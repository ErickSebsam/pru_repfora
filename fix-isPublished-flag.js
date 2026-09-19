/**
 * fix-isPublished-flag.js
 *
 * Limpieza única del flag scheduleDetails.isPublished en Planning.
 *
 * Contexto: resync-schedules-to-planning.js y el cruce de horarios de
 * extractFromPDFs marcaban como isPublished = true TODAS las actividades
 * cruzadas con horarios legados de la colección "schedules", aunque el
 * programador nunca las hubiera publicado con "Programar en Calendario".
 * Eso hacía que en SchedulerView el estado "Programado" se tragara al
 * estado "Confirmado".
 *
 * Este script deja isPublished = true SOLO en las actividades que tienen
 * un horario generado oficialmente por el módulo de planeación
 * (observation === "Generado desde el módulo de planeación"). Al resto les
 * pone isPublished = false, conservando assignedDays, instructor, horas, etc.
 *
 * Uso:
 *   node fix-isPublished-flag.js --dry-run   (solo reporta, no guarda)
 *   node fix-isPublished-flag.js             (aplica los cambios)
 */
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import dbConnection from "./database.js";
import Planning from "./models/Planning.js";
import Fiche from "./models/Fiche.js";
import Schedule from "./models/Schedule.js";

const OBSERVACION_OFICIAL = "Generado desde el módulo de planeación";
const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  await dbConnection();

  const plannings = await Planning.find({});
  console.log(`[FIX_PUBLISHED] ${plannings.length} planning(s) encontrados.`);
  if (DRY_RUN) console.log("[FIX_PUBLISHED] MODO DRY-RUN: no se guardarán cambios.\n");

  let limpiadas = 0;
  let preservadas = 0;
  let docsGuardados = 0;

  for (const planningDoc of plannings) {
    const ficheNumber = planningDoc.pedagogicalPlanning?.fiche;
    if (!ficheNumber) continue;

    const dbFiche = await Fiche.findOne({ number: ficheNumber.toString() }).lean();
    let seActualizoAlgo = false;

    for (const phase of planningDoc.pedagogicalPlanning?.content || []) {
      for (const comp of phase.competencies || []) {
        for (const rap of comp.learningOutcomes || []) {
          for (const act of rap.pedagogicalActivities || []) {
            if (!act.scheduleDetails?.isPublished) continue;

            const apoyo = (act.description || act.observations || "").trim();
            const instructorId = act.suggestedInstructor?.id;

            let esOficial = false;
            if (dbFiche) {
              const query = {
                fiche: dbFiche._id,
                observation: OBSERVACION_OFICIAL,
              };
              if (apoyo) query.supporttext = apoyo;
              if (instructorId && mongoose.Types.ObjectId.isValid(instructorId)) {
                query.instructor = new mongoose.Types.ObjectId(instructorId);
              }
              const oficial = await Schedule.findOne(query).lean();
              esOficial = !!oficial;
            }

            if (esOficial) {
              preservadas++;
              console.log(
                `[PRESERVA] Ficha ${ficheNumber} — "${apoyo.substring(0, 50)}" (publicación oficial)`,
              );
            } else {
              if (!DRY_RUN) act.scheduleDetails.isPublished = false;
              limpiadas++;
              seActualizoAlgo = true;
              console.log(
                `[LIMPIA] Ficha ${ficheNumber} — "${apoyo.substring(0, 50)}" (import legado)`,
              );
            }
          }
        }
      }
    }

    if (seActualizoAlgo && !DRY_RUN) {
      planningDoc.markModified("pedagogicalPlanning.content");
      await planningDoc.save();
      docsGuardados++;
    }
  }

  console.log("\n[FIX_PUBLISHED] Resumen:");
  console.log(`  Actividades con isPublished limpiado: ${limpiadas}`);
  console.log(`  Actividades oficiales preservadas: ${preservadas}`);
  console.log(`  Planning docs guardados: ${docsGuardados}${DRY_RUN ? " (dry-run)" : ""}`);

  process.exit(0);
}

main().catch((error) => {
  console.error("[FIX_PUBLISHED] Error:", error);
  process.exit(1);
});