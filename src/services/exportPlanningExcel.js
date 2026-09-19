import xlsx from 'xlsx-js-style';

export const exportPlanningToExcel = (planningData, $q) => {
  if (!planningData) {
    if ($q) $q.notify({ message: 'No hay datos de planeación para exportar', color: 'red-8' });
    return;
  }

  try {
    const metadata = planningData.metadata || {};

    // Crear el libro de Excel
    const wb = xlsx.utils.book_new();
    const aoa = [];

    const rowHeights = [
      { hpt: 15 }, { hpt: 15 }, { hpt: 20 }, { hpt: 20 }, { hpt: 20 }, { hpt: 20 }, { hpt: 20 }, { hpt: 20 }, { hpt: 20 }, { hpt: 20 }, { hpt: 20 }, { hpt: 20 }, { hpt: 20 }, { hpt: 20 },
      { hpt: 60 }, // Fila 15 (index 14)
      { hpt: 45 }, // Fila 16 (index 15)
      { hpt: 35 }  // Fila 17 (index 16)
    ];

    // Fila 1 (index 0): Logo y Versión
    aoa.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Código: \nGFPI-F-134']);
    // Fila 2 (index 1): Logo y Código
    aoa.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ' Versión: 05']);

    // Fila 3 (index 2): Cabecera institucional
    aoa.push(['PROCESO', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);

    // Fila 4 (index 3): Nombre del formato
    aoa.push(['GESTIÓN DE FORMACIÓN PROFESIONAL INTEGRAL', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);

    // Fila 5 (index 4)
    aoa.push(['NOMBRE DEL FORMATO', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);

    // Fila 6 (index 5)
    aoa.push(['FORMATO PLANEACIÓN PEDAGÓGICA', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);

    // Fila 7 (index 6): Clasificación de la información
    aoa.push(['CLASIFICACIÓN DE LA INFORMACIÓN', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);

    // Fila 8 (index 7): Valores Clasificación de la información
    aoa.push(['Pública  ☐', '', '', '', '', 'Pública Clasificada  ☐', '', '', '', '', '', 'Pública Reservada  ☐', '', '', '', '']);

    // Fila 9 (index 8): Fecha de elaboración
    aoa.push(['Fecha de Elaboración', '', '', '', new Date().toLocaleDateString('es-CO'), '', '', '', '', '', '', '', '', '', '', '']);

    // Fila 10 (index 9): Denominación del programa
    aoa.push(['Denominación del Programa de Formación', '', '', '', metadata.programName || 'TECNOLOGO EN ANALISIS Y DESARROLLO DE SOFTWARE', '', '', '', '', '', '', '', '', '', '', '']);

    // Fila 11 (index 10): Modalidad de formación
    aoa.push(['Modalidad de Formación', '', '', '', metadata.modality || metadata.modalidad || 'Presencial', '', '', '', '', '', '', '', '', '', '', '']);

    // Fila 12 (index 11): Código y versión del programa
    aoa.push(['Código y versión del Programa de Formación', '', '', '', `${metadata.programCode || ''} v ${metadata.version || '1.0'}`, '', '', '', '', '', '', '', '', '', '', '']);

    // Fila 13 (index 12): Nombre del Proyecto Formativo
    aoa.push(['Nombre del Proyecto Formativo (no aplica para complementaria)', '', '', '', metadata.projectName || metadata.projectFormativo || metadata.proyecto || '', '', '', '', '', '', '', '', '', '', '', '']);

    // Fila 14 (index 13): Código de proyecto / ficha
    aoa.push(['Código del Proyecto (no aplica para complementaria)', '', '', '', metadata.projectCode || '', '', '', '', '', '', '', '', '', '', '', '']);

    // Fila 15 (index 14): Equipo gestor
    aoa.push([
      'Nombre Completo de los integrantes del   Equipo de Gestión Curricular  que realizó la planeación pedagógica', '', '', '',
      'Nombres y Apellidos', '', '', '', '', '',
      'Regional y Centro de formación', '', '', '', '', ''
    ]);

    // Fila 16 (index 15): Cabeceras de la tabla
    aoa.push([
      'FASE DE PROYECTO FORMATIVO (Si el programa es de titulada)',
      'ACTIVIDAD DE PROYECTO FORMATIVO  ( si el programa es titulada)',
      'COMPETENCIA',
      'RESULTADOS DE APRENDIZAJE',
      'SABERES DE CONCEPTOS Y PRINCIPIOS',
      'SABERES DE PROCESO',
      'CRITERIOS DE EVALUACIÓN',
      'ACTIVIDADES DE APRENDIZAJE A DESARROLLAR',
      'DURACIÓN ACTIVIDAD DE APRENDIZAJE (HORAS)',
      '',
      'DESCRIPCIÓN DE LA EVIDENCIA DE APRENDIZAJE',
      'ESTRATEGIAS DIDÁCTICAS ACTIVAS',
      'AMBIENTES  DE \nAPRENDIZAJE TIPIFICADOS',
      '',
      '',
      'OBSERVACIONES'
    ]);

    // Fila 17 (index 16): Subcabeceras de la tabla
    aoa.push([
      '', '', '', '', '', '', '', '',
      'HORAS TRABAJO DIRECTO',
      'HORAS TRABAJO INDEPENDIENTE',
      '', '',
      'AMBIENTE  ',
      'MATERIALES DE FORMACIÓN',
      'INSTRUCTORES RESPONSABLES',
      ''
    ]);

    // Recorrer el contenido pedagógico de la planeación
    const content = planningData.content || [];
    const phaseTranslations = {
      'INDUCCION': 'INDUCCIÓN',
      'ANALYSIS': 'ANÁLISIS',
      'PLANNING': 'PLANEACIÓN',
      'EXECUTION': 'EJECUCIÓN',
      'EVALUATION': 'EVALUACIÓN',
      'ETAPA_PRODUCTIVA': 'ETAPA PRODUCTIVA'
    };

    content.forEach((phase) => {
      const phaseRaw = phase.phase || '';
      const phaseName = phaseTranslations[phaseRaw.toUpperCase()] || phaseRaw;
      const generalProjectActivity = phase.projectActivity || '';

      (phase.competencies || []).forEach((comp) => {
        // Limpiar basura común de encabezados de página del PDF
        const cleanList = (arr) => {
          return (arr || [])
            .filter(x => {
              const txt = (x || '').toUpperCase();
              return !txt.includes('PAGE') &&
                !txt.includes('LÍNEA TECNOLÓGICA') &&
                !txt.includes('RED TECNOLÓGICA') &&
                !txt.includes('RED DE CONOCIMIENTO') &&
                !txt.includes('SERVICIOS PERSONALES');
            });
        };

        const concepts = cleanList(comp.knowledge?.conceptsAndPrinciples).map(x => `* ${x}`).join('\n');
        const processes = cleanList(comp.knowledge?.processes).map(x => `* ${x}`).join('\n');

        (comp.learningOutcomes || []).forEach((rap, rapIdx) => {
          const projectActivity = rap.projectActivity || generalProjectActivity;
          // Fallback de criterios de evaluación
          const criteriaList = (rap.evaluationCriteria && rap.evaluationCriteria.length > 0)
            ? rap.evaluationCriteria
            : (comp.evaluationCriteria || comp.criterios_de_evaluacion || comp.criteria || []);
          const evalCriteria = cleanList(criteriaList).map(x => `* ${x}`).join('\n');

          (rap.pedagogicalActivities || []).forEach((act) => {
            const evidences = (act.learningEvidences || []).map(x => `* ${x}`).join('\n');
            const strategies = (act.didacticStrategies || []).map(x => `* ${x}`).join('\n');
            const materials = (act.environment?.materials || []).map(x => `* ${x}`).join('\n');
            const envType = act.environment?.type || 'No definido';

            // Requisitos académicos de la competencia (Perfil del Instructor)
            const academicReqs = comp.academicRequirements || '';

            // Fechas programadas en Observaciones
            const obsDates = (act.scheduleDetails && act.scheduleDetails.assignedDays && act.scheduleDetails.assignedDays.length > 0)
              ? `Fechas programadas:\n${act.scheduleDetails.assignedDays.join(', ')}`
              : '';

            const rapText = `${comp.code || ''}-${rapIdx + 1} ${rap.description || ''}`;

            const rowData = [
              phaseName,
              projectActivity,
              comp.name || '',
              rapText,
              concepts,
              processes,
              evalCriteria,
              act.description || '',
              Number(act.hours?.direct) || 0,
              Number(act.hours?.independent) || 0,
              evidences,
              strategies,
              envType,
              materials,
              academicReqs,
              obsDates
            ];

            // Calcular cuántos saltos de línea (\n) tiene la celda más larga
            let maxLines = 1;
            rowData.forEach(val => {
              if (typeof val === 'string') {
                const lines = val.split('\n').length;
                if (lines > maxLines) maxLines = lines;
              }
            });

            // 12 puntos por línea + 10 puntos de margen de seguridad (mínimo 20pt)
            const dynamicHeight = Math.max(20, (maxLines * 12) + 10);
            rowHeights.push({ hpt: dynamicHeight });

            aoa.push(rowData);
          });
        });
      });
    });

    const ws = xlsx.utils.aoa_to_sheet(aoa);

    // Mostrar el texto institucional "SENA" en verde y negrita para 100% compatibilidad
    ws['A1'] = {
      v: 'SENA',
      s: {
        font: { name: 'Calibri', sz: 20, bold: true, color: { rgb: '39A900' } }, // Verde institucional SENA
        alignment: { horizontal: 'center', vertical: 'center' }
      }
    };

    // Configurar fusiones (merges) de celdas según el template V05
    ws['!merges'] = [
      { s: { c: 0, r: 0 }, e: { c: 14, r: 1 } },
      { s: { c: 0, r: 2 }, e: { c: 15, r: 2 } },
      { s: { c: 0, r: 3 }, e: { c: 15, r: 3 } },
      { s: { c: 0, r: 4 }, e: { c: 15, r: 4 } },
      { s: { c: 0, r: 5 }, e: { c: 15, r: 5 } },
      { s: { c: 0, r: 6 }, e: { c: 15, r: 6 } },

      { s: { c: 0, r: 7 }, e: { c: 4, r: 7 } },
      { s: { c: 5, r: 7 }, e: { c: 9, r: 7 } },
      { s: { c: 10, r: 7 }, e: { c: 15, r: 7 } },

      { s: { c: 0, r: 8 }, e: { c: 3, r: 8 } },
      { s: { c: 4, r: 8 }, e: { c: 15, r: 8 } },

      { s: { c: 0, r: 9 }, e: { c: 3, r: 9 } },
      { s: { c: 4, r: 9 }, e: { c: 15, r: 9 } },

      { s: { c: 0, r: 10 }, e: { c: 3, r: 10 } },
      { s: { c: 4, r: 10 }, e: { c: 15, r: 10 } },

      { s: { c: 0, r: 11 }, e: { c: 3, r: 11 } },
      { s: { c: 4, r: 11 }, e: { c: 15, r: 11 } },

      { s: { c: 0, r: 12 }, e: { c: 3, r: 12 } },
      { s: { c: 4, r: 12 }, e: { c: 15, r: 12 } },

      { s: { c: 0, r: 13 }, e: { c: 3, r: 13 } },
      { s: { c: 4, r: 13 }, e: { c: 15, r: 13 } },

      { s: { c: 0, r: 14 }, e: { c: 3, r: 14 } },
      { s: { c: 4, r: 14 }, e: { c: 9, r: 14 } },
      { s: { c: 10, r: 14 }, e: { c: 15, r: 14 } },

      { s: { c: 0, r: 15 }, e: { c: 0, r: 16 } },
      { s: { c: 1, r: 15 }, e: { c: 1, r: 16 } },
      { s: { c: 2, r: 15 }, e: { c: 2, r: 16 } },
      { s: { c: 3, r: 15 }, e: { c: 3, r: 16 } },
      { s: { c: 4, r: 15 }, e: { c: 4, r: 16 } },
      { s: { c: 5, r: 15 }, e: { c: 5, r: 16 } },
      { s: { c: 6, r: 15 }, e: { c: 6, r: 16 } },
      { s: { c: 7, r: 15 }, e: { c: 7, r: 16 } },
      { s: { c: 8, r: 15 }, e: { c: 9, r: 15 } },
      { s: { c: 10, r: 15 }, e: { c: 10, r: 16 } },
      { s: { c: 11, r: 15 }, e: { c: 11, r: 16 } },
      { s: { c: 12, r: 15 }, e: { c: 14, r: 15 } },
      { s: { c: 15, r: 15 }, e: { c: 15, r: 16 } }
    ];

    ws['!cols'] = [
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 25 }, { wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 30 }, { wch: 20 }
    ];
    ws['!rows'] = rowHeights;

    const borderThin = {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } }
    };

    for (const key in ws) {
      if (key[0] === '!') continue;

      const match = key.match(/^([A-Z]+)(\d+)$/);
      if (!match) continue;

      const col = match[1];
      const row = parseInt(match[2], 10);
      const cell = ws[key];

      if (row === 1 || row === 2) {
        if (col === 'P') {
          cell.s = {
            font: { name: 'Calibri', sz: 9, color: { rgb: '000000' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: borderThin
          };
        }
      } else if (row === 3 || row === 5 || row === 7) {
        // Filas de color Negro con texto Blanco
        cell.s = {
          fill: { fgColor: { rgb: '000000' } },
          font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: borderThin
        };
      } else if (row === 4 || row === 6) {
        // Filas de color Blanco con texto Negro
        cell.s = {
          fill: { fgColor: { rgb: 'FFFFFF' } },
          font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '000000' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: borderThin
        };
      } else if (row === 8) {
        cell.s = {
          fill: { fgColor: { rgb: 'FFFFFF' } },
          font: { name: 'Calibri', sz: 9, bold: true, color: { rgb: '000000' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: borderThin
        };
      } else if (row >= 9 && row <= 15) {
        const isLabel = (col === 'A' || col === 'B' || col === 'C' || col === 'D' || (row === 15 && (col === 'E' || col === 'K')));
        cell.s = {
          fill: { fgColor: { rgb: 'FFFFFF' } },
          font: { name: 'Calibri', sz: 9, bold: isLabel, color: { rgb: '000000' } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border: borderThin
        };
      } else if (row === 16 || row === 17) {
        cell.s = {
          fill: { fgColor: { rgb: '595959' } },
          font: { name: 'Calibri', sz: 9, bold: true, color: { rgb: 'FFFFFF' } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border: borderThin
        };
      } else if (row >= 18) {
        // Centrar Fase (A), Act. Proyecto (B), Competencia (C), RAP (D), Actividades (H), Horas (I, J), Evidencias (K), Estrategias (L), Ambiente (M), Materiales (N), Instructores (O) y Observaciones/Fechas (P)
        const isCenterCol = (col === 'A' || col === 'B' || col === 'C' || col === 'D' || col === 'H' || col === 'I' || col === 'J' || col === 'K' || col === 'L' || col === 'M' || col === 'N' || col === 'O' || col === 'P');
        cell.s = {
          font: { name: 'Calibri', sz: 9, color: { rgb: '000000' } },
          alignment: {
            horizontal: isCenterCol ? 'center' : 'left',
            vertical: isCenterCol ? 'center' : 'top',
            wrapText: true
          },
          border: borderThin
        };
      }
    }

    xlsx.utils.book_append_sheet(wb, ws, 'PLANEACION');

    const fileName = `Planeacion_Pedagogica_Ficha_${planningData.fiche || 'Sin_Ficha'}.xlsx`;
    xlsx.writeFile(wb, fileName);

    if ($q) {
      $q.notify({
        message: '¡Excel oficial de Planeación exportado con éxito con formato estandarizado (V05)!',
        color: 'green-9',
        icon: 'check_circle',
        position: 'top'
      });
    }
  } catch (error) {
    console.error('Error al exportar a Excel:', error);
    if ($q) {
      $q.notify({
        message: 'Error al exportar a Excel oficial con estilos',
        color: 'red-8',
        icon: 'error',
        position: 'top'
      });
    }
  }
};