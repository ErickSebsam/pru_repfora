import { config } from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import * as XLSX from "xlsx/xlsx.mjs";

// Configurar fs para XLSX en ESM
XLSX.set_fs(fs);

// Cargar variables de entorno
config();
// Cargar variables de entorno probando diferentes archivos .env y envSanGil.txt
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

// URLs por defecto encontradas en la configuración del proyecto
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

// Cargar modelos Mongoose
import ComplementaryRequest from "../models/ComplementaryRequest.js";
import ComplementaryCatalog from "../models/ComplementaryCatalog.js";
import Instructor from "../models/Instructor.js";
import Fiche from "../models/Fiche.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Rutas de entrada y salida
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

async function verifyAndExport() {
  console.log("════════════════════════════════════════════════════════════════");
  console.log(" 🔍 ANALISIS DE DF-14A.xlsx Y VERIFICACION DE FICHAS BD ");
  console.log("════════════════════════════════════════════════════════════════\n");

  // 1. Verificar existencia de DF-14A.xlsx
  if (!fs.existsSync(excelPath)) {
    console.error(`❌ ERROR: No se encontró el archivo Excel en: ${excelPath}`);
    process.exit(1);
  }

  console.log(`📄 Leyendo archivo Excel: ${excelPath}...`);
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
    console.error("❌ ERROR: No se pudo identificar la cabecera de la tabla en DF-14A.xlsx");
    process.exit(1);
  }

  console.log(`✅ Cabecera identificada en fila ${headerRowIndex + 1}. Procesando filas...`);

  // Extraer fichas de "Curso Especial"
  const excelFichasMap = new Map();
  let totalRowsChecked = 0;

  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row.length === 0 || !row.some((val) => val !== "")) continue;

    totalRowsChecked++;
    const rowObj = {};
    headers.forEach((header, index) => {
      if (header) {
        rowObj[header] = row[index];
      }
    });

    const nivel = (rowObj["nivel_de_formacion"] || rowObj["nivel_formacion"] || "").toString().toLowerCase();
    if (nivel.includes("curso especial")) {
      const ficha = (rowObj["ficha"] || "").toString().trim();
      const estado = (rowObj["estado_de_ficha"] || rowObj["estado_ficha"] || rowObj["estado"] || "").toString().trim();
      const programa = (rowObj["programa"] || rowObj["nombre_programa"] || "").toString().trim();
      const duracion = parseInt(rowObj["duracion_maxima"] || rowObj["duracion"] || 0, 10) || 0;
      const enTransito = parseInt(rowObj["aprendices_en_transito"] || rowObj["en_transito"] || rowObj["transito"] || 0, 10) || 0;
      const enFormacion = parseInt(rowObj["en_formacion"] || rowObj["aprendices_en_formacion"] || rowObj["formacion"] || 0, 10) || 0;
      const rawFechaInicio = rowObj["fecha_inicio_ficha"] || rowObj["fecha_inicio"] || null;
      const rawFechaFin = rowObj["fecha_fin_ficha"] || rowObj["fecha_fin_de_ficha"] || rowObj["fecha_fin"] || null;

      if (ficha) {
        excelFichasMap.set(ficha, {
          fichaNumber: ficha,
          estado,
          programa,
          duracion,
          enTransito,
          enFormacion,
          fechaInicio: parseDF14Date(rawFechaInicio),
          fechaFin: parseDF14Date(rawFechaFin),
        });
      }
    }
  }

  console.log(`📊 Filas analizadas en Excel: ${totalRowsChecked}`);
  console.log(`📊 Fichas de 'Curso Especial' (Complementarias) en Excel: ${excelFichasMap.size}\n`);

  // Crear carpeta complementary-list si no existe
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Carpeta creada: ${outputDir}`);
  } else {
    console.log(`📁 Usando carpeta existente: ${outputDir}`);
  }

  // Guardar archivo con todas las fichas de Curso Especial extraídas del Excel DF-14A
  const excelFichasArray = Array.from(excelFichasMap.values());
  const excelFichasPath = path.join(outputDir, "df14a_excel_fichas.json");
  fs.writeFileSync(excelFichasPath, JSON.stringify(excelFichasArray, null, 2), "utf-8");
  console.log(`💾 Exportadas las ${excelFichasArray.length} fichas complementarias del Excel en: 'df14a_excel_fichas.json'\n`);

  // 2. Conectar a MongoDB probando las URLs candidatas
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
    console.error("❌ ERROR: No se pudo conectar a ninguna de las bases de datos probadas.");
    process.exit(1);
  }

  // 3. Consultar solicitudes y fichas en la base de datos
  console.log("📥 Consultando 'ComplementaryRequest' y 'Fiche' en la base de datos...");
  const dbRequests = await ComplementaryRequest.find({ status: 0 })
    .populate("instructor", "name email emailpersonal documento")
    .populate("catalogCourse", "prfDenominacion prfCodigo prfVersion lineaTecnologica redConocimiento")
    .lean();

  const dbFiches = await Fiche.find({ status: 0 }).lean();

  console.log(`📊 ComplementaryRequests encontradas en BD: ${dbRequests.length}`);
  console.log(`📊 Fiches (Generales) encontradas en BD      : ${dbFiches.length}\n`);

  // 4. Guardar cada ficha complementaria localmente como JSON
  console.log("💾 Guardando solicitudes y fichas localmente en complementary-list...");
  let savedFilesCount = 0;
  const dbFichaNumbersMap = new Map();
  const dbGeneralFichesMap = new Map();

  for (const reqObj of dbRequests) {
    const fichaNum = reqObj.fichaNumber ? String(reqObj.fichaNumber).trim() : null;
    const fileName = fichaNum ? `ficha_${fichaNum}.json` : `solicitud_${reqObj._id}.json`;
    const filePath = path.join(outputDir, fileName);

    fs.writeFileSync(filePath, JSON.stringify(reqObj, null, 2), "utf-8");
    savedFilesCount++;

    if (fichaNum) {
      dbFichaNumbersMap.set(fichaNum, reqObj);
    }
  }

  for (const fObj of dbFiches) {
    const num = (fObj.number || fObj.fichaNumber || fObj.code || "").toString().trim();
    if (num) {
      dbGeneralFichesMap.set(num, fObj);
    }
  }

  // Guardar archivos consolidados
  const allRequestsPath = path.join(outputDir, "all_complementary_requests.json");
  fs.writeFileSync(allRequestsPath, JSON.stringify(dbRequests, null, 2), "utf-8");

  const allFichesPath = path.join(outputDir, "all_fiches.json");
  fs.writeFileSync(allFichesPath, JSON.stringify(dbFiches, null, 2), "utf-8");

  console.log(`✅ Guardados ${savedFilesCount} JSONs de solicitudes, 'all_complementary_requests.json' y 'all_fiches.json'.\n`);

  // 5. Verificar y cruzar cuáles fichas del Excel están en la BD
  console.log("🔎 Verificando coincidencias entre el Excel DF-14A y la Base de Datos...");
  const matchedInComplementary = [];
  const matchedInFiches = [];
  const missingInDb = [];

  for (const [fichaNumber, excelData] of excelFichasMap.entries()) {
    const matchComp = dbFichaNumbersMap.get(fichaNumber);
    const matchFiche = dbGeneralFichesMap.get(fichaNumber);

    if (matchComp || matchFiche) {
      if (matchComp) {
        matchedInComplementary.push({
          fichaNumber,
          excelData,
          dbRecord: {
            id: matchComp._id,
            numeroSolicitud: matchComp.numeroSolicitud,
            state: matchComp.state,
            catalogCourseName: matchComp.catalogCourseName,
            catalogCourseCode: matchComp.catalogCourseCode,
            numAprendices: matchComp.numAprendices,
            instructor: matchComp.instructor ? matchComp.instructor.name : null,
          },
        });
      }
      if (matchFiche) {
        matchedInFiches.push({
          fichaNumber,
          excelData,
          ficheRecord: {
            id: matchFiche._id,
            number: matchFiche.number,
            program: matchFiche.program,
          },
        });
      }
    } else {
      missingInDb.push({
        fichaNumber,
        excelData,
      });
    }
  }

  // Generar reporte en formato JSON
  const reportData = {
    fechaProcesamiento: new Date().toISOString(),
    resumenExcel: {
      totalFilasExcel: totalRowsChecked,
      totalFichasCursoEspecial: excelFichasMap.size,
    },
    resumenBaseDatos: {
      totalSolicitudesComplementarias: dbRequests.length,
      solicitudesConNumeroFicha: dbFichaNumbersMap.size,
      totalFichesGenerales: dbFiches.length,
    },
    resultadoCruce: {
      fichasCoincidentesEnComplementaryRequests: matchedInComplementary.length,
      fichasCoincidentesEnFichesGenerales: matchedInFiches.length,
      totalFichasExcelFaltantesEnBD: missingInDb.length,
      porcentajeCoincidencia: excelFichasMap.size > 0
        ? `${(((matchedInComplementary.length + matchedInFiches.length) / excelFichasMap.size) * 100).toFixed(2)}%`
        : "0%",
    },
    coincidenciasComplementary: matchedInComplementary,
    coincidenciasFiches: matchedInFiches,
    fichasFaltantesMuestra: missingInDb.slice(0, 100),
  };

  const reportPath = path.join(outputDir, "df14a_verification_report.json");
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2), "utf-8");

  // 6. Mostrar resultados por consola
  console.log("════════════════════════════════════════════════════════════════");
  console.log(" 📋 RESULTADO FINAL DE LA VERIFICACIÓN ");
  console.log("════════════════════════════════════════════════════════════════");
  console.log(` Total fichas "Curso Especial" en DF-14A.xlsx     : ${excelFichasMap.size}`);
  console.log(` Total solicitudes ComplementaryRequest en BD    : ${dbRequests.length}`);
  console.log(` Total Fiches generales en BD                    : ${dbFiches.length}`);
  console.log(` --------------------------------------------------------------`);
  console.log(` ✅ Coincidencias en ComplementaryRequests       : ${matchedInComplementary.length}`);
  console.log(` ✅ Coincidencias en Fiches Generales            : ${matchedInFiches.length}`);
  console.log(` ❌ Fichas del Excel NO encontradas en BD       : ${missingInDb.length}`);
  console.log(` 📊 Coincidencia Total                           : ${reportData.resultadoCruce.porcentajeCoincidencia}`);
  console.log("════════════════════════════════════════════════════════════════");
  console.log(`📂 Todos los archivos JSON localmente guardados en:`);
  console.log(`   ${outputDir}`);
  console.log(`📄 Reporte de verificación guardado en:`);
  console.log(`   ${reportPath}\n`);

  const totalMatched = matchedInComplementary.length + matchedInFiches.length;
  if (totalMatched > 0) {
    console.log("📌 Detalle de fichas encontradas:");
    matchedInComplementary.forEach((m, idx) => {
      console.log(
        `   ${idx + 1}. [Complementaria] Ficha ${m.fichaNumber} | Curso: "${m.dbRecord.catalogCourseName}" | Estado BD: ${m.dbRecord.state} | Instructor: ${m.dbRecord.instructor || "N/A"}`
      );
    });
    matchedInFiches.forEach((m, idx) => {
      console.log(
        `   ${idx + 1 + matchedInComplementary.length}. [Ficha General] Ficha ${m.fichaNumber} | ID BD: ${m.ficheRecord.id}`
      );
    });
  } else {
    console.log("⚠️ Ninguna de las fichas de Curso Especial en el Excel DF-14A coincide con las fichas registradas actualmente en la base de datos.");
  }

  await mongoose.disconnect();
  console.log("\n✨ Proceso finalizado correctamente.");
}

verifyAndExport().catch((err) => {
  console.error("❌ Error en la ejecución del script:", err);
  mongoose.disconnect().catch(() => {});
  process.exit(1);
});
