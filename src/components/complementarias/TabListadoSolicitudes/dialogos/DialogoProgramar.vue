<template>
  <q-dialog :model-value="modelValue" persistent maximized
    @update:model-value="$emit('update:modelValue', $event)"
    @show="onShow">
    <q-card class="dialog-card flex column">

      <!-- Header -->
      <q-card-section class="bg-green-9 q-px-lg q-py-sm row items-center no-shrink">
        <q-icon :name="modo === 'reprogramar' ? 'update' : 'date_range'" color="white" size="22px" class="q-mr-sm" />
        <div class="col">
          <div class="text-white text-weight-bold dialog-title">
            {{ modo === 'reprogramar' ? 'RE-PROGRAMAR SESIONES' : 'PROGRAMAR SESIONES' }}
          </div>
          <div class="text-green-2 text-caption">
            {{ nombreCurso || prfCodigo }} · {{ duracionEfectiva || '—' }} h totales · {{ instructorNombre }}
          </div>
        </div>
        <q-btn flat round dense icon="close" color="white" v-close-popup />
      </q-card-section>

      <!-- Info del curso -->
      <q-card-section class="q-py-sm q-px-lg bg-grey-1 no-shrink">
        <div class="row items-center q-mb-xs">
          <q-icon name="menu_book" color="green-9" size="18px" class="q-mr-xs" />
          <span class="text-subtitle2 text-green-9 text-weight-bold">Información del curso</span>
        </div>
        <div class="row q-col-gutter-md">
          <div class="col-12 col-sm-4">
            <q-input :model-value="prfCodigo" outlined dense readonly bg-color="white" color="green-9" label="Código">
              <template v-slot:prepend><q-icon name="tag" size="16px" /></template>
            </q-input>
          </div>
          <div class="col-12 col-sm-5">
            <q-input :model-value="nombreCurso || '—'" outlined dense readonly bg-color="white" color="green-9" label="Nombre del curso">
              <template v-slot:prepend><q-icon name="school" size="16px" /></template>
            </q-input>
          </div>
          <div class="col-12 col-sm-3">
            <q-input :model-value="`${duracionEfectiva || 0} horas`" outlined dense readonly bg-color="white" color="green-9" label="Duración">
              <template v-slot:prepend><q-icon name="schedule" size="16px" /></template>
            </q-input>
          </div>
        </div>
      </q-card-section>

      <!-- Ambiente (solo modo programar) -->
      <q-card-section v-if="modo === 'programar'" class="q-py-sm q-px-lg bg-grey-1 no-shrink">
        <div class="row q-col-gutter-md items-center">
          <div class="col-12 col-sm-6 col-md-4">
            <q-select
              v-model="environment"
              :options="ambientesConOtro"
              option-value="value" option-label="label"
              emit-value map-options
              outlined dense color="green-9" label="Ambiente (opcional)"
              clearable>
              <template v-slot:prepend><q-icon name="meeting_room" size="16px" /></template>
            </q-select>
          </div>
          <div v-if="environment === '__otro__'" class="col-12 col-sm-6 col-md-4">
            <q-input v-model="otroAmbiente" outlined dense color="green-9" label="Nombre del ambiente">
              <template v-slot:prepend><q-icon name="door_front" size="16px" /></template>
            </q-input>
          </div>
        </div>
      </q-card-section>

      <!-- Loading -->
      <div v-if="loadingSolicitud" class="col flex flex-center">
        <q-spinner-gears color="green-9" size="48px" />
      </div>

      <!-- Body: calendario -->
      <div v-else class="col" style="overflow-y: auto; min-height: 0">
        <SeccionProgramacionFicha
          ref="seccionRef"
          v-model:sesiones="sesiones"
          v-model:fechaInicio="fechaInicio"
          v-model:fechaFin="fechaFin"
          :prf-codigo="prfCodigo"
          :prf-duracion-maxima="duracionEfectiva"
          :instructor-id="instructorId"
          :nombre-instructor="instructorNombre"
          :instructores-adicionales="instructoresAdicionales"
          :competencies="competenciesSolicitud"
          :all-schedules="allSchedules"
          :loading="false"
          :readonly="false"
          @cargar-schedules="cargarSchedules"
        />
      </div>

      <!-- Footer -->
      <q-card-actions align="center" class="q-py-md bg-white shadow-up-1 no-shrink">
        <q-btn label="CANCELAR" flat color="dark" v-close-popup />
        <q-btn
          :label="modo === 'reprogramar' ? 'RE-PROGRAMAR' : 'PROGRAMAR'"
          :icon="modo === 'reprogramar' ? 'update' : 'date_range'"
          color="green-9" unelevated size="md"
          :disable="sesiones.length === 0"
          @click="confirmar"
        />
      </q-card-actions>

    </q-card>
  </q-dialog>
</template>

<script setup>
// ── 1. IMPORTS
import { ref, computed } from 'vue'
import { get } from '../../../../services/api.js'
import { notifyErrorRequest } from '../../../../common/notify.js'
import { toDateStr, calcularHoras } from '../../../../utils/complementarias/DateUtils.js'
import SeccionProgramacionFicha from '../../TabRegistroSolicitud/secciones/programacion/SeccionProgramacionFicha.vue'

// ── 3. PROPS Y EMITS
const props = defineProps({
  modelValue:    { type: Boolean, required: true },
  modo:          { type: String,  default: 'programar' },
  solicitudId:   { type: String,  required: true },
  scheduleId:    { type: String,  default: '' },
  instructorId:  { type: String,  default: '' },
  duracionMax:   { type: Number,  default: 0 },
  scheduleData:  { type: Object,  default: () => ({}) },
  solicitudData: { type: Object,  default: () => ({}) },
  ambientes:     { type: Array,   default: () => [] },
})

const emit = defineEmits(['update:modelValue', 'guardado'])

// ── 4. ESTADO REACTIVO
const seccionRef          = ref(null)
const solicitudCompleta   = ref({})
const sesiones            = ref([])
const fechaInicio         = ref('')
const fechaFin            = ref('')
const environment         = ref('')
const otroAmbiente        = ref('')
const allSchedules        = ref({ titulada: [], complementaria: [], otros: [] })
const loadingSchedules    = ref(false)
const loadingSolicitud    = ref(false)

// ── 5. COMPUTED (leen de solicitudCompleta, no de props.solicitudData)
const instructorNombre = computed(() =>
  solicitudCompleta.value?.instructor?.name || solicitudCompleta.value?.instructor?.nombre || props.instructorId || '—'
)

const prfCodigo = computed(() =>
  solicitudCompleta.value?.catalogCourse?.prfCodigo ||
  solicitudCompleta.value?.prfCodigo ||
  'COMPLEMENTARIA'
)

const nombreCurso = computed(() =>
  solicitudCompleta.value?.prfDenominacion ||
  solicitudCompleta.value?.catalogCourse?.prfDenominacion ||
  solicitudCompleta.value?.catalogCourseName ||
  ''
)

const duracionEfectiva = computed(() =>
  Number(solicitudCompleta.value?.prfDuracionMaxima) ||
  Number(solicitudCompleta.value?.catalogCourse?.prfDuracionMaxima) ||
  props.duracionMax || 0
)

const competenciesSolicitud = computed(() => {
  const data = solicitudCompleta.value
  const outcomes = Array.isArray(data?.outcomes) ? data.outcomes : []

  if (Array.isArray(data?.competencies) && data.competencies.length) {
    const normalized = data.competencies.map(c => ({
      name: c.name || c.nombre || '',
      code: c.code || c.codigo || '',
      resultados: Array.isArray(c.resultados) && c.resultados.length ? c.resultados : [],
    }))
    if (outcomes.length) {
      const sinResultados = normalized.filter(c => !c.resultados.length)
      if (normalized.length === 1) {
        normalized[0].resultados = [...new Set([...normalized[0].resultados, ...outcomes])]
      } else if (sinResultados.length) {
        sinResultados.forEach(c => { c.resultados = [...outcomes] })
      }
    }
    return normalized
  }

  const sesionesData = Array.isArray(data?.sesiones) ? data.sesiones : []
  const map = new Map()
  for (const s of sesionesData) {
    if (!s.competencia) continue
    if (!map.has(s.competencia)) {
      map.set(s.competencia, { name: s.competencia, code: '', resultados: [] })
    }
    const entry = map.get(s.competencia)
    if (Array.isArray(s.resultados)) {
      for (const r of s.resultados) {
        if (r && !entry.resultados.includes(r)) entry.resultados.push(r)
      }
    }
  }
  if (outcomes.length) {
    if (map.size === 1) {
      const entry = map.values().next().value
      for (const o of outcomes) { if (!entry.resultados.includes(o)) entry.resultados.push(o) }
    } else if (!map.size) {
      map.set('default', { name: sesionesData[0]?.competencia || '', code: '', resultados: outcomes })
    }
  }
  return [...map.values()]
})

const instructoresAdicionales = computed(() => {
  if (!Array.isArray(solicitudCompleta.value?.instructores)) return []
  const principal = props.instructorId
  return solicitudCompleta.value.instructores
    .map(i => {
      if (typeof i !== 'object') return { _id: i, name: '' }
      return { _id: i._id || i.instructor || '', name: i.name || i.nombre || '' }
    })
    .filter(i => i._id && i._id !== principal)
})

const ambientesConOtro = computed(() => [
  ...props.ambientes,
  { label: 'Otro', value: '__otro__' },
])

// ── 6. FUNCIÓN DE CARGA
async function fetchSolicitud() {
  if (!props.solicitudId) return
  loadingSolicitud.value = true
  try {
    solicitudCompleta.value = await get(`/complementary/requests/${props.solicitudId}`) || {}
  } catch {
    solicitudCompleta.value = props.solicitudData || {}
  }
  loadingSolicitud.value = false
}

// ── 7. INICIALIZACIÓN (se ejecuta en @show del q-dialog, siempre que se muestra)
async function onShow() {
  allSchedules.value = { titulada: [], complementaria: [], otros: [] }
  environment.value  = ''
  otroAmbiente.value = ''

  await fetchSolicitud()
  const data = solicitudCompleta.value

  const s = props.scheduleData || {}
  if (s && (s.events || s.tstart)) {
    const tstart = s.tstart ? String(s.tstart).slice(0, 5) : ''
    const tend   = s.tend   ? String(s.tend).slice(0, 5)   : ''
    fechaInicio.value = toDateStr(s.fstart) || ''
    fechaFin.value    = toDateStr(s.fend)   || ''
    const horas = calcularHoras(tstart, tend)
    sesiones.value = Array.isArray(s.events)
      ? s.events
          .map(e => {
            const isObj = typeof e === 'object' && e !== null
            const fecha = toDateStr(isObj ? e.start || '' : e)
            return {
              fecha,
              horaInicio: tstart,
              horaFin: tend,
              totalHoras: horas,
              instructor:  isObj ? (e.idInstructor || '') : '',
              competencia: isObj ? (e.competencia || '') : '',
              resultado:   isObj ? (e.resultado || '') : '',
            }
          })
          .sort((a, b) => a.fecha.localeCompare(b.fecha))
      : []
  } else {
    const src = Array.isArray(data?.sesiones) ? data.sesiones : []
    if (src.length) {
      const sorted = [...src].sort((a, b) => a.fecha.localeCompare(b.fecha))
      fechaInicio.value = toDateStr(data?.fechaInicio) || sorted[0].fecha
      fechaFin.value    = toDateStr(data?.fechaFin)    || sorted[sorted.length - 1].fecha
      sesiones.value = sorted.map(s => ({
        fecha:       s.fecha,
        horaInicio:  s.horaInicio || '',
        horaFin:     s.horaFin    || '',
        totalHoras:  s.totalHoras || calcularHoras(s.horaInicio || '', s.horaFin || ''),
        instructor:  s.instructor?._id || s.instructor || '',
        competencia: s.competencia || '',
        resultado:   s.resultado   || '',
      }))
    } else {
      fechaInicio.value = toDateStr(data?.fechaInicio) || ''
      fechaFin.value    = toDateStr(data?.fechaFin)    || ''
      sesiones.value    = []
    }
  }
  environment.value = data?.environment?._id || data?.environment || ''

  const comps = competenciesSolicitud.value
  if (comps.length === 1 && sesiones.value.length) {
    const compName = comps[0].name
    const resultados = comps[0].resultados || []
    const resUnico = resultados.length === 1 ? resultados[0] : null
    sesiones.value = sesiones.value.map(s => ({
      ...s,
      competencia: s.competencia || compName,
      resultado:   s.resultado || resUnico || '',
    }))
  }

  seccionRef.value?.updateCalendarSize()
}

// ── 9. API / ENDPOINTS
// carga los horarios existentes del instructor (titulada, complementaria, otros)
async function cargarSchedules(instructorId) {
  if (!instructorId) { allSchedules.value = { titulada: [], complementaria: [], otros: [] }; return }
  loadingSchedules.value = true
  try {
    const res = await get(`/complementary/instructor/${instructorId}/all-schedules`)
    const complementarias = Array.isArray(res?.complementaria) ? res.complementaria : []
    allSchedules.value = {
      titulada:       Array.isArray(res?.titulada)       ? res.titulada       : [],
      complementaria: props.scheduleId ? complementarias.filter(s => s._id !== props.scheduleId) : complementarias,
      otros:          Array.isArray(res?.otros)          ? res.otros          : [],
    }
  } catch {
    allSchedules.value = { titulada: [], complementaria: [], otros: [] }
  }
  loadingSchedules.value = false
}

// arma el payload con eventos, días y horarios y emite al padre
function confirmar() {
  if (!sesiones.value.length) return
  const events = sesiones.value.map(s => ({
    start: s.fecha,
    idInstructor: s.instructor || props.instructorId,
    autogenerated: true,
  }))
  const days   = [...new Set(sesiones.value.map(s => new Date(s.fecha + 'T00:00:00').getDay()))].sort((a, b) => a - b)
  const tstart = sesiones.value[0]?.horaInicio || '08:00'
  const tend   = sesiones.value[0]?.horaFin    || '16:00'
  const fstart = fechaInicio.value || sesiones.value[0]?.fecha
  const fend   = fechaFin.value    || sesiones.value[sesiones.value.length - 1]?.fecha

  if (fstart > fend) { notifyErrorRequest('La fecha de inicio no puede ser posterior a la fecha de fin.'); return }
  if (tstart >= tend) { notifyErrorRequest('La hora de inicio debe ser anterior a la hora de fin.'); return }
  const originalFstart = props.scheduleData?.fstart ? toDateStr(props.scheduleData.fstart) : ''
  if (originalFstart && fstart < originalFstart) {
    notifyErrorRequest('La fecha de inicio no puede ser anterior a la fecha de inicio original.'); return
  }

  const data = { instructor: props.instructorId, events, days, tstart, tend, fstart, fend }
  if (environment.value && environment.value !== '__otro__') {
    data.environment = environment.value
  }
  if (environment.value === '__otro__' && otroAmbiente.value) {
    data.supporttext = `PLANEACIÓN COMPLEMENTARIA — Ambiente: ${otroAmbiente.value}`
  }
  emit('guardado', {
    modo: props.modo,
    solicitudId: props.solicitudId,
    scheduleId: props.scheduleId,
    data,
  })
  emit('update:modelValue', false)
}
</script>

<style scoped>
.dialog-card  { height: 100vh; }
.dialog-title { font-size: 16px; }
.no-shrink    { flex-shrink: 0; }
</style>
