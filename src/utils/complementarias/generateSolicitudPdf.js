import html2pdf from "html2pdf.js"

const C = {
  headerBg:   "#2e7d32",
  headerText: "#ffffff",
  accent:     "#43a047",
  labelBg:    "#f1f8e9",
  stripeBg:   "#fafffe",
  border:     "#c8e6c9",
  cardBg:     "#ffffff",
  text:       "#1a1a1a",
  sub:        "#5c6b5f",
  noteBg:     "#f5f5f5",
  noteBorder: "#66bb6a",
}

const PENDIENTE = '<span style="color:#bbb;font-style:italic;">Sin registrar</span>'

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

const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: ${C.text}; line-height: 1.5; }
  .wrap { max-width: 760px; margin: 0 auto; padding: 18px 22px; }
  .inst-header { display: flex; align-items: center; border: 2px solid ${C.border}; border-radius: 10px; overflow: hidden; margin-bottom: 16px; }
  .inst-texts { flex: 1; padding: 12px 18px; border-right: 1.5px solid ${C.border}; text-align: center; line-height: 1.65; }
  .inst-logo { width: 120px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 12px 10px; }
  .inst-logo img { width: 68px; height: auto; }
  .inst-meta { background: ${C.labelBg}; padding: 5px 18px; font-size: 10.5px; border-top: 1px solid ${C.border}; display: flex; justify-content: space-between; }
  .section { page-break-inside: avoid; margin-bottom: 14px; border: 1.5px solid ${C.border}; border-radius: 8px; overflow: hidden; }
  .section-title { background: ${C.headerBg}; color: ${C.headerText}; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.9px; padding: 7px 14px; }
  .section-body { padding: 0; }
  .dt { width: 100%; border-collapse: collapse; }
  .dt td { padding: 6px 12px; border-bottom: 1px solid ${C.border}; vertical-align: top; }
  .dt tr:last-child td { border-bottom: none; }
  .dt tr:nth-child(even) td { background: ${C.stripeBg}; }
  .lbl { font-weight: 600; color: ${C.headerBg}; width: 34%; background: ${C.labelBg} !important; font-size: 11px; }
  .val { font-size: 12px; color: ${C.text}; }
  .dt2 { width: 100%; border-collapse: collapse; }
  .dt2 td { padding: 6px 10px; border-bottom: 1px solid ${C.border}; border-right: 1px solid ${C.border}; vertical-align: top; }
  .dt2 tr:last-child td { border-bottom: none; }
  .dt2 tr:nth-child(even) td { background: ${C.stripeBg}; }
  .lbl2 { font-weight: 600; color: ${C.headerBg}; width: 18%; background: ${C.labelBg} !important; font-size: 11px; }
  .val2 { font-size: 12px; width: 32%; }
  .req-grid { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 12px; }
  .req-item { flex: 0 0 calc(50% - 3px); display: flex; align-items: flex-start; gap: 6px; background: ${C.labelBg}; border: 1px solid ${C.border}; border-radius: 6px; padding: 6px 10px; font-size: 11px; line-height: 1.4; }
  .req-icon { color: ${C.accent}; font-size: 13px; flex-shrink: 0; margin-top: 1px; }
  .sess-table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .sess-table th { background: ${C.headerBg}; color: white; padding: 5px 6px; text-align: center; font-size: 10px; border: 1px solid #1b5e20; }
  .sess-table td { text-align: center; padding: 4px 6px; border: 1px solid ${C.border}; font-size: 11px; }
  .sess-table tr:nth-child(even) td { background: ${C.stripeBg}; }
  .sess-total { display: flex; justify-content: flex-end; gap: 16px; padding: 6px 14px 10px; font-size: 11.5px; font-weight: 600; }
  .sess-total span { color: ${C.sub}; }
  .sess-total strong { color: ${C.headerBg}; }
  .instr-list { padding: 10px 14px; }
  .instr-item { display: flex; gap: 12px; padding: 6px 10px; border: 1px solid ${C.border}; border-radius: 6px; margin-bottom: 6px; background: ${C.labelBg}; font-size: 11px; }
  .instr-item strong { color: ${C.headerBg}; }
  .form-block { padding: 10px 14px; }
  .form-label { font-size: 11px; font-weight: 700; color: ${C.headerBg}; margin-bottom: 4px; display: flex; align-items: center; gap: 4px; }
  .form-list { margin: 2px 0 10px 18px; font-size: 11px; line-height: 1.7; }
  .form-list li { padding: 1px 0; }
  .form-field { padding: 4px 0 10px; font-size: 11.5px; }
  .nota { background: ${C.noteBg}; border-left: 4px solid ${C.noteBorder}; border-radius: 0 6px 6px 0; padding: 8px 14px; font-size: 10px; color: ${C.sub}; line-height: 1.5; margin-top: 14px; }
`

function v(val) { return val || PENDIENTE }

function sec(title, body) {
  return `<div class="section"><div class="section-title">${title}</div><div class="section-body">${body}</div></div>`
}

function dtRows(pairs) {
  return `<table class="dt">${pairs.map(([l, val]) =>
    `<tr><td class="lbl">${l}</td><td class="val">${v(val)}</td></tr>`
  ).join("")}</table>`
}

function dt2Rows(pairs) {
  const cells = pairs.map(([l, val]) =>
    `<td class="lbl2">${l}</td><td class="val2">${v(val)}</td>`
  )
  let html = `<table class="dt2">`
  for (let i = 0; i < cells.length; i += 2)
    html += `<tr>${cells[i]}${cells[i + 1] ?? "<td></td><td></td>"}</tr>`
  return html + "</table>"
}

function buildReqs(texto) {
  if (!texto) return `<p style="padding:10px 14px;color:#aaa;font-size:11px;">Sin requisitos registrados — se cargan al confirmar el curso desde el catálogo.</p>`
  const items = texto.split(/[\n\t\r•\-]+/).map(r => r.trim()).filter(Boolean)
  if (!items.length) return `<div style="padding:10px 14px;font-size:11px;">${texto}</div>`
  if (items.length === 1) return `<div style="padding:10px 14px;font-size:11px;">${items[0]}</div>`
  return `<div class="req-grid">${items.map(r =>
    `<div class="req-item"><span class="req-icon">✓</span><span>${r}</span></div>`
  ).join("")}</div>`
}

function buildInstructoresAdicionales(lista) {
  if (!lista?.length) return `<p style="padding:10px 14px;color:#aaa;font-size:11px;">Sin instructores adicionales.</p>`
  return `<div class="instr-list">${lista.map(i => `
    <div class="instr-item">
      <div><strong>${i.name || '—'}</strong></div>
      <div>CC: ${i.numdocument || '—'}</div>
      <div>${i.email || '—'}</div>
    </div>`).join('')}</div>`
}

function buildFormacion(competencies, outcomes) {
  let html = '<div class="form-block">'

  if (competencies?.length) {
    const c = competencies[0]
    const codigo = c.code && c.code !== '000000' ? c.code : ''

    html += `<div class="form-label">● Competencia${codigo ? ` — ${codigo}` : ''}${c.totalCompetenceHours ? ` — ${c.totalCompetenceHours}h` : ''}</div>`
    html += `<div class="form-field" style="padding-left:14px;font-weight:500;">${c.name || 'Sin nombre'}</div>`

    const resultados = (c.resultados || outcomes || []).filter(Boolean)
    html += `<div class="form-label">● Resultados de aprendizaje${resultados.length ? ` (${resultados.length})` : ''}</div>`
    if (resultados.length) {
      html += `<ol class="form-list">${resultados.map(r => `<li>${r}</li>`).join('')}</ol>`
    } else {
      html += `<div class="form-field" style="padding-left:14px;">${PENDIENTE}</div>`
    }

    const criterios = (c.criteria || []).filter(Boolean)
    html += `<div class="form-label">● Criterios de evaluación${criterios.length ? ` (${criterios.length})` : ''}</div>`
    if (criterios.length) {
      html += `<ol class="form-list">${criterios.map(cr => `<li>${cr}</li>`).join('')}</ol>`
    } else {
      html += `<div class="form-field" style="padding-left:14px;">${PENDIENTE}</div>`
    }
  } else {
    html += `<div class="form-label">● Competencia</div><div class="form-field" style="padding-left:14px;">${PENDIENTE}</div>`
  }

  html += '</div>'
  return html
}

function buildSessions(sesiones, durMax, fechaInicio, fechaFin) {
  const total = sesiones.reduce((s, x) => s + (x.totalHoras || 0), 0)
  const diff  = (durMax || 0) - total
  const colorDiff = diff > 0 ? '#e65100' : diff < 0 ? '#c62828' : C.headerBg
  const labelDiff = diff > 0 ? 'Faltan' : diff < 0 ? 'Excede' : 'Completo'

  let html = `
    <div style="display:flex;gap:32px;padding:8px 14px;background:${C.labelBg};border-bottom:1px solid ${C.border};font-size:11px;">
      <div><strong style="color:${C.headerBg}">Fecha de inicio:</strong> ${v(fechaInicio)}</div>
      <div><strong style="color:${C.headerBg}">Fecha de finalización:</strong> ${v(fechaFin)}</div>
    </div>`

  if (!sesiones.length) {
    html += `<p style="padding:10px 14px;color:#aaa;font-size:11px;text-align:center;">Sin sesiones programadas</p>`
    return html
  }

  const tieneResultado = sesiones.some(s => s.resultado)

  const rows = sesiones.map((s, i) => `<tr>
    <td>${i + 1}</td>
    <td>${s.fecha || "—"}</td>
    <td>${s.horaInicio || "—"}</td>
    <td>${s.horaFin || "—"}</td>
    <td>${s.totalHoras || 0}</td>
    ${tieneResultado ? `<td style="text-align:left;font-size:10px;">${s.resultado || '—'}</td>` : ''}
  </tr>`).join("")

  html += `
    <div style="padding:10px 12px;">
      <table class="sess-table">
        <thead><tr>
          <th style="width:6%">N°</th>
          <th style="width:18%">Fecha</th>
          <th style="width:14%">H. Inicio</th>
          <th style="width:14%">H. Fin</th>
          <th style="width:10%">Horas</th>
          ${tieneResultado ? '<th style="width:38%">Resultado de aprendizaje</th>' : ''}
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="sess-total">
      <div><span>Horas del curso: </span><strong>${durMax || 0}</strong></div>
      <div><span>Horas programadas: </span><strong>${total}</strong></div>
      <div><span style="color:${colorDiff}">${labelDiff}: </span>
           <strong style="color:${colorDiff}">${Math.abs(diff)}</strong></div>
    </div>`
  return html
}

function buildHtml(d, logoSrc) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>${css}</style></head><body><div class="wrap">

    <div class="inst-header">
      <div class="inst-texts">
        <div style="font-size:14px;font-weight:800;color:${C.text};">SERVICIO NACIONAL DE APRENDIZAJE SENA</div>
        <div style="font-size:12px;font-weight:700;color:${C.text};">SISTEMA INTEGRADO DE GESTIÓN Y AUTOCONTROL SIGA</div>
        <div style="font-size:12px;font-weight:700;color:${C.text};">PROCESO GESTIÓN DE FORMACIÓN PROFESIONAL INTEGRAL</div>
        <div style="font-size:11.5px;color:${C.text};margin-top:2px;">Procedimiento Ingreso</div>
        <div style="margin-top:8px;font-size:13px;font-weight:700;color:${C.text};">Formato Inscripción Cursos Especiales</div>
        <div style="font-size:11.5px;color:${C.text};">Documento de Apoyo No controlado N°1</div>
      </div>
      <div class="inst-logo">
        ${logoSrc ? `<img src="${logoSrc}" alt="SENA" />` : `<div style="font-size:24px;font-weight:900;color:${C.headerBg};">SENA</div>`}
      </div>
    </div>
    <div class="inst-meta">
      <span><strong>Fecha:</strong> ${d.fechaRegistro || "—"} &nbsp;|&nbsp; <strong>Hora:</strong> ${d.horaRegistro || "—"} &nbsp;|&nbsp; <strong>N° Consecutivo:</strong> ${d.numeroSolicitud || "Pendiente"}</span>
      <span><strong>N° Solicitud:</strong> ${d.codigoSolicitud || "Pendiente"} &nbsp;|&nbsp; <strong>Ficha:</strong> ${d.fichaCaracterizacion || "Pendiente"}</span>
    </div>

    ${sec("DATOS DEL PROGRAMA", dt2Rows([
      ["Código del curso",   d.prfCodigo],
      ["Denominación",       d.prfDenominacion],
      ["Versión",            d.prfVersion],
      ["Duración en horas",  d.prfDuracionMaxima],
      ["N° de aprendices",   d.numAprendices],
      ["Tipo de programa",   d.tipoPrograma],
      ["Tipo de población",  d.tipoPoblacion],
    ]))}

    ${sec("DATOS DEL INSTRUCTOR", dt2Rows([
      ["Nombre",               d.nombreInstructor],
      ["Cédula",               d.cedulaInstructor],
      ["Teléfono",             d.telefonoInstructor],
      ["Correo institucional", d.correoInstructor],
      ["Correo personal",      d.correoPersonalInstructor],
    ]))}

    ${sec("INSTRUCTORES ADICIONALES", buildInstructoresAdicionales(d.instructoresAdicionales))}

    ${sec("UBICACIÓN", dtRows([
      ["Departamento",            d.departamento],
      ["Municipio",               d.municipio],
      ["Vereda / Corregimiento",  d.vereda],
      ["Dirección",               d.direccion],
      ["Supervisor",              d.supervisorNombre],
      ["Ambiente",                d.ambienteNombre],
      ["Dirección del ambiente",  d.ambienteDireccion],
    ]))}

    ${sec("DATOS DE LA EMPRESA", dt2Rows([
      ["Nombre empresa", d.nombreEmpresa],
      ["NIT",           d.nitEmpresa],
      ["Contacto",      d.contactoEmpresa],
      ["Teléfono",      d.telefonoEmpresa],
    ]))}

    ${sec("FECHAS DEL PROGRAMA", dt2Rows([
      ["Fecha de inscripción", d.fechaInscripcion],
      ["Inicio de matrícula",  d.fechaMatriculaInicio],
      ["Fin de matrícula",     d.fechaMatriculaFin],
    ]))}

    ${sec("FORMACIÓN", buildFormacion(d.competencies, d.outcomes))}

    ${sec("PROGRAMACIÓN DE LA FICHA", buildSessions(d.sesiones || [], d.prfDuracionMaxima, d.fechaInicio, d.fechaFin))}

    ${sec("REQUISITOS DE INGRESO", buildReqs(d.requisitosIngreso))}

    <div class="nota">
      La firma de este formato refleja que se han validado los requisitos de idoneidad del instructor
      según el diseño curricular y la información del usuario según guía procedimiento de ingreso
      GFPI-G-025 (núm. 7.5).
    </div>

  </div></body></html>`
}

export async function generateSolicitudPdf(data) {
  const logoSrc = await toBase64("/images/LOGO-SENA.png")

  const container = document.createElement("div")
  container.innerHTML = buildHtml(data, logoSrc)
  document.body.appendChild(container)

  const opt = {
    margin:      [0.3, 0.3, 0.3, 0.3],
    filename:    `Solicitud_${data.prfCodigo || "SC"}_${data.fechaRegistro || ""}.pdf`,
    image:       { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false, allowTaint: true },
    jsPDF:       { unit: "in", format: "letter", orientation: "portrait" },
    pagebreak:   { mode: ["avoid-all", "css"] },
  }

  try {
    const blobUrl = await html2pdf().from(container).set(opt).outputPdf("bloburl")
    window.open(blobUrl, "_blank")
  } finally {
    document.body.removeChild(container)
  }
}
