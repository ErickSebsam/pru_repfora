<template>
  <div>

    <q-select
      v-if="!readonly"
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
      :options="opcionesFiltradas"
      :loading="loading"
      multiple use-chips use-input input-debounce="0"
      option-label="name"
      @filter="doFilter"
      outlined color="green-9" label="Agregar instructor(es) adicional(es)"
      class="q-mb-md"
      :disable="disable"
      no-error-icon
    >
      <template v-slot:prepend><q-icon name="search" /></template>
      <template v-slot:no-option>
        <q-item><q-item-section class="text-grey">Sin resultados</q-item-section></q-item>
      </template>
    </q-select>

    <q-banner v-if="modelValue.length === 0" dense rounded class="bg-grey-2 text-grey-7">
      <template v-slot:avatar><q-icon name="info" color="grey-6" /></template>
      Aún no se han agregado instructores adicionales a esta solicitud.
    </q-banner>

    <div v-for="(inst, idx) in modelValue" :key="inst._id || idx">
      <q-separator v-if="idx > 0" class="q-my-md" />
      <div class="text-green-9 text-weight-bold q-mb-sm">
        <q-icon name="person" size="18px" class="q-mr-xs" />Instructor adicional {{ idx + 1 }}: {{ inst.name }}
      </div>
      <div class="row q-col-gutter-md">
        <div class="col-12 col-sm-6">
          <q-input :model-value="inst.name" outlined readonly bg-color="grey-3" color="green-9" label="Nombre instructor(a)">
            <template v-slot:prepend><q-icon name="person" /></template>
          </q-input>
        </div>
        <div class="col-12 col-sm-6">
          <q-input :model-value="inst.numdocument" outlined readonly bg-color="grey-3" color="green-9" label="Cédula instructor(a)">
            <template v-slot:prepend><q-icon name="badge" /></template>
          </q-input>
        </div>
      </div>
      <div class="row q-col-gutter-md q-mt-sm">
        <div class="col-12 col-sm-4">
          <q-input :model-value="inst.phone || '—'" outlined readonly bg-color="grey-3" color="green-9" label="Teléfono instructor(a)">
            <template v-slot:prepend><q-icon name="call" /></template>
          </q-input>
        </div>
        <div class="col-12 col-sm-4">
          <q-input :model-value="inst.email || '—'" outlined readonly bg-color="grey-3" color="green-9" label="Correo institucional">
            <template v-slot:prepend><q-icon name="mail" /></template>
          </q-input>
        </div>
        <div class="col-12 col-sm-4">
          <q-input :model-value="inst.emailpersonal || '—'" outlined readonly bg-color="grey-3" color="green-9" label="Correo personal">
            <template v-slot:prepend><q-icon name="mail_outline" /></template>
          </q-input>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
// ── 1. IMPORTS
import { ref } from 'vue'
import { get } from '../../../../services/api.js'

// ── 3. PROPS Y EMITS
const props = defineProps({
  modelValue:      { type: Array,   default: () => [] },
  loading:         { type: Boolean, default: false },
  readonly:        { type: Boolean, default: false },
  disable:         { type: Boolean, default: false },
  excludeDocument: { type: String,  default: '' },
})

defineEmits(['update:modelValue'])

// ── 4. ESTADO REACTIVO
// opciones del select; se llenan server-side en doFilter (al abrir/escribir).
const opcionesFiltradas = ref([])

// ── 10. MANEJADORES DEL TEMPLATE
// búsqueda server-side de instructores (autocomplete). El instructor ya asignado
// se conserva porque modelValue ya trae sus objetos completos.
async function doFilter(val, update) {
  const q = (val || '').trim()
  try {
    const res = await get('/instructors', q ? { status: 0, q, limit: 20 } : { status: 0, limit: 20 })
    const lista = Array.isArray(res) ? res : []
    update(() => {
      opcionesFiltradas.value = props.excludeDocument
        ? lista.filter(i => i.numdocument !== props.excludeDocument)
        : lista
    })
  } catch {
    update(() => { opcionesFiltradas.value = [] })
  }
}
</script>
