import { get, post, put, del, postRaw } from "./api.js";
import { requestAxios } from "../common/axios.js";

/**
 * Servicio para manejar todas las peticiones de Planeación Pedagógica
 */
export const PlanningService = {
  /**
   * Obtiene todas las planeaciones guardadas en MongoDB
   */
  getAllPlannings: () => get("/planning"),

  /**
   * Obtiene la planeación completa de una ficha desde MongoDB
   * @param {string} fiche - Número de ficha (ej: 3065259)
   */
  getPlanningByFiche: (fiche) => get(`/planning/${fiche}`),

  /**
   * Verifica si una ficha ya existe en las planeaciones de Repfora o en la base de datos.
   * @param {string} fiche - Número de ficha (ej: 3065259)
   * @returns {Promise<{existsPlanning: boolean, existsInDatabase: boolean, planning: object|null, ficheInfo: object|null}>}
   */
  checkPlanningExists: (fiche) => get(`/planning/check-exists/${fiche}`, {}, { skipErrorNotify: true }),

  /**
   * Envía/actualiza la planeación completa en MongoDB (upsert)
   * @param {object} payload - { pedagogicalPlanning: { ... } }
   */
  uploadPlanning: (payload) => postRaw("/planning/upload", payload).then((r) => r.data),

  /**
   * Guarda cambios parciales de un instructor (actividades, horas, calendario)
   * @param {object} fullPlanning - Documento completo con los cambios aplicados
   */
  saveDraft: (fullPlanning) => postRaw("/planning/upload", fullPlanning).then((r) => r.data),

  // implementacion de luis llanos (servicio frontend para registrar comentario en actividad y disparar notificaciones de correo)
  /**
   * Guarda un comentario en una actividad pedagógica y envía notificaciones por correo
   * @param {string} fiche - Número de ficha
   * @param {object} payload - Contexto de la actividad y datos del comentario
   */
  addActivityComment: (fiche, payload) => post(`/planning/${fiche}/comment`, payload),
  // fin de implementacion luis llanos

  // generado por luis llanos (servicio para recalcular horas directas segun formula y persistir en MongoDB)
  /**
   * Recalcula y guarda en la base de datos las horas directas de los resultados según:
   * % Horas Lectivas = (Horas Lectivas / Horas Totales)
   * Horas Competencia Lectivas = Horas Competencia * % Horas Lectivas
   * Horas Resultado = Horas Competencia Lectivas / Resultados de la Competencia
   * @param {string|null} fiche - Número de ficha (opcional, si no se envía recalcula todas)
   * @param {boolean} all - Forzar recálculo para todas las fichas
   * @param {string|null} shift - Jornada ("diurna", "nocturna", "mañana", "tarde", "noche")
   */
  // comentado para correcion de multiplos
  // recalculateDirectHours: (fiche = null, all = false) => post('/planning/recalculate-direct-hours', { fiche, all }),
  // correcion de multiplos
  recalculateDirectHours: (fiche = null, all = false, shift = null) => post('/planning/recalculate-direct-hours', { fiche, all, shift }),
  // fin de implementacion luis llanos

  /**
   * Envía 3 PDFs al backend para extracción automática.
   * El backend ejecuta el script Python y guarda en MongoDB.
   * @param {File} programPdf - PDF del Programa de Formación
   * @param {File} projectPdf - PDF del Reporte Proyecto Formativo
   * @param {File} teamPdf - PDF del Equipo Ejecutor
   * @param {string} fiche - Número de ficha
   * @param {string} leaderEmail - Correo del instructor creador / líder
   * @param {string} mergeMode - 'fill-missing' para completar solo lo que falta si ya existe la planeación
   * @param {{confirmedMerge?: boolean, mergeToken?: string}} mergeOptions - Opciones de confirmación de fusión
   */
  extractFromPDFs: async (programPdf, projectPdf, teamPdf, fiche, leaderEmail, mergeMode = 'fill-missing', mergeOptions = {}) => {
    const formData = new FormData();
    formData.append("programPdf", programPdf);
    formData.append("projectPdf", projectPdf);
    if (teamPdf) {
      formData.append("teamPdf", teamPdf);
    }
    formData.append("fiche", fiche);
    if (leaderEmail) {
      formData.append("leaderEmail", leaderEmail);
    }
    if (mergeMode) {
      formData.append("mergeMode", mergeMode);
    }
    if (mergeOptions?.confirmedMerge) {
      formData.append("confirmedMerge", "true");
    }
    if (mergeOptions?.mergeToken) {
      formData.append("mergeToken", mergeOptions.mergeToken);
    }

    const response = await requestAxios.post("/planning/extract", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120000, // 2 min para extracción pesada
      skipErrorNotify: true,
    });
    return response.data;
  },

  /**
   * Programa un resultado (RAP) de la planeación directamente al calendario oficial
   * @param {object} payload - { planningId, phaseIndex, competenceIndex, rapIndex, activityIndex }
   */
  scheduleOutcome: (payload) => postRaw("/planning/schedule-outcome", payload).then((r) => r.data),

  /**
   * Guarda una planilla (plantilla) del programa
   * @param {object} payload - { programCode, programName, content, savedBy }
   */
  savePlanningTemplate: (payload) => postRaw("/planning/template", payload).then((r) => r.data),

  /**
   * Obtiene la planilla (plantilla) guardada para un programa
   * @param {string} programCode - Código del programa (ej: 228106)
   */
  getPlanningTemplate: (programCode) => get(`/planning/template/${programCode}`, {}, { skipErrorNotify: true }),

  /**
   * Aplica la plantilla de un programa a la planeación de una ficha específica.
   * Solo agrega lo que NO existe — no toca instructores ni confirmaciones ya establecidas.
   * @param {string} fiche - Número de ficha destino
   * @param {string} programCode - Código del programa cuya plantilla se aplicará
   */
  applyPlanningTemplate: (fiche, programCode) =>
    post(`/planning/apply-template/${fiche}`, { programCode }),
};

/**
 * Servicio CRUD para los Días No Programables (vacaciones colectivas, festivos, etc.)
 * Reemplaza el almacenamiento en localStorage con persistencia real en MongoDB.
 */
export const VacationService = {
  /**
   * Obtiene todos los días no programables registrados
   */
  getAll: () => get("/planning/vacations"),

  /**
   * Registra un nuevo rango de días no programables
   * @param {{ start: string, end: string, reason: string, createdBy?: string }} data
   */
  create: (data) => post("/planning/vacations", data),

  /**
   * Actualiza un rango de días no programables existente
   * @param {string} id - ID del documento en MongoDB
   * @param {{ start: string, end: string, reason: string }} data
   */
  update: (id, data) => put(`/planning/vacations/${id}`, data),

  /**
   * Elimina un rango de días no programables
   * @param {string} id - ID del documento en MongoDB
   */
  delete: (id) => del(`/planning/vacations/${id}`),
};

/**
 * Servicio CRUD para las Jornadas (Shifts) parametrizables en el módulo de planeaciones.
 */
export const ShiftService = {
  /**
   * Obtiene todas las jornadas registradas
   */
  getAll: () => get("/planning/shifts", {}, { skipErrorNotify: true }),

  /**
   * Registra una nueva jornada
   * @param {{ name: string, code: string, hoursPerDay: number, allowedDays: number[], defaultStartTime?: string, defaultEndTime?: string, isCustom?: boolean }} data
   */
  create: (data) => post("/planning/shifts", data),

  /**
   * Actualiza una jornada existente
   * @param {string} id - ID del documento en MongoDB
   * @param {{ name: string, hoursPerDay: number, allowedDays: number[], defaultStartTime?: string, defaultEndTime?: string, isCustom?: boolean }} data
   */
  update: (id, data) => put(`/planning/shifts/${id}`, data),

  /**
   * Elimina una jornada
   * @param {string} id - ID del documento en MongoDB
   */
  delete: (id) => del(`/planning/shifts/${id}`),
};

