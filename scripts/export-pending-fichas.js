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
  "mongodb://multAdmin:JDHTDiizeqR7YdvB@86.38.204.37:27017/repforacidm",
  "mongodb+srv://adminHSENA:CDb8lJoGBSVGEnIG@cluster0.cckpzpd.mongodb.net/Horarios_SENA",
  "mongodb://localhost:27017/Horarios_SENA",
  "mongodb://127.0.0.1:27017/Horarios_SENA",
  "mongodb://multAdmin:JDHTDiizeqR7YdvB@89.116.49.65:27017/Horarios_SENA",
  "mongodb://multAdmin:JDHTDiizeqR7YdvB@72.60.172.138:27017/repforacedrum?authSource=admin"
];

defaultUrls.forEach((url) => {
  if (!mongoUrlsToTry.includes(url)) {
    mongoUrlsToTry.push(url);
  }
});

import ComplementaryRequest from "../models/ComplementaryRequest.js";
import Fiche from "../models/Fiche.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const excelPath = path.resolve(__dirname, "../../DF-14A.xlsx");
const outputDir = path.resolve(__dirname, "../../complementary-list");

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
      const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      return isNaN(date.getTime()) ? null : date;
    }
    const yyyymmddMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (yyyymmddMatch) {
      const [, year, month, day] = yyyymmddMatch;
      const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      return isNaN(date.getTime()) ? null : date;
    }
    const parsed = new Date(str);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

async function runPendingExport() {
  console.log("════════════════════════════════════════════════════════════════");
  console.log(" 🔍 FILTRADO Y EXPORTACION DE FICHAS PENDIENTES (SIN RUTA / JUICIOS)");
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

  const allExcelRowsMap = new Map();
  const pendingExcelFichasMap = new Map();

  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row.length === 0 || !row.some((val) => val !== "")) continue;

    const rowObj = {};
    headers.forEach((header, index) => {
      if (header) {
        rowObj[header] = row[index];
      }
    });

    const fichaNumber = (rowObj["ficha"] || "").toString().trim();
    if (!fichaNumber) continue;

    const estadoRaw = (rowObj["estado_de_ficha"] || rowObj["estado_ficha"] || rowObj["estado"] || "").toString().trim();
    const estadoNorm = estadoRaw.toLowerCase();
    const nivel = (rowObj["nivel_de_formacion"] || rowObj["nivel_formacion"] || "").toString().trim();
    const programa = (rowObj["programa"] || rowObj["nombre_programa"] || "").toString().trim();

    const enTransito = parseInt(rowObj["aprendices_en_transito"] || rowObj["en_transito"] || rowObj["transito"] || 0, 10) || 0;
    const enFormacion = parseInt(rowObj["en_formacion"] || rowObj["aprendices_en_formacion"] || rowObj["formacion"] || 0, 10) || 0;

    const rawFechaInicio = rowObj["fecha_inicio_ficha"] || rowObj["fecha_inicio"] || null;
    const rawFechaFin = rowObj["fecha_fin_ficha"] || rowObj["fecha_fin_de_ficha"] || rowObj["fecha_fin"] || null;

    const fechaInicioParsed = parseDF14Date(rawFechaInicio);
    const fechaFinParsed = parseDF14Date(rawFechaFin);

    const sinRuta = enTransito > 0;
    
    // Regla de negocio: Juicios pendientes solo aplica para fichas en estado 'terminada' / 'terminada por fecha' 
    // y cuya fecha de finalización sea 9 días antes del día actual (<= 29/07/2026)
    const cutoffDate = new Date("2026-07-29T23:59:59.999Z");
    const isTerminada = estadoNorm.includes("terminada");
    const juiciosPendientes = isTerminada && enFormacion > 0 && fechaFinParsed && fechaFinParsed <= cutoffDate;

    const fichaInfo = {
      fichaNumber,
      nivel,
      programa,
      estado: estadoRaw,
      fechaInicio: fechaInicioParsed ? fechaInicioParsed.toISOString().split("T")[0] : rawFechaInicio || null,
      fechaFin: fechaFinParsed ? fechaFinParsed.toISOString().split("T")[0] : rawFechaFin || null,
      enTransito,
      enFormacion,
      sinRuta,
      juiciosPendientes,
      motivoPendiente: [
        sinRuta ? `Sin Ruta (${enTransito} aprendices en tránsito)` : null,
        juiciosPendientes ? `Juicios Pendientes (${enFormacion} aprendices en formación)` : null,
      ]
        .filter(Boolean)
        .join(" | "),
    };

    allExcelRowsMap.set(fichaNumber, fichaInfo);

    if (sinRuta || juiciosPendientes) {
      pendingExcelFichasMap.set(fichaNumber, fichaInfo);
    }
  }

  console.log(`📊 Total fichas en Excel DF-14A: ${allExcelRowsMap.size}`);
  console.log(`📊 Fichas con pendientes (Sin Ruta / Juicios) en Excel: ${pendingExcelFichasMap.size}\n`);

  // Conectar a MongoDB
  console.log("🔌 Conectando a la base de datos MongoDB...");
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

  // Consultar registros en BD
  console.log("📥 Consultando 'ComplementaryRequest' y 'Fiche' en la base de datos...");
  const dbRequests = await ComplementaryRequest.find({ status: 0 }).lean();
  const dbFiches = await Fiche.find({ status: 0 }).lean();

  const dbCompMap = new Map();
  const dbFichesMap = new Map();

  for (const r of dbRequests) {
    if (r.fichaNumber) {
      dbCompMap.set(String(r.fichaNumber).trim(), r);
    }
  }

  for (const f of dbFiches) {
    const num = (f.number || f.fichaNumber || f.code || "").toString().trim();
    if (num) {
      dbFichesMap.set(num, f);
    }
  }

  console.log(`📊 ComplementaryRequests en BD: ${dbCompMap.size}`);
  console.log(`📊 Fiches generales en BD      : ${dbFichesMap.size}\n`);

  // Filtrar fichas que estén en DF-14A (con pendientes) Y que aparezcan en la Base de Datos
  const pendingInDbList = [];
  const pendingComplementaryInDbList = [];

  for (const [fichaNumber, pendingInfo] of pendingExcelFichasMap.entries()) {
    const dbComp = dbCompMap.get(fichaNumber);
    const dbFiche = dbFichesMap.get(fichaNumber);

    if (dbComp || dbFiche) {
      const matchedRecord = {
        fichaNumber,
        excelData: pendingInfo,
        origenBD: dbComp ? "ComplementaryRequest" : "Fiche",
        registroBD: dbComp
          ? {
              id: dbComp._id,
              numeroSolicitud: dbComp.numeroSolicitud,
              state: dbComp.state,
              catalogCourseName: dbComp.catalogCourseName,
              numAprendices: dbComp.numAprendices,
            }
          : {
              id: dbFiche._id,
              number: dbFiche.number,
              program: dbFiche.program,
            },
      };

      pendingInDbList.push(matchedRecord);

      if ((pendingInfo.nivel || "").toLowerCase().includes("curso especial")) {
        pendingComplementaryInDbList.push(matchedRecord);
      }
    }
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Guardar archivo JSON con las fichas pendientes en BD
  const pendingInDbPath = path.join(outputDir, "fichas_pendientes_df14a_y_bd.json");
  fs.writeFileSync(pendingInDbPath, JSON.stringify(pendingInDbList, null, 2), "utf-8");

  // Guardar archivo JSON exclusivo de complementarias pendientes en BD
  const pendingCompPath = path.join(outputDir, "fichas_complementarias_pendientes_en_bd.json");
  fs.writeFileSync(pendingCompPath, JSON.stringify(pendingComplementaryInDbList, null, 2), "utf-8");

  // Guardar todas las pendientes del Excel DF-14A
  const pendingAllExcelPath = path.join(outputDir, "df14a_todas_las_fichas_pendientes.json");
  fs.writeFileSync(
    pendingAllExcelPath,
    JSON.stringify(Array.from(pendingExcelFichasMap.values()), null, 2),
    "utf-8"
  );

  console.log("════════════════════════════════════════════════════════════════");
  console.log(" 📋 RESULTADO FINAL DE LA FILTRACION Y GUARDADO DE JSON ");
  console.log("════════════════════════════════════════════════════════════════");
  console.log(` Total fichas con pendientes en DF-14A.xlsx : ${pendingExcelFichasMap.size}`);
  console.log(` Fichas con pendientes PRESENTES EN BD      : ${pendingInDbList.length}`);
  console.log(`   └─ Complementarias ("Curso Especial")    : ${pendingComplementaryInDbList.length}`);
  console.log(`   └─ Otras de Formación (Técnico/Tecnólogo): ${pendingInDbList.length - pendingComplementaryInDbList.length}`);
  console.log("════════════════════════════════════════════════════════════════");
  console.log(`💾 Archivos guardados exitosamente en: ${outputDir}`);
  console.log(` 1. fichas_pendientes_df14a_y_bd.json (${pendingInDbList.length} fichas)`);
  console.log(` 2. fichas_complementarias_pendientes_en_bd.json (${pendingComplementaryInDbList.length} fichas)`);
  console.log(` 3. df14a_todas_las_fichas_pendientes.json (${pendingExcelFichasMap.size} fichas)\n`);

  if (pendingInDbList.length > 0) {
    console.log("📌 Muestra de fichas pendientes presentes en la BD (primeras 20):");
    pendingInDbList.slice(0, 20).forEach((item, index) => {
      console.log(
        ` ${index + 1}. Ficha: ${item.fichaNumber} | Nivel: ${item.excelData.nivel} | Estado: ${item.excelData.estado} | Motivo: ${item.excelData.motivoPendiente}`
      );
    });
  }

  await mongoose.disconnect();
  console.log("\n✨ Proceso finalizado correctamente.");
}

runPendingExport().catch((err) => {
  console.error("❌ Error ejecutando exportación de pendientes:", err);
  mongoose.disconnect().catch(() => {});
  process.exit(1);
});
