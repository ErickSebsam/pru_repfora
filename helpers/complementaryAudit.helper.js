import * as XLSX from "xlsx/xlsx.mjs";
import fs from "fs";

XLSX.set_fs(fs);

function normalizeKey(str) {
  if (!str || typeof str !== 'string') return '';
  // Convert to lowercase, remove accents, trim, and replace spaces with underscores
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, '_');
}

function parseDF14Date(val) {
  if (!val && val !== 0) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'number') {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return isNaN(date.getTime()) ? null : date;
  }
  if (typeof val === 'string') {
    const str = val.trim();
    if (!str) return null;
    const ddmmyyyyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyyMatch) {
      const [, day, month, year] = ddmmyyyyMatch;
      const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      return isNaN(date.getTime()) ? null : date;
    }
    const yyyymmddMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
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

export const complementaryAuditHelper = {
  parseDF14: async (filePath) => {
    try {
      // Read file. xlsx handles both true .xlsx and XML Spreadsheet (.xls)
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      // Get raw data as array of arrays to find headers
      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      
      let headerRowIndex = -1;
      let headers = [];
      
      // Find the header row by looking for key columns
      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        const rowString = row.join("").toLowerCase();
        
        // Typical DF14 headers
        if (rowString.includes("ficha") && rowString.includes("nivel")) {
          headerRowIndex = i;
          headers = row.map(normalizeKey);
          break;
        }
      }
      
      if (headerRowIndex === -1) {
        throw new Error("No se pudo identificar la cabecera de la tabla en el archivo Excel. Asegúrese de que es un reporte válido (DF14).");
      }
      
      // Process data rows
      const data = [];
      for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        // Skip empty rows
        if (!row || row.length === 0 || !row.some(val => val !== "")) continue;
        
        const rowObj = {};
        headers.forEach((header, index) => {
          if (header) {
            rowObj[header] = row[index];
          }
        });
        
        // Filter only "curso especial" (complementarias)
        const nivel = (rowObj["nivel_de_formacion"] || rowObj["nivel_formacion"] || "").toString().toLowerCase();
        if (nivel.includes("curso especial")) {
          
          const ficha = (rowObj["ficha"] || "").toString().trim();
          const estado = (rowObj["estado_de_ficha"] || rowObj["estado_ficha"] || rowObj["estado"] || "").toString().toLowerCase().trim();
          
          // Parse numbers safely
          const enTransito = parseInt(rowObj["aprendices_en_transito"] || rowObj["en_transito"] || rowObj["transito"] || 0, 10) || 0;
          const enFormacion = parseInt(rowObj["en_formacion"] || rowObj["aprendices_en_formacion"] || rowObj["formacion"] || 0, 10) || 0;
          
          // Parse fecha_fin_ficha safely
          const rawFechaFin = rowObj["fecha_fin_ficha"] || rowObj["fecha_fin_de_ficha"] || rowObj["fecha_fin"] || rowObj["fecha_finalizacion_ficha"] || rowObj["fecha_finalizacion"] || rowObj["fecha_fin_formacion"];
          const fechaFinFicha = parseDF14Date(rawFechaFin);

          if (ficha) {
            data.push({
              fichaNumber: ficha,
              estado,
              enTransito,
              enFormacion,
              fechaFinFicha
            });
          }
        }
      }
      
      return data;
      
    } catch (error) {
      console.error("[AUDIT-HELPER] Error parseando DF14:", error);
      throw error;
    }
  }
};
