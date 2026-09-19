<template>
  <q-dialog :model-value="modelValue" persistent @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="dialog-card flex column">

      <!-- Header -->
      <q-card-section class="bg-green-9 q-px-lg q-py-md no-shrink">
        <div class="row items-center no-wrap q-gutter-md">
          <q-icon name="fact_check" color="white" size="32px" />
          <div>
            <div class="text-white text-weight-bold dialog-title">ASIGNAR FICHA</div>
            <div class="text-green-2 text-caption">Completa los datos administrativos del programa</div>
          </div>
        </div>
      </q-card-section>

      <q-separator color="green-8" />

      <!-- Body scrollable -->
      <div class="dialog-body">
        <div class="q-pa-md column q-gutter-md">

          <!-- ── Sección 1: Códigos SOFIA PLUS ── -->
          <div>
            <div class="section-title">
              <q-icon name="qr_code_2" size="16px" class="q-mr-xs" />CÓDIGOS SOFIA PLUS
            </div>
            <div class="row q-col-gutter-sm">
              <div class="col-12 col-sm-6">
                <q-input
                  v-model="codigoSolicitud"
                  outlined dense color="green-9"
                  label="Código de solicitud *"
                  placeholder="Ej: 123456"
                  autofocus
                >
                  <template v-slot:prepend><q-icon name="confirmation_number" /></template>
                </q-input>
              </div>
              <div class="col-12 col-sm-6">
                <q-input
                  v-model="fichaCaracterizacion"
                  outlined dense color="green-9"
                  label="Ficha de caracterización *"
                  placeholder="Ej: FC-2026-001"
                >
                  <template v-slot:prepend><q-icon name="description" /></template>
                </q-input>
              </div>
            </div>
          </div>

          <!-- ── Sección 2: Tipo de programa y población ── -->
          <div>
            <div class="section-title">
              <q-icon name="category" size="16px" class="q-mr-xs" />TIPO DE PROGRAMA Y POBLACIÓN
            </div>
            <div class="row q-col-gutter-sm">
              <div class="col-12 col-sm-6">
                <q-select
                  v-model="tipoPrograma"
                  :options="opcionesPrograma"
                  :loading="loadingParametros"
                  emit-value map-options
                  outlined dense color="green-9"
                  label="Tipo de programa *"
                  clearable
                >
                  <template v-slot:prepend><q-icon name="category" /></template>
                  <template v-slot:no-option>
                    <q-item><q-item-section class="text-grey">Sin tipos registrados</q-item-section></q-item>
                  </template>
                </q-select>
              </div>
              <div class="col-12 col-sm-6">
                <q-select
                  v-model="tipoPoblacion"
                  :options="opcionesPoblacion"
                  :loading="loadingParametros"
                  emit-value map-options
                  outlined dense color="green-9"
                  label="Tipo de población *"
                  clearable
                >
                  <template v-slot:prepend><q-icon name="diversity_3" /></template>
                  <template v-slot:no-option>
                    <q-item><q-item-section class="text-grey">Sin tipos registrados</q-item-section></q-item>
                  </template>
                </q-select>
              </div>
            </div>
          </div>

          <!-- ── Sección 3: Fechas del programa ── -->
          <div>
            <div class="section-title">
              <q-icon name="event" size="16px" class="q-mr-xs" />FECHAS DEL PROGRAMA
            </div>
            <div class="row q-col-gutter-sm">
              <div class="col-12 col-sm-6">
                <q-input
                  :model-value="fechaInicio"
                  type="date" outlined dense color="green-9"
                  label="Fecha de inicio"
                  readonly bg-color="grey-2"
                  @click="alertaFechasProgramar"
                >
                  <template v-slot:prepend><q-icon name="play_circle_outline" /></template>
                </q-input>
              </div>
              <div class="col-12 col-sm-6">
                <q-input
                  :model-value="fechaFin"
                  type="date" outlined dense color="green-9"
                  label="Fecha de finalización"
                  readonly bg-color="grey-2"
                  @click="alertaFechasProgramar"
                >
                  <template v-slot:prepend><q-icon name="stop_circle" /></template>
                </q-input>
              </div>
            </div>
          </div>

          <!-- ── Sección 4: Fechas administrativas ── -->
          <div>
            <div class="section-title">
              <q-icon name="admin_panel_settings" size="16px" class="q-mr-xs" />FECHAS ADMINISTRATIVAS
            </div>
            <div class="row q-col-gutter-sm">
              <div class="col-12">
                <q-input
                  v-model="fechaInscripcion"
                  type="date" outlined dense color="green-9"
                  label="Apertura de inscripciones *"
                >
                  <template v-slot:prepend><q-icon name="assignment_turned_in" /></template>
                </q-input>
              </div>
              <div class="col-12 col-sm-6">
                <q-input
                  v-model="fechaMatriculaInicio"
                  type="date" outlined dense color="green-9"
                  label="Inicio de matrícula *"
                >
                  <template v-slot:prepend><q-icon name="how_to_reg" /></template>
                </q-input>
              </div>
              <div class="col-12 col-sm-6">
                <q-input
                  v-model="fechaMatriculaFin"
                  type="date" outlined dense color="green-9"
                  label="Fin de matrícula *"
                >
                  <template v-slot:prepend><q-icon name="how_to_reg" /></template>
                </q-input>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Footer -->
      <q-separator />
      <q-card-actions align="center" class="q-py-md no-shrink">
        <q-btn label="CANCELAR" flat color="dark" v-close-popup />
        <q-btn
          label="CONFIRMAR"
          icon="check_circle"
          color="green-9" unelevated
          :disable="!formValido"
          @click="confirmar"
        />
      </q-card-actions>

    </q-card>
  </q-dialog>
</template>

<script setup>
// ── 1. IMPORTS
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { opcionesDeParametros } from '../../../../utils/complementarias/EstadoColorUtils.js'
import { toDateStr } from '../../../../utils/complementarias/DateUtils.js'

// ── 3. PROPS Y EMITS
const props = defineProps({
  modelValue:        { type: Boolean, required: true },
  solicitudId:       { type: String,  required: true },
  solicitudData:     { type: Object,  default: () => ({}) },
  parametros:        { type: Array,   default: () => [] },
  loadingParametros: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'guardado'])
const $q = useQuasar()

// ── 4. ESTADO REACTIVO
const codigoSolicitud      = ref('')
const fichaCaracterizacion = ref('')
const tipoPrograma         = ref(null)
const tipoPoblacion        = ref(null)
const fechaInicio          = ref('')
const fechaFin             = ref('')
const fechaInscripcion     = ref('')
const fechaMatriculaInicio = ref('')
const fechaMatriculaFin    = ref('')

// ── 5. COMPUTED
// opciones de tipo programa filtradas desde parámetros
const opcionesPrograma  = computed(() => opcionesDeParametros(props.parametros, 'programa'))
// opciones de tipo población filtradas desde parámetros
const opcionesPoblacion = computed(() => opcionesDeParametros(props.parametros, 'poblaci'))

// valida que todos los campos obligatorios estén completos
const formValido = computed(() =>
  codigoSolicitud.value.trim() &&
  fichaCaracterizacion.value.trim() &&
  tipoPrograma.value &&
  tipoPoblacion.value &&
  fechaInscripcion.value &&
  fechaMatriculaInicio.value &&
  fechaMatriculaFin.value
)

// ── 6. WATCHERS
// al abrir el diálogo, pre-carga los datos existentes de la solicitud
watch(() => props.modelValue, (val) => {
  if (val) {
    const d = props.solicitudData
    codigoSolicitud.value      = d?.codigoSolicitud                       || ''
    fichaCaracterizacion.value = d?.fichaCaracterizacion                  || ''
    tipoPrograma.value         = d?.tipoPrograma                          || null
    tipoPoblacion.value        = d?.tipoPoblacion                         || null
    fechaInicio.value          = toDateStr(d?.fechaInicio)
    fechaFin.value             = toDateStr(d?.fechaFin)
    fechaInscripcion.value     = toDateStr(d?.fechaInscripcion)
    fechaMatriculaInicio.value = toDateStr(d?.fechaMatriculaInicio)
    fechaMatriculaFin.value    = toDateStr(d?.fechaMatriculaFin)
  }
})

// ── 10. MANEJADORES DEL TEMPLATE
function alertaFechasProgramar() {
  $q.notify({ type: 'info', icon: 'date_range', message: 'Las fechas de inicio y finalización se definen en la etapa de Programar.', position: 'top', timeout: 3500 })
}

function confirmar() {
  if (!formValido.value) return
  emit('guardado', {
    id: props.solicitudId,
    data: {
      codigoSolicitud:      codigoSolicitud.value.trim().toUpperCase(),
      fichaCaracterizacion: fichaCaracterizacion.value.trim().toUpperCase(),
      tipoPrograma:         tipoPrograma.value,
      tipoPoblacion:        tipoPoblacion.value,
      fechaInicio:          fechaInicio.value       || undefined,
      fechaFin:             fechaFin.value          || undefined,
      fechaInscripcion:     fechaInscripcion.value,
      fechaMatriculaInicio: fechaMatriculaInicio.value,
      fechaMatriculaFin:    fechaMatriculaFin.value,
    },
  })
  emit('update:modelValue', false)
}
</script>

<style scoped>
.dialog-card  { width: 680px; max-width: 96vw; max-height: 92vh; }
.dialog-title { font-size: 17px; }
.no-shrink    { flex-shrink: 0; }
.dialog-body  { flex: 1; overflow-y: auto; min-height: 0; }
.section-title {
  font-size: 11px;
  font-weight: 700;
  color: #2e7d32;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
}
</style>
