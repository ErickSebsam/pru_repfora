// ── CONSTANTES COMPLEMENTARIAS
// Configuraciones, opciones y columnas reutilizables para el modulo de complementarias

const toDateStr = (iso) => (iso ? String(iso).slice(0, 10) : '')

// ── DIAS Y HORAS
// dias de la semana con valor numerico (0=dom)
export const DIAS_SEMANA = [
  { val: 1, label: 'Lun' },
  { val: 2, label: 'Mar' },
  { val: 3, label: 'Mié' },
  { val: 4, label: 'Jue' },
  { val: 5, label: 'Vie' },
  { val: 6, label: 'Sáb' },
  { val: 0, label: 'Dom' },
]

// ── MAPEO DE ESTADOS
// traduccion de estado backend a etiqueta visible
export const STATE_BACKEND_MAP = {
  PENDIENTE:      'En proceso',
  APROBADA:       'Aprobada',
  FICHA_ASIGNADA: 'Ficha asignada',
  INSCRIPCION:    'Inscripción',
  MATRICULADA:    'Matriculada',
  PROGRAMADA:     'Programada',
  CERRADA:        'Cerrada',
  RECHAZADA:      'Rechazada',
  CANCELADA:      'Cancelada',
  EJECUCION:      'En ejecución',
}

// etiquetas para tabs de listado
export const TAB_LABEL = {
  enProceso:  'En proceso',
  aprobadas:  'Aprobadas',
  ejecucion:  'En ejecución',
  rechazadas: 'Rechazadas',
  canceladas: 'Canceladas',
  cerradas:   'Cerradas',
}

// estados que se agrupan bajo "aprobadas"
export const ESTADOS_APROBADAS = [
  'APROBADA', 'FICHA_ASIGNADA', 'INSCRIPCION', 'MATRICULADA', 'PROGRAMADA',
]

// ── OPCIONES DE SELECT
// opciones de orden para listados
export const OPCIONES_ORDEN = [
  { label: 'Más recientes primero',          value: 'recientes'   },
  { label: 'Fecha inicio: próximas primero', value: 'inicio_asc'  },
  { label: 'Fecha inicio: lejanas primero',  value: 'inicio_desc' },
]

// opciones de mes para filtros de reportes
export const OPCIONES_MES = [
  { label: 'Enero',      value: 1  }, { label: 'Febrero',    value: 2  }, { label: 'Marzo',      value: 3  },
  { label: 'Abril',      value: 4  }, { label: 'Mayo',       value: 5  }, { label: 'Junio',      value: 6  },
  { label: 'Julio',      value: 7  }, { label: 'Agosto',     value: 8  }, { label: 'Septiembre', value: 9  },
  { label: 'Octubre',    value: 10 }, { label: 'Noviembre',  value: 11 }, { label: 'Diciembre',  value: 12 },
]

// opciones de estado para reportes
export const OPCIONES_ESTADO_REPORTE = [
  'PENDIENTE', 'APROBADA', 'RECHAZADA', 'FICHA_ASIGNADA', 'INSCRIPCION',
  'MATRICULADA', 'PROGRAMADA', 'EJECUCION', 'CERRADA', 'CANCELADA',
].map(e => ({ label: e, value: e }))

// ── COLORES
// colores para tipos de ficha en calendario
export const COLORES_TIPO = {
  titulada:       { bg: '#2196F3', border: '#1565c0' },
  complementaria: { bg: '#2e7d32', border: '#1b5e20', dashed: true },
  otros:          { bg: '#fb8c00', border: '#ef6c00' },
}

// paleta rotativa para multiples fichas
export const PALETA_FICHAS = [
  { bg: '#1e88e5', border: '#1565c0' },
  { bg: '#8e24aa', border: '#6a1b9a' },
  { bg: '#00897b', border: '#00695c' },
  { bg: '#d81b60', border: '#ad1457' },
  { bg: '#5e35b1', border: '#4527a0' },
  { bg: '#0097a7', border: '#006064' },
  { bg: '#6d4c41', border: '#4e342e' },
  { bg: '#c62828', border: '#b71c1c' },
]

// ── COLUMNAS DE TABLAS
// columnas compartidas entre reportes de fichas
const _COL_FICHAS = [
  { name: 'numeroSolicitud',      label: 'N° SOLICITUD', field: row => row.numeroSolicitud      || '—', align: 'left'   },
  { name: 'fichaCaracterizacion', label: 'FICHA',        field: row => row.fichaCaracterizacion || '—', align: 'left'   },
  { name: 'curso',                label: 'CURSO',        field: row => row.catalogCourseName    || '—', align: 'left'   },
  { name: 'estado',               label: 'ESTADO',       field: row => row.state                || '—', align: 'center' },
  { name: 'fechaInicio',          label: 'INICIO',       field: row => toDateStr(row.fechaInicio) || '—', align: 'center' },
  { name: 'fechaFin',             label: 'FIN',          field: row => toDateStr(row.fechaFin)    || '—', align: 'center' },
]

// mapa de columnas por tipo de reporte
export const COLUMNS_REPORTES = {
  'fichas-sin-ruta':    _COL_FICHAS,
  'fichas-estado':      _COL_FICHAS,
  'proyeccion-mensual': [
    { name: 'mes',      label: 'MES',      field: row => row._id?.mes,    align: 'center' },
    { name: 'anio',     label: 'AÑO',      field: row => row._id?.anio,   align: 'center' },
    { name: 'estado',   label: 'ESTADO',   field: row => row._id?.estado, align: 'left'   },
    { name: 'cantidad', label: 'CANTIDAD', field: 'cantidad',              align: 'center' },
  ],
  'horas-por-mes': [
    { name: 'instructor',   label: 'INSTRUCTOR',    field: row => row.instructor?.name  || '—', align: 'left'   },
    { name: 'email',        label: 'CORREO',        field: row => row.instructor?.email || '—', align: 'left'   },
    { name: 'horasTotales', label: 'HORAS TOTALES', field: 'horasTotales',                      align: 'center' },
    { name: 'fichas',       label: 'FICHAS',        field: 'fichas',                             align: 'center' },
  ],
  'complementarias-por-fecha': [
    { name: 'fichaNumero',  label: 'FICHA',       field: row => row.fichaNumero || '—',                              align: 'center' },
    { name: 'fichaNombre',  label: 'PROGRAMA',    field: row => row.fichaNombre || '—',                              align: 'left'   },
    { name: 'instructor',   label: 'INSTRUCTOR',  field: row => row.instructor?.name || '—',                         align: 'left'   },
    { name: 'telefono',     label: 'TELÉFONO',    field: row => row.instructor?.phone || '—',                        align: 'center' },
    { name: 'ambiente',     label: 'AMBIENTE',    field: row => row.horario?.environment?.name || '—',               align: 'left'   },
    { name: 'dias',         label: 'DÍAS',        field: row => row.horario?.days,                                        align: 'center' },
    { name: 'horario',      label: 'HORARIO',     field: row => `${row.horario?.tstart || ''} – ${row.horario?.tend || ''}`, align: 'center' },
    { name: 'horas',        label: 'HORAS',       field: row => row.horario?.hourswork || '—',                       align: 'center' },
  ],
}

// ── CATÁLOGO
// filtros del panel del catálogo (checkbox + rango de horas)
export const CONFIGURACION_FILTROS = [
  { field: 'modalidad',            label: 'Modalidad',             type: 'checkbox' },
  { field: 'lineaTecnologica',     label: 'Línea Tecnológica',     type: 'checkbox' },
  { field: 'redConocimiento',      label: 'Red de Conocimiento',   type: 'checkbox' },
  { field: 'apuestasPrioritarias', label: 'Apuestas Prioritarias', type: 'checkbox' },
  { field: 'prfDuracionMaxima',    label: 'Duración',              type: 'hours-range', min: 0, max: 2200 },
]

// opciones de ordenamiento del catálogo
export const OPCIONES_ORDENAMIENTO = [
  { label: 'Horas: menor a mayor', value: 'horas_asc'   },
  { label: 'Horas: mayor a menor', value: 'horas_desc'  },
  { label: 'Nombre: A → Z',        value: 'nombre_asc'  },
  { label: 'Nombre: Z → A',        value: 'nombre_desc' },
]

// ── PARÁMETROS
// tipos de parámetro (programa / población)
export const OPCIONES_TIPO_PARAMETRO = [
  { label: 'Tipo de Programa',  value: 'programa'  },
  { label: 'Tipo de Población', value: 'poblacion' },
]

// columnas de la tabla de parámetros
export const COLUMNAS_PARAMETROS = [
  { name: 'nombre',    label: 'NOMBRE',   field: 'nombre',                              align: 'left',   sortable: true },
  { name: 'status',    label: 'ESTADO',   field: 'status',                              align: 'center' },
  { name: 'createdAt', label: 'CREADO',   field: row => toDateStr(row.createdAt) || '—', align: 'center' },
  { name: 'acciones',  label: 'ACCIONES', field: 'acciones',                            align: 'center' },
]

// ── JUICIOS Y REPORTES
// tarjetas de reportes disponibles en el diálogo de juicios
export const REPORTES_JUICIOS = [
  { tipo: 'fichas-sin-ruta',    title: 'Fichas sin ruta',    subtitle: 'Solicitudes sin horario asignado',    icon: 'alt_route'  },
  { tipo: 'proyeccion-mensual', title: 'Proyección mensual', subtitle: 'Fichas proyectadas por mes y estado', icon: 'insights'   },
  { tipo: 'fichas-estado',      title: 'Fichas por estado',  subtitle: 'Resumen y detalle por estado',        icon: 'fact_check' },
  { tipo: 'horas-por-mes',      title: 'Horas por instructor', subtitle: 'Horas dictadas por mes',            icon: 'schedule'   },
]
