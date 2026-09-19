/**
 * resync-schedules-to-planning.js
 *
 * Vuelve a cruzar cada Planning YA GUARDADO en Mongo contra la colección
 * "schedules" mapeando de manera inteligente por texto y similitud.
 */
import dotenv from "dotenv";
dotenv.config();

import dbConnection from "./database.js";
import Planning from "./models/Planning.js";
import Fiche from "./models/Fiche.js";
import Schedule from "./models/Schedule.js";
import "./models/Competence.js";
import "./models/Outcome.js";
import "./models/Instructor.js";

// ==========================================
// FUNCIONES UTILITARIAS NATIVAS DEL SISTEMA
// ==========================================
function cleanTextForComparison(text) {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quita acentos y tildes
    .replace(/[^a-z0-9]/g, "") // Quita espacios y caracteres especiales
    .trim();
}

function getSimilarity(str1, str2) {
  const s1 = str1 || "";
  const s2 = str2 || "";
  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;

  const pairs1 = getBigramPairs(s1);
  const pairs2 = getBigramPairs(s2);
  const union = pairs1.length + pairs2.length;
  if (union === 0) return 0.0;

  let hits = 0;
  for (const p1 of pairs1) {
    const idx = pairs2.indexOf(p1);
    if (idx >= 0) {
      hits++;
      pairs2.splice(idx, 1);
    }
  }
  return (2.0 * hits) / union;
}

function getBigramPairs(str) {
  const pairs = [];
  for (let i = 0; i < str.length - 1; i++) {
    pairs.push(str.substring(i, i + 2));
  }
  return pairs;
}

function getShiftFromTime(timeStr) {
  if (!timeStr) return null;
  const hour = parseInt(timeStr.split(":")[0], 10);
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "night";
}

function formatDateToYYYYMMDD(dateInput) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

function formatDateDMY(dateInput) {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// ==========================================
// LÓGICA PRINCIPAL
// ==========================================
async function main() {
  await dbConnection();

  const plannings = await Planning.find({});
  console.log(`[RESYNC] ${plannings.length} planning(s) encontrados.`);

  let fichasSinSchedules = 0;
  let fichasSinFiche = 0;
  let actividadesActualizadas = 0;
  let confirmadosPreservados = 0;

  for (const planningDoc of plannings) {
    const ficheNumber = planningDoc.pedagogicalPlanning?.fiche;
    if (!ficheNumber) continue;

    const dbFiche = await Fiche.findOne({
      number: ficheNumber.toString(),
    }).lean();
    if (!dbFiche) {
      fichasSinFiche++;
      continue;
    }

    const schedulesFound = await Schedule.find({ fiche: dbFiche._id })
      .populate("competence")
      .populate("outcome")
      .populate("instructor")
      .lean();

    if (!schedulesFound || schedulesFound.length === 0) {
      fichasSinSchedules++;
      continue;
    }

    let seActualizoAlgo = false;

    (planningDoc.pedagogicalPlanning?.content || []).forEach((phase) => {
      (phase.competencies || []).forEach((comp) => {
        (comp.learningOutcomes || []).forEach((rap) => {
          // 1. Filtrar los schedules de esta Competencia y RAP
          const matchedSchedules = schedulesFound.filter((sched) => {
            if (!sched.competence || !sched.outcome) return false;

            const compNameDb = cleanTextForComparison(sched.competence.name);
            const compNamePdf = cleanTextForComparison(comp.name);

            const compCoincide =
              compNameDb === compNamePdf ||
              compNameDb.includes(compNamePdf) ||
              compNamePdf.includes(compNameDb) ||
              getSimilarity(compNameDb, compNamePdf) >= 0.85;

            if (!compCoincide) return false;

            const outcomeTextDb = cleanTextForComparison(
              sched.outcome.outcomes,
            );
            const outcomeTextPdf = cleanTextForComparison(rap.description);

            if (outcomeTextDb === outcomeTextPdf) return true;
            if (
              outcomeTextDb.includes(outcomeTextPdf) ||
              outcomeTextPdf.includes(outcomeTextDb)
            )
              return true;

            return getSimilarity(outcomeTextDb, outcomeTextPdf) >= 0.85;
          });

          // 2. Emparejar con las actividades pedagógicas de forma segura
          if (matchedSchedules.length > 0 && rap.pedagogicalActivities) {
            rap.pedagogicalActivities.forEach((targetAct, actIdx) => {
              let matchedSchedule = matchedSchedules.find((sched) => {
                const schedText = cleanTextForComparison(sched.supporttext);
                const actText = cleanTextForComparison(
                  targetAct.description || targetAct.observations,
                );
                return schedText === actText && actText !== "";
              });

              if (!matchedSchedule) {
                matchedSchedule = matchedSchedules[actIdx];
              }

              if (!matchedSchedule) return;

              const assignedDays = (matchedSchedule.events || [])
                .map((evt) => formatDateToYYYYMMDD(evt))
                .filter(Boolean);

              targetAct.isScheduledInCalendar = true;

              if (matchedSchedule.instructor) {
                // Si ya estaba confirmado a mano (alguien le dio clic al botón
                // de confirmar en la pantalla), NO se pisa ese estado — se deja
                // como estaba. Solo se pone "pending" para los que aún no
                // tenían ningún estado de confirmación.
                const yaEstabaConfirmado =
                  targetAct.suggestedInstructor?.assignmentStatus === "confirmed";

                targetAct.suggestedInstructor = {
                  id: matchedSchedule.instructor._id.toString(),
                  name: matchedSchedule.instructor.name,
                  type: matchedSchedule.instructor.bindingtype || "",
                  assignmentStatus: yaEstabaConfirmado ? "confirmed" : "pending",
                };

                if (yaEstabaConfirmado) confirmadosPreservados++;
              }

              const startDateStr = formatDateDMY(matchedSchedule.fstart);
              const endDateStr = formatDateDMY(matchedSchedule.fend);

              targetAct.hours = {
                direct: matchedSchedule.hourswork || 0,
                independent: targetAct.hours?.independent || 0,
              };

              targetAct.scheduleDetails = {
                assignedDays,
                shift: matchedSchedule.tstart
                  ? getShiftFromTime(matchedSchedule.tstart)
                  : null,
                tstart: matchedSchedule.tstart || null,
                tend: matchedSchedule.tend || null,
                hoursPerDay: matchedSchedule.hourswork || 0,
                calendarNotes: `Programado del ${startDateStr} al ${endDateStr}`,
                isPublished: true,
              };

              seActualizoAlgo = true;
              actividadesActualizadas++;
            });
          }
        });
      });
    });

    if (seActualizoAlgo) {
      planningDoc.markModified("pedagogicalPlanning.content");
      await planningDoc.save();
      console.log(`[RESYNC] Ficha ${ficheNumber}: actualizada.`);
    }
  }

  console.log("\n[RESYNC] Resumen:");
  console.log(`  Actividades actualizadas: ${actividadesActualizadas}`);
  console.log(`  Confirmados preservados (no se tocaron): ${confirmadosPreservados}`);
  console.log(`  Fichas sin documento Fiche encontrado: ${fichasSinFiche}`);
  console.log(`  Fichas sin schedules en BD: ${fichasSinSchedules}`);

  process.exit(0);
}

main().catch((error) => {
  console.error("[RESYNC] Error:", error);
  process.exit(1);
});