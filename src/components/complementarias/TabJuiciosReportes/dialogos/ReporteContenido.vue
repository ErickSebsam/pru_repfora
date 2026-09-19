<template>
  <div>

    <!-- Header del reporte -->
    <div class="section-box__title q-mb-md" style="border-radius: 8px 8px 0 0; border-bottom: 3px solid var(--color_button)">
      <q-icon :name="config.icon" size="16px" class="q-mr-xs" />
      {{ config.title }}
      <span class="q-ml-sm text-caption text-weight-regular" style="text-transform:none; letter-spacing:0; opacity:0.75">
        — {{ config.subtitle }}
      </span>
    </div>

    <!-- Filtros -->
    <div class="row q-col-gutter-sm items-end q-mb-md">
      <template v-if="tipo === 'fichas-sin-ruta'">
        <div class="col-12 col-sm-4">
          <q-input v-model="filtros.fechaInicio" type="date" outlined dense color="green-9" label="Fecha inicio">
            <template v-slot:prepend><q-icon name="event" color="green-9" /></template>
          </q-input>
        </div>
        <div class="col-12 col-sm-4">
          <q-input v-model="filtros.fechaFin" type="date" outlined dense color="green-9" label="Fecha fin">
            <template v-slot:prepend><q-icon name="event" color="green-9" /></template>
          </q-input>
        </div>
      </template>

      <template v-if="tipo === 'proyeccion-mensual'">
        <div class="col-12 col-sm-4">
          <q-select v-model="filtros.mes" :options="opcionesMes" emit-value map-options
            outlined dense color="green-9" label="Mes" clearable />
        </div>
        <div class="col-12 col-sm-4">
          <q-select v-model="filtros.anio" :options="opcionesAnio"
            outlined dense color="green-9" label="Año" clearable />
        </div>
      </template>

      <template v-if="tipo === 'fichas-estado'">
        <div class="col-12 col-sm-4">
          <q-select v-model="filtros.estado" :options="opcionesEstado" emit-value map-options
            outlined dense color="green-9" label="Estado" clearable />
        </div>
      </template>

      <template v-if="tipo === 'horas-por-mes'">
        <div class="col-12 col-sm-4">
          <q-select v-model="filtros.instructor" :options="opcionesInstructor" :loading="loadingInstructores"
            use-input input-debounce="200" @filter="filtrarInstructores"
            emit-value map-options outlined dense color="green-9" label="Instructor" clearable>
            <template v-slot:no-option>
              <q-item><q-item-section class="text-grey">Sin resultados</q-item-section></q-item>
            </template>
          </q-select>
        </div>
        <div class="col-12 col-sm-4">
          <q-select v-model="filtros.mes" :options="opcionesMes" emit-value map-options
            outlined dense color="green-9" label="Mes" clearable />
        </div>
        <div class="col-12 col-sm-4">
          <q-select v-model="filtros.anio" :options="opcionesAnio"
            outlined dense color="green-9" label="Año" clearable />
        </div>
      </template>

      <div class="col-12 col-sm-auto">
        <q-btn label="CONSULTAR" icon="search" unelevated class="style-btn" :loading="loadingReporte" @click="consultar" />
      </div>
    </div>

    <!-- Resumen fichas-estado -->
    <div v-if="tipo === 'fichas-estado' && resumenReporte.length" class="row q-gutter-xs q-mb-sm">
      <q-chip v-for="r in resumenReporte" :key="r._id" color="green-8" text-color="white">
        {{ r._id }}: {{ r.cantidad }}
      </q-chip>
    </div>

    <div v-if="totalReporte !== null" class="text-caption text-grey-7 q-mb-sm">
      <q-icon name="info" size="14px" color="green-9" /> Total: {{ totalReporte }}
    </div>

    <!-- Tabla -->
    <q-table
      :rows="rowsReporte"
      :columns="columns"
      row-key="_idx"
      flat bordered dense
      :loading="loadingReporte"
      no-data-label="Sin datos. Ajusta los filtros y presiona Consultar."
    >
      <template v-if="tipo === 'horas-por-mes'" v-slot:body-cell-fichas="cellProps">
        <q-td :props="cellProps">
          <q-btn flat dense round icon="visibility" color="green-9" size="sm">
            <q-menu anchor="bottom right" self="top right">
              <q-list dense style="min-width: 280px">
                <q-item v-for="(f, idx) in cellProps.row.fichas" :key="idx">
                  <q-item-section>
                    <q-item-label>{{ f.fichaNumber }} — {{ f.curso }}</q-item-label>
                    <q-item-label caption>
                      {{ f.horas }}h · {{ toDateStr(f.fechaInicio) }} – {{ toDateStr(f.fechaFin) }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
                <q-item v-if="!cellProps.row.fichas?.length">
                  <q-item-section class="text-grey">Sin fichas</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </q-td>
      </template>
    </q-table>

  </div>
</template>

<script setup>
// ── 1. IMPORTS
import { ref, computed, reactive, watch } from 'vue'
import { toDateStr, aniosDisponibles } from '../../../../utils/complementarias/DateUtils.js'
import { OPCIONES_MES, OPCIONES_ESTADO_REPORTE, COLUMNS_REPORTES } from '../../../../static/complementarias/ConstantesComplementarias.js'

// ── 3. PROPS Y EMITS
const props = defineProps({
  tipo:                { type: String,  required: true },
  instructoresReporte: { type: Array,   default: () => [] },
  loadingInstructores: { type: Boolean, default: false },
  rowsReporte:         { type: Array,   default: () => [] },
  resumenReporte:      { type: Array,   default: () => [] },
  totalReporte:        { type: Number,  default: null },
  loadingReporte:      { type: Boolean, default: false },
})

const emit = defineEmits(['consultar'])

// ── 4. ESTADO REACTIVO
const CONFIG = {
  'fichas-sin-ruta': {
    title: 'FICHAS SIN RUTA', subtitle: 'Solicitudes sin horario asignado',
    icon: 'alt_route', endpoint: '/complementary/reports/fichas-sin-ruta',
  },
  'proyeccion-mensual': {
    title: 'PROYECCIÓN MENSUAL', subtitle: 'Cantidad de fichas por estado y mes',
    icon: 'insights', endpoint: '/complementary/reports/proyeccion-mensual',
  },
  'fichas-estado': {
    title: 'FICHAS POR ESTADO', subtitle: 'Resumen y detalle por estado',
    icon: 'fact_check', endpoint: '/complementary/reports/fichas-estado',
  },
  'horas-por-mes': {
    title: 'HORAS POR INSTRUCTOR', subtitle: 'Horas dictadas por mes',
    icon: 'schedule', endpoint: '/complementary/reports/horas-por-mes',
  },
}

const opcionesMes    = OPCIONES_MES
const opcionesEstado = OPCIONES_ESTADO_REPORTE

const filtros = reactive({ fechaInicio: '', fechaFin: '', mes: null, anio: null, estado: null, instructor: null })

const opcionesInstructor = ref([])

// ── 5. COMPUTED
const config       = computed(() => CONFIG[props.tipo] || { title: '', subtitle: '', icon: 'assessment', endpoint: '' })
const columns      = computed(() => COLUMNS_REPORTES[props.tipo] || [])
const opcionesAnio = computed(aniosDisponibles)

// ── 6. WATCHERS
watch(() => props.instructoresReporte, (lista) => {
  opcionesInstructor.value = lista.map(i => ({ label: i.name, value: i._id }))
}, { immediate: true })

watch(() => props.tipo, () => {
  Object.assign(filtros, { fechaInicio: '', fechaFin: '', mes: null, anio: null, estado: null, instructor: null })
}, { immediate: true })

// ── 8. HELPERS
function filtrarInstructores(val, update) {
  update(() => {
    const needle = val?.toLowerCase() || ''
    opcionesInstructor.value = props.instructoresReporte
      .filter(i => !needle || i.name.toLowerCase().includes(needle))
      .map(i => ({ label: i.name, value: i._id }))
  })
}

// ── 10. MANEJADORES DEL TEMPLATE
function consultar() {
  const params = {}
  if (props.tipo === 'fichas-sin-ruta') {
    if (filtros.fechaInicio) params.fechaInicio = filtros.fechaInicio
    if (filtros.fechaFin)    params.fechaFin    = filtros.fechaFin
  } else if (props.tipo === 'proyeccion-mensual') {
    if (filtros.mes)  params.mes  = filtros.mes
    if (filtros.anio) params.anio = filtros.anio
  } else if (props.tipo === 'fichas-estado') {
    if (filtros.estado) params.estado = filtros.estado
  } else if (props.tipo === 'horas-por-mes') {
    if (filtros.instructor) params.instructor = filtros.instructor
    if (filtros.mes)        params.mes        = filtros.mes
    if (filtros.anio)       params.anio       = filtros.anio
  }
  emit('consultar', { endpoint: config.value.endpoint, params })
}
</script>

<style scoped>
.section-box__title {
  background-color: color-mix(in srgb, var(--color_button) 10%, white);
  color: var(--color_button);
  font-size: 13px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 9px 14px;
  display: flex;
  align-items: center;
}
</style>
