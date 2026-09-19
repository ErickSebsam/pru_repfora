// ── UTILIDADES DE SOLICITUDES
// Funciones puras y configuración para el listado de solicitudes
import { toDateStr } from './DateUtils.js'
import { STATE_BACKEND_MAP, ESTADOS_APROBADAS } from '../../static/complementarias/ConstantesComplementarias.js'

// mapea una solicitud del backend a la fila que muestra la tabla
export function formatearFilaSolicitud(solicitud) {
  const cursoCompleto = solicitud.catalogCourseName || solicitud.catalogCourse?.prfDenominacion || '—'
  return {
    _id:                  solicitud._id,
    _stateRaw:            solicitud.state,
    numeroSolicitud:      solicitud.numeroSolicitud      || '—',
    fichaCaracterizacion: solicitud.fichaCaracterizacion || '—',
    fechaInicio:          toDateStr(solicitud.fechaInicio) || '—',
    curso:                cursoCompleto.length > 40 ? cursoCompleto.slice(0, 40) + '…' : cursoCompleto,
    _cursoCompleto:       cursoCompleto,
    instructor:           solicitud.instructor?.name || solicitud.nombreInstructor || '—',
    ubicacion:            solicitud.municipio || solicitud.ambienteNombre || '—',
    estado:               STATE_BACKEND_MAP[solicitud.state] || solicitud.state || '—',
    _detalle:             solicitud,
  }
}

// columnas de la tabla del listado según el rol (admin agrega la columna instructor)
export function columnasListado(modo) {
  return [
    { name: 'numeroSolicitud',      label: 'N° SOLICITUD',             field: 'numeroSolicitud',      align: 'center', sortable: true },
    { name: 'fichaCaracterizacion', label: 'Ficha de Caracterización', field: 'fichaCaracterizacion', align: 'center' },
    { name: 'fechaInicio',          label: 'Fecha de Inicio',          field: 'fechaInicio',          align: 'center', sortable: true },
    { name: 'curso',                label: 'CURSO',                    field: 'curso',                align: 'left',   style: 'max-width: 220px' },
    ...(modo === 'admin' ? [{ name: 'instructor', label: 'INSTRUCTOR', field: 'instructor', align: 'center' }] : []),
    { name: 'ubicacion',            label: 'UBICACIÓN',                field: 'ubicacion',            align: 'center' },
    { name: 'estado',               label: 'ESTADO',                   field: 'estado',               align: 'center' },
    { name: 'opciones',             label: 'OPCIONES',                 field: 'opciones',             align: 'center' },
  ]
}

// suma los counts por estado a los grupos de cada tab del listado
export function mapTabCounts(counts) {
  const c = counts || {}
  const sum = (...keys) => keys.reduce((t, k) => t + (c[k] || 0), 0)
  return {
    enProceso:  sum('PENDIENTE'),
    aprobadas:  sum(...ESTADOS_APROBADAS),
    ejecucion:  sum('EJECUCION'),
    rechazadas: sum('RECHAZADA'),
    canceladas: sum('CANCELADA'),
    cerradas:   sum('CERRADA'),
  }
}

// filtros locales por tab (modo instructor: filtra en cliente sobre sus solicitudes)
export const FILTROS_LISTADO = {
  enProceso:  r => r._stateRaw === 'PENDIENTE',
  aprobadas:  r => ESTADOS_APROBADAS.includes(r._stateRaw),
  ejecucion:  r => r._stateRaw === 'EJECUCION',
  rechazadas: r => r._stateRaw === 'RECHAZADA',
  canceladas: r => r._stateRaw === 'CANCELADA',
  cerradas:   r => r._stateRaw === 'CERRADA',
}

// params de la API por tab (modo admin: el backend filtra por estado)
export const PARAMS_LISTADO = {
  enProceso:  { state: 'PENDIENTE' },
  aprobadas:  {},
  rechazadas: { state: 'RECHAZADA' },
  canceladas: { state: 'CANCELADA' },
  ejecucion:  { state: 'EJECUCION' },
  cerradas:   { state: 'CERRADA' },
}
