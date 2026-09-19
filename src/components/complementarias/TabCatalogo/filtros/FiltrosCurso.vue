<template>
  <q-card flat bordered rounded-borders>
    <q-card-section class="q-pa-sm">

      <div class="text-subtitle2 text-green-9 text-weight-bold q-mb-sm text-uppercase">
        Filtros de Búsqueda
      </div>

      <div v-for="filter in config" :key="filter.field" class="q-mb-md">

        <!-- Título: fijo si es modalidad, colapsable para el resto -->
        <div
          class="row items-center no-wrap q-mb-xs"
          :class="{ 'cursor-pointer': filter.field !== 'modalidad' }"
          @click="filter.field !== 'modalidad' && toggleSection(filter.field)"
        >
          <div class="text-caption text-green-9 text-weight-bold text-uppercase col">
            {{ filter.label }}
          </div>
          <q-icon
            v-if="filter.field !== 'modalidad'"
            :name="collapsed[filter.field] ? 'chevron_right' : 'expand_more'"
            color="green-9" size="18px"
          />
        </div>

        <template v-if="filter.field === 'modalidad' || !collapsed[filter.field]">

          <!-- Checkboxes dinámicos con conteo por opción -->
          <div v-if="filter.type === 'checkbox'" class="q-gutter-y-xs">
            <div
              v-for="option in (uniqueOptionsMap[filter.field] || [])"
              :key="option"
              class="row items-center no-wrap"
            >
              <q-checkbox
                :model-value="(modelValue[filter.field] || []).includes(option)"
                @update:model-value="toggleCheckbox(filter.field, option)"
                :label="option"
                dense color="green-9" size="sm"
              />
              <q-badge
                v-if="counts[filter.field]?.[option]"
                color="green-2" text-color="green-9"
                :label="counts[filter.field][option]"
                class="q-ml-xs"
              />
            </div>
          </div>

          <!-- Rango de horas -->
          <div v-else-if="filter.type === 'hours-range'">
            <div class="row q-gutter-sm items-center">
              <q-input
                v-model.number="hoursMin"
                type="number" label="Mín (h)"
                dense outlined color="green-9" class="col"
              />
              <q-input
                v-model.number="hoursMax"
                type="number" label="Máx (h)"
                dense outlined color="green-9" class="col"
              />
              <q-btn
                @click="applyHours(filter)"
                icon="arrow_forward"
                color="green-9" dense round size="sm" unelevated
              />
            </div>
          </div>

        </template>

        <q-separator color="green-3" class="q-mt-sm" />
      </div>

      <q-btn
        @click="clearFilters"
        label="Limpiar filtros"
        color="green-9" outline dense
        class="full-width q-mt-xs" size="sm"
      />

    </q-card-section>
  </q-card>
</template>

<script setup>
// ── 1. IMPORTS
import { ref, computed } from 'vue'

// ── 3. PROPS Y EMITS
const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  config:     { type: Array,  required: true },
  courses:    { type: Array,  default: () => [] },
  counts:     { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update:modelValue'])

// ── 4. ESTADO REACTIVO
const hoursMin = ref(0)
const hoursMax = ref(2200)

// secciones colapsadas por defecto, excepto modalidad que siempre esta visible
const collapsed = ref(
  Object.fromEntries(props.config.map(f => [f.field, f.field !== 'modalidad']))
)

// ── 5. COMPUTED
// opciones unicas por campo: salen de los counts (server-side, globales).
// fallback a props.courses por compatibilidad si no llegan counts.
const uniqueOptionsMap = computed(() => {
  const result = {}
  props.config.forEach(f => {
    if (f.type !== 'checkbox') return
    const desdeCounts = props.counts?.[f.field] ? Object.keys(props.counts[f.field]) : []
    const desdeCourses = props.courses?.length
      ? props.courses.map(c => c[f.field]).filter(Boolean)
      : []
    result[f.field] = [...new Set([...desdeCounts, ...desdeCourses])].sort()
  })
  return result
})

// ── 10. MANEJADORES DEL TEMPLATE
function toggleSection(field) {
  collapsed.value = { ...collapsed.value, [field]: !collapsed.value[field] }
}

function applyHours(filter) {
  emit('update:modelValue', {
    ...props.modelValue,
    [filter.field + 'Min']: hoursMin.value,
    [filter.field + 'Max']: hoursMax.value,
  })
}

function toggleCheckbox(field, value) {
  const current = props.modelValue[field] || []
  const updated = current.includes(value)
    ? current.filter(v => v !== value)
    : [...current, value]
  emit('update:modelValue', { ...props.modelValue, [field]: updated })
}

function clearFilters() {
  const cleared = {}
  props.config.forEach(f => {
    if (f.type === 'checkbox') cleared[f.field] = []
    else if (f.type === 'hours-range') {
      cleared[f.field + 'Min'] = f.min
      cleared[f.field + 'Max'] = f.max
    }
  })
  emit('update:modelValue', cleared)
}
</script>
