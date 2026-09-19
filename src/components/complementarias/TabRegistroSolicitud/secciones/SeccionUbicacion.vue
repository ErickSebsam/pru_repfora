<template>
  <div>
    <div class="row q-col-gutter-md">
      <div class="col-12 col-sm-6">
        <q-select
          :model-value="formData.departamento"
          @update:model-value="onDepartamentoChange"
          :options="departamentosOptions"
          :loading="loadingDepartamentos"
          outlined color="green-9" label="Departamento"
          :disable="loading || readonly"
        >
          <template v-slot:prepend><q-icon name="map" /></template>
        </q-select>
      </div>
      <div class="col-12 col-sm-6">
        <q-select
          v-model="formData.municipio"
          :options="municipiosOptions"
          :loading="loadingMunicipios"
          emit-value map-options
          use-input input-debounce="200"
          @filter="filterMunicipios"
          outlined color="green-9" label="Municipio de ejecución"
          :disable="loading || readonly"
          no-error-icon
        >
          <template v-slot:prepend><q-icon name="location_on" /></template>
          <template v-slot:no-option>
            <q-item><q-item-section class="text-grey">Sin resultados</q-item-section></q-item>
          </template>
        </q-select>
      </div>
    </div>
    <div class="row q-col-gutter-md q-mt-sm">
      <div class="col-12 col-sm-6">
        <q-input v-model="formData.vereda" outlined color="green-9" label="Vereda / Corregimiento"
          :disable="loading || readonly">
          <template v-slot:prepend><q-icon name="nature" /></template>
        </q-input>
      </div>
      <div class="col-12 col-sm-6">
        <q-input v-model="formData.direccion" outlined color="green-9" label="Dirección donde se impartirá el curso"
          :disable="loading || readonly">
          <template v-slot:prepend><q-icon name="home" /></template>
        </q-input>
      </div>
    </div>
    <div class="q-mt-sm">
      <q-select
        v-model="formData.supervisor"
        :options="supervisoresOptions"
        emit-value map-options
        outlined color="green-9" label="Supervisor (coordinador responsable)"
        :disable="loading || readonly || supervisoresOptions.length === 0"
        :hint="supervisoresOptions.length === 0 ? 'Sin supervisores disponibles' : ''"
        clearable
      >
        <template v-slot:prepend><q-icon name="supervisor_account" /></template>
      </q-select>
    </div>
  </div>
</template>

<script setup>
// ── 1. IMPORTS
import { ref, watch, onMounted } from 'vue'
import { get } from '../../../../services/api.js'

// ── 3. PROPS
const props = defineProps({
  formData:            { type: Object, required: true },
  supervisoresOptions: { type: Array,  default: () => [] },
  readonly:            { type: Boolean, default: false },
  loading:             { type: Boolean, default: false },
})

// ── 4. ESTADO REACTIVO
const departamentosOptions = ref([])
const loadingDepartamentos = ref(false)
const allMunicipios        = ref([])
const municipiosOptions    = ref([])
const loadingMunicipios    = ref(false)

// ── 6. WATCHERS
watch(() => props.formData?.departamento, (dep, prev) => {
  if (dep && dep !== prev) loadMunicipios(dep)
}, { immediate: true })

// ── 7. CICLO DE VIDA
onMounted(loadDepartamentos)

// ── 9. API / ENDPOINTS
async function loadDepartamentos() {
  loadingDepartamentos.value = true
  try {
    const data = await get('/towns/departaments')
    departamentosOptions.value = Array.isArray(data) ? data : []
  } catch { departamentosOptions.value = [] }
  loadingDepartamentos.value = false
}

async function loadMunicipios(departamento) {
  loadingMunicipios.value = true
  try {
    const data = await get(`/towns/towns/${departamento}`)
    allMunicipios.value     = Array.isArray(data) ? data.map(m => ({ label: m.name, value: m.name })) : []
    municipiosOptions.value = allMunicipios.value
  } catch {
    allMunicipios.value     = []
    municipiosOptions.value = []
  }
  loadingMunicipios.value = false
}

// ── 10. MANEJADORES DEL TEMPLATE
function onDepartamentoChange(val) {
  props.formData.departamento = val
  props.formData.municipio    = ''
}

function filterMunicipios(val, update) {
  update(() => {
    if (!val) {
      municipiosOptions.value = allMunicipios.value
    } else {
      const needle = val.toLowerCase()
      municipiosOptions.value = allMunicipios.value.filter(m => m.label.toLowerCase().includes(needle))
    }
  })
}
</script>
