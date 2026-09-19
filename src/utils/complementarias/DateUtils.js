// ── UTILIDADES DE FECHA Y HORAS
// Funciones para formatear/obtener fechas y para calcular y convertir horas

// ── FORMATEO
// fecha ISO a string legible con hora (ej: "12 de junio de 2026, 14:30")
export function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// fecha ISO a string corto "YYYY-MM-DD"
export function toDateStr(iso) {
  return iso ? String(iso).slice(0, 10) : ''
}

// ── VALORES ACTUALES
// retorna fecha de hoy en formato "YYYY-MM-DD"
export function fechaHoy() {
  return new Date().toISOString().slice(0, 10)
}

// retorna hora actual en formato "HH:mm"
export function horaActual() {
  return new Date().toTimeString().slice(0, 5)
}

// ── RANGOS
// retorna array con [anio-1, anio, anio+1] para selects de filtro
export function aniosDisponibles() {
  const y = new Date().getFullYear()
  return [y - 1, y, y + 1]
}

// suma (o resta) días a una fecha "YYYY-MM-DD" y devuelve "YYYY-MM-DD"
export function sumarDias(fechaStr, dias) {
  const d = new Date(fechaStr + 'T00:00:00')
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

// diferencia en días entre dos fechas "YYYY-MM-DD" (a - b)
export function diffDias(aStr, bStr) {
  return Math.round((new Date(aStr + 'T00:00:00') - new Date(bStr + 'T00:00:00')) / 86400000)
}

// ── HORAS
// calcula diferencia en horas entre dos strings "HH:mm"
export function calcularHoras(hInicio, hFin) {
  if (!hInicio || !hFin) return 0
  const [h1, m1] = hInicio.split(':').map(Number)
  const [h2, m2] = hFin.split(':').map(Number)
  if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0
  const mins = (h2 * 60 + m2) - (h1 * 60 + m1)
  return mins > 0 ? parseFloat((mins / 60).toFixed(2)) : 0
}

// suma totalHoras de todas las sesiones
export const calcularTotalHoras = (sesiones) =>
  sesiones.reduce((sum, s) => sum + (s.totalHoras || 0), 0)

// convierte string "HH:00" a numero entero de hora
export const horaToNum = (h) => h ? (parseInt(h) || 0) : 0

// convierte numero entero a string "HH:00" (rango 0-23)
export const numToHora = (v) => `${String(Math.max(0, Math.min(23, parseInt(v) || 0))).padStart(2, '0')}:00`
