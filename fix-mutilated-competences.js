/**
 * fix-english-competence.js
 *
 * Reemplazo puntual del nombre de la competencia de inglés (código oficial
 * SENA: 240202501) en Planning. No todas las fichas quedaron cortadas con el
 * mismo texto exacto, así que en vez de comparar por texto, se identifica la
 * competencia por su CÓDIGO (que sí es estable en todas las fichas).
 *
 * El nombre correcto se trae EN VIVO de la colección "competences" (no está
 * escrito a mano en el script) — específicamente del documento con _id
 * 64a8694b904dc8a4b5e1f680, que ya confirmamos manualmente que tiene el
 * texto completo (de los ~60 duplicados de esta competencia en el catálogo,
 * varios están incompletos; este es el que sí está bien).
 *
 * Uso: node fix-english-competence.js
 */
import dotenv from 'dotenv';
dotenv.config();

import dbConnection from './database.js';
import Planning from './models/Planning.js';
import Competence from './models/Competence.js';

const CODIGO_INGLES = '240202501';
const ID_COMPETENCIA_BUENA = '64a8694b904dc8a4b5e1f680';

async function main() {
  await dbConnection();

  const competenciaBuena = await Competence.findById(ID_COMPETENCIA_BUENA).lean();
  if (!competenciaBuena || !competenciaBuena.name) {
    console.error(`[FIX_ENGLISH] No se encontró la competencia ${ID_COMPETENCIA_BUENA} en "competences". Abortando.`);
    process.exit(1);
  }

  const nombreCorrecto = competenciaBuena.name.trim();
  console.log(`[FIX_ENGLISH] Nombre correcto traído de competences: "${nombreCorrecto}"\n`);

  const plannings = await Planning.find({});
  console.log(`[FIX_ENGLISH] ${plannings.length} planning(s) encontrados.`);

  let documentosActualizados = 0;
  let competenciasReparadas = 0;

  for (const planningDoc of plannings) {
    let seActualizoAlgo = false;

    for (const phase of planningDoc.pedagogicalPlanning?.content || []) {
      for (const comp of phase.competencies || []) {
        if (String(comp.code || '').trim() !== CODIGO_INGLES) continue;
        if ((comp.name || '').trim().toUpperCase() === nombreCorrecto.toUpperCase()) continue;

        console.log(`[REPARADO] Ficha ${planningDoc.pedagogicalPlanning.fiche}`);
        console.log(`  - Antes: "${comp.name}"`);

        comp.name = nombreCorrecto.toUpperCase();
        seActualizoAlgo = true;
        competenciasReparadas++;
      }
    }

    if (seActualizoAlgo) {
      planningDoc.markModified('pedagogicalPlanning.content');
      await planningDoc.save();
      documentosActualizados++;
    }
  }

  console.log('\n[FIX_ENGLISH] Resumen:');
  console.log(`  Documentos actualizados: ${documentosActualizados}`);
  console.log(`  Competencias reparadas: ${competenciasReparadas}`);

  process.exit(0);
}

main().catch((error) => {
  console.error('[FIX_ENGLISH] Error:', error);
  process.exit(1);
});