import { complementaryAuditHelper } from "../helpers/complementaryAudit.helper.js";
import ComplementaryRequest from "../models/ComplementaryRequest.js";
import Schedule from "../models/Schedule.js";
import fs from "fs";

export const complementaryAuditController = {
  processDF14: async (req, res) => {
    try {
      if (!req.files || Object.keys(req.files).length === 0 || !req.files.file) {
        return res.status(400).json({ msg: "No se ha subido ningún archivo." });
      }

      const file = req.files.file;
      
      // Parse the file using the helper
      let auditData;
      try {
        auditData = await complementaryAuditHelper.parseDF14(file.tempFilePath);
      } catch (error) {
        return res.status(400).json({ msg: error.message || "Error procesando el archivo Excel." });
      }

      if (!auditData || auditData.length === 0) {
        return res.status(404).json({ msg: "No se encontraron fichas de 'Curso especial' válidas en el archivo." });
      }

      const results = {
        totalProcesadas: auditData.length,
        fichasEvaluadas: 0,
        fichasNoEncontradas: 0,
        faltanRutas: [],
        faltanJuicios: [],
        detalles: []
      };

      // Calcular fecha límite para juicios: hoy - 9 días
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const juiciosCutoff = new Date(today.getTime() - 9 * 24 * 60 * 60 * 1000);

      for (const item of auditData) {
        // Bug #3 fix: buscar con tipo string Y number para evitar mismatch en BD
        const request = await ComplementaryRequest.findOne({
          $or: [
            { fichaNumber: item.fichaNumber },
            { fichaNumber: parseInt(item.fichaNumber, 10) }
          ]
        }).populate("instructor", "name email emailpersonal");
        
        if (!request) {
          results.fichasNoEncontradas++;
          results.detalles.push(`Ficha ${item.fichaNumber} no encontrada en el sistema.`);
          continue;
        }

        const fichaData = {
          fichaNumber: item.fichaNumber,
          instructorName: request.instructorName || (request.instructor ? request.instructor.name : "Instructor"),
          courseName: request.catalogCourseName,
          email: request.instructor ? request.instructor.email : null,
        };

        let handled = false;

        // Proceso A: Rutas
        if (item.enTransito > 0) {
          results.faltanRutas.push({
            ...fichaData,
            pendientes: item.enTransito
          });
          results.detalles.push(`Ficha ${item.fichaNumber}: Reportada por Rutas (${item.enTransito} en tránsito).`);
          handled = true;
        }

        // Proceso B: Juicios pendientes
        // REGLA ESTRICTA: Únicamente fichas en estado 'terminada por fecha' y con fecha fin > 9 días
        const estadoNorm = (item.estado || '').toLowerCase().trim();
        const esTerminada = estadoNorm.includes('terminada');

        if (esTerminada) {
          if (item.enFormacion > 0) {
            // Verificar regla de 9 días de antigüedad para fichas terminadas
            let pasaFiltroFecha = false;
            const rawFechaFin = item.fechaFinFicha || request.fechaFin;
            if (rawFechaFin) {
              const fechaFin = new Date(rawFechaFin);
              fechaFin.setHours(0, 0, 0, 0);
              if (!isNaN(fechaFin.getTime())) {
                pasaFiltroFecha = fechaFin <= juiciosCutoff;
              }
            }

            if (pasaFiltroFecha) {
              results.faltanJuicios.push({
                ...fichaData,
                pendientes: item.enFormacion,
                fechaFinFicha: item.fechaFinFicha || request.fechaFin
              });
              results.detalles.push(`Ficha ${item.fichaNumber}: Reportada por Juicios (${item.enFormacion} pendientes, finalizada hace >9 días).`);
              handled = true;
            } else {
              results.detalles.push(`Ficha ${item.fichaNumber}: Terminada con juicios pendientes pero aún dentro del margen de 9 días.`);
            }
          } else if (item.enFormacion === 0) {
            // Todo evaluado. Marcar horarios como calificados
            const updateResult = await Schedule.updateMany(
              { complementaryRequest: request._id, status: 0, rated: { $ne: true } },
              {
                $set: {
                  rated: true,
                  dateRating: new Date(),
                  statusRating: "Calificado",
                  ratedByProcess: "audit_df14_bulk"
                }
              }
            );
            
            if (updateResult.modifiedCount > 0) {
              results.fichasEvaluadas++;
              results.detalles.push(`Ficha ${item.fichaNumber}: ${updateResult.modifiedCount} horarios marcados como Evaluados.`);
              handled = true;
            }
          }
        }

        if (!handled) {
          results.detalles.push(`Ficha ${item.fichaNumber}: Al día, sin acciones requeridas.`);
        }
      }

      // Cleanup temp file
      if (fs.existsSync(file.tempFilePath)) {
        fs.unlinkSync(file.tempFilePath);
      }

      return res.json({
        msg: "Auditoría masiva completada exitosamente.",
        results
      });

    } catch (error) {
      console.error("[AUDIT-DF14] Error general:", error);
      return res.status(500).json({ msg: "Error interno procesando auditoría DF14" });
    }
  }
};
