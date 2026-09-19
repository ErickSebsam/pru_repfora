<template>
  <div>
    <div class="row justify-center q-mb-md">
      <div class="col-12 flex items-center">
        <div v-for="(label, val) in tabLabel" :key="val" class="row items-center no-wrap">
          <q-radio
            :model-value="tabActivo"
            color="green-7"
            checked-icon="task_alt"
            unchecked-icon="panorama_fish_eye"
            :val="val" :label="label"
            @click="$emit('toggle-filtro', val)"
          />
          <q-badge
            v-if="tabCounts[val] != null"
            color="green-2" text-color="green-9"
            :label="tabCounts[val]" class="q-mr-sm"
          />
        </div>
        <q-btn
          v-if="tabActivo || searchText"
          flat dense icon="filter_alt_off" color="green-9" size="sm" label="Limpiar"
          class="q-ml-sm"
          @click="$emit('limpiar')"
        />
      </div>
    </div>

    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-12 col-sm-6">
        <q-input
          :model-value="searchText"
          @update:model-value="$emit('update:searchText', $event)"
          input-debounce="400"
          label="Buscar por nombre del curso"
          outlined dense clearable color="green-9"
        >
          <template v-slot:prepend><q-icon name="search" /></template>
        </q-input>
      </div>
      <div class="col-12 col-sm-6">
        <q-input
          :model-value="searchFicha"
          @update:model-value="$emit('update:searchFicha', $event)"
          input-debounce="400"
          label="Buscar por ficha de caracterización"
          outlined dense clearable color="green-9"
        >
          <template v-slot:prepend><q-icon name="fact_check" /></template>
        </q-input>
      </div>
    </div>

    <template v-if="modo === 'admin'">
      <div class="row q-mb-md">
        <div class="col-12 col-sm-4">
          <q-select
            :model-value="sortMode"
            @update:model-value="$emit('update:sortMode', $event); $emit('sort-change', $event)"
            :options="opcionesOrden"
            emit-value map-options
            outlined dense color="green-9" label="Ordenar por"
          >
            <template v-slot:prepend><q-icon name="sort" /></template>
          </q-select>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
// ── 3. PROPS Y EMITS
defineProps({
  tabActivo:     { type: String, default: null },
  searchText:    { type: String, default: '' },
  searchFicha:   { type: String, default: '' },
  sortMode:      { type: String, default: 'recientes' },
  modo:          { type: String, required: true },
  tabLabel:      { type: Object, required: true },
  tabCounts:     { type: Object, default: () => ({}) },
  opcionesOrden: { type: Array,  default: () => [] },
})

defineEmits([
  'update:tabActivo', 'update:searchText', 'update:searchFicha', 'update:sortMode',
  'limpiar', 'toggle-filtro', 'sort-change',
])
</script>
