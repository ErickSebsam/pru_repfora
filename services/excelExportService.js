import ExcelJS from 'exceljs';
import archiver from 'archiver';
import { Readable } from 'stream';

// ─── Paleta de colores institucional ─────────────────────────────────────────
const C = {
  navy:       '1F3864',
  navyLight:  '2E5490',
  blue:       '2F75B6',
  blueLight:  'D6E4F7',
  teal:       '17375E',
  green:      '375623',
  greenBg:    'E2EFDA',
  greenCell:  'C6EFCE',
  yellow:     '7D6608',
  yellowBg:   'FFFACD',
  yellowCell: 'FFEB9C',
  red:        '9C0006',
  redBg:      'FFE7E7',
  redCell:    'FFC7CE',
  gray1:      'F2F2F2',
  gray2:      'D9D9D9',
  white:      'FFFFFF',
  black:      '000000',
};

const FONT_BASE = 'Calibri';

// ─── Paleta ESTADO GENERAL ────────────────────────────────────────────────────
function estadoStyle(estado) {
  const e = (estado || '').toUpperCase().trim();
  if (e === 'AL DÍA')       return { fg: C.greenCell, font: C.green };
  if (e.includes('PARCIAL')) return { fg: C.yellowCell, font: C.yellow };
  if (e.includes('CRÍTICO')) return { fg: C.redCell,    font: C.red };
  return { fg: C.gray2, font: C.black };
}

// ─── Helpers de estilo ────────────────────────────────────────────────────────
function fillSolid(hex) {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${hex}` } };
}

function fontStyle({ bold = false, size = 11, color = C.black, name = FONT_BASE } = {}) {
  return { name, size, bold, color: { argb: `FF${color}` } };
}

function borderAll(style = 'thin') {
  const s = { style, color: { argb: `FF${C.gray2}` } };
  return { top: s, left: s, bottom: s, right: s };
}

function borderAllDark() {
  const s = { style: 'thin', color: { argb: `FF${C.navy}` } };
  return { top: s, left: s, bottom: s, right: s };
}

function alignCenter(wrapText = false) {
  return { horizontal: 'center', vertical: 'middle', wrapText };
}

function alignLeft() {
  return { horizontal: 'left', vertical: 'middle', wrapText: false };
}

// ─── Hoja de detalle por ficha con problemas ─────────────────────────────────
// Una fila por aprendiz para que la hoja sea filtrable con AutoFilter.
// Incluye aprendices pendientes/vencidos y los excluidos por novedad (CON NOVEDAD).
function buildFicheDetailSheet(wb, ficheSummary, items, newsExcludedItems = []) {
  const sheetName = `Ficha ${ficheSummary.ficheNumber}`.substring(0, 31);
  const ws = wb.addWorksheet(sheetName, {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    views: [{ state: 'frozen', ySplit: 5 }],
  });

  ws.columns = [
    { key: 'num',          width: 4  },
    { key: 'rap',          width: 50 },
    { key: 'instructor',   width: 22 },
    { key: 'fend',         width: 14 },
    { key: 'diasVencido',  width: 12 },
    { key: 'estado',       width: 13 },
    { key: 'tieneNovedad', width: 12 },
    { key: 'tipoNovedad',  width: 22 },
    { key: 'documento',    width: 14 },
    { key: 'aprendiz',     width: 38 },
  ];

  // ── Fila 1: ficha + programa ───────────────────────────────────────────────
  ws.mergeCells('A1:J1');
  const r1 = ws.getCell('A1');
  r1.value     = `FICHA ${ficheSummary.ficheNumber}  ·  ${(ficheSummary.programName || '').toUpperCase()}`;
  r1.fill      = fillSolid(C.navy);
  r1.font      = fontStyle({ bold: true, size: 13, color: C.white });
  r1.alignment = alignLeft();
  ws.getRow(1).height = 28;

  // ── Fila 2: coordinación + estado ─────────────────────────────────────────
  ws.mergeCells('A2:J2');
  const r2 = ws.getCell('A2');
  const estadoLabel = ficheSummary.estadoGeneral || 'SNC';
  r2.value     = `Coordinación: ${ficheSummary.coordinationName || '—'}   |   Estado: ${estadoLabel}`;
  r2.fill      = fillSolid(C.navyLight);
  r2.font      = fontStyle({ size: 10, color: C.white });
  r2.alignment = alignLeft();
  ws.getRow(2).height = 18;

  // ── Fila 3: vacía ──────────────────────────────────────────────────────────
  ws.getRow(3).height = 6;

  // ── Fila 4: cabeceras ──────────────────────────────────────────────────────
  const headers = ['#', 'RESULTADO DE APRENDIZAJE', 'INSTRUCTOR', 'FECHA LÍMITE', 'DÍAS\nVENCIDO', 'ESTADO', 'TIENE\nNOVEDAD', 'TIPO DE NOVEDAD', 'DOCUMENTO', 'APRENDIZ'];
  const r4 = ws.getRow(4);
  r4.height = 32;
  headers.forEach((h, idx) => {
    const cell = r4.getCell(idx + 1);
    cell.value     = h;
    cell.fill      = fillSolid(C.teal);
    cell.font      = fontStyle({ bold: true, size: 9, color: C.white });
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border    = borderAllDark();
  });

  // ── Construir filas: una por aprendiz ──────────────────────────────────────
  // Pendientes/Vencidos: filas normales (TIENE NOVEDAD = 'NO')
  // Excluidos por novedad: filas marcadas (TIENE NOVEDAD = 'SÍ', estado 'NOVEDAD')
  const rows = [];

  items.forEach(item => {
    const isVenc = item.isVencido || item.daysOverdue > 0;
    const estadoStr = isVenc ? 'VENCIDO' : 'PENDIENTE';
    const fendDate = item.fend ? new Date(item.fend) : null;
    const fendStr  = fendDate ? formatDate(fendDate) : '—';

    const learners = (item.isTotalMissing && (!item.missingLearners || item.missingLearners.length === 0))
      ? [{ name: '(Resultado sin evaluar)', document: '' }]
      : (item.missingLearners || []);

    learners.forEach(l => {
      rows.push({
        rap: item.outcomeText || '',
        instructor: item.instructorName || '—',
        fend: fendStr,
        diasVencido: isVenc ? (item.daysOverdue || 0) : '—',
        estado: estadoStr,
        tieneNovedad: 'NO',
        tipoNovedad: '',
        documento: l.document || '',
        aprendiz: l.name || '',
        _isVenc: isVenc,
        _isNews: false
      });
    });
  });

  newsExcludedItems.forEach(item => {
    const fendDate = item.fend ? new Date(item.fend) : null;
    const fendStr  = fendDate ? formatDate(fendDate) : '—';
    rows.push({
      rap: item.outcomeText || '',
      instructor: item.instructorName || '—',
      fend: fendStr,
      diasVencido: item.isVencido ? (item.daysOverdue || 0) : '—',
      estado: 'NOVEDAD',
      tieneNovedad: 'SÍ',
      tipoNovedad: item.noveltyType || '',
      documento: item.learnerDocument || '',
      aprendiz: item.learnerName || '',
      _isVenc: !!item.isVencido,
      _isNews: true
    });
  });

  // Ordenar: vencidos primero, luego pendientes, luego novedad
  rows.sort((a, b) => {
    const order = v => v._isNews ? 2 : (v._isVenc ? 0 : 1);
    return order(a) - order(b);
  });

  // ── Filas de datos ─────────────────────────────────────────────────────────
  rows.forEach((r, idx) => {
    const rowNum = 5 + idx;
    const row    = ws.getRow(rowNum);
    const rowBg  = r._isNews ? C.gray1 : (r._isVenc ? C.redBg : C.yellowBg);
    const newsBg = r._isNews ? C.greenBg : rowBg;

    const values = [
      idx + 1,
      r.rap,
      r.instructor,
      r.fend,
      r.diasVencido,
      r.estado,
      r.tieneNovedad,
      r.tipoNovedad,
      r.documento,
      r.aprendiz
    ];

    row.height = 18;

    values.forEach((val, colIdx) => {
      const cell  = row.getCell(colIdx + 1);
      cell.value  = val;
      cell.border = borderAll();

      if (colIdx === 0) {
        cell.fill      = fillSolid(idx % 2 === 0 ? C.white : C.gray1);
        cell.font      = fontStyle({ size: 9, bold: true, color: C.navy });
        cell.alignment = alignCenter();
      } else if (colIdx === 1) {
        // RAP: texto largo izquierda con wrap
        cell.fill      = fillSolid(rowBg);
        cell.font      = fontStyle({ size: 8.5 });
        cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      } else if (colIdx === 5) {
        // Estado
        let estadoColorBg = C.yellowCell, estadoColorFont = C.yellow;
        if (r._isVenc) { estadoColorBg = C.redCell; estadoColorFont = C.red; }
        if (r._isNews) { estadoColorBg = C.greenCell; estadoColorFont = C.green; }
        cell.fill = fillSolid(estadoColorBg);
        cell.font = fontStyle({ bold: true, size: 9, color: estadoColorFont });
        cell.alignment = alignCenter();
      } else if (colIdx === 6) {
        // TIENE NOVEDAD
        cell.fill = fillSolid(r._isNews ? C.greenCell : C.gray2);
        cell.font = fontStyle({ bold: true, size: 9, color: r._isNews ? C.green : C.black });
        cell.alignment = alignCenter();
      } else if (colIdx === 7) {
        // TIPO NOVEDAD
        cell.fill = fillSolid(newsBg);
        cell.font = fontStyle({ size: 9, bold: r._isNews });
        cell.alignment = alignCenter();
      } else if (colIdx === 9) {
        // Aprendiz
        cell.fill      = fillSolid(rowBg);
        cell.font      = fontStyle({ size: 9 });
        cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      } else {
        cell.fill      = fillSolid(rowBg);
        cell.font      = fontStyle({ size: 9 });
        cell.alignment = alignCenter();
      }
    });
  });

  // AutoFilter sobre la tabla de detalle (fila 4 = cabecera, hasta última fila con datos)
  const lastRow = 4 + rows.length;
  if (rows.length > 0) {
    ws.autoFilter = {
      from: { row: 4, column: 1 },
      to:   { row: lastRow, column: headers.length }
    };
  }
}

// ─── Construcción del workbook ────────────────────────────────────────────────
async function buildWorkbook(fichesSummary, fechaCorte, runNumber, pendientes = [], vencidos = [], newsExcluded = []) {
  const wb = new ExcelJS.Workbook();
  wb.creator  = 'SENA - Sistema de Auditoría';
  wb.created  = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet('RESUMEN SEDE', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    views: [{ state: 'frozen', ySplit: 8 }],
  });

  // Ancho de columnas
  ws.columns = [
    { key: 'num',        width: 5  },
    { key: 'ficha',      width: 12 },
    { key: 'programa',   width: 48 },
    { key: 'aprendices', width: 14 },
    { key: 'rapsTotal',  width: 11 },
    { key: 'alDia',      width: 10 },
    { key: 'noVence',    width: 13 },
    { key: 'sncParcial', width: 13 },
    { key: 'sncCritico', width: 13 },
    { key: 'sinProg',    width: 14 },
    { key: 'exclusiones',width: 16 },
    { key: 'estado',     width: 16 },
  ];

  // ── FILA 1: ENCABEZADO INSTITUCIONAL ────────────────────────────────────────
  ws.mergeCells('A1:L1');
  const r1 = ws.getRow(1);
  r1.height = 36;
  const r1c1 = ws.getCell('A1');
  r1c1.value      = 'SERVICIO NACIONAL DE APRENDIZAJE — SENA';
  r1c1.fill       = fillSolid(C.navy);
  r1c1.font       = fontStyle({ bold: true, size: 16, color: C.white });
  r1c1.alignment  = alignCenter();

  // ── FILA 2: SUBTÍTULO ────────────────────────────────────────────────────────
  ws.mergeCells('A2:L2');
  const r2 = ws.getRow(2);
  r2.height = 22;
  const r2c1 = ws.getCell('A2');
  r2c1.value     = `INFORME DE SEGUIMIENTO SNC · BARRIDO #${runNumber}  |  Corte: ${fechaCorte}  |  Acuerdo 009 de 2024 — Plazo: 8 días hábiles`;
  r2c1.fill      = fillSolid(C.navyLight);
  r2c1.font      = fontStyle({ bold: false, size: 11, color: C.white });
  r2c1.alignment = alignCenter();

  // ── FILA 3: vacía ───────────────────────────────────────────────────────────
  ws.getRow(3).height = 6;

  // ── FILAS 4-5: ESTADÍSTICAS GLOBALES ────────────────────────────────────────
  const totalFichas  = fichesSummary.length;
  const fichasConSnc = fichesSummary.filter(f => f.estadoGeneral !== 'AL DÍA').length;
  const fichasAlDia  = totalFichas - fichasConSnc;
  const rapsTotal    = fichesSummary.reduce((s, f) => s + (f.rapsTotal   || 0), 0);
  const rapsSncTotal = fichesSummary.reduce((s, f) => s + (f.sncParcial  || 0) + (f.sncCritico || 0), 0);
  const rapsAlDia    = fichesSummary.reduce((s, f) => s + (f.alDia       || 0), 0);

  // Pares [label, valor, colorLabel, colorVal]
  const stats = [
    ['FICHAS ANALIZADAS', totalFichas,  C.blue,    C.blueLight],
    ['FICHAS CON SNC',    fichasConSnc, C.red,     C.redBg    ],
    ['FICHAS AL DÍA',     fichasAlDia,  C.green,   C.greenBg  ],
    ['RAPs TOTAL',        rapsTotal,    C.blue,    C.blueLight],
    ['RAPs CON SNC',      rapsSncTotal, C.red,     C.redBg    ],
    ['RAPs AL DÍA',       rapsAlDia,   C.green,   C.greenBg  ],
  ];

  // Distribución: 2 columnas por stat → columnas A-B, C-D, E-F, G-H, I-J, K-L
  const statCols = ['A','C','E','G','I','K'];
  ws.getRow(4).height = 20;
  ws.getRow(5).height = 28;

  stats.forEach(([label, val, colorLbl, colorVal], idx) => {
    const col = statCols[idx];
    const nextCol = String.fromCharCode(col.charCodeAt(0) + 1);

    ws.mergeCells(`${col}4:${nextCol}4`);
    const lCell = ws.getCell(`${col}4`);
    lCell.value     = label;
    lCell.fill      = fillSolid(colorLbl);
    lCell.font      = fontStyle({ bold: true, size: 9, color: C.white });
    lCell.alignment = alignCenter();
    lCell.border    = borderAllDark();

    ws.mergeCells(`${col}5:${nextCol}5`);
    const vCell = ws.getCell(`${col}5`);
    vCell.value     = val;
    vCell.fill      = fillSolid(colorVal);
    vCell.font      = fontStyle({ bold: true, size: 16, color: colorLbl });
    vCell.alignment = alignCenter();
    vCell.border    = borderAllDark();
  });

  // ── FILA 6: vacía ───────────────────────────────────────────────────────────
  ws.getRow(6).height = 6;

  // ── FILA 7: NOTA LEGAL ──────────────────────────────────────────────────────
  ws.mergeCells('A7:L7');
  const r7 = ws.getRow(7);
  r7.height = 16;
  const r7c1 = ws.getCell('A7');
  r7c1.value     = '⚠ Los RAPs con estado SNC CRÍTICO superan el plazo de 8 días hábiles establecido en el Acuerdo 009 de 2024. Se requiere acción inmediata.';
  r7c1.fill      = fillSolid(C.yellowBg);
  r7c1.font      = fontStyle({ bold: false, size: 9, color: C.yellow });
  r7c1.alignment = alignLeft();

  // ── FILA 8: CABECERAS DE TABLA ───────────────────────────────────────────────
  const headers = [
    '#', 'FICHA', 'PROGRAMA DE FORMACIÓN',
    'APRENDICES\nACTIVOS', 'RAPs\nTOTAL',
    'AL\nDÍA', 'AÚN NO\nVENCE', 'SNC\nPARCIAL', 'SNC\nCRÍTICO',
    'SIN\nPROGRAMAR', 'RAPs CON\nEXCLUSIONES', 'ESTADO\nGENERAL',
  ];

  const r8 = ws.getRow(8);
  r8.height = 38;
  headers.forEach((h, colIdx) => {
    const cell = r8.getCell(colIdx + 1);
    cell.value     = h;
    cell.fill      = fillSolid(C.navy);
    cell.font      = fontStyle({ bold: true, size: 9, color: C.white });
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border    = { top: { style: 'medium', color: { argb: `FF${C.white}` } }, left: { style: 'thin', color: { argb: `FF${C.gray2}` } }, bottom: { style: 'medium', color: { argb: `FF${C.white}` } }, right: { style: 'thin', color: { argb: `FF${C.gray2}` } } };
  });

  // ── FILAS DE DATOS ───────────────────────────────────────────────────────────
  fichesSummary.forEach((f, idx) => {
    const rowNum = 9 + idx;
    const row    = ws.getRow(rowNum);
    row.height   = 18;

    const isEven  = idx % 2 === 0;
    const rowFill = isEven ? C.white : C.gray1;
    const es      = estadoStyle(f.estadoGeneral);

    const values = [
      idx + 1,
      f.ficheNumber,
      (f.programName || '').toUpperCase(),
      f.aprendicesActivos || 0,
      f.rapsTotal         || 0,
      f.alDia             || 0,
      f.aunNoVence        || 0,
      f.sncParcial        || 0,
      f.sncCritico        || 0,
      f.sinProgramar      || 0,
      f.rapsConExclusiones|| 0,
      f.estadoGeneral     || 'AL DÍA',
    ];

    values.forEach((val, colIdx) => {
      const cell  = row.getCell(colIdx + 1);
      cell.value  = val;
      cell.border = borderAll();

      // Columna ESTADO: color propio
      if (colIdx === 11) {
        cell.fill      = fillSolid(es.fg);
        cell.font      = fontStyle({ bold: true, size: 9, color: es.font });
        cell.alignment = alignCenter();
      } else {
        cell.fill = fillSolid(rowFill);
        cell.font = fontStyle({ size: 9 });
        if (colIdx === 2) {
          cell.alignment = alignLeft();
        } else if (colIdx === 0) {
          cell.alignment = alignCenter();
          cell.font = fontStyle({ size: 9, color: C.navy });
        } else {
          cell.alignment = alignCenter();
          // Resaltar SNC > 0
          if ((colIdx === 7 || colIdx === 8) && val > 0) {
            cell.fill = fillSolid(colIdx === 8 ? C.redBg : C.yellowBg);
            cell.font = fontStyle({ bold: true, size: 9, color: colIdx === 8 ? C.red : C.yellow });
          }
        }
      }
    });
  });

  // ── FILA TOTALES ─────────────────────────────────────────────────────────────
  const totalRow    = ws.getRow(9 + fichesSummary.length);
  totalRow.height   = 20;
  const totalValues = [
    'TOTAL', '',
    `${fichesSummary.length} fichas`,
    fichesSummary.reduce((s, f) => s + (f.aprendicesActivos || 0), 0),
    fichesSummary.reduce((s, f) => s + (f.rapsTotal         || 0), 0),
    fichesSummary.reduce((s, f) => s + (f.alDia             || 0), 0),
    fichesSummary.reduce((s, f) => s + (f.aunNoVence        || 0), 0),
    fichesSummary.reduce((s, f) => s + (f.sncParcial        || 0), 0),
    fichesSummary.reduce((s, f) => s + (f.sncCritico        || 0), 0),
    fichesSummary.reduce((s, f) => s + (f.sinProgramar      || 0), 0),
    fichesSummary.reduce((s, f) => s + (f.rapsConExclusiones|| 0), 0),
    '',
  ];

  totalValues.forEach((val, colIdx) => {
    const cell  = totalRow.getCell(colIdx + 1);
    cell.value  = val;
    cell.fill   = fillSolid(C.navy);
    cell.font   = fontStyle({ bold: true, size: 9, color: C.white });
    cell.border = borderAllDark();
    cell.alignment = colIdx === 2 ? alignLeft() : alignCenter();
  });

  // ── Hojas de detalle para fichas con problemas ──────────────────────────────
  if (pendientes.length > 0 || vencidos.length > 0 || newsExcluded.length > 0) {
    const allItems = [...vencidos, ...pendientes];
    // Fichas que tienen pendientes/vencidos O aprendices excluidos por novedad
    const fichasConNovedad = new Set(newsExcluded.map(n => String(n.ficheNumber)));
    const fichasConProblemasSet = new Set(
      fichesSummary
        .filter(f => f.estadoGeneral !== 'AL DÍA')
        .map(f => String(f.ficheNumber))
    );
    // Unión de fichas con problemas y fichas con novedad
    for (const fn of fichasConNovedad) fichasConProblemasSet.add(fn);
    const fichasParaDetalle = fichesSummary.filter(f => fichasConProblemasSet.has(String(f.ficheNumber)));

    for (const ficheSummary of fichasParaDetalle) {
      const ficheItems = allItems.filter(i => String(i.ficheNumber) === String(ficheSummary.ficheNumber));
      const ficheNews  = newsExcluded.filter(n => String(n.ficheNumber) === String(ficheSummary.ficheNumber));
      if (ficheItems.length > 0 || ficheNews.length > 0) {
        buildFicheDetailSheet(wb, ficheSummary, ficheItems, ficheNews);
      }
    }
  }

  return wb;
}

// ─── API pública ──────────────────────────────────────────────────────────────

export async function generateResumenSedeXLSX({ fichesSummary = [], executionDate, runNumber = 1, pendientes = [], vencidos = [], newsExcluded = [] }) {
  const fechaCorte = formatDate(executionDate || new Date());
  const wb = await buildWorkbook(fichesSummary, fechaCorte, runNumber, pendientes, vencidos, newsExcluded);
  return wb.xlsx.writeBuffer();
}

export async function generateResumenPorCoordinacionZIP({ fichesSummary = [], executionDate, runNumber = 1, pendientes = [], vencidos = [], newsExcluded = [] }) {
  return new Promise(async (resolve, reject) => {
    const chunks  = [];
    const archive = archiver('zip', { zlib: { level: 6 } });

    archive.on('data',  chunk => chunks.push(chunk));
    archive.on('end',   () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);

    const fechaFile = (executionDate ? new Date(executionDate) : new Date()).toISOString().split('T')[0];

    const bufGeneral = await generateResumenSedeXLSX({ fichesSummary, executionDate, runNumber, pendientes, vencidos, newsExcluded });
    archive.append(Readable.from(bufGeneral), { name: `resumen-sede-${fechaFile}.xlsx` });

    const byCoord = new Map();
    for (const f of fichesSummary) {
      const key = f.coordinationName || 'SIN_COORDINACION';
      if (!byCoord.has(key)) byCoord.set(key, []);
      byCoord.get(key).push(f);
    }

    for (const [coordName, fichas] of byCoord) {
      const coordPend = pendientes.filter(p => fichas.some(f => String(f.ficheNumber) === String(p.ficheNumber)));
      const coordVenc = vencidos.filter(v => fichas.some(f => String(f.ficheNumber) === String(v.ficheNumber)));
      const coordNews = newsExcluded.filter(n => fichas.some(f => String(f.ficheNumber) === String(n.ficheNumber)));
      const buf       = await generateResumenSedeXLSX({ fichesSummary: fichas, executionDate, runNumber, pendientes: coordPend, vencidos: coordVenc, newsExcluded: coordNews });
      const safeName  = coordName.replace(/[/\\?%*:|"<>]/g, '_').trim();
      archive.append(Readable.from(buf), { name: `${safeName}-${fechaFile}.xlsx` });
    }

    archive.finalize();
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date) {
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}
