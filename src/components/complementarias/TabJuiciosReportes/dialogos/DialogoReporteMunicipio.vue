<template>
  <q-dialog v-model="model" persistent maximized>
    <q-card class="flex column">

      <!-- Header -->
      <q-card-section class="q-px-lg q-py-sm row items-center no-shrink" style="background-color: var(--color_button)">
        <q-icon name="location_on" color="white" size="24px" class="q-mr-sm" />
        <div class="col">
          <div class="text-white text-weight-bold" style="font-size:15px">REPORTE DE COMPLEMENTARIAS POR MUNICIPIO Y FECHA</div>
          <div class="text-green-3 text-caption">Fichas e instructores con clase programada en un municipio y día específico</div>
        </div>
        <q-btn flat round dense icon="close" color="white" v-close-popup />
      </q-card-section>

      <q-separator color="green-8" />

      <!-- Body -->
      <div class="col" style="overflow-y: auto; min-height: 0">
        <div class="q-pa-lg">

          <!-- Filtros -->
          <div class="section-box q-mb-lg">
            <div class="section-box__title">
              <q-icon name="filter_alt" size="15px" class="q-mr-xs" />Filtros de consulta
            </div>
            <div class="q-pa-md">
              <div class="row q-col-gutter-sm items-end">
                <div class="col-12 col-sm-3">
                  <q-select v-model="departamento" :options="departamentosOpciones"
                    :loading="loadingDepartamentos" outlined dense color="green-9" label="Departamento *"
                    @update:model-value="onDepartamentoChange">
                    <template v-slot:prepend><q-icon name="map" color="green-9" /></template>
                  </q-select>
                </div>
                <div class="col-12 col-sm-4">
                  <q-select v-model="town" :options="municipiosOpciones"
                    :loading="loadingMunicipios" emit-value map-options
                    use-input input-debounce="200" @filter="filtrarMunicipios"
                    outlined dense color="green-9" label="Municipio *"
                    :disable="!departamento">
                    <template v-slot:prepend><q-icon name="location_on" color="green-9" /></template>
                    <template v-slot:no-option>
                      <q-item><q-item-section class="text-grey">Sin resultados</q-item-section></q-item>
                    </template>
                  </q-select>
                </div>
                <div class="col-12 col-sm-3">
                  <q-input v-model="fecha" type="date" outlined dense color="green-9" label="Fecha *">
                    <template v-slot:prepend><q-icon name="today" color="green-9" /></template>
                  </q-input>
                </div>
                <div class="col-12 col-sm-2">
                  <q-btn label="GENERAR" icon="search" unelevated class="style-btn full-width"
                    :loading="loadingReporte" :disable="!town || !fecha" @click="consultar" />
                </div>
              </div>
            </div>
          </div>

          <!-- Cargando -->
          <div v-if="loadingReporte" class="text-center q-pa-xl">
            <q-spinner-dots color="green-9" size="48px" />
            <div class="text-grey-5 q-mt-md">Consultando reporte…</div>
          </div>

          <!-- Estado vacío inicial -->
          <div v-else-if="!consultado" class="text-center q-pa-xl">
            <q-icon name="manage_search" color="grey-4" size="64px" />
            <div class="text-grey-5 q-mt-md" style="font-size:16px; font-weight:600">Selecciona un municipio y fecha</div>
            <div class="text-grey-4 q-mt-xs text-body2">El reporte mostrará las fichas complementarias con clase programada ese día</div>
          </div>

          <!-- Sin resultados -->
          <div v-else-if="consultado && !rows.length" class="text-center q-pa-xl">
            <q-icon name="event_busy" color="grey-4" size="64px" />
            <div class="text-grey-5 q-mt-md" style="font-size:16px; font-weight:600">Sin complementarias ese día</div>
            <div class="text-grey-4 q-mt-xs text-body2">No hay fichas con clase programada en {{ municipioNombre }} el {{ fechaFormateada }}</div>
          </div>

          <!-- Resultados -->
          <template v-if="consultado && rows.length">
            <div class="row q-col-gutter-sm q-mb-md">
              <div class="col-auto">
                <q-badge color="green-8" class="q-pa-sm" style="font-size:13px">
                  <q-icon name="school" class="q-mr-xs" />
                  {{ rows.length }} {{ rows.length === 1 ? 'ficha encontrada' : 'fichas encontradas' }}
                </q-badge>
              </div>
              <div class="col-auto">
                <q-badge color="blue-grey-7" class="q-pa-sm" style="font-size:13px">
                  <q-icon name="location_on" class="q-mr-xs" />
                  {{ municipioNombre }}{{ departamento ? ` — ${departamento}` : '' }}
                </q-badge>
              </div>
              <div class="col-auto">
                <q-badge color="blue-grey-7" class="q-pa-sm" style="font-size:13px">
                  <q-icon name="today" class="q-mr-xs" />
                  {{ fechaFormateada }}
                </q-badge>
              </div>
            </div>

            <q-table
              :rows="rows"
              :columns="columnas"
              row-key="_idx"
              flat bordered
              :pagination="{ rowsPerPage: 20 }"
              rows-per-page-label="Registros por página"
              no-data-label="Sin datos"
            >
              <template v-slot:body-cell-instructor="cellProps">
                <q-td :props="cellProps">
                  <div class="text-weight-medium">{{ cellProps.row.instructor?.name || '—' }}</div>
                  <div class="text-caption text-grey-6">
                    <a v-if="cellProps.row.instructor?.phone" :href="`tel:${cellProps.row.instructor.phone}`" class="text-grey-7">
                      {{ cellProps.row.instructor.phone }}
                    </a>
                    <span v-if="cellProps.row.instructor?.phone && cellProps.row.instructor?.email"> · </span>
                    <a v-if="cellProps.row.instructor?.email" :href="`mailto:${cellProps.row.instructor.email}`" class="text-green-9">
                      {{ cellProps.row.instructor.email }}
                    </a>
                  </div>
                </q-td>
              </template>

              <template v-slot:body-cell-dias="cellProps">
                <q-td :props="cellProps">
                  <q-badge v-for="d in (cellProps.row.horario?.days || [])" :key="d"
                    color="green-1" text-color="green-9" class="q-mr-xs" style="font-size:11px">
                    {{ DIAS_SEMANA.find(ds => ds.val === d)?.label || d }}
                  </q-badge>
                </q-td>
              </template>
            </q-table>

            <div class="row justify-end q-mt-md">
              <q-btn label="EXPORTAR PDF" icon="picture_as_pdf" unelevated class="style-btn"
                :loading="loadingPdf" @click="exportarPdf" />
            </div>
          </template>

        </div>
      </div>

    </q-card>
  </q-dialog>
</template>

<script setup>
// ── 1. IMPORTS
import { ref, computed, watch } from 'vue'
import { get } from '../../../../services/api.js'
import { notifyErrorRequest } from '../../../../common/notify.js'
import { COLUMNS_REPORTES, DIAS_SEMANA } from '../../../../static/complementarias/ConstantesComplementarias.js'
import { generateReporteMunicipioPdf } from '../../../../utils/complementarias/generateReporteMunicipioPdf.js'

// ── 3. PROPS Y EMITS
const props = defineProps({
  modelValue: { type: Boolean, required: true },
})
const emit = defineEmits(['update:modelValue'])

// ── 4. ESTADO REACTIVO
const DEP_DEFAULT          = 'SANTANDER'
const departamento         = ref(null)
const town                 = ref(null)
const fecha                = ref('')
const rows                 = ref([])
const consultado           = ref(false)
const loadingReporte       = ref(false)
const loadingPdf           = ref(false)
const departamentosOpciones = ref([])
const allMunicipios        = ref([])
const municipiosOpciones   = ref([])
const loadingDepartamentos = ref(false)
const loadingMunicipios    = ref(false)

// ── 5. COMPUTED
const model = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const columnas = COLUMNS_REPORTES['complementarias-por-fecha'] || []

const municipioNombre = computed(() =>
  allMunicipios.value.find(m => m.value === town.value)?.label || ''
)

const fechaFormateada = computed(() => {
  if (!fecha.value) return ''
  return new Date(fecha.value + 'T12:00:00').toLocaleDateString('es-CO', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })
})

// ── 6. WATCHERS
watch(() => props.modelValue, (val) => {
  if (val) {
    town.value       = null
    fecha.value      = ''
    rows.value       = []
    consultado.value = false
    if (!departamentosOpciones.value.length) cargarDepartamentos()
    else preselectDep()
  }
})

// ── 9. API / ENDPOINTS
function preselectDep() {
  const dep = departamentosOpciones.value.find(d => d === DEP_DEFAULT)
  departamento.value = dep || null
  if (dep) cargarMunicipios(dep)
}

async function cargarDepartamentos() {
  loadingDepartamentos.value = true
  try {
    const data = await get('/towns/departaments')
    departamentosOpciones.value = Array.isArray(data) ? data : []
  } catch { departamentosOpciones.value = [] }
  loadingDepartamentos.value = false
  preselectDep()
}

async function cargarMunicipios(dep) {
  loadingMunicipios.value = true
  try {
    const data = await get(`/towns/towns/${dep}`)
    allMunicipios.value     = Array.isArray(data) ? data.map(m => ({ label: m.name, value: m._id })) : []
    municipiosOpciones.value = allMunicipios.value
  } catch {
    allMunicipios.value     = []
    municipiosOpciones.value = []
  }
  loadingMunicipios.value = false
}

async function consultar() {
  if (!town.value || !fecha.value) return
  loadingReporte.value = true
  consultado.value     = true
  rows.value           = []
  try {
    const res = await get('/complementary/reports/complementarias-por-fecha', {
      town:  town.value,
      fecha: fecha.value,
    })
    const data = Array.isArray(res) ? res : (res?.data || [])
    rows.value = data.map((r, idx) => ({ ...r, _idx: idx }))
  } catch (err) {
    notifyErrorRequest(err?.response?.data?.msg || 'Error al generar el reporte')
  }
  loadingReporte.value = false
}

// ── 10. MANEJADORES DEL TEMPLATE
function onDepartamentoChange(val) {
  town.value = null
  if (val) cargarMunicipios(val)
  else { allMunicipios.value = []; municipiosOpciones.value = [] }
}

function filtrarMunicipios(val, update) {
  update(() => {
    if (!val) municipiosOpciones.value = allMunicipios.value
    else {
      const needle = val.toLowerCase()
      municipiosOpciones.value = allMunicipios.value.filter(m => m.label.toLowerCase().includes(needle))
    }
  })
}

async function exportarPdf() {
  loadingPdf.value = true
  try {
    await generateReporteMunicipioPdf(rows.value, {
      municipio:    municipioNombre.value,
      departamento: departamento.value,
      fecha:        fecha.value,
      total:        rows.value.length,
    })
  } finally { loadingPdf.value = false }
}
</script>

<style scoped>
.section-box {
  border: 1.5px solid color-mix(in srgb, var(--color_button) 35%, transparent);
  border-radius: 10px;
  overflow: hidden;
}
.section-box__title {
  background-color: color-mix(in srgb, var(--color_button) 10%, white);
  color: var(--color_button);
  font-size: 13px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 9px 14px;
  border-bottom: 3px solid var(--color_button);
  display: flex;
  align-items: center;
}
</style>
