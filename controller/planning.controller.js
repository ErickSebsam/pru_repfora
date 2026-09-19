import mongoose from 'mongoose';
import Planning from '../models/Planning.js';
import Fiche from '../models/Fiche.js';
import Program from '../models/Program.js';
import Competence from '../models/Competence.js';
import Outcome from '../models/Outcome.js';
import Schedule from '../models/Schedule.js';
import { exec } from 'child_process';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import sendEmail from '../utils/emails/sendEmail.js';
import Instructor from '../models/Instructor.js';
import PlanningTemplate from '../models/PlanningTemplate.js';
import webToken from '../middlewares/webToken.js';
import Notification from '../models/Notification.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache temporal de datos extraídos mientras el usuario confirma la fusión
// (evita volver a ejecutar el extractor de PDFs en la fase de confirmación).
const extractPendingConfirmations = new Map();

// generado por luis llanos (calcula y asigna las horas directas de los resultados aplicando % de horas lectivas a cada competencia)
export const calculateDirectHoursForPlanning = (pedagogicalPlanning, force = false, explicitShift = null) => {
  if (!pedagogicalPlanning) return pedagogicalPlanning;

  const metadata = pedagogicalPlanning.metadata || {};
  const totalHours = Number(metadata.totalHours) || (Number(metadata.lectivaHours || 0) + Number(metadata.productivaHours || 0)) || 0;
  const lectivaHours = Number(metadata.lectivaHours) || 0;
  const ratio = totalHours > 0 ? (lectivaHours / totalHours) : 1;

  // correcion de multiplos
  // Determinar si la formacion es en la noche o en la mañana/tarde
  const currentShift = String(explicitShift || metadata.shift || metadata.jornada || '').toLowerCase().trim();
  const isNight = currentShift.includes('noche') || currentShift.includes('night') || currentShift.includes('nocturn');
  const multiple = isNight ? 5 : 6;

  if (Array.isArray(pedagogicalPlanning.content)) {
    for (const phase of pedagogicalPlanning.content) {
      if (!Array.isArray(phase.competencies)) continue;

      for (const comp of phase.competencies) {
        const compTotalHours = Number(comp.totalCompetenceHours) || 0;
        const compLectivaHours = compTotalHours * ratio;

        const raps = comp.learningOutcomes || [];
        const numRaps = raps.length;

        if (numRaps > 0) {
          const rawHoursPerRap = compLectivaHours / numRaps;

          /*
          // comentado para correcion de multiplos
          const directHoursPerRap = Math.round(rawHoursPerRap * 10) / 10;
          */

          // correcion de multiplos
          // Aproximar al multiplo de 6 mas cercano descendente (mañana/tarde) o multiplo de 5 (noche)
          const directHoursPerRap = Math.max(multiple, Math.floor(rawHoursPerRap / multiple) * multiple);

          for (const rap of raps) {
            if (!Array.isArray(rap.pedagogicalActivities) || rap.pedagogicalActivities.length === 0) {
              rap.pedagogicalActivities = [{
                description: rap.description || 'Actividad de aprendizaje',
                hours: { direct: directHoursPerRap, independent: 0 }
              }];
            } else {
              const numActs = rap.pedagogicalActivities.length;

              /*
              // comentado para correcion de multiplos
              const directHoursPerAct = numActs === 1 ? directHoursPerRap : Math.round((directHoursPerRap / numActs) * 10) / 10;
              */

              // correcion de multiplos
              const directHoursPerAct = numActs === 1 ? directHoursPerRap : Math.max(multiple, Math.floor((directHoursPerRap / numActs) / multiple) * multiple || Math.round(directHoursPerRap / numActs));

              for (const act of rap.pedagogicalActivities) {
                if (!act.hours) act.hours = { direct: 0, independent: 0 };
                if (force || !act.hours.direct || act.hours.direct === 0) {
                  act.hours.direct = directHoursPerAct;
                }
              }
            }
          }
        }
      }
    }
  }

  return pedagogicalPlanning;
};
// fin de implementacion luis llanos

const normalizeName = (name) => {
  return (name || '')
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
};

const cleanTextForComparison = (str) => {
  if (!str) return "";
  return String(str)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ]/g, "");
};

const getSimilarity = (s1, s2) => {
  const a = cleanTextForComparison(s1);
  const b = cleanTextForComparison(s2);

  if (!a.length || !b.length) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.95;

  const bigramsA = new Set();
  for (let i = 0; i < a.length - 1; i++) bigramsA.add(a.substring(i, i + 2));

  let intersection = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const bigram = b.substring(i, i + 2);
    if (bigramsA.has(bigram)) intersection++;
  }

  const totalBigrams = (a.length - 1) + (b.length - 1);
  return totalBigrams > 0 ? (2 * intersection) / totalBigrams : 0;
};

const getShiftFromTime = (tstart) => {
  if (!tstart) return null;
  const hour = parseInt(tstart.split(":")[0], 10);
  if (isNaN(hour)) return null;
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 || hour < 6) return 'night';
  return null;
};

const formatDateToYYYYMMDD = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateDMY = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

const isSameInstructorName = (name1, name2) => {
  if (!name1 || !name2) return false;
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  if (n1 === n2) return true;

  const words1 = n1.split(/\s+/).filter(w => w.length > 2);
  const words2 = n2.split(/\s+/).filter(w => w.length > 2);

  if (words1.length === 0 || words2.length === 0) return false;

  const match1 = words1.every(w => words2.includes(w));
  const match2 = words2.every(w => words1.includes(w));

  const firstTwo1 = words1.slice(0, 2).join(' ');
  const firstTwo2 = words2.slice(0, 2).join(' ');
  const firstTwoMatch = firstTwo1 && firstTwo2 && firstTwo1 === firstTwo2;

  return match1 || match2 || firstTwoMatch;
};

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const isEmptyValue = (value) => value === undefined || value === null || value === '';

const isDefaultEmptyActivity = (act) => {
  if (!act) return false;
  const hasDesc = act.description && act.description !== 'Actividad sin descripción' && String(act.description).trim() !== '';
  const hasInstructor = !!(act.suggestedInstructor?.id || act.instructors?.id);
  const hasHours = (Number(act.hours?.direct) || 0) > 0 || (Number(act.hours?.independent) || 0) > 0;
  return !hasDesc && !hasInstructor && !hasHours;
};

const hasOnlyDefaultEmptyActivities = (activities) => {
  if (!activities || activities.length === 0) return true;
  return activities.length === 1 && isDefaultEmptyActivity(activities[0]);
};

/**
 * Determina la ficha definitiva con la que se guardará la planeación.
 * Si el extractor no logró detectar la ficha desde el PDF del Equipo Ejecutor
 * (devuelve "000000" u otro placeholder), se usa la ficha válida enviada por
 * el frontend para evitar guardar la planeación bajo un número incorrecto
 * (por ejemplo, el código del proyecto formativo).
 */
const resolveFinalFiche = (planningData, fallbackFiche) => {
  let finalFiche = planningData?.pedagogicalPlanning?.fiche || fallbackFiche;

  if (
    !finalFiche
    || ['000000', 'undefined', 'null', 'EXTRACTED'].includes(String(finalFiche))
    || String(finalFiche).includes('EXTRACTED')
  ) {
    const numericFiche = String(fallbackFiche || '').match(/\d{5,9}/);
    if (numericFiche) finalFiche = numericFiche[0];
  }

  return finalFiche;
};

/**
 * Fusiona la planeación recién extraída DENTRO de la planeación ya existente en Repfora.
 * Solo completa la información que falta: nunca borra ni sobrescribe asignaciones de
 * instructores, confirmaciones ni programaciones ya establecidas.
 */
const fillMissingIntoExistingPlanning = (existingPlanning, planningData) => {
  const incoming = planningData.pedagogicalPlanning || {};
  const existing = existingPlanning.pedagogicalPlanning || {};

  // Metadatos: los campos que provienen de los documentos oficiales (PDFs o BD)
  // se REFRESCAN siempre con lo recién extraído, porque la re-extracción es la
  // fuente autoritativa (corrige datos viejos o incorrectos, ej. programa
  // equivocado). El resto de campos solo se completa si está vacío.
  const AUTHORITATIVE_METADATA_KEYS = [
    'programName', 'programCode', 'projectCode', 'totalHours',
    'lectivaHours', 'productivaHours', 'lectivaStartDate', 'lectivaEndDate',
    'teamPdfProcessed'
  ];
  if (incoming.metadata) {
    if (!existing.metadata) existing.metadata = {};
    for (const [key, value] of Object.entries(incoming.metadata)) {
      if (isEmptyValue(value)) continue;
      if (AUTHORITATIVE_METADATA_KEYS.includes(key)) {
        existing.metadata[key] = JSON.parse(JSON.stringify(value));
      } else if (isEmptyValue(existing.metadata[key])) {
        existing.metadata[key] = JSON.parse(JSON.stringify(value));
      }
    }
  }

  // Fechas generales de la ficha (provienen de la BD): refrescar si la
  // extracción entrante trae un valor.
  for (const key of ['startDate', 'endDate']) {
    if (!isEmptyValue(incoming[key])) {
      existing[key] = JSON.parse(JSON.stringify(incoming[key]));
    }
  }

  // Líder de la planeación
  if (isEmptyValue(existing.leaderEmail) && !isEmptyValue(incoming.leaderEmail)) {
    existing.leaderEmail = incoming.leaderEmail;
  }

  const existingContent = existing.content || [];
  const incomingContent = incoming.content || [];

  incomingContent.forEach(inPhase => {
    if (!inPhase) return;
    const exPhase = existingContent.find(p => p.phase === inPhase.phase);

    if (!exPhase) {
      existingContent.push(JSON.parse(JSON.stringify(inPhase)));
      return;
    }

    (inPhase.competencies || []).forEach(inComp => {
      if (!inComp) return;
      const exComp = (exPhase.competencies || []).find(c => c.code === inComp.code);

      if (!exComp) {
        if (!exPhase.competencies) exPhase.competencies = [];
        exPhase.competencies.push(JSON.parse(JSON.stringify(inComp)));
        return;
      }

      // Completar campos vacíos de la competencia
      for (const key of ['name', 'totalCompetenceHours']) {
        if (isEmptyValue(exComp[key]) && !isEmptyValue(inComp[key])) {
          exComp[key] = JSON.parse(JSON.stringify(inComp[key]));
        }
      }

      (inComp.learningOutcomes || []).forEach(inRap => {
        if (!inRap) return;
        const exRap = (exComp.learningOutcomes || []).find(
          r => (r.description || '').trim().toUpperCase() === (inRap.description || '').trim().toUpperCase()
        );

        if (!exRap) {
          if (!exComp.learningOutcomes) exComp.learningOutcomes = [];
          exComp.learningOutcomes.push(JSON.parse(JSON.stringify(inRap)));
          return;
        }

        // Fusionar actividades sin duplicar: si el RAP existente solo tiene la
        // actividad vacía por defecto, se cargan las recién extraídas; de lo
        // contrario solo se agregan las actividades entrantes con información
        // que no existan ya. La actividad vacía del extractor nunca se duplica.
        const exActs = exRap.pedagogicalActivities || [];
        const inActs = inRap.pedagogicalActivities || [];

        if (hasOnlyDefaultEmptyActivities(exActs) && inActs.length) {
          exRap.pedagogicalActivities = JSON.parse(JSON.stringify(inActs));
        } else {
          inActs.forEach(inAct => {
            if (!inAct) return;

            // La actividad por defecto del extractor no aporta nada si ya
            // existen actividades con información (asignaciones, horas, etc.)
            if (isDefaultEmptyActivity(inAct) && exActs.length > 0) return;

            const inInstr = ((inAct.suggestedInstructor?.name || inAct.instructors?.name) || '').trim().toUpperCase();
            const inDesc = ((inAct.description || inAct.observations) || '').trim().toUpperCase();

            const dup = exActs.find(a => {
              const aDesc = ((a.description || a.observations) || '').trim().toUpperCase();
              const aInstr = ((a.suggestedInstructor?.name || a.instructors?.name) || '').trim().toUpperCase();
              return aDesc === inDesc && aInstr === inInstr;
            });

            if (!dup) {
              exActs.push(JSON.parse(JSON.stringify(inAct)));
            }
          });
        }

        // cambion efectuado por luis llanos: completar materiales y ambiente si estaban vacíos en actividades existentes
        exActs.forEach((exAct, actIdx) => {
          const correspondingInAct = inActs[actIdx] || inActs[0];
          if (correspondingInAct) {
            const inMats = correspondingInAct.trainingMaterials || correspondingInAct.materials || correspondingInAct.environment?.materials || [];
            if ((!exAct.materials || exAct.materials.length === 0) && inMats.length > 0) {
              exAct.materials = JSON.parse(JSON.stringify(inMats));
            }
            if ((!exAct.trainingMaterials || exAct.trainingMaterials.length === 0) && inMats.length > 0) {
              exAct.trainingMaterials = JSON.parse(JSON.stringify(inMats));
            }
            if ((!exAct.environment?.materials || exAct.environment.materials.length === 0) && inMats.length > 0) {
              if (!exAct.environment) exAct.environment = { type: '', materials: [] };
              exAct.environment.materials = JSON.parse(JSON.stringify(inMats));
            }
            if (isEmptyValue(exAct.environment?.type) && !isEmptyValue(correspondingInAct.environment?.type)) {
              if (!exAct.environment) exAct.environment = { type: '', materials: [] };
              exAct.environment.type = correspondingInAct.environment.type;
            }
            if (isEmptyValue(exAct.learningEnvironment) && !isEmptyValue(correspondingInAct.learningEnvironment)) {
              exAct.learningEnvironment = correspondingInAct.learningEnvironment;
            }
          }
        });

        // Completar otros campos vacíos del RAP (las actividades ya se manejaron arriba)
        for (const [key, value] of Object.entries(inRap)) {
          if (key === 'pedagogicalActivities') continue;
          if (isEmptyValue(exRap[key]) && !isEmptyValue(value)) {
            exRap[key] = JSON.parse(JSON.stringify(value));
          }
        }
      });
    });
  });

  existing.content = existingContent;
  if (!existing.timestamps) existing.timestamps = {};
  existing.timestamps.updatedAt = new Date();
};

export const uploadPlanning = async (req, res) => {
  try {
    const { fiche, pedagogicalPlanning } = req.body;
    const targetFiche = fiche || pedagogicalPlanning?.fiche;

    if (!targetFiche) {
      return res.status(400).json({ message: 'Falta el número de ficha' });
    }

    // Detect newly confirmed activities (with all details) instead of just instructor names
    const getConfirmedActivities = (content) => {
      const confirmed = new Map();
      if (!content) return confirmed;
      content.forEach(phase => {
        if (phase.competencies) {
          phase.competencies.forEach(comp => {
            if (comp.learningOutcomes) {
              comp.learningOutcomes.forEach(rap => {
                if (rap.pedagogicalActivities) {
                  rap.pedagogicalActivities.forEach(act => {
                    const sugg = act.suggestedInstructor || act.instructors;
                    if (sugg && sugg.name && sugg.assignmentStatus === 'confirmed') {
                      // Crear una clave única que represente a esta actividad asignada y confirmada
                      const key = `${comp.code}||${rap.description}||${act.description || act.observations || ''}`.trim().toUpperCase();
                      confirmed.set(key, {
                        instructorName: sugg.name.trim().toUpperCase(),
                        phase: phase.phase,
                        competenceCode: comp.code,
                        competenceName: comp.name,
                        rapDescription: rap.description,
                        activityDescription: act.description || act.observations || 'Sin descripción',
                        hoursDirect: act.hours?.direct || 0,
                        hoursIndependent: act.hours?.independent || 0
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
      return confirmed;
    };

    const token = req.headers.token || req.headers.authorization;
    let decoded = null;
    let isInstructor = false;
    let instructorName = "";

    if (token) {
      try {
        decoded = await webToken.decodeAnyToken(token);
        if (decoded && (decoded.rol === "INSTRUCTOR" || decoded.isInstructor)) {
          isInstructor = true;
          const inst = await Instructor.findById(decoded.id);
          if (inst) {
            instructorName = inst.name;
          }
        }
      } catch (err) {
        console.error('Error decoding token in uploadPlanning:', err.message);
      }
    }

    const existingPlanning = await Planning.findOne({ 'pedagogicalPlanning.fiche': targetFiche });
    const oldConfirmedActs = existingPlanning ? getConfirmedActivities(existingPlanning.pedagogicalPlanning?.content) : new Map();
    const newConfirmedActs = getConfirmedActivities(pedagogicalPlanning.content);

    const newlyConfirmedActs = [];
    for (const [key, actData] of newConfirmedActs.entries()) {
      if (!oldConfirmedActs.has(key)) {
        newlyConfirmedActs.push(actData);
      }
    }

    if (!pedagogicalPlanning.timestamps) {
      pedagogicalPlanning.timestamps = {};
    }

    const planningLeaderEmail = (existingPlanning?.pedagogicalPlanning?.leaderEmail || '').trim().toLowerCase();
    const instructorEmail = (decoded?.email || '').trim().toLowerCase();
    const userRole = (decoded?.rol || '').toUpperCase();
    const isAdminOrProgrammer = ['PROGRAMADOR', 'COORDINADOR', 'ADMIN'].includes(userRole);
    const isLeaderOfThisFiche = isAdminOrProgrammer || !!(planningLeaderEmail && instructorEmail && planningLeaderEmail === instructorEmail);

    console.log('--- UPLOAD PLANNING DEBUG ---');
    console.log('Logged user email:', instructorEmail);
    console.log('Logged user role:', userRole);
    console.log('Logged instructor name:', instructorName);
    console.log('Is Leader of this Fiche:', isLeaderOfThisFiche);
    console.log('Is Instructor flag:', isInstructor);

    let planning;
    if (existingPlanning && isInstructor && instructorName && !isLeaderOfThisFiche) {
      console.log('=> ENTERING SAFE MERGE FOR INSTRUCTORS');
      // Realizar la fusión segura (safe merge) para instructores
      if (pedagogicalPlanning.content && Array.isArray(pedagogicalPlanning.content)) {
        existingPlanning.pedagogicalPlanning.content.forEach(existingPhase => {
          const incomingPhase = pedagogicalPlanning.content.find(p => p.phase === existingPhase.phase);
          if (!incomingPhase) return;

          existingPhase.competencies.forEach(existingComp => {
            const incomingComp = incomingPhase.competencies.find(c => c.code === existingComp.code);
            if (!incomingComp) return;

            existingComp.learningOutcomes.forEach(existingRap => {
              const incomingRap = incomingComp.learningOutcomes.find(
                r => r.description.trim().toUpperCase() === existingRap.description.trim().toUpperCase()
              );
              if (!incomingRap) return;

              existingRap.pedagogicalActivities.forEach((existingAct, idx) => {
                const sugg = existingAct.suggestedInstructor || existingAct.instructors;
                const isAssigned = sugg && sugg.name && isSameInstructorName(sugg.name, instructorName);

                if (isAssigned) {
                  const existingDesc = (existingAct.description || existingAct.observations || '').trim().toUpperCase();
                  // Reemplazar búsqueda por descripción con búsqueda por índice para evitar que se pierdan los cambios del instructor
                  const incomingAct = incomingRap.pedagogicalActivities[idx];

                  if (incomingAct) {
                    console.log('>>> EXISTING ACT:', existingAct.description);
                    console.log('>>> INCOMING ACT:', incomingAct.description);

                    if (incomingAct.hours !== undefined) {
                      existingAct.hours = incomingAct.hours;
                    }

                    if (incomingAct.description !== undefined) {
                      existingAct.description = incomingAct.description;
                    }

                    existingAct.didacticStrategies = incomingAct.didacticStrategies || [];
                    existingAct.learningEvidences = incomingAct.learningEvidences || [];
                    existingAct.environment = {
                      type: incomingAct.environment?.type || '',
                      materials: incomingAct.environment?.materials || []
                    };
                    if (incomingAct.observations !== undefined) {
                      existingAct.observations = incomingAct.observations;
                    }
                    // TAREA 3: Persistir datos del calendario del instructor en el safe merge
                    if (incomingAct.scheduleDetails !== undefined) {
                      existingAct.scheduleDetails = incomingAct.scheduleDetails;
                    }
                    if (incomingAct.isScheduledInCalendar !== undefined) {
                      existingAct.isScheduledInCalendar = incomingAct.isScheduledInCalendar;
                    }
                    // cambion efectuado por luis llanos
                    if (incomingAct.materials !== undefined) {
                      existingAct.materials = incomingAct.materials;
                    }
                    if (incomingAct.trainingMaterials !== undefined) {
                      existingAct.trainingMaterials = incomingAct.trainingMaterials;
                    }
                    if (incomingAct.learningEnvironment !== undefined) {
                      existingAct.learningEnvironment = incomingAct.learningEnvironment;
                    }
                    // implementacion de luis llanos (preservar comentarios en la actualizacion segura de actividades)
                    if (incomingAct.comments !== undefined) {
                      existingAct.comments = incomingAct.comments;
                    }
                    // fin de implementacion luis llanos
                    if (incomingAct.reviewed !== undefined) {
                      existingAct.reviewed = incomingAct.reviewed;
                    }
                  }
                }
              });
            });
          });
        });
      }

      existingPlanning.pedagogicalPlanning.timestamps.updatedAt = new Date();
      existingPlanning.markModified('pedagogicalPlanning.content');
      await existingPlanning.save();
      planning = existingPlanning;

      // Notificar a todos los programadores y administradores en el sistema (solo en base de datos)
      try {
        const User = mongoose.model('User');
        const programmersAndAdmins = await User.find({ role: { $in: ['PROGRAMADOR', 'ADMIN', 'COORDINADOR'] } });

        for (const user of programmersAndAdmins) {
          if (user.email) {
            const notifProgramador = new Notification({
              sender: instructorName || 'Instructor',
              subject: `El instructor ${instructorName} actualizó su planeación pedagógica de la Ficha ${targetFiche}`,
              fiche: targetFiche,
              recipient: user.email.trim().toLowerCase(),
              read: false
            });
            await notifProgramador.save();
          }
        }
        console.log(`[NOTIFICACIÓN] Creadas notificaciones en BD para ${programmersAndAdmins.length} administradores/programadores.`);
      } catch (notifErr) {
        console.error('[NOTIFICACIÓN ERROR] Error creando notificaciones para el equipo de programación:', notifErr.message);
      }
    } else {
      // Sobrescribir todo para administradores, coordinadores, programadores o si es una planeación nueva
      pedagogicalPlanning.timestamps.updatedAt = new Date();
      planning = await Planning.findOneAndUpdate(
        { 'pedagogicalPlanning.fiche': targetFiche },
        { $set: { pedagogicalPlanning } },
        { upsert: true, new: true }
      );
    }

    // Send detailed email notifications to newly confirmed instructors in the background
    // (Solo si no es el propio instructor el que guarda para evitar spam de correos)
    if (newlyConfirmedActs.length > 0 && !isInstructor) {
      const programName = pedagogicalPlanning.metadata?.programName || 'Programa de Formación';

      // Agrupar actividades por nombre de instructor
      const actsByInstructor = new Map();
      newlyConfirmedActs.forEach(act => {
        const instName = act.instructorName;
        if (!actsByInstructor.has(instName)) {
          actsByInstructor.set(instName, []);
        }
        actsByInstructor.get(instName).push(act);
      });

      (async () => {
        for (const [instName, acts] of actsByInstructor.entries()) {
          try {
            // TAREA 2: Búsqueda tolerante a tildes y capitalización
            // 1) Intento exacto (case-insensitive)
            let inst = await Instructor.findOne({ name: new RegExp(`^${instName}$`, 'i') });
            // 2) Fallback: busca por la primera palabra significativa y verifica con isSameInstructorName
            if (!inst) {
              const normalizedWords = normalizeName(instName).split(/\s+/).filter(w => w.length > 2);
              if (normalizedWords.length > 0) {
                const candidates = await Instructor.find({ name: new RegExp(normalizedWords[0], 'i') });
                inst = candidates.find(c => isSameInstructorName(c.name, instName)) || null;
              }
            }
            if (inst) {
              const emails = [inst.email, inst.emailpersonal].filter(Boolean);

              if (emails.length > 0) {
                console.log(`[EMAIL] Notificando al instructor: ${inst.name} (${emails.join(', ')}) para ficha ${targetFiche} con ${acts.length} actividades.`);

                // Guardar también una notificación en la base de datos para que sea visible en el sistema (por ej. en el panel de notificaciones)
                try {
                  const dbNotif = new Notification({
                    sender: "Coordinación / Planeación",
                    subject: `Nueva planeación pedagógica asignada y confirmada para la Ficha ${targetFiche}`,
                    fiche: targetFiche,
                    recipient: inst.email || null,
                    read: false
                  });
                  await dbNotif.save();
                  console.log(`[NOTIFICACIÓN] Notificación de BD creada para el instructor ${inst.name} en ficha ${targetFiche}`);
                } catch (notifErr) {
                  console.error(`[NOTIFICACIÓN ERROR] Error guardando notificación en BD:`, notifErr.message);
                }

                for (const email of emails) {
                  try {
                    await sendEmail(
                      process.env.FROM_EMAIL,
                      process.env.SECURY_EMAIL,
                      [email],
                      `Nueva Actividad Asignada y Confirmada - Ficha ${targetFiche}`,
                      {
                        name: inst.name,
                        fiche: targetFiche,
                        programName: programName,
                        url: `${process.env.URL_FRONTEND}/`,
                        activities: acts
                      },
                      "./template/planningNotification.hbs"
                    );
                  } catch (err) {
                    console.error(`[EMAIL ERROR] Error enviando a ${email}:`, err.message);
                  }
                }
              } else {
                console.log(`[EMAIL] No se encontraron correos para el instructor: ${instName}`);
              }
            } else {
              console.log(`[EMAIL] No se encontró el instructor para: ${instName}`);
            }
          } catch (emailError) {
            console.error(`[EMAIL ERROR] Error en proceso de notificación para ${instName}:`, emailError.message);
          }
        }
      })();
    }

    res.json({ message: 'Planeación guardada con éxito', data: planning });
  } catch (error) {
    console.error('[UPLOAD ERROR DETAILED]:', error);
    res.status(500).json({ message: 'Error al guardar planeación', error: error.message });
  }
};

export const getPlanningByFiche = async (req, res) => {
  try {
    const { fiche } = req.params;
    const planning = await Planning.findOne({ 'pedagogicalPlanning.fiche': fiche });
    if (!planning) return res.status(404).json({ message: 'No se encontró la planeación' });

    // Restricciones de seguridad por rol de instructor
    const token = req.headers.token || req.headers.authorization;
    let decoded = null;
    let isInstructor = false;
    let instructorName = "";

    if (token) {
      try {
        decoded = await webToken.decodeAnyToken(token);
        if (decoded && (decoded.rol === "INSTRUCTOR" || decoded.isInstructor)) {
          isInstructor = true;
          const inst = await Instructor.findById(decoded.id);
          if (inst) {
            instructorName = inst.name;
          }
        }
      } catch (err) {
        console.error('Error decoding token in getPlanningByFiche:', err.message);
      }
    }

    if (isInstructor && decoded) {
      const emailLower = (decoded.email || "").trim().toLowerCase();
      const leaderEmail = (planning.pedagogicalPlanning?.leaderEmail || "").trim().toLowerCase();
      // Si el instructor es el líder de esta planeación, le devolvemos todo el documento.
      if (leaderEmail && emailLower === leaderEmail) {
        return res.json(planning);
      }

      // Si no es el líder, filtramos el contenido de la planeación
      // para dejar únicamente las competencias, RAPs y actividades que tiene asignadas y confirmadas.
      if (planning.pedagogicalPlanning && planning.pedagogicalPlanning.content) {
        // Convertir el planning a un objeto JS plano para poder modificarlo libremente
        const planningObj = planning.toObject();

        planningObj.pedagogicalPlanning.content = planningObj.pedagogicalPlanning.content.map(phase => {
          if (!phase.competencies) return phase;

          phase.competencies = phase.competencies.map(comp => {
            if (!comp.learningOutcomes) return comp;

            comp.learningOutcomes = comp.learningOutcomes.map(rap => {
              if (!rap.pedagogicalActivities) return rap;

              // Filtrar actividades pedagógicas asignadas y confirmadas para este instructor
              rap.pedagogicalActivities = rap.pedagogicalActivities.filter(act => {
                const sugg = act.suggestedInstructor || act.instructors;
                const isAssigned = sugg && sugg.name && isSameInstructorName(sugg.name, instructorName);
                const isConfirmed = sugg && sugg.assignmentStatus === 'confirmed';
                return isAssigned && isConfirmed;
              });

              return rap;
            }).filter(rap => rap.pedagogicalActivities.length > 0);

            return comp;
          }).filter(comp => comp.learningOutcomes.length > 0);

          return phase;
        }).filter(phase => phase.competencies && phase.competencies.length > 0);

        return res.json(planningObj);
      }
    }

    res.json(planning);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener datos', error: error.message });
  }
};

export const checkPlanningExists = async (req, res) => {
  try {
    const { fiche } = req.params;
    if (!fiche) {
      return res.status(400).json({ message: 'Falta el número de ficha' });
    }

    const existingPlanning = await Planning.findOne({ 'pedagogicalPlanning.fiche': fiche.toString() }).lean();
    const dbFiche = await Fiche.findOne({ number: fiche.toString() }).populate('program').lean();

    res.json({
      existsPlanning: !!existingPlanning,
      existsInDatabase: !!dbFiche,
      planning: existingPlanning
        ? {
          fiche: existingPlanning.pedagogicalPlanning?.fiche || fiche,
          programCode: existingPlanning.pedagogicalPlanning?.metadata?.programCode || '',
          programName: existingPlanning.pedagogicalPlanning?.metadata?.programName || '',
        }
        : null,
      ficheInfo: dbFiche
        ? {
          number: dbFiche.number,
          programCode: dbFiche.program?.code || '',
          programName: dbFiche.program?.name || '',
          startDate: dbFiche.fstart || null,
          endDate: dbFiche.fend || null,
        }
        : null,
    });
  } catch (error) {
    console.error('[CHECK EXISTS ERROR]:', error.message);
    res.status(500).json({ message: 'Error al verificar la ficha', error: error.message });
  }
};

export const extractFromPDFs = async (req, res) => {
  try {
    const { fiche, leaderEmail } = req.body;
    const mergeMode = (req.body.mergeMode || '').toString();
    const confirmedMerge = (req.body.confirmedMerge || '').toString();
    const mergeToken = (req.body.mergeToken || '').toString();

    const programPath = req.files?.programPdf ? path.resolve(req.files.programPdf.tempFilePath) : null;
    const projectPath = req.files?.projectPdf ? path.resolve(req.files.projectPdf.tempFilePath) : null;
    const teamPath = req.files?.teamPdf ? path.resolve(req.files.teamPdf.tempFilePath) : null;

    const cleanup = () => {
      try {
        for (const p of [programPath, projectPath, teamPath]) {
          if (p && fs.existsSync(p)) fs.unlinkSync(p);
        }
        console.log('[CLEANUP] Archivos temporales eliminados');
      } catch (e) { console.error('Error cleanup:', e.message); }
    };

    const savePlanningData = async (planningData) => {
      // GUARDAR O ACTUALIZAR EN BASE DE DATOS
      const finalFiche = resolveFinalFiche(planningData, fiche);
      planningData.pedagogicalPlanning.fiche = finalFiche;
      try {
        if (leaderEmail) {
          planningData.pedagogicalPlanning.leaderEmail = leaderEmail.trim().toLowerCase();
        }

        // Asegurar nombres de competencias para evitar errores en UI
        if (planningData.pedagogicalPlanning.content) {
          planningData.pedagogicalPlanning.content.forEach(phase => {
            if (phase.competencies) {
              phase.competencies.forEach(comp => {
                if (!comp.name) comp.name = `COMPETENCIA ${comp.code || 'SIN CODIGO'}`;
                // cambion efectuado por luis llanos: asegurar que materiales de formación estén presentes en las actividades
                if (comp.learningOutcomes) {
                  comp.learningOutcomes.forEach(rap => {
                    if (rap.pedagogicalActivities) {
                      rap.pedagogicalActivities.forEach(act => {
                        const mats = act.trainingMaterials || act.materials || act.environment?.materials || [];
                        if (mats.length > 0) {
                          act.materials = mats;
                          act.trainingMaterials = mats;
                          if (!act.environment) act.environment = { type: '', materials: [] };
                          act.environment.materials = mats;
                        }
                      });
                    }
                  });
                }
              });
            }
          });
        }

        // Revisar en base de datos si los resultados ya están programados
        const dbFiche = await Fiche.findOne({ number: finalFiche.toString() });
        if (dbFiche) {
          // Copiar fechas de inicio/fin de la ficha si están en blanco en el planning extraído
          if (planningData.pedagogicalPlanning) {
            if (!planningData.pedagogicalPlanning.startDate && dbFiche.fstart) {
              planningData.pedagogicalPlanning.startDate = dbFiche.fstart;
            }
            if (!planningData.pedagogicalPlanning.endDate && dbFiche.fend) {
              planningData.pedagogicalPlanning.endDate = dbFiche.fend;
            }
            if (planningData.pedagogicalPlanning.metadata) {
              if (!planningData.pedagogicalPlanning.metadata.lectivaStartDate && dbFiche.fstart) {
                planningData.pedagogicalPlanning.metadata.lectivaStartDate = dbFiche.fstart;
              }
              if (!planningData.pedagogicalPlanning.metadata.lectivaEndDate && dbFiche.fend) {
                planningData.pedagogicalPlanning.metadata.lectivaEndDate = dbFiche.fend;
              }
            }

            // Traer los datos del programa registrados en la base de datos si faltan
            if (dbFiche.program) {
              const dbProgram = await Program.findById(dbFiche.program).lean();
              if (dbProgram) {
                if (!planningData.pedagogicalPlanning.metadata) {
                  planningData.pedagogicalPlanning.metadata = {};
                }
                if (!planningData.pedagogicalPlanning.metadata.programCode && dbProgram.code) {
                  planningData.pedagogicalPlanning.metadata.programCode = dbProgram.code;
                }
                if (!planningData.pedagogicalPlanning.metadata.programName && dbProgram.name) {
                  planningData.pedagogicalPlanning.metadata.programName = dbProgram.name;
                }
              }
            }
          }

          const schedulesFound = await Schedule.find({ fiche: dbFiche._id })
            .populate("competence")
            .populate("outcome")
            .populate("instructor")
            .lean();

          if (schedulesFound && schedulesFound.length > 0) {
            console.log(`[EXTRACT] Encontradas ${schedulesFound.length} programaciones en Repfora para la ficha ${finalFiche}`);
            if (planningData.pedagogicalPlanning.content) {
              planningData.pedagogicalPlanning.content.forEach(phase => {
                if (phase.competencies) {
                  phase.competencies.forEach(comp => {
                    if (comp.learningOutcomes) {
                      comp.learningOutcomes.forEach(rap => {
                        // Buscar si existe una programación en DB para esta competencia y resultado
                        const matchedSchedules = schedulesFound.filter(sched => {
                          if (!sched.competence || !sched.outcome) return false;

                          // Comparar competencias: primero por código exacto y, si no
                          // coincide, por nombre (los códigos internos de la BD suelen
                          // diferir de los códigos oficiales de 9 dígitos del PDF).
                          const compCodeDb = String(sched.competence.number || '').trim();
                          const compCodePdf = String(comp.code || '').trim();
                          const compNameDb = cleanTextForComparison(sched.competence.name);
                          const compNamePdf = cleanTextForComparison(comp.name);

                          const compMatch =
                            (compCodeDb !== '' && compCodeDb === compCodePdf)
                            || compNameDb === compNamePdf
                            || compNameDb.includes(compNamePdf)
                            || compNamePdf.includes(compNameDb)
                            || getSimilarity(compNameDb, compNamePdf) >= 0.85;

                          if (!compMatch) return false;

                          // Comparar descripciones de resultados de aprendizaje
                          const outcomeTextDb = cleanTextForComparison(sched.outcome.outcomes);
                          const outcomeTextPdf = cleanTextForComparison(rap.description);

                          if (outcomeTextDb === outcomeTextPdf) return true;
                          if (outcomeTextDb.includes(outcomeTextPdf) || outcomeTextPdf.includes(outcomeTextDb)) return true;

                          const sim = getSimilarity(outcomeTextDb, outcomeTextPdf);
                          return sim >= 0.85;
                        });

                        if (matchedSchedules && matchedSchedules.length > 0) {
                          console.log(`[EXTRACT] Mapeando ${matchedSchedules.length} programación(es) para RAP: "${rap.description.substring(0, 30)}..."`);
                          if (rap.pedagogicalActivities) {
                            matchedSchedules.forEach((matchedSchedule, schedIdx) => {
                              const targetAct = rap.pedagogicalActivities[schedIdx];
                              if (!targetAct) return;

                              // Convertir las fechas UTC de eventos de la programación al formato YYYY-MM-DD
                              const assignedDays = (matchedSchedule.events || [])
                                .map(evt => formatDateToYYYYMMDD(evt))
                                .filter(Boolean);

                              targetAct.isScheduledInCalendar = true;

                              if (matchedSchedule.instructor) {
                                targetAct.suggestedInstructor = {
                                  id: matchedSchedule.instructor._id.toString(),
                                  name: matchedSchedule.instructor.name,
                                  type: matchedSchedule.instructor.bindingtype || '',
                                  assignmentStatus: 'confirmed'
                                };
                              }

                              const startDateStr = formatDateDMY(matchedSchedule.fstart);
                              const endDateStr = formatDateDMY(matchedSchedule.fend);

                              targetAct.scheduleDetails = {
                                assignedDays: assignedDays,
                                shift: matchedSchedule.tstart ? getShiftFromTime(matchedSchedule.tstart) : null,
                                tstart: matchedSchedule.tstart || null,
                                tend: matchedSchedule.tend || null,
                                hoursPerDay: matchedSchedule.hourswork || 0,
                                calendarNotes: `Programado del ${startDateStr} al ${endDateStr}`,
                                isPublished: true
                              };
                            });
                          }
                        }
                      });
                    }
                  });
                }
              });
            }
          }
        }

        if (!planningData.pedagogicalPlanning.timestamps) {
          planningData.pedagogicalPlanning.timestamps = {};
        }
        planningData.pedagogicalPlanning.timestamps.updatedAt = new Date();

        const existingPlanning = await Planning.findOne({ 'pedagogicalPlanning.fiche': finalFiche });

        let planning;
        let programCorrected = false;
        if (existingPlanning && mergeMode !== 'overwrite') {
          // La planeación ya existe en Repfora.
          const incomingPp = planningData.pedagogicalPlanning || {};
          const existingPp = existingPlanning.pedagogicalPlanning || {};

          const isPlaceholderCode = (v) => !v || String(v).trim() === '000000';
          const incomingCode = String(incomingPp.metadata?.programCode || '').trim();
          const existingCode = String(existingPp.metadata?.programCode || '').trim();
          const programChanged = !isPlaceholderCode(incomingCode)
            && (isPlaceholderCode(existingCode) || incomingCode !== existingCode);

          if (programChanged) {
            // La re-extracción detectó un programa distinto al guardado (la planeación
            // previa quedó con datos incorrectos, ej. el programa equivocado).
            // Se reemplaza el contenido completo por el recién extraído (que además
            // ya viene enriquecido con fechas, datos del programa y programaciones
            // de la BD) y se conserva el líder de la planeación.
            const keptLeader = existingPp.leaderEmail || incomingPp.leaderEmail;
            const prevCreatedAt = existingPp.timestamps?.createdAt;
            existingPlanning.pedagogicalPlanning = JSON.parse(JSON.stringify(incomingPp));
            if (keptLeader) existingPlanning.pedagogicalPlanning.leaderEmail = keptLeader;
            if (!existingPlanning.pedagogicalPlanning.timestamps) {
              existingPlanning.pedagogicalPlanning.timestamps = {};
            }
            if (prevCreatedAt) {
              existingPlanning.pedagogicalPlanning.timestamps.createdAt = prevCreatedAt;
            }
            existingPlanning.pedagogicalPlanning.timestamps.updatedAt = new Date();
            existingPlanning.markModified('pedagogicalPlanning');
            await existingPlanning.save();
            planning = existingPlanning;
            programCorrected = true;
            console.log(`[EXTRACT] Programa corregido para ficha ${finalFiche} (${existingCode || 'vacío'} -> ${incomingCode}): planeación reemplazada conservando el líder`);
          } else {
            // Mismo programa: NO sobrescribir. Completar únicamente la información
            // que falta para no borrar asignaciones ni programaciones.
            fillMissingIntoExistingPlanning(existingPlanning, planningData);
            existingPlanning.markModified('pedagogicalPlanning');
            await existingPlanning.save();
            planning = existingPlanning;
            console.log(`[EXTRACT] Fusión completando faltantes para la ficha ${finalFiche}`);
          }
        } else {
          planning = await Planning.findOneAndUpdate(
            { 'pedagogicalPlanning.fiche': finalFiche },
            { $set: planningData },
            { upsert: true, new: true }
          );
        }

        cleanup();
        console.log(`[EXTRACT] Éxito para ficha ${finalFiche} (planeación ya existente: ${!!existingPlanning}, programa corregido: ${programCorrected})`);
        return res.json({
          message: programCorrected
            ? 'La planeación tenía un programa incorrecto y fue reemplazada con la información extraída'
            : existingPlanning
              ? 'La planeación ya existía y se completó con la información extraída'
              : 'Éxito',
          data: planning,
          finalFiche,
          mergedIntoExistingPlanning: !!existingPlanning,
          programCorrected
        });
      } catch (dbError) {
        cleanup();
        console.error('[ERROR] Error al guardar en BD:', dbError.message);
        return res.status(500).json({ message: 'Error al guardar datos extraídos', error: dbError.message });
      }
    };

    // FASE 2: el usuario ya confirmó la fusión; se reutilizan los datos extraídos
    // sin necesidad de volver a ejecutar el extractor de PDFs.
    if (mergeToken && extractPendingConfirmations.has(mergeToken)) {
      const planningData = extractPendingConfirmations.get(mergeToken);
      extractPendingConfirmations.delete(mergeToken);
      return await savePlanningData(planningData);
    }

    if (!req.files || !req.files.programPdf || !req.files.projectPdf) {
      return res.status(400).json({ message: 'Faltan archivos esenciales (Programa y Proyecto)' });
    }

    const scriptsDir = path.resolve(__dirname, '../scripts');
    const extractorPath = path.join(scriptsDir, 'extractor.py');

    console.log(`[EXTRACT] Iniciando para ficha ${fiche}. Equipo Ejecutor: ${teamPath ? 'SÍ' : 'NO'}`);

    // Construir comando dinámico
    const pyCmd = process.platform === 'win32' ? 'py' : 'python3';
    let command = teamPath
      ? `${pyCmd} "${extractorPath}" "${programPath}" "${projectPath}" "${teamPath}" "${fiche}"`
      : `${pyCmd} "${extractorPath}" "${programPath}" "${projectPath}" "${fiche}"`;

    exec(command, { timeout: 120000 }, async (error, stdout, stderr) => {
      if (error) {
        cleanup();
        console.error('[ERROR] Extractor:', stderr || error.message);
        return res.status(500).json({ message: 'Error en la extracción', error: stderr || error.message });
      }

      // CAPTURAR JSON DESDE STDOUT (Sincrónico y Seguro)
      let planningData = null;
      const jsonMatch = stdout.match(/---JSON_START---([\s\S]*?)---JSON_END---/);
      if (jsonMatch) {
        try {
          planningData = JSON.parse(jsonMatch[1].trim());
        } catch (e) {
          console.error('[ERROR] Falló el parseo del JSON extraído:', e.message);
        }
      }

      if (!planningData) {
        cleanup();
        return res.status(500).json({ message: 'No se extrajeron datos válidos del PDF', stdout });
      }

      const finalFiche = resolveFinalFiche(planningData, fiche);
      planningData.pedagogicalPlanning.fiche = finalFiche;

      // FASE 1: la ficha se detecta desde el PDF del Equipo Ejecutor (extractor).
      // Si ya tiene información en Repfora (planeación, ficha en BD u horarios activos),
      // NO se guarda todavía: se devuelve el estado al frontend para que muestre las
      // alertas de confirmación ("La planeación ya existe" / "La ficha ya está registrada").
      // El frontend reenvía con confirmedMerge + mergeToken (FASE 2) para guardar.
      // NOTA: se confirma SIEMPRE (incluso en modo 'fill-missing') para que el modal
      // de validación se muestre y espere la respuesta del usuario.
      if (!confirmedMerge && mergeMode !== 'overwrite') {
        const existingPlanningCheck = await Planning.findOne({ 'pedagogicalPlanning.fiche': finalFiche.toString() }).lean();
        const dbFicheCheck = await Fiche.findOne({ number: finalFiche.toString() }).populate('program').lean();
        const schedulesCount = dbFicheCheck ? await Schedule.countDocuments({ fiche: dbFicheCheck._id, status: 0 }) : 0;

        if (existingPlanningCheck || dbFicheCheck || schedulesCount > 0) {
          const token = crypto.randomUUID();
          extractPendingConfirmations.set(token, JSON.parse(JSON.stringify(planningData)));
          setTimeout(() => extractPendingConfirmations.delete(token), 10 * 60 * 1000);

          cleanup();
          console.log(`[EXTRACT] Confirmación requerida para ficha ${finalFiche} (planeación: ${!!existingPlanningCheck}, ficha: ${!!dbFicheCheck}, horarios activos: ${schedulesCount})`);
          return res.status(409).json({
            code: 'MERGE_CONFIRMATION_REQUIRED',
            message: 'La ficha ya tiene información en Repfora. Confirma para continuar con la extracción.',
            mergeToken: token,
            fiche: finalFiche,
            existsPlanning: !!existingPlanningCheck,
            existsInDatabase: !!dbFicheCheck,
            schedulesCount,
            programName:
              existingPlanningCheck?.pedagogicalPlanning?.metadata?.programName
              || dbFicheCheck?.program?.name
              || ''
          });
        }
      }

      return await savePlanningData(planningData);
    });
  } catch (err) {
    console.error('[ERROR GLOBAL]:', err.message);
    res.status(500).json({ message: 'Error interno del servidor', error: err.message });
  }
};

export const getAllPlannings = async (req, res) => {
  try {
    const token = req.headers.token || req.headers.authorization;
    let decoded = null;
    let isInstructor = false;
    let instructorName = "";

    if (token) {
      try {
        decoded = await webToken.decodeAnyToken(token);
        if (decoded && (decoded.rol === "INSTRUCTOR" || decoded.isInstructor)) {
          isInstructor = true;
          const inst = await Instructor.findById(decoded.id);
          if (inst) {
            instructorName = inst.name;
          }
        }
      } catch (err) {
        console.error('Error decoding token in getAllPlannings:', err.message);
      }
    }

    if (isInstructor && decoded) {
      const emailLower = (decoded.email || "").trim().toLowerCase();

      // Traer todas las planeaciones con el contenido necesario para filtrar en memoria
      const allPlannings = await Planning.find(
        {},
        {
          'pedagogicalPlanning.metadata': 1,
          'pedagogicalPlanning.fiche': 1,
          'pedagogicalPlanning.leaderEmail': 1,
          'pedagogicalPlanning.content': 1
        }
      ).lean();

      // Filtrar en Node.js — garantiza que nombre Y confirmación sean del mismo subdocumento
      const filtered = allPlannings.filter(plan => {
        const p = plan.pedagogicalPlanning;

        // Si es el líder de esta planeación, siempre la ve
        if (emailLower && p.leaderEmail && p.leaderEmail.trim().toLowerCase() === emailLower) {
          return true;
        }

        // Si tiene al menos una actividad confirmada con su nombre
        if (instructorName && p.content) {
          return p.content.some(phase =>
            (phase.competencies || []).some(comp =>
              (comp.learningOutcomes || []).some(rap =>
                (rap.pedagogicalActivities || []).some(act => {
                  const sugg = act.suggestedInstructor || act.instructors;
                  return sugg &&
                    isSameInstructorName(sugg.name, instructorName) &&
                    sugg.assignmentStatus === 'confirmed';
                })
              )
            )
          );
        }

        return false;
      });

      return res.json(filtered.map(plan => ({
        _id: plan._id,
        pedagogicalPlanning: {
          fiche: plan.pedagogicalPlanning.fiche,
          metadata: plan.pedagogicalPlanning.metadata
        }
      })));
    }

    // Para programadores, coordinadores y admins: devolver todo sin filtro.
    // Se incluye el contenido para que las vistas (SchedulerView, Pedagogías)
    // puedan calcular estados, progreso y cantidad de actividades confirmadas
    // por ficha desde el listado.
    const plannings = await Planning.find({}, {
      'pedagogicalPlanning.metadata': 1,
      'pedagogicalPlanning.fiche': 1,
      'pedagogicalPlanning.content': 1
    });
    res.json(plannings);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener planeaciones', error: error.message });
  }
};

export const scheduleOutcomeInCalendar = async (req, res) => {
  try {
    const { planningId, phaseIndex, competenceIndex, rapIndex, activityIndex } = req.body;
    // Si recibimos formato de índices (nuevo flujo del frontend en SchedulerView)
    if (planningId !== undefined && phaseIndex !== undefined) {
      const planning = await Planning.findById(planningId);
      if (!planning) return res.status(404).json({ message: 'Planeación no encontrada' });

      const phase = planning.pedagogicalPlanning.content[phaseIndex];
      const comp = phase?.competencies[competenceIndex];
      const rap = comp?.learningOutcomes[rapIndex];
      const act = rap?.pedagogicalActivities[activityIndex];

      if (!act) return res.status(404).json({ message: 'Actividad o resultado no encontrado' });

      const sugg = act.suggestedInstructor || act.instructors;
      if (!sugg || sugg.assignmentStatus !== 'confirmed') {
        return res.status(400).json({ message: 'El instructor asignado debe estar CONFIRMADO para poder programar este resultado.' });
      }

      // Marcar como oficialmente programado y publicado
      act.isScheduledInCalendar = true;
      if (!act.scheduleDetails) {
        act.scheduleDetails = {};
      }
      act.scheduleDetails.isPublished = true;

      try {
        // Importar modelos necesarios de forma dinámica para evitar referencias circulares
        const ScheduleModel = (await import('../models/Schedule.js')).default;
        const EnvironmentModel = (await import('../models/Environment.js')).default;
        const FicheModel = (await import('../models/Fiche.js')).default;
        const ProgramModel = (await import('../models/Program.js')).default;
        const CompetenceModel = (await import('../models/Competence.js')).default;
        const OutcomeModel = (await import('../models/Outcome.js')).default;

        const dbFiche = await FicheModel.findOne({ number: planning.pedagogicalPlanning.fiche });
        const dbProgram = await ProgramModel.findOne({ code: planning.pedagogicalPlanning.metadata.programCode });
        let dbCompetence = await CompetenceModel.findOne({ number: comp.code });
        if (!dbCompetence && dbProgram) {
          const programCompetences = await CompetenceModel.find({ program: dbProgram._id });
          let bestComp = null;
          let bestCompSim = 0;
          for (const c of programCompetences) {
            const sim = getSimilarity(c.name, comp.name);
            if (sim > bestCompSim) {
              bestCompSim = sim;
              bestComp = c;
            }
          }
          if (bestComp && bestCompSim >= 0.8) {
            dbCompetence = bestComp;
            console.log(`[SIMILARITY MATCH] Mapped competence "${comp.name}" to "${dbCompetence.name}" (Similarity: ${bestCompSim})`);
          }
        }

        // Fallback global para competencias transversales (ej. Inglés) que no están asociadas al ID de este programa
        if (!dbCompetence) {
          const globalCompetences = await CompetenceModel.find({});
          let bestComp = null;
          let bestCompSim = 0;
          for (const c of globalCompetences) {
            const sim = getSimilarity(c.name, comp.name);
            if (sim > bestCompSim) {
              bestCompSim = sim;
              bestComp = c;
            }
          }
          if (bestComp && bestCompSim >= 0.8) {
            dbCompetence = bestComp;
            console.log(`[GLOBAL SIMILARITY MATCH] Mapped competence "${comp.name}" to "${dbCompetence.name}" (Similarity: ${bestCompSim})`);
          }
        }

        // Fallback global para competencias transversales (ej. Inglés) que no están asociadas al ID de este programa
        if (!dbCompetence) {
          const globalCompetences = await CompetenceModel.find({});
          let bestComp = null;
          let bestCompSim = 0;
          for (const c of globalCompetences) {
            const sim = getSimilarity(c.name, comp.name);
            if (sim > bestCompSim) {
              bestCompSim = sim;
              bestComp = c;
            }
          }
          if (bestComp && bestCompSim >= 0.8) {
            dbCompetence = bestComp;
            console.log(`[GLOBAL SIMILARITY MATCH] Mapped competence "${comp.name}" to "${dbCompetence.name}" (Similarity: ${bestCompSim})`);
          }
        }

        let dbOutcome = null;
        if (dbCompetence && rap && rap.description) {
          dbOutcome = await OutcomeModel.findOne({ outcomes: rap.description, competence: dbCompetence._id });
          if (!dbOutcome) {
            const competenceOutcomes = await OutcomeModel.find({ competence: dbCompetence._id });
            let bestOutcome = null;
            let bestOutcomeSim = 0;
            for (const o of competenceOutcomes) {
              const sim = getSimilarity(o.outcomes, rap.description);
              if (sim > bestOutcomeSim) {
                bestOutcomeSim = sim;
                bestOutcome = o;
              }
            }
            if (bestOutcome && bestOutcomeSim >= 0.8) {
              dbOutcome = bestOutcome;
              console.log(`[SIMILARITY MATCH] Mapped outcome "${rap.description.substring(0, 50)}..." to "${dbOutcome.outcomes.substring(0, 50)}..." (Similarity: ${bestOutcomeSim})`);
            }
          }
        }

        // Fallback para evitar guardar resultados indefinidos en la base de datos de programaciones
        if (!dbOutcome && dbCompetence) {
          const competenceOutcomes = await OutcomeModel.find({ competence: dbCompetence._id });
          if (competenceOutcomes.length > 0) {
            dbOutcome = competenceOutcomes[0];
            console.log(`[OUTCOME FALLBACK] Using first outcome of competence: "${dbOutcome.outcomes}"`);
          }
        }

        if (dbFiche && dbProgram && sugg && sugg.id) {
          const events = (act.scheduleDetails.assignedDays || []).map(d => new Date(`${d}T00:00:00.000Z`));

          if (events.length > 0) {
            let envId = null;
            if (act.environment && act.environment.type) {
              const envName = act.environment.type.trim();
              // 1) Intentar coincidencia exacta insensible a mayúsculas
              let dbEnv = await EnvironmentModel.findOne({ name: new RegExp(`^${escapeRegExp(envName)}$`, 'i') });

              // 2) Fallback: Buscar por similitud de nombres si no fue exacto
              if (!dbEnv) {
                const allEnvs = await EnvironmentModel.find({});
                let bestEnv = null;
                let bestEnvSim = 0;
                for (const e of allEnvs) {
                  const sim = getSimilarity(e.name, envName);
                  if (sim > bestEnvSim) {
                    bestEnvSim = sim;
                    bestEnv = e;
                  }
                }
                if (bestEnv && bestEnvSim >= 0.8) {
                  dbEnv = bestEnv;
                  console.log(`[SIMILARITY MATCH] Mapped environment "${envName}" to "${dbEnv.name}" (Similarity: ${bestEnvSim})`);
                }
              }

              if (dbEnv) {
                envId = dbEnv._id;
              }
            }

            // Fallback total: si no se encontró, asignar el primero disponible en el sistema
            if (!envId) {
              const dbEnvFallback = await EnvironmentModel.findOne();
              if (dbEnvFallback) envId = dbEnvFallback._id;
            }

            let tstart = "06:00", tend = "12:00";
            if (act.scheduleDetails.shift === "nocturna") { tstart = "18:00"; tend = "22:00"; }
            else if (act.scheduleDetails.shift === "diurna") { tstart = "06:00"; tend = "18:00"; }
            else if (act.scheduleDetails.shift === "mixta") { tstart = "06:00"; tend = "14:00"; }

            if (act.scheduleDetails.tstart) tstart = act.scheduleDetails.tstart;
            if (act.scheduleDetails.tend) tend = act.scheduleDetails.tend;

            // Dejar inactivo el horario previo generado desde planeación para esta
            // misma actividad (sin importar el instructor), para no duplicar el
            // horario si el programador vuelve a presionar "Registrar en el
            // Calendario de Horarios". Los horarios creados por el módulo clásico
            // de horarios (otra observación) no se tocan.
            const supportText = act.description || act.observations || 'PLANEACIÓN PEDAGÓGICA';
            await ScheduleModel.updateMany(
              {
                fiche: dbFiche._id,
                ...(dbCompetence ? { competence: dbCompetence._id } : {}),
                ...(dbOutcome ? { outcome: dbOutcome._id } : {}),
                observation: 'Generado desde el módulo de planeación',
                status: 0,
                $or: [
                  { supporttext: supportText },
                  { fstart: events[0], fend: events[events.length - 1] },
                ],
              },
              { $set: { status: 1 } }
            );
            
            const newSchedule = new ScheduleModel({
              fiche: dbFiche._id,
              program: dbProgram._id,
              competence: dbCompetence ? dbCompetence._id : undefined,
              outcome: dbOutcome ? dbOutcome._id : undefined,
              instructor: sugg.id,
              supporttext: supportText,
              observation: 'Generado desde el módulo de planeación',
              environment: envId, // Placeholder, ya que en planeación no se captura
              days: [1, 2, 3, 4, 5],
              fstart: events[0],
              fend: events[events.length - 1],
              tstart,
              tend,
              hourswork: act.hours?.direct || 0,
              events: events,
              scheduleType: "TITULADA"
            });
            await newSchedule.save();
          }
        }
      } catch (err) {
        console.error('[SYNC SCHEDULE ERROR]:', err);
      }

      await planning.save();
      return res.json({ message: '¡Resultado programado con éxito en el calendario oficial!', data: planning });
    }

    // Flujo alternativo/fallback
    const { fiche, phaseId, competenceCode, outcomeDesc, scheduleData } = req.body;

    if (!fiche || !phaseId || !competenceCode || !outcomeDesc || !scheduleData) {
      return res.status(400).json({
        message: 'Faltan parámetros requeridos: se necesitan fiche, phaseId, competenceCode, outcomeDesc y scheduleData'
      });
    }

    const planning = await Planning.findOne({ 'pedagogicalPlanning.fiche': fiche });
    if (!planning) return res.status(404).json({ message: 'Planeación no encontrada' });

    const phase = planning.pedagogicalPlanning.content.find(p => p.phase === phaseId);
    if (!phase) return res.status(404).json({ message: `Fase '${phaseId}' no encontrada` });

    const comp = phase.competencies.find(c => c.code === competenceCode);
    if (!comp) return res.status(404).json({ message: `Competencia '${competenceCode}' no encontrada en la fase '${phaseId}'` });

    // Comparación robusta insensible a mayúsculas, minúsculas y espacios laterales
    const outcome = comp.learningOutcomes.find(
      o => o.description.trim().toUpperCase() === outcomeDesc.trim().toUpperCase()
    );
    if (!outcome) return res.status(404).json({ message: 'Resultado de aprendizaje no encontrado en esta competencia' });

    if (outcome.pedagogicalActivities && outcome.pedagogicalActivities[0]) {
      // Inicializar scheduleDetails si no existe
      if (!outcome.pedagogicalActivities[0].scheduleDetails) {
        outcome.pedagogicalActivities[0].scheduleDetails = {};
      }
      // Fusionar los datos de programación de forma segura
      outcome.pedagogicalActivities[0].scheduleDetails = {
        ...outcome.pedagogicalActivities[0].scheduleDetails,
        ...scheduleData,
        isPublished: scheduleData.isPublished !== undefined ? scheduleData.isPublished : true
      };

      // Si se está programando, marcar el flag de calendarizado en la raíz de la actividad
      outcome.pedagogicalActivities[0].isScheduledInCalendar = true;
    }

    await planning.save();
    res.json({ message: 'Calendario actualizado con éxito', data: planning });
  } catch (error) {
    console.error('[SCHEDULE OUTCOME ERROR]:', error.message);
    res.status(500).json({ message: 'Error al programar el resultado', error: error.message });
  }
};

export const savePlanningTemplate = async (req, res) => {
  try {
    const { programCode, programName, content, savedBy } = req.body;

    if (!programCode || !programName) {
      return res.status(400).json({ message: 'Faltan datos obligatorios: programCode y programName son requeridos' });
    }

    const template = await PlanningTemplate.findOneAndUpdate(
      { programCode },
      {
        programCode,
        programName,
        content: content || [],
        savedBy: savedBy || '',
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.json({ message: 'Plantilla guardada correctamente', data: template });
  } catch (error) {
    res.status(500).json({ message: 'Error al guardar la plantilla', error: error.message });
  }
};

export const getPlanningTemplate = async (req, res) => {
  try {
    const { programCode } = req.params;

    if (!programCode) {
      return res.status(400).json({ message: 'Falta el código de programa' });
    }

    const template = await PlanningTemplate.findOne({ programCode });

    if (!template) {
      return res.status(404).json({ message: 'No existe una plantilla para este código de programa' });
    }

    res.json(template);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la plantilla', error: error.message });
  }
};

/**
 * Aplica una plantilla de programa a la planeación de una ficha específica.
 * Solo agrega fases/competencias/RAPs/actividades que NO existen todavía.
 * NO modifica instructores ni confirmaciones ya establecidas.
 * POST /api/planning/apply-template/:fiche
 * Body: { programCode: string }
 */
export const applyPlanningTemplate = async (req, res) => {
  try {
    const { fiche } = req.params;
    const { programCode } = req.body;

    if (!fiche || !programCode) {
      return res.status(400).json({ message: 'fiche y programCode son obligatorios' });
    }

    const template = await PlanningTemplate.findOne({ programCode });
    if (!template) {
      return res.status(404).json({ message: 'No existe plantilla guardada para este programa' });
    }

    const planning = await Planning.findOne({ 'pedagogicalPlanning.fiche': fiche });
    if (!planning) {
      return res.status(404).json({ message: 'No se encontró la planeación para esta ficha' });
    }

    const existingContent = planning.pedagogicalPlanning.content || [];

    // Helper: clona una actividad eliminando la asignación de instructor y restableciendo horas a 0
    const cleanActivity = (act) => ({
      ...JSON.parse(JSON.stringify(act)),
      hours: { direct: 0, independent: 0 },
      suggestedInstructor: { id: '', name: '', type: '', assignmentStatus: 'pending' },
      isScheduledInCalendar: false,
      scheduleDetails: { isPublished: false },
    });

    for (const templatePhase of template.content) {
      const existingPhase = existingContent.find(p => p.phase === templatePhase.phase);

      if (!existingPhase) {
        // La fase entera no existe: agregarla sin asignaciones de instructor
        const newPhase = JSON.parse(JSON.stringify(templatePhase));
        newPhase.competencies = (newPhase.competencies || []).map(comp => ({
          ...comp,
          learningOutcomes: (comp.learningOutcomes || []).map(rap => ({
            ...rap,
            pedagogicalActivities: (rap.pedagogicalActivities || []).map(cleanActivity),
          })),
        }));
        existingContent.push(newPhase);
        continue;
      }

      // La fase existe: revisar competencias
      for (const templateComp of templatePhase.competencies || []) {
        const existingComp = existingPhase.competencies?.find(c => c.code === templateComp.code);

        if (!existingComp) {
          // Competencia no existe: agregarla sin asignaciones
          const newComp = JSON.parse(JSON.stringify(templateComp));
          newComp.learningOutcomes = (newComp.learningOutcomes || []).map(rap => ({
            ...rap,
            pedagogicalActivities: (rap.pedagogicalActivities || []).map(cleanActivity),
          }));
          if (!existingPhase.competencies) existingPhase.competencies = [];
          existingPhase.competencies.push(newComp);
          continue;
        }

        // Competencia existe: revisar RAPs
        for (const templateRap of templateComp.learningOutcomes || []) {
          const existingRap = existingComp.learningOutcomes?.find(
            r => r.description.trim().toUpperCase() === templateRap.description.trim().toUpperCase()
          );

          if (!existingRap) {
            // RAP no existe: agregarlo sin asignaciones
            const newRap = JSON.parse(JSON.stringify(templateRap));
            newRap.pedagogicalActivities = (newRap.pedagogicalActivities || []).map(cleanActivity);
            if (!existingComp.learningOutcomes) existingComp.learningOutcomes = [];
            existingComp.learningOutcomes.push(newRap);
          } else {
            // Si el RAP ya existe, pero solo tiene la actividad por defecto vacía, la sobrescribimos con las del template
            const hasOnlyDefaultEmpty = !existingRap.pedagogicalActivities ||
              existingRap.pedagogicalActivities.length === 0 ||
              (existingRap.pedagogicalActivities.length === 1 &&
                (!existingRap.pedagogicalActivities[0].description ||
                  existingRap.pedagogicalActivities[0].description === 'Actividad sin descripción' ||
                  existingRap.pedagogicalActivities[0].description.trim() === '') &&
                !existingRap.pedagogicalActivities[0].suggestedInstructor?.id &&
                (Number(existingRap.pedagogicalActivities[0].hours?.direct) || 0) === 0
              );

            if (hasOnlyDefaultEmpty && templateRap.pedagogicalActivities && templateRap.pedagogicalActivities.length > 0) {
              existingRap.pedagogicalActivities = templateRap.pedagogicalActivities.map(cleanActivity);
            }
          }
        }
      }
    }

    planning.pedagogicalPlanning.content = existingContent;
    if (!planning.pedagogicalPlanning.timestamps) {
      planning.pedagogicalPlanning.timestamps = {};
    }
    planning.pedagogicalPlanning.timestamps.updatedAt = new Date();
    planning.markModified('pedagogicalPlanning.content');
    await planning.save();

    res.json({ message: 'Plantilla aplicada correctamente', data: planning });
  } catch (error) {
    res.status(500).json({ message: 'Error al aplicar la plantilla', error: error.message });
  }
};

// implementacion de luis llanos (guarda comentario en actividad pedagogica y notifica por email al creador y al instructor del RAP)
/**
 * Guarda un comentario en una actividad pedagógica específica y envía notificaciones por correo
 * tanto al creador del comentario como al instructor responsable del resultado de aprendizaje.
 */
export const addActivityComment = async (req, res) => {
  try {
    const { fiche } = req.params;
    const {
      phase,
      compCode,
      compName,
      rapDesc,
      actDesc,
      activityIndex,
      responsibleInstructor,
      comment
    } = req.body;

    if (!fiche) {
      return res.status(400).json({ message: 'Falta el número de ficha' });
    }
    if (!comment || !comment.text || !comment.text.trim()) {
      return res.status(400).json({ message: 'El comentario no puede estar vacío' });
    }

    // 1. Obtener datos del usuario desde el token JWT
    const token = req.headers.token || req.headers.authorization;
    let decoded = null;
    if (token) {
      try {
        decoded = await webToken.decodeAnyToken(token);
      } catch (err) {
        console.warn('Error decodificando token en addActivityComment:', err.message);
      }
    }

    const authorName = comment.author || decoded?.name || decoded?.nombre || 'Usuario REPFORA';
    const authorEmail = (comment.authorEmail || decoded?.email || '').trim().toLowerCase();
    const authorRole = (comment.role || decoded?.rol || 'USUARIO').toUpperCase();

    const formattedComment = {
      id: comment.id || ('comm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)),
      text: comment.text.trim(),
      author: authorName,
      authorEmail: authorEmail,
      role: authorRole,
      createdAt: comment.createdAt || new Date().toISOString()
    };

    // 2. Cargar planeación pedagógica
    const planningDoc = await Planning.findOne({ 'pedagogicalPlanning.fiche': fiche });
    if (!planningDoc || !planningDoc.pedagogicalPlanning) {
      return res.status(404).json({ message: `Planeación no encontrada para la ficha ${fiche}` });
    }

    const programName = planningDoc.pedagogicalPlanning.metadata?.programName || 'Programa de Formación';

    // 3. Localizar la actividad en el árbol de contenido
    let activityFound = null;
    let fallbackActivity = null;
    let targetInstructorName = responsibleInstructor || '';

    if (Array.isArray(planningDoc.pedagogicalPlanning.content)) {
      for (const p of planningDoc.pedagogicalPlanning.content) {
        if (phase && p.phase !== phase) continue;
        if (!Array.isArray(p.competencies)) continue;

        for (const c of p.competencies) {
          if (compCode && c.code !== compCode) continue;
          if (!Array.isArray(c.learningOutcomes)) continue;

          for (const r of c.learningOutcomes) {
            const rapMatch = !rapDesc || cleanTextForComparison(r.description) === cleanTextForComparison(rapDesc);
            if (!rapMatch) continue;
            if (!Array.isArray(r.pedagogicalActivities)) continue;

            if (!fallbackActivity && r.pedagogicalActivities.length > 0) {
              fallbackActivity = r.pedagogicalActivities[0];
            }

            // Si se suministró índice
            if (typeof activityIndex === 'number' && r.pedagogicalActivities[activityIndex]) {
              activityFound = r.pedagogicalActivities[activityIndex];
              break;
            }

            // Búsqueda por descripción
            for (const a of r.pedagogicalActivities) {
              if (actDesc && cleanTextForComparison(a.description || a.observations) === cleanTextForComparison(actDesc)) {
                activityFound = a;
                break;
              }
            }

            if (!activityFound && r.pedagogicalActivities.length === 1) {
              activityFound = r.pedagogicalActivities[0];
            }

            if (activityFound) break;
          }
          if (activityFound) break;
        }
        if (activityFound) break;
      }
    }

    const finalActivity = activityFound || fallbackActivity;
    if (!finalActivity) {
      return res.status(404).json({ message: 'No se encontró la actividad en la planeación pedagógica' });
    }

    if (!Array.isArray(finalActivity.comments)) {
      finalActivity.comments = [];
    }
    finalActivity.comments.push(formattedComment);

    if (!targetInstructorName) {
      targetInstructorName = finalActivity.responsibleInstructor?.name
        || (typeof finalActivity.responsibleInstructor === 'string' ? finalActivity.responsibleInstructor : '')
        || finalActivity.suggestedInstructor?.name
        || finalActivity.instructors?.name
        || '';
    }

    if (!planningDoc.pedagogicalPlanning.timestamps) {
      planningDoc.pedagogicalPlanning.timestamps = {};
    }
    planningDoc.pedagogicalPlanning.timestamps.updatedAt = new Date();
    planningDoc.markModified('pedagogicalPlanning.content');
    await planningDoc.save();

    // 4. Buscar información del instructor responsable en BD
    let instructorEmail = '';
    let foundInstructor = null;

    if (targetInstructorName) {
      foundInstructor = await Instructor.findOne({ name: new RegExp(`^${targetInstructorName.trim()}$`, 'i') });
      if (!foundInstructor) {
        const words = normalizeName(targetInstructorName).split(/\s+/).filter(w => w.length > 2);
        if (words.length > 0) {
          const candidates = await Instructor.find({ name: new RegExp(words[0], 'i') });
          foundInstructor = candidates.find(c => isSameInstructorName(c.name, targetInstructorName)) || null;
        }
      }
      if (foundInstructor) {
        instructorEmail = (foundInstructor.email || foundInstructor.emailpersonal || '').trim().toLowerCase();
      }
    }

    // 5. Destinatarios de correo
    const emailsToNotify = [];
    if (authorEmail && authorEmail.includes('@')) {
      emailsToNotify.push({
        email: authorEmail,
        recipientName: authorName,
        isAuthor: true
      });
    }

    if (instructorEmail && instructorEmail.includes('@')) {
      // Si el instructor responsable es diferente al autor del comentario, se agrega a la lista
      if (instructorEmail !== authorEmail) {
        emailsToNotify.push({
          email: instructorEmail,
          recipientName: foundInstructor?.name || targetInstructorName || 'Instructor',
          isAuthor: false
        });
      }
    }

    // 6. Envío de correos asíncrono
    if (emailsToNotify.length > 0 && process.env.FROM_EMAIL && process.env.SECURY_EMAIL) {
      const emailBasePayload = {
        fiche,
        programName,
        phase: phase || '—',
        competenceCode: compCode || '—',
        competenceName: compName || '—',
        rapDescription: rapDesc || '—',
        activityDescription: actDesc || finalActivity.description || '—',
        instructorName: targetInstructorName || 'Sin asignar',
        authorName,
        authorRole,
        commentText: formattedComment.text,
        date: new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
        url: `${process.env.URL_FRONTEND || 'http://localhost:3000'}/#/pedagogias`
      };

      for (const dest of emailsToNotify) {
        const subject = dest.isAuthor
          ? `Copia: Registraste un comentario en la Ficha ${fiche}`
          : `Nueva Observación en tu RAP - Ficha ${fiche} (${authorName})`;

        sendEmail(
          process.env.FROM_EMAIL,
          process.env.SECURY_EMAIL,
          [dest.email],
          subject,
          {
            ...emailBasePayload,
            recipientName: dest.recipientName
          },
          "./template/commentNotification.hbs"
        ).catch(mailErr => {
          console.error(`[EMAIL ERROR] Error enviando notificación de comentario a ${dest.email}:`, mailErr.message);
        });
      }
    }

    // 7. Notificación en la campanita de la plataforma para el instructor responsable
    if (instructorEmail && instructorEmail !== authorEmail) {
      try {
        const notifDoc = new Notification({
          sender: authorName,
          subject: `${authorName} comentó en tu RAP de la Ficha ${fiche}: "${formattedComment.text.slice(0, 70)}${formattedComment.text.length > 70 ? '...' : ''}"`,
          fiche,
          recipient: instructorEmail,
          read: false
        });
        await notifDoc.save();
      } catch (notifErr) {
        console.warn('[NOTIFICACION ERROR] No se pudo guardar notificación en BD:', notifErr.message);
      }
    }

    return res.status(200).json({
      message: 'Comentario guardado y notificado exitosamente',
      comment: formattedComment,
      notifiedEmails: emailsToNotify.map(d => d.email)
    });

  } catch (error) {
    console.error('Error en addActivityComment:', error);
    return res.status(500).json({
      message: 'Error al procesar el comentario',
      error: error.message
    });
  }
};
// fin de implementacion luis llanos

// generado por luis llanos (recalcula y guarda horas directas para una o todas las fichas en MongoDB)
/**
 * Recalcula las horas directas de los resultados de aprendizaje basándose en el porcentaje
 * de horas lectivas respecto a las horas totales, y las horas de cada competencia.
 */
export const recalculateDirectHours = async (req, res) => {
  try {
    /*
    // comentado para correcion de multiplos
    const { fiche, all } = req.body || {};
    */

    // correcion de multiplos
    const { fiche, all, shift } = req.body || {};
    const query = (fiche && !all) ? { 'pedagogicalPlanning.fiche': fiche } : {};

    const plannings = await Planning.find(query);
    if (!plannings || plannings.length === 0) {
      return res.status(404).json({ message: 'No se encontraron planeaciones para recalcular' });
    }

    let updatedCount = 0;
    for (const doc of plannings) {
      if (!doc.pedagogicalPlanning) continue;

      // correcion de multiplos
      if (shift) {
        if (!doc.pedagogicalPlanning.metadata) doc.pedagogicalPlanning.metadata = {};
        doc.pedagogicalPlanning.metadata.shift = shift;
      }

      calculateDirectHoursForPlanning(doc.pedagogicalPlanning, true, shift);

      if (!doc.pedagogicalPlanning.timestamps) {
        doc.pedagogicalPlanning.timestamps = {};
      }
      doc.pedagogicalPlanning.timestamps.updatedAt = new Date();
      doc.markModified('pedagogicalPlanning.content');
      await doc.save();
      updatedCount++;
    }

    return res.status(200).json({
      message: `Horas directas calculadas y guardadas exitosamente para ${updatedCount} planeación(es).`,
      updatedCount
    });
  } catch (error) {
    console.error('Error en recalculateDirectHours:', error);
    return res.status(500).json({
      message: 'Error al recalcular horas directas',
      error: error.message
    });
  }
};
// fin de implementacion luis llanos