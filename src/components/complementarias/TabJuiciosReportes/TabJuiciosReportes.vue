<template>
  <div class="q-pa-md">

    <div class="text-subtitle2 text-weight-bold text-green-9 q-mb-xs">Juicios y Reportes</div>
    <div class="text-caption text-grey-6 q-mb-xl">Herramientas de seguimiento y auditoría de complementarias</div>

    <div class="row justify-center q-col-gutter-xl">

      <!-- Card Reportes (activa) -->
      <div class="col-12 col-sm-5 col-md-4">
        <q-card
          flat bordered
          class="card-herramienta shadow-2 cursor-pointer"
          :class="{ 'card-hover': hoveredReportes }"
          v-ripple
          @mouseenter="hoveredReportes = true"
          @mouseleave="hoveredReportes = false"
          @click="dialogReportes = true"
        >
          <q-card-section class="card-header q-py-sm q-px-md">
            <div class="row items-center q-gutter-xs">
              <q-icon name="location_on" color="white" size="20px" />
              <div class="text-white text-weight-bold card-title">Reportes</div>
              <q-space />
              <q-badge color="green-3" text-color="green-9" label="DISPONIBLE" class="card-badge" />
            </div>
          </q-card-section>
          <q-separator color="green-3" />
          <q-card-section class="text-center q-py-lg">
            <q-icon name="location_on" color="green-8" size="52px" class="q-mb-sm" />
            <div class="text-caption text-grey-6 q-mt-xs">
              Reporte de visita a municipio: fichas e instructores con clase programada en un día y lugar.
            </div>
          </q-card-section>
          <q-separator />
          <q-card-actions class="justify-center q-py-sm">
            <q-btn unelevated class="style-btn q-px-lg" label="ABRIR" icon-right="open_in_new" size="sm" />
          </q-card-actions>
        </q-card>
      </div>

      <!-- Card Juicios (activa) -->
      <div class="col-12 col-sm-5 col-md-4">
        <q-card
          flat bordered
          class="card-herramienta shadow-2 cursor-pointer"
          :class="{ 'card-hover': hovered }"
          v-ripple
          @mouseenter="hovered = true"
          @mouseleave="hovered = false"
          @click="dialogJuicios = true"
        >
          <q-card-section class="card-header q-py-sm q-px-md">
            <div class="row items-center q-gutter-xs">
              <q-icon name="gavel" color="white" size="20px" />
              <div class="text-white text-weight-bold card-title">Juicios y Rutas</div>
              <q-space />
              <q-badge color="green-3" text-color="green-9" label="DISPONIBLE" class="card-badge" />
            </div>
          </q-card-section>
          <q-separator color="green-3" />
          <q-card-section class="text-center q-py-lg">
            <q-icon name="gavel" color="green-8" size="52px" class="q-mb-sm" />
            <div class="text-caption text-grey-6 q-mt-xs">
              Auditoría DF-14, reportes de fichas y seguimiento de juicios pendientes.
            </div>
          </q-card-section>
          <q-separator />
          <q-card-actions class="justify-center q-py-sm">
            <q-btn
              unelevated class="style-btn q-px-lg" size="sm"
              label="EJECUTAR DF-14A" icon="bolt"
              :loading="loadingDF14A"
              @click.stop="ejecutarDF14A"
            />
          </q-card-actions>
        </q-card>
      </div>

    </div>

    <DialogoJuicios
      v-model="dialogJuicios"
      :resultado-auditoria="resultadoAuditoria"
      :loading-auditoria="loadingAuditoria"
      :instructores-reporte="instructoresReporte"
      :loading-instructores="loadingInstructores"
      :rows-reporte="rowsReporte"
      :resumen-reporte="resumenReporte"
      :total-reporte="totalReporte"
      :loading-reporte="loadingReporte"
      @procesar="onProcesarAuditoria"
      @consultar="onConsultarReporte"
    />

    <DialogoReporteMunicipio v-model="dialogReportes" />

  </div>
</template>

<script setup>
// ── 1. IMPORTS
import { ref, onMounted } from 'vue'
import { get, postRaw } from '../../../services/api.js'
import { notifySuccessRequest, notifyErrorRequest } from '../../../common/notify.js'
import DialogoJuicios from './dialogos/DialogoJuicios.vue'
import DialogoReporteMunicipio from './dialogos/DialogoReporteMunicipio.vue'

// ── 4. ESTADO REACTIVO
const dialogJuicios       = ref(false)
const dialogReportes      = ref(false)
const hovered             = ref(false)
const hoveredReportes     = ref(false)
const instructoresReporte = ref([])
const loadingInstructores = ref(false)
const resultadoAuditoria  = ref(null)
const loadingAuditoria    = ref(false)
const loadingDF14A        = ref(false)
const rowsReporte         = ref([])
const resumenReporte      = ref([])
const totalReporte        = ref(null)
const loadingReporte      = ref(false)

// ── 7. CICLO DE VIDA
onMounted(cargarInstructoresReporte)

// ── 9. API / ENDPOINTS
async function cargarInstructoresReporte() {
  loadingInstructores.value = true
  try {
    const data = await get('/instructors?status=0')
    instructoresReporte.value = Array.isArray(data) ? data : []
  } catch {
    instructoresReporte.value = []
  }
  loadingInstructores.value = false
}

// ── 10. MANEJADORES DEL TEMPLATE
async function onProcesarAuditoria(formData) {
  loadingAuditoria.value   = true
  resultadoAuditoria.value = null
  try {
    const res = await postRaw('/complementary/reports/audit-df14', formData)
    resultadoAuditoria.value = res.data
    notifySuccessRequest(res.data?.msg || 'Auditoría DF-14 procesada correctamente')
  } catch (err) {
    console.error('[DF14] error al procesar auditoría:', err)
    notifyErrorRequest(err?.response?.data?.msg || 'Error al procesar el archivo DF-14')
  }
  loadingAuditoria.value = false
}

async function onConsultarReporte({ endpoint, params }) {
  loadingReporte.value = true
  rowsReporte.value    = []
  resumenReporte.value = []
  totalReporte.value   = null
  try {
    const res = await get(endpoint, params)
    rowsReporte.value    = (res?.data || []).map((r, idx) => ({ ...r, _idx: idx }))
    totalReporte.value   = typeof res?.total === 'number' ? res.total : null
    resumenReporte.value = Array.isArray(res?.resumen) ? res.resumen : []
  } catch {}
  loadingReporte.value = false
}

async function ejecutarDF14A() {
  loadingDF14A.value = true
  try {
    const baseUrl = import.meta.env.VITE_API_URL
    const res = await fetch(`${baseUrl}/complementary/reports/df14a/run-simple`)
    const data = await res.json()
    if (res.ok) {
      notifySuccessRequest(data.msg || 'Ejecución de DF-14A iniciada en segundo plano.')
    } else {
      notifyErrorRequest(data.msg || 'No se pudo iniciar la auditoría.')
    }
  } catch {
    notifyErrorRequest('Error de red al conectar con el servidor.')
  }
  loadingDF14A.value = false
}
</script>

<style scoped>
.card-herramienta {
  border-radius: 8px;
  transition: background 0.18s ease, border-color 0.18s ease;
  border: 1px solid #e0e0e0;
  min-height: 260px;
}
.card-hover {
  background-color: #e8f5e9;
  border-color: #66bb6a;
}
.card-pendiente {
  background: #fafafa;
}
.card-header {
  background-color: var(--color_card);
  border-radius: 8px 8px 0 0;
}
.card-title {
  font-size: 0.95rem;
  letter-spacing: 0.3px;
}
.card-badge {
  font-size: 9px;
  letter-spacing: 0.5px;
  border-radius: 20px;
  padding: 2px 8px;
}
</style>
