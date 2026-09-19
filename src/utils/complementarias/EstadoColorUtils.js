// ── UTILIDADES DE ESTADO Y COLOR
// Funciones para mapear estados, parametros y colores de badges

// filtra parametros por tipo y retorna opciones para q-select
export function opcionesDeParametros(parametros, tipo) {
  return (parametros || [])
    .filter(p => p.tipo?.toLowerCase().includes(tipo))
    .map(p => ({ label: p.nombre, value: p.nombre }))
}

// ── PARSEO DE TEXTO
// divide texto por saltos de linea o tabulaciones en array limpio
export function parsearTextoLista(text) {
  if (!text) return []
  return text.split(/[\n\t]+/).map(r => r.trim()).filter(r => r.length > 0)
}

// ── COLORES
// retorna clase de color quasar segun estado legible
export function estadoColor(estado) {
  return ({
    'En proceso':     'orange-8',
    'Aprobada':       'green-9',
    'Rechazada':      'red-8',
    'Ficha asignada': 'purple-8',
    'Inscripción':    'teal-8',
    'Matriculada':    'blue-7',
    'Programada':     'blue-8',
    'Cerrada':        'grey-7',
    'Cancelada':      'grey-6',
    'En ejecución':   'deep-purple-8',
  })[estado] || 'grey-5'
}
