import { isHoliday, getHolidayName } from './holidays';

// ────────────────────────────────────────────────────────────
// 1. Formateo de fechas
// ────────────────────────────────────────────────────────────

/**
 * Formatea Date → 'YYYY-MM-DD'.
 */
export const formatDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Formatea Date → 'DD/MM/YYYY' (formato colombiano).
 */
export const formatDateCO = (date) => {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

/**
 * Parsea 'YYYY-MM-DD' → Date (sin zona horaria).
 */
export const parseDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

// ────────────────────────────────────────────────────────────
// 2. Nombres de días y meses (español)
// ────────────────────────────────────────────────────────────

const DAY_NAMES_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAY_NAMES_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** Nombre corto del día (0=Dom, 1=Lun, …). */
export const getDayName = (dayIndex) => DAY_NAMES_SHORT[dayIndex] || '';

/** Nombre completo del día. */
export const getDayNameFull = (dayIndex) => DAY_NAMES_FULL[dayIndex] || '';

/** Nombre del mes (0-indexed). */
export const getMonthName = (monthIndex) => MONTH_NAMES[monthIndex] || '';

/** Formato amigable: "Lun 15 de Mayo 2026". */
export const formatDateFriendly = (date) => {
  const d = typeof date === 'string' ? parseDate(date) : new Date(date);
  return `${getDayName(d.getDay())} ${d.getDate()} de ${getMonthName(d.getMonth())} ${d.getFullYear()}`;
};

// ────────────────────────────────────────────────────────────
// 3. Verificaciones de día
// ────────────────────────────────────────────────────────────

/** ¿Es fin de semana? */
export const isWeekend = (date) => {
  const d = typeof date === 'string' ? parseDate(date) : new Date(date);
  const day = d.getDay();
  return day === 0 || day === 6;
};

/** ¿Es día NO laborable (festivo o fin de semana)? */
export const isNonWorkingDay = (date) => {
  if (isWeekend(date)) return true;
  return isHoliday(date);
};

/** ¿Es día hábil? */
export const isBusinessDay = (date) => !isNonWorkingDay(date);

/**
 * Info completa de por qué un día no es hábil.
 * @returns {{ working: boolean, reason: string|null }}
 */
export const getDayStatus = (date) => {
  if (isWeekend(date)) {
    const d = typeof date === 'string' ? parseDate(date) : new Date(date);
    return { working: false, reason: d.getDay() === 0 ? 'Domingo' : 'Sábado' };
  }
  const holidayName = getHolidayName(date);
  if (holidayName) {
    return { working: false, reason: `Festivo: ${holidayName}` };
  }
  return { working: true, reason: null };
};

// ────────────────────────────────────────────────────────────
// 4. Cálculos de días hábiles
// ────────────────────────────────────────────────────────────

/** Cuenta días hábiles entre dos fechas (inclusive). */
export const countBusinessDays = (startDate, endDate) => {
  let count = 0;
  const cur = typeof startDate === 'string' ? parseDate(startDate) : new Date(startDate);
  const end = typeof endDate === 'string' ? parseDate(endDate) : new Date(endDate);

  while (cur <= end) {
    if (isBusinessDay(cur)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};

/** Siguiente día hábil después de una fecha. */
export const getNextBusinessDay = (date) => {
  const next = typeof date === 'string' ? parseDate(date) : new Date(date);
  next.setDate(next.getDate() + 1);
  while (isNonWorkingDay(next)) {
    next.setDate(next.getDate() + 1);
  }
  return next;
};

/** Suma N días hábiles a una fecha. */
export const addBusinessDays = (startDate, businessDays) => {
  const cur = typeof startDate === 'string' ? parseDate(startDate) : new Date(startDate);
  let added = 0;
  while (added < businessDays) {
    cur.setDate(cur.getDate() + 1);
    if (isBusinessDay(cur)) added++;
  }
  return cur;
};

// ────────────────────────────────────────────────────────────
// 5. Jornada Laboral (Regla R2)
// ────────────────────────────────────────────────────────────

/**
 * Horas por día según jornada.
 * Diurna / Tarde → 6h  |  Nocturna → 5h
 */
export const getHoursPerDay = (shift, customHours) => {
  if(shift === 'personalizado' && customHours !== null) return customHours;
  const s = shift?.toLowerCase();
  if (s === 'nocturna' || s === 'night' || s === 'mixta_manana') return 5;
  if (s === 'mixta_manana_tarde') return 10;
  return 6;
};

/**
 * Días de clase necesarios para cubrir horas directas.
 */
export const calculateWorkDays = (directHours, shift, customHours) => {
  return Math.ceil(directHours / getHoursPerDay(shift, customHours));
};

/**
 * Genera sesiones de calendario a partir de una config.
 *
 * @param {number} totalHours     - Horas directas a cubrir
 * @param {string} startDate      - 'YYYY-MM-DD'
 * @param {number[]} selectedDays - Días de la semana [1=Lun, 2=Mar, …, 6=Sáb]
 * @param {string} shift          - 'diurna' | 'nocturna'
 * @returns {Array<{fecha: string, horas: number, festivo: boolean, nombreFestivo: string|null}>}
 */
export const generateSessions = (totalHours, startDate, selectedDays, shift, occupiedDates = [], vacation = null, customHours = null) => {
  const sessions = [];
  const hoursPerDay = getHoursPerDay(shift, customHours);
  let remaining = totalHours;
  const current = parseDate(startDate);
  let safety = 0;

  const isVacation = (dateStr) => {
    if (!vacation) return false;
    if (Array.isArray(vacation)) {
      return vacation.some(v => v.start && v.end && dateStr >= v.start && dateStr <= v.end);
    }
    if (!vacation.start || !vacation.end) return false;
    return dateStr >= vacation.start && dateStr <= vacation.end;
  };

  while (remaining > 0 && safety < 365) {
    let dow = current.getDay()
    if(dow === 0) dow = 7
    if (selectedDays.includes(dow)) {
      const dateStr = formatDate(current);
      
      // Si el día es festivo, lo saltamos automáticamente
      if (isHoliday(dateStr)) {
        current.setDate(current.getDate() + 1);
        safety++;
        continue;
      }

      // Si el día está ocupado por otra programación en esta ficha, lo saltamos automáticamente
      if (occupiedDates.includes(dateStr)) {
        current.setDate(current.getDate() + 1);
        safety++;
        continue;
      }

      // Si el día está en vacaciones, lo saltamos automáticamente
      if (isVacation(dateStr)) {
        current.setDate(current.getDate() + 1);
        safety++;
        continue;
      }

      const hrs = Math.min(hoursPerDay, remaining);

      sessions.push({
        fecha: dateStr,
        horas: hrs,
        festivo: false,
        nombreFestivo: null,
      });

      remaining -= hrs;
    }
    current.setDate(current.getDate() + 1);
    safety++;
  }

  return sessions;
};

// ────────────────────────────────────────────────────────────
// 8. Cálculo de horas por trimestre
// ────────────────────────────────────────────────────────────

/**
 * Agrupa las horas directas de todas las actividades de una planeación
 * por trimestre calendario (cada 3 meses desde la fecha más temprana encontrada).
 *
 * @param {object} planning - Objeto completo de planeación (planning.pedagogicalPlanning)
 * @returns {Array<{trimestre: number, inicio: string, fin: string, horas: number}>}
 */
export const calcularHorasPorTrimestre = (planning) => {
  if (!planning?.content) return [];

  // 1. Recolectar todas las sesiones con sus horas
  const sesiones = [];
  for (const fase of planning.content) {
    for (const comp of fase.competencies || []) {
      for (const rap of comp.learningOutcomes || []) {
        for (const act of rap.pedagogicalActivities || []) {
          const dias = act.scheduleDetails?.assignedDays || [];
          const horasDirectas = Number(act.hours?.direct || act.scheduleDetails?.hours?.direct || 0);
          if (dias.length > 0 && horasDirectas > 0) {
            // Distribuir horas equitativamente entre los días de la actividad
            const horasPorDia = horasDirectas / dias.length;
            for (const dia of dias) {
              sesiones.push({ fecha: dia, horas: horasPorDia });
            }
          }
        }
      }
    }
  }

  if (sesiones.length === 0) return [];

  // 2. Determinar la fecha más temprana como ancla del Trimestre 1
  const fechasOrdenadas = sesiones
    .map(s => new Date(s.fecha + 'T12:00:00'))
    .sort((a, b) => a - b);
  const fechaInicio = fechasOrdenadas[0];

  // 3. Agrupar cada sesión en su trimestre
  const trimestresMap = {};
  for (const sesion of sesiones) {
    const fechaSesion = new Date(sesion.fecha + 'T12:00:00');
    // Diferencia en meses desde la fecha de inicio
    const diffMeses =
      (fechaSesion.getFullYear() - fechaInicio.getFullYear()) * 12 +
      (fechaSesion.getMonth() - fechaInicio.getMonth());
    const numeroTrimestre = Math.floor(diffMeses / 3) + 1;

    if (!trimestresMap[numeroTrimestre]) {
      // Calcular inicio y fin del trimestre
      const inicioTrim = new Date(fechaInicio);
      inicioTrim.setMonth(inicioTrim.getMonth() + (numeroTrimestre - 1) * 3);
      const finTrim = new Date(inicioTrim);
      finTrim.setMonth(finTrim.getMonth() + 3);
      finTrim.setDate(finTrim.getDate() - 1);
      trimestresMap[numeroTrimestre] = {
        trimestre: numeroTrimestre,
        inicio: formatDateCO(inicioTrim),
        fin: formatDateCO(finTrim),
        horas: 0
      };
    }
    trimestresMap[numeroTrimestre].horas += sesion.horas;
  }

  // 4. Redondear horas y ordenar por trimestre
  return Object.values(trimestresMap)
    .map(t => ({ ...t, horas: Math.round(t.horas * 10) / 10 }))
    .sort((a, b) => a.trimestre - b.trimestre);
};


export default {
  formatDate, formatDateCO, parseDate,
  getDayName, getDayNameFull, getMonthName, formatDateFriendly,
  isWeekend, isNonWorkingDay, isBusinessDay, getDayStatus,
  countBusinessDays, getNextBusinessDay, addBusinessDays,
  getHoursPerDay, calculateWorkDays, generateSessions,
  calcularHorasPorTrimestre,
};
