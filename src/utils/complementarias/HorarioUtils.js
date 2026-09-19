// ── UTILIDADES DE HORARIOS
// Funciones puras para mostrar/agrupar horarios y calcular la ventana de carga del calendario
import { DIAS_SEMANA } from '../../static/complementarias/ConstantesComplementarias.js'
import { toDateStr } from './DateUtils.js'

// orden canónico de los días de la semana
const ORDEN_DIAS = DIAS_SEMANA.map(d => d.val)

// devuelve las etiquetas de los días de la semana a partir de sus valores
export function diasLabel(days) {
  return (days || []).map(d => DIAS_SEMANA.find(x => x.val === d)?.label || d).join(', ')
}

// agrupa horarios por clave + horas, mezclando días y extendiendo el rango de fechas
export function agruparHorarios(lista, keyFn) {
  const map = new Map()
  for (const it of lista) {
    const key = `${keyFn(it)}__${it.tstart}__${it.tend}`
    const existing = map.get(key)
    if (!existing) {
      map.set(key, { ...it, days: [...new Set(it.days || [])] })
    } else {
      existing.days = [...new Set([...existing.days, ...(it.days || [])])]
      if (toDateStr(it.fstart) < toDateStr(existing.fstart)) existing.fstart = it.fstart
      if (toDateStr(it.fend)   > toDateStr(existing.fend))   existing.fend   = it.fend
    }
  }
  return [...map.values()].map(it => ({
    ...it,
    days: it.days.slice().sort((a, b) => ORDEN_DIAS.indexOf(a) - ORDEN_DIAS.indexOf(b)),
  }))
}

// calcula la ventana de carga: rango del curso si existe, o el mes visible
export function calcularVentana({ anio, mes }) {
  const desde = `${anio}-${String(mes).padStart(2, '0')}-01`
  const hasta = `${anio}-${String(mes).padStart(2, '0')}-${String(new Date(anio, mes, 0).getDate()).padStart(2, '0')}`
  return { desde, hasta }
}

// arma el HTML del diálogo "horario ya asignado" a partir de un horario existente
export function buildHorarioExistenteHtml(p) {
  const dias = diasLabel(p.days)
  const color = '#2e7d32'

  let title = 'Horario ya asignado'
  let icono = 'event'
  const filas = []

  if (p.tipo === 'titulada') {
    title = 'Programación de Titulada'
    icono = 'school'
    filas.push({ icon: 'tag', label: 'Ficha', value: p.fiche?.number || '—' })
    if (p.program?.name) filas.push({ icon: 'menu_book', label: 'Programa', value: `${p.program.name}${p.program.code ? ` (${p.program.code})` : ''}` })
    if (p.competence?.name) filas.push({ icon: 'verified', label: 'Competencia', value: p.competence.name })
    if (p.environment?.name) filas.push({ icon: 'location_on', label: 'Ambiente', value: p.environment.name })
  } else if (p.tipo === 'complementaria') {
    title = 'Programación Complementaria'
    icono = 'menu_book'
    filas.push({ icon: 'menu_book', label: 'Curso', value: `${p.complementaryRequest?.catalogCourseName || '—'}${p.complementaryRequest?.catalogCourseCode ? ` (${p.complementaryRequest.catalogCourseCode})` : ''}` })
    filas.push({ icon: 'tag', label: 'Ficha', value: p.complementaryRequest?.fichaNumber || '—' })
    if (p.environment?.name) filas.push({ icon: 'location_on', label: 'Ambiente', value: p.environment.name })
  } else if (p.tipo === 'otros') {
    title = 'Otra Actividad'
    icono = 'event_busy'
    filas.push({ icon: 'category', label: 'Tipo', value: p.typeactivity || '—' })
    if (p.otheractivity) filas.push({ icon: 'assignment', label: 'Actividad', value: p.otheractivity })
    if (p.additionalactivity) filas.push({ icon: 'add_task', label: 'Actividad adicional', value: p.additionalactivity })
    if (p.justification) filas.push({ icon: 'notes', label: 'Justificación', value: p.justification })
  } else {
    if (p.instructor?.name) filas.push({ icon: 'person', label: 'Instructor', value: p.instructor.name })
  }

  filas.push({ icon: 'schedule', label: 'Horario', value: `${p.tstart} - ${p.tend}` })
  filas.push({ icon: 'date_range', label: 'Días', value: dias || '—' })
  filas.push({ icon: 'hourglass_top', label: 'Horas', value: `${p.hourswork ?? 0}h` })

  const filasHtml = filas.map(f =>
    `<div style="display:flex;align-items:flex-start;gap:10px;padding:7px 0;border-bottom:1px solid #f0f0f0;">
      <span class="material-icons" style="font-size:18px;color:${color};flex-shrink:0;margin-top:1px;">${f.icon}</span>
      <div><div style="font-size:11px;color:#9e9e9e;text-transform:uppercase;letter-spacing:0.3px;">${f.label}</div><div style="font-size:14px;color:#212121;">${f.value}</div></div>
    </div>`
  ).join('')

  return `
    <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:8px;background:${color}12;margin-bottom:12px;">
      <span class="material-icons" style="font-size:22px;color:${color};">${icono}</span>
      <span style="font-size:14px;font-weight:600;color:${color};">${title}</span>
    </div>
    <div style="padding:0 4px;">${filasHtml}</div>`
}
