<template>
  <q-dialog :model-value="modelValue" maximized @update:model-value="$emit('update:modelValue', $event)" @show="onShow">
    <q-card class="dialog-card flex column">

      <!-- Header -->
      <q-card-section class="bg-green-9 q-px-lg q-py-md row items-center no-wrap no-shrink">
        <q-icon
          :name="modoEdicion ? 'edit_note' : 'visibility'"
          color="white" size="30px" class="q-mr-md"
        />
        <div class="col">
          <div class="text-white text-weight-bold ellipsis dialog-title">
            {{ solicitud?._detalle?.catalogCourse?.prfDenominacion || solicitud?.nombreCurso || '—' }}
          </div>
          <div class="text-green-2 text-caption">
            <span v-if="solicitud?._detalle?.fichaNumber">
              Ficha N° {{ solicitud._detalle.fichaNumber }}
              <span v-if="solicitud._detalle.fichaCaracterizacion"> · Caract. {{ solicitud._detalle.fichaCaracterizacion }}</span>
              ·
            </span>
            {{ modoEdicion ? 'Editar y corregir datos de la solicitud' : 'Detalle completo de la solicitud (solo lectura)' }}
          </div>
        </div>
        <q-badge
          :color="badgeColor"
          class="q-mx-md badge-estado"
        >
          {{ solicitud?.estado }}
        </q-badge>
        <q-btn flat round dense icon="close" color="white" v-close-popup />
      </q-card-section>

      <!-- Body -->
      <q-scroll-area class="col">
        <div class="q-pa-md">
          <FormularioRegistroSolicitud
            ref="formRef"
            v-model="formData"
            :readonly="!modoEdicion"
            :loading="loadingGuardar"
            :coordinadores="coordinadores"
            :environments="environments"
            :supervisores="supervisores"
            :parametros="parametros"
            :solicitud-id="props.solicitud?._id || ''"
          />

          <!-- Historial de cambios -->
          <div v-if="historial.length" class="q-mt-lg">
            <div class="text-weight-bold text-green-9 q-mb-sm history-title">
              <q-icon name="history" class="q-mr-xs" />Historial de cambios
            </div>
            <q-timeline color="green-9" layout="dense">
              <q-timeline-entry
                v-for="(h, i) in historial" :key="i"
                :title="STATE_LABEL[h.newState] || h.newState"
                :subtitle="formatFecha(h.timestamp)"
                :icon="estadoIcono(h.newState)"
                :color="estadoColorHistory(h.newState)"
              >
                <div class="text-caption text-grey-7">
                  Por: <strong>{{ h.changedBy }}</strong> ({{ h.changedByRole }})
                </div>
                <div v-if="h.observations" class="q-mt-xs text-body2 text-grey-8 bg-grey-2 q-pa-sm rounded-borders">
                  {{ h.observations }}
                </div>
              </q-timeline-entry>
            </q-timeline>
          </div>
        </div>
      </q-scroll-area>

      <!-- Footer -->
      <q-card-actions align="center" class="q-pb-lg bg-white shadow-up-1 no-shrink">
        <q-btn
          label="PREVISUALIZAR PDF"
          icon="picture_as_pdf"
          flat color="green-9"
          :loading="loadingPdf"
          @click="previsualizarPdf"
        />
        <template v-if="modoEdicion">
          <q-btn label="CANCELAR" flat color="dark" v-close-popup />
          <q-btn
            label="GUARDAR CAMBIOS"
            color="green-9" unelevated
            :loading="loadingGuardar"
            @click="guardar"
          >
            <template v-slot:loading>
              <q-spinner-oval color="white" size="1em" />
            </template>
          </q-btn>
        </template>
      </q-card-actions>

    </q-card>
  </q-dialog>
</template>

<script setup>
// ── 1. IMPORTS
import { ref, computed, watch, nextTick } from 'vue'
import { generateSolicitudPdf } from '../../../../utils/complementarias/generateSolicitudPdf.js'
import { estadoColor } from '../../../../utils/complementarias/EstadoColorUtils.js'
import { STATE_BACKEND_MAP as STATE_LABEL } from '../../../../static/complementarias/ConstantesComplementarias.js'
import { toDateStr, calcularHoras } from '../../../../utils/complementarias/DateUtils.js'
import FormularioRegistroSolicitud from '../../TabRegistroSolicitud/TabRegistroSolicitud.vue'

// ── 3. PROPS Y EMITS
const props = defineProps({
  modelValue:    { type: Boolean, required: true },
  solicitud:     { type: Object,  required: true },
  modoEdicion:   { type: Boolean, default: false },
  coordinadores: { type: Array,   default: () => [] },
  environments:  { type: Array,   default: () => [] },
  supervisores:  { type: Array,   default: () => [] },
  parametros:    { type: Array,   default: () => [] },
})

const emit = defineEmits(['update:modelValue', 'guardado'])

// ── 4. ESTADO REACTIVO
const loadingGuardar = ref(false)
const loadingPdf     = ref(false)
const formData       = ref({})
const formRef        = ref(null)

// ── 5. COMPUTED
const badgeColor = computed(() => estadoColor(props.solicitud?.estado))

const historial = computed(() =>
  Array.isArray(props.solicitud?._detalle?.history)
    ? [...props.solicitud._detalle.history].reverse()
    : []
)

// ── 6. WATCHERS
watch(() => props.modelValue, (val) => {
  if (val) formData.value = transformarDetalleAFormulario(props.solicitud?._detalle)
}, { immediate: true })

// ── 8. HELPERS
function transformarDetalleAFormulario(d) {
  if (!d) return {}
  return {
    fechaRegistro:            toDateStr(d.createdAt),
    horaRegistro:             d.createdAt?.slice(11, 16) || '',
    catalogCourse:            d.catalogCourse?._id       || d.catalogCourse || '',
    prfCodigo:                d.catalogCourse?.prfCodigo          || '',
    prfVersion:               d.catalogCourse?.prfVersion         || '',
    prfDuracionMaxima:        d.catalogCourse?.prfDuracionMaxima || d.prfDuracionMaxima || 0,
    prfDenominacion:          d.catalogCourse?.prfDenominacion    || '',
    tipoPrograma:             d.tipoPrograma      || '',
    numAprendices:            d.numAprendices     || '',
    tipoPoblacion:            d.tipoPoblacion     || '',
    coordinator:              d.coordinator?._id  || d.coordinator || '',
    instructorId:             d.instructor?._id           || '',
    nombreInstructor:         d.instructor?.name          || '',
    cedulaInstructor:         d.instructor?.numdocument   || '',
    telefonoInstructor:       d.instructor?.phone         || '',
    correoInstructor:         d.instructor?.email         || '',
    correoPersonalInstructor: d.instructor?.personalEmail || d.instructor?.emailpersonal || '',
    instructoresAdicionales: (d.instructores || [])
      .filter(x => !x.esPrincipal)
      .map(x => ({ _id: x.instructor, name: x.nombre, numdocument: x.documento, email: x.email })),
    departamento:             d.departamento      || '',
    municipio:                d.municipio         || '',
    vereda:                   d.vereda            || '',
    direccion:                d.direccion         || '',
    nombreEmpresa:            d.nombreEmpresa     || '',
    nitEmpresa:               d.nitEmpresa        || '',
    contactoEmpresa:          d.contactoEmpresa   || '',
    telefonoEmpresa:          d.telefonoEmpresa   || '',
    fechaInicio:              toDateStr(d.fechaInicio),
    fechaFin:                 toDateStr(d.fechaFin),
    fechaInscripcion:         toDateStr(d.fechaInscripcion),
    fechaMatriculaInicio:     toDateStr(d.fechaMatriculaInicio),
    fechaMatriculaFin:        toDateStr(d.fechaMatriculaFin),
    requisitosIngreso:  d.requisitosIngreso  || '',
    competencies:       Array.isArray(d.competencies) ? d.competencies.map(c => ({
      name: c.name || c.nombre || '',
      code: c.code || c.codigo || '',
      totalCompetenceHours: c.totalCompetenceHours || c.horas || null,
      criteria: c.criteria || c.criterios || [],
      resultados: c.resultados || c.outcomes || [],
    })) : [],
    outcomes:           Array.isArray(d.outcomes) ? d.outcomes : [],
    learningActivity:   d.learningActivity   || '',
    recursosNecesarios: d.recursosNecesarios || '',
    environment:        d.environment?._id  || d.environment || '',
    formationDocument:  d.formationDocument  || '',
    codigoSolicitud:    d.codigoSolicitud    || '',
    fichaCaracterizacion: d.fichaCaracterizacion || '',
    sesiones:           (Array.isArray(d.sesiones) && d.sesiones.length)
                          ? d.sesiones.map(s => ({
                              ...s,
                              resultado: s.resultado || (s.resultados?.[0]) || '',
                              instructor: typeof s.instructor === 'object' ? s.instructor?.name || '' : s.instructor || '',
                            }))
                          : construirSesiones(d._scheduleData),
    numeroSolicitud:    d.numeroSolicitud    || '',
    supervisor:               d.supervisor?._id || d.supervisor || '',
    supervisorNombre:         d.supervisor?.name || d.supervisorNombre || '',
    campesena:                d.campesena?._id  || d.campesena  || '',
    ambienteNombre:     d.ambienteNombre     || '',
    ambienteDireccion:  d.ambienteDireccion  || '',
  }
}

function construirSesiones(schedule) {
  if (!schedule?.events?.length) return []
  const horas = calcularHoras(schedule.tstart, schedule.tend)
  return schedule.events
    .map(evt => ({ fecha: toDateStr(evt?.start || evt) }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map(({ fecha }) => ({
      fecha,
      horaInicio: schedule.tstart || '',
      horaFin:    schedule.tend   || '',
      totalHoras: horas,
    }))
}

function formatFecha(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

function estadoIcono(state) {
  const MAP = {
    PENDIENTE: 'schedule', APROBADA: 'check_circle', RECHAZADA: 'cancel',
    FICHA_ASIGNADA: 'fact_check', INSCRIPCION: 'how_to_reg', PROGRAMADA: 'date_range',
    EJECUCION: 'play_circle', CERRADA: 'lock', CANCELADA: 'block',
  }
  return MAP[state] || 'radio_button_unchecked'
}

function estadoColorHistory(state) {
  const MAP = {
    PENDIENTE: 'orange-8', APROBADA: 'green-9', RECHAZADA: 'red-8',
    FICHA_ASIGNADA: 'purple-8', INSCRIPCION: 'teal-8', PROGRAMADA: 'blue-8',
    EJECUCION: 'deep-purple-8', CERRADA: 'grey-7', CANCELADA: 'grey-6',
  }
  return MAP[state] || 'grey-5'
}

// ── 10. MANEJADORES DEL TEMPLATE
function onShow() {
  if (props.modoEdicion) nextTick(() => formRef.value?.updateCalendarSize())
}

function guardar() {
  emit('guardado', { id: props.solicitud._id, data: formData.value })
}

async function previsualizarPdf() {
  loadingPdf.value = true
  try {
    await generateSolicitudPdf(formData.value)
  } finally {
    loadingPdf.value = false
  }
}
</script>

<style scoped>
.dialog-card  { height: 100vh; }
.dialog-title { font-size: 16px; }
.no-shrink    { flex-shrink: 0; }
.badge-estado { padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; }
.history-title { font-size: 15px; }
</style>
