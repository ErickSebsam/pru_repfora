import { config } from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import * as XLSX from "xlsx/xlsx.mjs";

XLSX.set_fs(fs);
config();

const envCandidates = ["envSanGil.txt", "envSanGil", "envCucuta.txt", ".env"];
let mongoUrlsToTry = [];

if (process.env.MONGO_URL) {
  mongoUrlsToTry.push(process.env.MONGO_URL.replace(/^['"]|['"]$/g, "").trim());
}

for (const envFile of envCandidates) {
  if (fs.existsSync(envFile)) {
    const envParsed = config({ path: envFile, override: false }).parsed;
    if (envParsed && envParsed.MONGO_URL) {
      const cleanUrl = envParsed.MONGO_URL.replace(/^['"]|['"]$/g, "").trim();
      if (!mongoUrlsToTry.includes(cleanUrl)) {
        mongoUrlsToTry.push(cleanUrl);
      }
    }
  }
}

const defaultUrls = [
  "mongodb://localhost:27017/Horarios_SENA",
  "mongodb://127.0.0.1:27017/Horarios_SENA",
  "mongodb://multAdmin:JDHTDiizeqR7YdvB@89.116.49.65:27017/Horarios_SENA",
  "mongodb://multAdmin:JDHTDiizeqR7YdvB@86.38.204.37:27017/repforacidm"
];

defaultUrls.forEach((url) => {
  if (!mongoUrlsToTry.includes(url)) {
    mongoUrlsToTry.push(url);
  }
});

import ComplementaryRequest from "../models/ComplementaryRequest.js";
import ComplementaryCatalog from "../models/ComplementaryCatalog.js";
import Instructor from "../models/Instructor.js";
import Fiche from "../models/Fiche.js";
import Coordination from "../models/Coordination.js";
import Program from "../models/Program.js";
import User from "../models/User.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const candidateExcelPaths = [
  path.resolve(__dirname, "../../DF-14A_1.xlsx"),
  path.resolve(__dirname, "../../DF-14A.xlsx")
];
const excelPath = candidateExcelPaths.find(p => fs.existsSync(p)) || candidateExcelPaths[0];

function normalizeKey(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

function parseDF14Date(val) {
  if (!val && val !== 0) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === "number") {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return isNaN(date.getTime()) ? null : date;
  }
  if (typeof val === "string") {
    const str = val.trim();
    if (!str) return null;
    const ddmmyyyyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (ddmmyyyyMatch) {
      const [, day, month, year] = ddmmyyyyMatch;
      return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    }
    const yyyymmddMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (yyyymmddMatch) {
      const [, year, month, day] = yyyymmddMatch;
      return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    }
    const parsed = new Date(str);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

async function seedComplementaryFichas() {
  console.log("════════════════════════════════════════════════════════════════");
  console.log(" 🚀 SEEDER DE FICHAS COMPLEMENTARIAS (CURSO ESPECIAL) DESDE DF-14A ");
  console.log("════════════════════════════════════════════════════════════════\n");

  if (!fs.existsSync(excelPath)) {
    console.error(`❌ ERROR: No se encontró el archivo Excel en: ${excelPath}`);
    process.exit(1);
  }

  console.log(`📄 Parseando archivo Excel DF-14A.xlsx...`);
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  let headerRowIndex = -1;
  let headers = [];
  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    const rowString = row.join("").toLowerCase();
    if (rowString.includes("ficha") && rowString.includes("nivel")) {
      headerRowIndex = i;
      headers = row.map(normalizeKey);
      break;
    }
  }

  if (headerRowIndex === -1) {
    console.error("❌ ERROR: No se identificó la cabecera en el Excel.");
    process.exit(1);
  }

  // Filtrar ÚNICAMENTE fichas de "Curso Especial"
  const sinRutaCE = [];
  const juiciosCE = [];
  const cutoffDate = new Date("2026-07-29T23:59:59.999Z");

  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row.length === 0 || !row.some((val) => val !== "")) continue;

    const rowObj = {};
    headers.forEach((header, index) => {
      if (header) {
        rowObj[header] = row[index];
      }
    });

    const nivel = (rowObj["nivel_de_formacion"] || rowObj["nivel_formacion"] || "").toString().toUpperCase();
    if (!nivel.includes("CURSO ESPECIAL")) continue;

    const ficha = (rowObj["ficha"] || "").toString().trim();
    if (!ficha) continue;

    const estadoRaw = (rowObj["estado_de_ficha"] || rowObj["estado_ficha"] || rowObj["estado"] || "").toString().trim();
    const estadoNorm = estadoRaw.toLowerCase();
    const programa = (rowObj["programa"] || rowObj["nombre_programa"] || "").toString().trim();
    const codPrograma = (rowObj["codigo_programa"] || rowObj["cod_programa"] || "999999").toString().trim();
    const versionPrograma = (rowObj["version_programa"] || "1").toString().trim();
    const duracion = parseInt(rowObj["duracion_maxima"] || rowObj["duracion"] || 40, 10) || 40;
    const enTransito = parseInt(rowObj["aprendices_en_transito"] || rowObj["en_transito"] || rowObj["transito"] || 0, 10) || 0;
    const enFormacion = parseInt(rowObj["en_formacion"] || rowObj["aprendices_en_formacion"] || rowObj["formacion"] || 0, 10) || 0;

    const rawFechaInicio = rowObj["fecha_inicio_ficha"] || rowObj["fecha_inicio"] || null;
    const rawFechaFin = rowObj["fecha_fin_ficha"] || rowObj["fecha_fin_de_ficha"] || rowObj["fecha_fin"] || null;
    const fechaInicio = parseDF14Date(rawFechaInicio);
    const fechaFin = parseDF14Date(rawFechaFin);

    const record = {
      fichaNumber: ficha,
      codPrograma,
      versionPrograma,
      programa,
      duracion,
      estado: estadoRaw,
      enTransito,
      enFormacion,
      fechaInicio,
      fechaFin,
    };

    if (enTransito > 0) {
      sinRutaCE.push(record);
    }

    if (estadoNorm.includes("terminada") && enFormacion > 0 && fechaFin && fechaFin <= cutoffDate) {
      juiciosCE.push(record);
    }
  }

  console.log(`📊 Total 'Curso Especial' sin ruta en Excel: ${sinRutaCE.length}`);
  console.log(`📊 Total 'Curso Especial' juicios pendientes en Excel: ${juiciosCE.length}\n`);

  // Seleccionar una muestra representativa de fichas para subir (ej: 15 sin ruta + 15 juicios pendientes)
  const sampleSinRuta = sinRutaCE.slice(0, 20);
  const sampleJuicios = juiciosCE.slice(0, 20);
  const selectedFichas = [...sampleSinRuta, ...sampleJuicios];

  console.log(`🎯 Fichas seleccionadas para insertar en la BD: ${selectedFichas.length}\n`);

  // Conectar a MongoDB
  console.log("🔌 Conectando a MongoDB...");
  let connected = false;
  for (const mongoUrl of mongoUrlsToTry) {
    try {
      console.log(`📡 Intentando conectar a: ${mongoUrl.replace(/:([^@]+)@/, ":****@")}`);
      await mongoose.connect(mongoUrl, { serverSelectionTimeoutMS: 5000 });
      console.log("✅ Conexión exitosa a MongoDB.\n");
      connected = true;
      break;
    } catch (err) {
      console.warn(`⚠️ No se pudo conectar a ${mongoUrl.replace(/:([^@]+)@/, ":****@")}: ${err.message}`);
    }
  }

  if (!connected) {
    console.error("❌ ERROR: No se pudo conectar a MongoDB.");
    process.exit(1);
  }

  // 1. Crear o buscar Instructor de pruebas con email dfordonezpina@gmail.com
  const targetEmail = "dfordonezpina@gmail.com";
  let instructor = await Instructor.findOne({
    $or: [{ email: targetEmail }, { emailpersonal: targetEmail }],
  });

  if (!instructor) {
    console.log(`👤 Creando Instructor de prueba con correo ${targetEmail}...`);
    instructor = await Instructor.create({
      name: "Diego Fernando Ordoñez Piña",
      tpdocument: "CC",
      numdocument: "1098657403",
      email: targetEmail,
      emailpersonal: targetEmail,
      phone: "3001234567",
      knowledge: "SISTEMAS E INFORMATICA",
      thematicarea: "COMPLEMENTARIA",
      bindingtype: "CONTRATISTA",
      caphour: 160,
      hourswork: 40,
      status: 0,
    });
    console.log(`✅ Instructor creado con ID: ${instructor._id}`);
  } else {
    console.log(`👤 Instructor existente encontrado con ID: ${instructor._id} (${instructor.email})`);
    // Asegurar que email y emailpersonal estén asignados correctamente
    instructor.email = targetEmail;
    instructor.emailpersonal = targetEmail;
    await instructor.save();
  }

  // 2. Crear o reutilizar una Coordination genérica de prueba
  // (Fiche la requiere; el cron popula owner desde Fiche)
  let coordination = await Coordination.findOne({ name: "PROGRAMAS ESPECIALES - PRUEBA" });
  if (!coordination) {
    console.log("📌 Creando Coordination genérica de prueba...");
    // User de referencia (coordinador): buscar cualquiera activo o crear uno mínimo
    let userRef = await User.findOne({ status: 0 });
    if (!userRef) {
      userRef = await User.create({
        name: "Coordinador Pruebas",
        email: targetEmail,
        password: "prueba1234",
        status: 0,
      });
    }
    coordination = await Coordination.create({
      name: "PROGRAMAS ESPECIALES - PRUEBA",
      coordinator: userRef._id,
      programmers: [],
      modality: "Presencial",
      email: targetEmail,
      namefoldernew: "COMPLEMENTARIA_PRUEBA",
      passapp: "prueba123",
      status: 0,
    });
    console.log(`✅ Coordination de prueba creada con ID: ${coordination._id}`);
  } else {
    console.log(`📌 Coordination de prueba existente con ID: ${coordination._id}`);
  }

  // 3. Crear o reutilizar un Program genérico de prueba
  let program = await Program.findOne({ name: "PROGRAMA COMPLEMENTARIO - PRUEBA" }).catch(() => null);
  if (!program) {
    try {
      program = await Program.create({
        name: "PROGRAMA COMPLEMENTARIO - PRUEBA",
        code: "999999",
        status: 0,
      });
      console.log(`✅ Program de prueba creado con ID: ${program._id}`);
    } catch (e) {
      // Si falla, buscar cualquier program existente
      program = await Program.findOne({ status: 0 });
      if (!program) throw new Error("No se pudo crear ni encontrar un Program en la BD.");
      console.log(`📌 Usando Program existente con ID: ${program._id}`);
    }
  } else {
    console.log(`📌 Program de prueba existente con ID: ${program._id}`);
  }

  // 4. Insertar solicitudes de complementarias (ComplementaryRequest + Fiche)
  let insertedCount = 0;
  let updatedCount = 0;
  let ficheInserted = 0;
  let ficheUpdated = 0;

  for (const f of selectedFichas) {
    const numericCode = parseInt(f.codPrograma, 10) || 999999;
    let catalog = await ComplementaryCatalog.findOne({ prfCodigo: numericCode });

    if (!catalog) {
      catalog = await ComplementaryCatalog.create({
        prfCodigo: numericCode,
        prfCodigoStr: f.codPrograma,
        prfVersion: parseInt(f.versionPrograma, 10) || 1,
        codVer: `${numericCode}V1`,
        tipoFormacion: "COMPLEMENTARIA",
        prfDenominacion: f.programa,
        nivelFormacion: "CURSO ESPECIAL",
        prfDuracionMaxima: f.duracion,
        status: 0,
      });
    }

    const fichaFstart = f.fechaInicio || new Date("2025-01-15");
    const fichaFend = f.fechaFin || new Date("2025-06-30");

    const requestData = {
      catalogCourse: catalog._id,
      catalogCourseName: f.programa,
      catalogCourseCode: f.codPrograma,
      catalogCourseVersion: f.versionPrograma || "1",
      prfDuracionMaxima: f.duracion,
      instructor: instructor._id,
      instructores: [
        {
          instructor: instructor._id,
          nombre: instructor.name,
          documento: instructor.numdocument,
          email: targetEmail,
          esPrincipal: true,
        },
      ],
      supervisorNombre: "COORDINADOR DE PRUEBAS",
      ambienteNombre: "AMBIENTE DE PRUEBAS SENA",
      ambienteDireccion: "CALLE PRUEBAS SENA",
      fechaInicio: fichaFstart,
      fechaFin: fichaFend,
      municipio: "BUCARAMANGA",
      numAprendices: f.enFormacion > 0 ? f.enFormacion : f.enTransito > 0 ? f.enTransito : 20,
      tipoPrograma: "COMPLEMENTARIA VIRTUAL/PRESENCIAL",
      tipoPoblacion: "POBLACIÓN VULNERABLE",
      state: f.estado.toLowerCase().includes("terminada") ? "EJECUCION" : "APROBADA",
      fichaNumber: f.fichaNumber,
      codigoSolicitud: `SOL-${f.fichaNumber}`,
      status: 0,
    };

    // 4a. Upsert ComplementaryRequest
    const existingReq = await ComplementaryRequest.findOne({ fichaNumber: f.fichaNumber });
    if (existingReq) {
      await ComplementaryRequest.updateOne({ _id: existingReq._id }, { $set: requestData });
      updatedCount++;
    } else {
      await ComplementaryRequest.create(requestData);
      insertedCount++;
    }

    // 4b. Upsert Fiche — el cron df14a-report.js resuelve el instructor desde aquí
    const existingFiche = await Fiche.findOne({ number: f.fichaNumber.toString() });
    const ficheData = {
      number: f.fichaNumber.toString(),
      program: program._id,
      owner: instructor._id,
      coordination: coordination._id,
      fstart: fichaFstart,
      fend: fichaFend,
      status: 0,
    };
    if (existingFiche) {
      await Fiche.updateOne({ _id: existingFiche._id }, { $set: ficheData });
      ficheUpdated++;
    } else {
      await Fiche.create(ficheData);
      ficheInserted++;
    }
  }

  console.log("════════════════════════════════════════════════════════════════");
  console.log(" 📋 RESUMEN DE LA CARGA DE FICHAS COMPLEMENTARIAS ");
  console.log("════════════════════════════════════════════════════════════════");
  console.log(` 👤 Instructor asignado (Email): ${targetEmail}`);
  console.log(` 📋 Coordination de prueba ID  : ${coordination._id}`);
  console.log(` 📥 ComplementaryRequests insertadas : ${insertedCount}`);
  console.log(` 🔄 ComplementaryRequests actualizadas: ${updatedCount}`);
  console.log(` 📥 Fiches insertadas en BD         : ${ficheInserted}`);
  console.log(` 🔄 Fiches actualizadas en BD        : ${ficheUpdated}`);
  console.log(` 📊 Total fichas complementarias procesadas: ${selectedFichas.length}`);
  console.log("════════════════════════════════════════════════════════════════\n");

  await mongoose.disconnect();
  console.log("✨ Proceso de carga finalizado con éxito.");
}

seedComplementaryFichas().catch((err) => {
  console.error("❌ Error ejecutando el seeder:", err);
  mongoose.disconnect().catch(() => {});
  process.exit(1);
});
