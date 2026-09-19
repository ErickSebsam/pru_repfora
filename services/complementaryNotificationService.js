import sendEmail from "../utils/emails/sendEmail.js";
import Instructor from "../models/Instructor.js";
import User from "../models/User.js";
import Schedule from "../models/Schedule.js";
import Environment from "../models/Environment.js";
import ComplementaryEmailTemplate from "../models/ComplementaryEmailTemplate.js";
import { complementaryHelper } from "../helpers/complementary.helper.js";
import handlebars from "handlebars";
import path from "path";
import url from "url";
import fs from "fs";

const FROM_EMAIL = () => process.env.FROM_EMAIL;
const FROM_PASS = () => process.env.SECURY_EMAIL;

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

function formatDate(date) {
  if (!date) return "Pendiente";
  return new Date(date).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function parseEmails(rawEmailString) {
  if (!rawEmailString || typeof rawEmailString !== "string") return [];
  return rawEmailString
    .split(/[,;]+/)
    .map((e) => e.trim())
    .filter(Boolean);
}

async function getInstructorEmails(instructorId) {
  const instructor = await Instructor.findById(instructorId);
  if (!instructor) return [];
  const rawList = [instructor.email, instructor.emailpersonal].filter(Boolean);
  const emails = rawList.flatMap(parseEmails);
  return [...new Set(emails)];
}

/**
 * Obtiene el HTML compilado de un template de correo.
 * Primero busca en la BD por key; si no existe, cae al archivo .hbs correspondiente.
 * @param {string} key - Clave del template en BD
 * @param {string} hbsFallbackPath - Path relativo al archivo .hbs de fallback (desde utils/emails/)
 * @param {object} payload - Datos para compilar el template Handlebars
 * @returns {{ subject: string, html: string }}
 */
async function compileTemplate(key, hbsFallbackPath, payload) {
  try {
    const tpl = await ComplementaryEmailTemplate.findOne({ key, status: 0 });
    if (tpl) {
      const compiledSubject = handlebars.compile(tpl.subject)(payload);
      const compiledHtml = handlebars.compile(tpl.htmlContent)(payload);
      return { subject: compiledSubject, html: compiledHtml };
    }
  } catch (err) {
    console.log(`[COMPLEMENTARY-EMAIL] Error al cargar template de BD (${key}):`, err.message);
  }

  // Fallback: leer el archivo .hbs del disco
  try {
    const filePath = path.join(__dirname, "../utils/emails", hbsFallbackPath);
    const source = fs.readFileSync(filePath, "utf8");
    const compiledHtml = handlebars.compile(source)(payload);
    // El fallback no tiene subject dinámico, usar uno genérico
    return { subject: null, html: compiledHtml };
  } catch (err) {
    console.log(`[COMPLEMENTARY-EMAIL] Error al cargar template de disco (${hbsFallbackPath}):`, err.message);
    return { subject: null, html: "<p>Notificación del sistema REPFORA</p>" };
  }
}

/**
 * Envía un correo a una lista de destinatarios usando un template compilado.
 * @param {string[]} emails
 * @param {string} subject
 * @param {string} html - HTML ya compilado (no un template)
 */
async function sendComplementaryHtml(emails, subject, html, attachments = []) {
  if (!emails || emails.length === 0) return;
  const from = FROM_EMAIL();
  const pass = FROM_PASS();
  if (!from || !pass) {
    console.log("[COMPLEMENTARY-EMAIL] Credenciales de email no configuradas");
    return;
  }
  for (const email of emails) {
    try {
      // Usar nodemailer directamente con el HTML ya compilado (sin re-compilar hbs)
      const nodemailer = (await import("nodemailer")).default;
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: from, pass },
      });
      await transporter.sendMail({
        from: `REPFORA <${from}>`,
        to: email,
        subject,
        html,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
    } catch (err) {
      console.log(`[COMPLEMENTARY-EMAIL] Error enviando a ${email}:`, err.message);
    }
  }
}

/**
 * Obtiene los emails de coordinador y programadores de PROGRAMAS ESPECIALES,
 * respetando las preferencias individuales de notificación de cada usuario.
 * - Si notificacionesComplementarias.habilitado === false → se omite ese usuario
 * - Si notificacionesComplementarias.emailDestino está configurado → se usa ese email (permite múltiples separados por coma o punto y coma)
 * - Si no tiene emailDestino → se usa el email del usuario en el sistema
 * @returns {string[]} Lista de emails destino
 */
async function getCoordProgrammerEmails() {
  try {
    const coordinator = await complementaryHelper.findComplementaryCoordinator();
    const programmers = await complementaryHelper.findComplementaryProgrammers();

    const recipients = [];

    // Procesar coordinador
    if (coordinator) {
      // El coordinador es un User; buscar sus preferencias
      const coordUser = await User.findOne({ email: coordinator.email, status: 0 }).select("notificacionesComplementarias email");
      if (coordUser) {
        const prefs = coordUser.notificacionesComplementarias;
        const habilitado = prefs?.habilitado !== false; // default true si no está definido
        if (habilitado) {
          const destino = prefs?.emailDestino || coordUser.email;
          if (destino) recipients.push(...parseEmails(destino));
        }
      } else if (coordinator.email) {
        // Fallback: no encontró el User pero sí tiene email
        recipients.push(...parseEmails(coordinator.email));
      }
    }

    // Procesar programadores
    for (const programmer of programmers) {
      const progUser = await User.findOne({ email: programmer.email, status: 0 }).select("notificacionesComplementarias email");
      if (progUser) {
        const prefs = progUser.notificacionesComplementarias;
        const habilitado = prefs?.habilitado !== false;
        if (habilitado) {
          const destino = prefs?.emailDestino || progUser.email;
          if (destino) recipients.push(...parseEmails(destino));
        }
      } else if (programmer.email) {
        recipients.push(...parseEmails(programmer.email));
      }
    }

    // Deduplicar
    return [...new Set(recipients)];
  } catch (err) {
    console.log("[COMPLEMENTARY-EMAIL] Error al obtener emails de coordinador/programadores:", err.message);
    return [];
  }
}

// ========================= FUNCIONES DE NOTIFICACIÓN =========================

export async function notifyApproval(request) {
  const emails = await getInstructorEmails(request.instructor);
  const payload = {
    numeroSolicitud: request.numeroSolicitud || "",
    instructorName: request.instructorName || "Instructor",
    courseName: request.catalogCourseName,
    courseCode: request.catalogCourseCode,
    courseVersion: request.catalogCourseVersion,
    approvalDate: formatDate(new Date()),
  };
  const { subject, html } = await compileTemplate(
    "solicitudAprobada",
    "./template/solicitudAprobada.hbs",
    payload
  );
  await sendComplementaryHtml(
    emails,
    subject || `Solicitud Aprobada - ${request.catalogCourseName}`,
    html
  );
}

export async function notifyRejection(request, observations) {
  const emails = await getInstructorEmails(request.instructor);
  const payload = {
    numeroSolicitud: request.numeroSolicitud || "",
    instructorName: request.instructorName || "Instructor",
    courseName: request.catalogCourseName,
    courseCode: request.catalogCourseCode,
    courseVersion: request.catalogCourseVersion,
    rejectionDate: formatDate(new Date()),
    observations: observations || "Sin observaciones",
  };
  const { subject, html } = await compileTemplate(
    "solicitudRechazada",
    "./template/solicitudRechazada.hbs",
    payload
  );
  await sendComplementaryHtml(
    emails,
    subject || `Solicitud Rechazada - ${request.catalogCourseName}`,
    html
  );
}

export async function notifyNewRequest(request, instructorName, attachments = []) {
  try {
    const recipientEmails = await getCoordProgrammerEmails();

    if (recipientEmails.length === 0) {
      console.log("[COMPLEMENTARY-EMAIL] Sin destinatarios habilitados para nueva solicitud (coordinador/programadores)");
      return;
    }

    const coordinator = await complementaryHelper.findComplementaryCoordinator();
    const payload = {
      coordinatorName: coordinator?.name || "Coordinador",
      instructorName: instructorName || "Instructor",
      courseName: request.catalogCourseName,
      courseCode: request.catalogCourseCode,
      courseVersion: request.catalogCourseVersion,
      requestDate: formatDate(new Date()),
      municipio: request.municipio || "",
      numAprendices: request.numAprendices || 0,
    };
    const { subject, html } = await compileTemplate(
      "nuevaSolicitud",
      "./template/nuevaSolicitudComplementaria.hbs",
      payload
    );
    await sendComplementaryHtml(
      recipientEmails,
      subject || `Nueva Solicitud de Complementaria - ${request.catalogCourseName}`,
      html,
      attachments
    );
  } catch (err) {
    console.error("Error en notifyNewRequest:", err);
  } finally {
    // Cleanup de los archivos temporales en disco
    for (const att of attachments) {
      if (att.path && fs.existsSync(att.path)) {
        try {
          fs.unlinkSync(att.path);
          console.log(`[CLEANUP] Archivo temporal de correo eliminado: ${att.path}`);
        } catch (e) {
          console.error(`[CLEANUP] Error al eliminar temporal ${att.path}:`, e.message);
        }
      }
    }
  }
}

export async function notifyFichaAssigned(request) {
  const emails = await getInstructorEmails(request.instructor);
  const payload = {
    instructorName: request.instructorName || "Instructor",
    numeroSolicitud: request.numeroSolicitud || "",
    fichaCaracterizacion: request.fichaCaracterizacion || "",
    courseName: request.catalogCourseName,
    courseCode: request.catalogCourseCode,
    courseVersion: request.catalogCourseVersion,
    fechaInicio: formatDate(request.fechaInicio),
    fechaFin: formatDate(request.fechaFin),
  };
  const { subject, html } = await compileTemplate(
    "fichaAsignada",
    "./template/fichaComplementariaAsignada.hbs",
    payload
  );
  await sendComplementaryHtml(
    emails,
    subject || `Ficha Asignada - ${request.numeroSolicitud} - ${request.catalogCourseName}`,
    html
  );
}

export async function notifyCancellation(request, previousState, observations) {
  const emails = await getInstructorEmails(request.instructor);
  const payload = {
    numeroSolicitud: request.numeroSolicitud || "",
    instructorName: request.instructorName || "Instructor",
    courseName: request.catalogCourseName,
    courseCode: request.catalogCourseCode,
    courseVersion: request.catalogCourseVersion,
    fichaNumber: request.fichaNumber || "",
    previousState: previousState || "",
    cancellationDate: formatDate(new Date()),
    observations: observations || "",
  };
  const { subject, html } = await compileTemplate(
    "fichaCancelada",
    "./template/fichaComplementariaCancelada.hbs",
    payload
  );
  await sendComplementaryHtml(
    emails,
    subject || `Ficha Cancelada - ${request.fichaNumber || request.numeroSolicitud} - ${request.catalogCourseName}`,
    html
  );
}

const DIAS_SEMANA = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];

export async function notifyResubmit(request, instructorName) {
  const recipientEmails = await getCoordProgrammerEmails();

  if (recipientEmails.length === 0) {
    console.log("[COMPLEMENTARY-EMAIL] Sin destinatarios habilitados para resubmit (coordinador/programadores)");
    return;
  }

  const payload = {
    numeroSolicitud: request.numeroSolicitud || "",
    instructorName: instructorName || "Instructor",
    resubmitDate: formatDate(new Date()),
    courseName: request.catalogCourseName,
    courseCode: request.catalogCourseCode,
    courseVersion: request.catalogCourseVersion,
    prfDuracionMaxima: request.prfDuracionMaxima || 0,
    tipoPrograma: request.tipoPrograma || "",
    tipoPoblacion: request.tipoPoblacion || "",
    fechaInicio: formatDate(request.fechaInicio),
    fechaFin: formatDate(request.fechaFin),
    fechaInscripcionInicio: formatDate(request.fechaInscripcionInicio),
    fechaInscripcionFin: formatDate(request.fechaInscripcionFin),
    fechaMatriculaInicio: formatDate(request.fechaMatriculaInicio),
    fechaMatriculaFin: formatDate(request.fechaMatriculaFin),
    municipio: request.municipio || "",
    vereda: request.vereda || "",
    direccion: request.direccion || "",
    ambienteNombre: request.ambienteNombre || "",
    ambienteDireccion: request.ambienteDireccion || "",
    nombreEmpresa: request.nombreEmpresa || "",
    nitEmpresa: request.nitEmpresa || "",
    contactoEmpresa: request.contactoEmpresa || "",
    telefonoEmpresa: request.telefonoEmpresa || "",
    numAprendices: request.numAprendices || 0,
    requisitosIngreso: request.requisitosIngreso || "",
    recursosNecesarios: request.recursosNecesarios || "",
    proyectoAsociado: request.proyectoAsociado || "",
    competencias: Array.isArray(request.competencies) && request.competencies.length > 0
      ? request.competencies.map((c) => {
          if (typeof c === "string") {
            return { nombre: c, codigo: "", horas: 0, criterios: [] };
          }
          return {
            nombre: c.nombre || "",
            codigo: c.codigo || "",
            horas: c.horas || 0,
            criterios: Array.isArray(c.criterios) ? c.criterios : [],
          };
        })
      : null,
    resultados: Array.isArray(request.outcomes) && request.outcomes.length > 0 ? request.outcomes : null,
    supervisorNombre: request.supervisorNombre || "",
  };
  const { subject, html } = await compileTemplate(
    "solicitudModificada",
    "./template/solicitudResubmit.hbs",
    payload
  );
  await sendComplementaryHtml(
    recipientEmails,
    subject || `Solicitud Modificada y Reenviada - ${request.catalogCourseName}`,
    html
  );
}

export async function notifyScheduled(request, schedule) {
  const emails = await getInstructorEmails(request.instructor);
  const payload = {
    instructorName: request.instructorName || "Instructor",
    numeroSolicitud: request.numeroSolicitud || "",
    courseName: request.catalogCourseName,
    courseCode: request.catalogCourseCode,
    courseVersion: request.catalogCourseVersion,
    fechaInicio: formatDate(schedule.fstart),
    fechaFin: formatDate(schedule.fend),
    horaInicio: schedule.tstart || "",
    horaFin: schedule.tend || "",
    dias: Array.isArray(schedule.days) ? schedule.days.map((d) => DIAS_SEMANA[d] || d).join(", ") : "",
    totalHoras: schedule.hourswork || 0,
    ambienteNombre: schedule.environment?.name || request.ambienteNombre || "",
  };
  const { subject, html } = await compileTemplate(
    "complementariaProgramada",
    "./template/complementariaProgramada.hbs",
    payload
  );
  await sendComplementaryHtml(
    emails,
    subject || `Complementaria Programada - ${request.numeroSolicitud} - ${request.catalogCourseName}`,
    html
  );
}

export async function notifyExecution(request) {
  const emails = await getInstructorEmails(request.instructor);
  const payload = {
    instructorName: request.instructorName || "Instructor",
    fichaNumber: request.fichaNumber || "",
    numeroSolicitud: request.numeroSolicitud || "",
    courseName: request.catalogCourseName,
    courseCode: request.catalogCourseCode,
    courseVersion: request.catalogCourseVersion,
    fechaInicio: formatDate(request.fechaInicio),
    fechaFin: formatDate(request.fechaFin),
    executionDate: formatDate(new Date()),
  };
  const { subject, html } = await compileTemplate(
    "fichaEnEjecucion",
    "./template/fichaEnEjecucion.hbs",
    payload
  );
  await sendComplementaryHtml(
    emails,
    subject || `Ficha en Ejecución - ${request.fichaNumber || request.numeroSolicitud} - ${request.catalogCourseName}`,
    html
  );
}

// Notifica al coordinador y programadores cuando un instructor solicita ampliacion de su ficha.
export async function notifyExtensionRequest(request, instructorName) {
  const recipientEmails = await getCoordProgrammerEmails();

  if (recipientEmails.length === 0) {
    console.log("[COMPLEMENTARY-EMAIL] Sin destinatarios habilitados para solicitud de ampliacion (coordinador/programadores)");
    return;
  }

  const coordinator = await complementaryHelper.findComplementaryCoordinator();
  const payload = {
    coordinatorName: coordinator?.name || "Coordinador",
    instructorName: instructorName || "Instructor",
    fichaNumber: request.fichaNumber || "",
    numeroSolicitud: request.numeroSolicitud || "",
    courseName: request.catalogCourseName,
    courseCode: request.catalogCourseCode,
    courseVersion: request.catalogCourseVersion,
    requestDate: formatDate(new Date()),
    fechaFinActual: formatDate(request.fechaFin),
  };
  const { subject, html } = await compileTemplate(
    "ampliacionSolicitada",
    "./template/ampliacionSolicitada.hbs",
    payload
  );
  await sendComplementaryHtml(
    recipientEmails,
    subject || `Solicitud de Ampliacion - ${request.fichaNumber || request.numeroSolicitud} - ${request.catalogCourseName}`,
    html
  );
}

// Notifica al instructor cuando el coordinador/admin resuelve su solicitud de ampliacion.
export async function notifyExtensionResolved(request, extension) {
  const emails = await getInstructorEmails(request.instructor);
  const aprobada = extension.status === "APROBADA";
  const payload = {
    aprobada,
    fichaNumber: request.fichaNumber || "",
    numeroSolicitud: request.numeroSolicitud || "",
    courseName: request.catalogCourseName,
    courseCode: request.catalogCourseCode,
    courseVersion: request.catalogCourseVersion,
    resolutionDate: formatDate(extension.resolvedDate || new Date()),
    observations: extension.resolvedObservations || "",
  };
  const defaultSubject = aprobada
    ? `Ampliacion Aprobada - ${request.fichaNumber || request.numeroSolicitud} - ${request.catalogCourseName}`
    : `Ampliacion Rechazada - ${request.fichaNumber || request.numeroSolicitud} - ${request.catalogCourseName}`;
  const { subject, html } = await compileTemplate(
    "ampliacionResuelta",
    "./template/ampliacionResuelta.hbs",
    payload
  );
  await sendComplementaryHtml(
    emails,
    subject || defaultSubject,
    html
  );
}

function formatDateDMY(date, isTimestamp = false) {
  if (!date) return "Pendiente";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Pendiente";
  if (isTimestamp) {
    return d.toLocaleDateString("es-CO", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "numeric",
      day: "numeric"
    });
  } else {
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }
}

function formatDays(days) {
  if (!Array.isArray(days) || days.length === 0) return "";
  const sortedDays = [...days].sort((a, b) => a - b);
  const dayNames = ["DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"];
  
  // check if it's Lunes a Viernes [1, 2, 3, 4, 5]
  if (sortedDays.length === 5 && sortedDays.every((d, i) => d === i + 1)) {
    return "LUNES A VIERNES";
  }
  // check if it's Lunes a Sábado [1, 2, 3, 4, 5, 6]
  if (sortedDays.length === 6 && sortedDays.every((d, i) => d === i + 1)) {
    return "LUNES A SABADO";
  }
  
  return sortedDays.map(d => dayNames[d] || "").filter(Boolean).join(", ");
}

export async function notifyMatriculada(request) {
  try {
    const recipientEmails = await getCoordProgrammerEmails();
    if (recipientEmails.length === 0) {
      console.log("[COMPLEMENTARY-EMAIL] Sin destinatarios habilitados para notificar matrícula (coordinador/programadores)");
      return;
    }

    // 1. Obtener los horarios de la solicitud
    const schedules = await Schedule.find({ complementaryRequest: request._id, status: 0 });
    
    // 2. Formatear el horario
    let horarioFormatted = "No programado";
    if (schedules.length > 0) {
      horarioFormatted = schedules.map(s => {
        const daysText = formatDays(s.days);
        return `${daysText} DE ${s.tstart || ""} A ${s.tend || ""}`;
      }).join("<br>");
    }

    // 3. Obtener el instructor principal
    let instructorNombre = "";
    let instructorCorreo = "";
    if (request.instructor) {
      if (request.instructor.name) {
        instructorNombre = request.instructor.name;
        instructorCorreo = request.instructor.email || "";
      } else {
        const instDoc = await Instructor.findById(request.instructor);
        if (instDoc) {
          instructorNombre = instDoc.name;
          instructorCorreo = instDoc.email || "";
        }
      }
    }

    // 4. Obtener nombre del ambiente
    let environmentNombre = request.ambienteNombre || "";
    if (!environmentNombre && request.environment) {
      if (request.environment.name) {
        environmentNombre = request.environment.name;
      } else {
        const envDoc = await Environment.findById(request.environment);
        if (envDoc) {
          environmentNombre = envDoc.name;
        }
      }
    }
    if (!environmentNombre) {
      environmentNombre = "No asignado";
    }

    // 5. Armar el payload para el correo
    const payload = {
      fichaNumber: request.fichaNumber || request.fichaCaracterizacion || "Pendiente",
      fechaCreacion: formatDateDMY(request.createdAt, true),
      courseName: request.catalogCourseName || "",
      courseCode: request.catalogCourseCode || "",
      courseVersion: request.catalogCourseVersion || "",
      duracion: request.prfDuracionMaxima || 0,
      fechaInicio: formatDateDMY(request.fechaInicio, false),
      fechaFin: formatDateDMY(request.fechaFin, false),
      cupo: request.numAprendices || 0,
      municipio: request.municipio || "",
      ambiente: environmentNombre,
      horario: horarioFormatted,
      codigoSolicitud: request.codigoSolicitud || "Pendiente",
      fechaLimiteInscripcion: formatDateDMY(request.fechaInscripcionFin || request.fechaInscripcion, false),
      instructorNombre,
      instructorCorreo,
      numeroActaTrazabilidad: request.actaTrazabilidad || "Pendiente",
    };

    const { subject, html } = await compileTemplate(
      "fichaMatriculada",
      "./template/fichaMatriculada.hbs",
      payload
    );

    const emailSubject = subject || `Ficha Matriculada - ${payload.fichaNumber} - ${payload.courseName}`;

    await sendComplementaryHtml(
      recipientEmails,
      emailSubject,
      html
    );
    console.log(`[COMPLEMENTARY-EMAIL] Notificación de matrícula enviada a ${recipientEmails.join(", ")} para la ficha ${payload.fichaNumber}`);
  } catch (err) {
    console.error("Error en notifyMatriculada:", err);
  }
}
