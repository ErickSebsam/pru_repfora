import html2pdf from "html2pdf.js"

const C = {
  headerBg:   "#2e7d32",
  headerText: "#ffffff",
  accent:     "#43a047",
  labelBg:    "#f1f8e9",
  stripeBg:   "#fafffe",
  border:     "#c8e6c9",
  text:       "#1a1a1a",
  sub:        "#5c6b5f",
}

async function toBase64(url) {
  try {
    const res  = await fetch(url)
    const blob = await res.blob()
    return await new Promise(resolve => {
      const r = new FileReader()
      r.onloadend = () => resolve(r.result)
      r.readAsDataURL(blob)
    })
  } catch { return "" }
}

function buildHtml(rows, filtros, logoSrc) {
  const fechaFormateada = filtros.fecha
    ? new Date(filtros.fecha + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    : '—'

  const filasHtml = rows.map((r, i) => `
    <tr style="${i % 2 === 0 ? '' : `background:${C.stripeBg};`}">
      <td style="text-align:center; font-weight:600;">${r.fichaNumero || '—'}</td>
      <td>${r.fichaNombre || '—'}</td>
      <td>
        <div style="font-weight:500;">${r.instructor?.name || '—'}</div>
        <div style="font-size:10px; color:${C.sub};">${r.instructor?.phone || ''}</div>
        <div style="font-size:10px; color:${C.accent};">${r.instructor?.email || ''}</div>
      </td>
      <td>${r.horario?.environment?.name || '—'}</td>
      <td style="text-align:center;">${r.horario?.tstart || ''} – ${r.horario?.tend || ''}</td>
      <td style="text-align:center; font-weight:600;">${r.horario?.hourswork || '—'}</td>
    </tr>`).join('')

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: ${C.text}; line-height: 1.5; }
    .wrap { max-width: 780px; margin: 0 auto; padding: 16px 20px; }

    .inst-header {
      display: flex; align-items: center;
      border: 2px solid ${C.border}; border-radius: 10px;
      overflow: hidden; margin-bottom: 14px;
    }
    .inst-texts { flex: 1; padding: 10px 16px; border-right: 1.5px solid ${C.border}; text-align: center; line-height: 1.6; }
    .inst-logo { width: 110px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px; }
    .inst-logo img { width: 62px; height: auto; }

    .report-meta {
      background: ${C.labelBg}; border: 1.5px solid ${C.border}; border-radius: 8px;
      padding: 10px 16px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center;
    }
    .report-meta .label { font-size: 10px; font-weight: 700; color: ${C.headerBg}; text-transform: uppercase; letter-spacing: 0.5px; }
    .report-meta .value { font-size: 12px; font-weight: 500; color: ${C.text}; margin-top: 2px; }

    .section { page-break-inside: avoid; margin-bottom: 14px; border: 1.5px solid ${C.border}; border-radius: 8px; overflow: hidden; }
    .section-title {
      background: ${C.headerBg}; color: ${C.headerText};
      font-size: 11px; font-weight: bold; text-transform: uppercase;
      letter-spacing: 0.9px; padding: 7px 14px;
    }

    table { width: 100%; border-collapse: collapse; }
    th { background: ${C.headerBg}; color: white; padding: 6px 8px; font-size: 10px; text-align: left; border: 1px solid #1b5e20; }
    td { padding: 6px 8px; border: 1px solid ${C.border}; vertical-align: top; font-size: 11px; }

    .footer { margin-top: 16px; padding: 8px 14px; background: #f5f5f5; border-left: 4px solid ${C.accent}; border-radius: 0 6px 6px 0; font-size: 10px; color: ${C.sub}; }
  </style></head><body><div class="wrap">

    <div class="inst-header">
      <div class="inst-texts">
        <div style="font-size:13px; font-weight:800;">SERVICIO NACIONAL DE APRENDIZAJE SENA</div>
        <div style="font-size:11px; font-weight:700;">SISTEMA INTEGRADO DE GESTIÓN Y AUTOCONTROL SIGA</div>
        <div style="font-size:12px; font-weight:700; margin-top:6px; color:${C.headerBg};">
          Reporte de Complementarias por Municipio y Fecha
        </div>
      </div>
      <div class="inst-logo">
        ${logoSrc ? `<img src="${logoSrc}" alt="SENA" />` : `<div style="font-size:22px; font-weight:900; color:${C.headerBg};">SENA</div>`}
      </div>
    </div>

    <div class="report-meta">
      <div>
        <div class="label">Municipio</div>
        <div class="value">${filtros.municipio || '—'}${filtros.departamento ? ` — ${filtros.departamento}` : ''}</div>
      </div>
      <div style="text-align:center;">
        <div class="label">Fecha consultada</div>
        <div class="value">${fechaFormateada}</div>
      </div>
      <div style="text-align:right;">
        <div class="label">Total fichas</div>
        <div class="value" style="font-size:16px; font-weight:700; color:${C.headerBg};">${filtros.total ?? rows.length}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Fichas con clase programada</div>
      <table>
        <thead><tr>
          <th style="width:10%;">FICHA</th>
          <th style="width:22%;">PROGRAMA</th>
          <th style="width:24%;">INSTRUCTOR</th>
          <th style="width:18%;">AMBIENTE</th>
          <th style="width:14%; text-align:center;">HORARIO</th>
          <th style="width:8%; text-align:center;">HORAS</th>
        </tr></thead>
        <tbody>
          ${filasHtml || `<tr><td colspan="6" style="text-align:center; color:#ccc; padding:20px;">Sin resultados para esta consulta</td></tr>`}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <strong>Generado el:</strong> ${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
      a las ${new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
      — REPFORA · Módulo de Complementarias
    </div>

  </div></body></html>`
}

export async function generateReporteMunicipioPdf(rows, filtros) {
  const logoSrc = await toBase64("/images/LOGO-SENA.png")
  const container = document.createElement("div")
  container.innerHTML = buildHtml(rows, filtros, logoSrc)
  document.body.appendChild(container)

  const opt = {
    margin:      [0.3, 0.3, 0.3, 0.3],
    filename:    `Reporte_Municipio_${filtros.municipio || 'SC'}_${filtros.fecha || ''}.pdf`,
    image:       { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false, allowTaint: true },
    jsPDF:       { unit: "in", format: "letter", orientation: "landscape" },
    pagebreak:   { mode: ["avoid-all", "css"] },
  }

  try {
    const blobUrl = await html2pdf().from(container).set(opt).outputPdf("bloburl")
    window.open(blobUrl, "_blank")
  } finally {
    document.body.removeChild(container)
  }
}
