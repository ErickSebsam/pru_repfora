<template>
  <q-dialog v-model="model" persistent maximized>
    <q-card class="flex column">

      <!-- Header -->
      <q-card-section class="q-px-lg q-py-sm row items-center no-shrink" style="background-color: var(--color_button); flex-shrink: 0">
        <q-icon name="gavel" color="white" size="24px" class="q-mr-sm" />
        <div class="col">
          <div class="text-white text-weight-bold" style="font-size:15px">JUICIOS Y REPORTES</div>
          <div class="text-green-3 text-caption">Complementarias SENA</div>
        </div>
        <q-btn flat round dense icon="close" color="white" v-close-popup />
      </q-card-section>

      <q-separator color="green-8" />

      <!-- Body -->
      <div class="col row no-wrap" style="overflow:hidden; min-height:0">

        <!-- Panel izquierdo -->
        <div class="panel-left q-pa-lg">
          <div class="seccion-label q-mb-md">
            <q-icon name="bar_chart" size="16px" class="q-mr-xs" />Reportes disponibles
          </div>

          <q-list separator>
            <q-item
              v-for="rep in reportes" :key="rep.tipo"
              clickable v-ripple
              class="reporte-item rounded-borders q-mb-xs"
              :class="{ 'reporte-activo': reporteActivo === rep.tipo }"
              @click="seleccionarReporte(rep.tipo)"
            >
              <q-item-section avatar>
                <q-icon :name="rep.icon" :color="reporteActivo === rep.tipo ? 'white' : 'green-9'" size="20px" />
              </q-item-section>
              <q-item-section>
                <q-item-label :class="reporteActivo === rep.tipo ? 'text-white text-weight-bold' : 'text-green-9 text-weight-medium'">
                  {{ rep.title }}
                </q-item-label>
                <q-item-label caption :class="reporteActivo === rep.tipo ? 'text-green-2' : ''">
                  {{ rep.subtitle }}
                </q-item-label>
              </q-item-section>
              <q-item-section side v-if="reporteActivo === rep.tipo">
                <q-icon name="chevron_right" color="white" />
              </q-item-section>
            </q-item>
          </q-list>

          <q-separator color="green-3" class="q-my-lg" />

          <!-- Auditoría DF-14 -->
          <div class="seccion-label q-mb-md">
            <q-icon name="rule_folder" size="16px" class="q-mr-xs" />Auditoría DF-14
          </div>

          <q-item
            clickable v-ripple
            class="reporte-item rounded-borders"
            :class="{ 'reporte-activo': reporteActivo === 'df14' }"
            @click="seleccionarReporte('df14')"
          >
            <q-item-section avatar>
              <q-icon name="upload_file" :color="reporteActivo === 'df14' ? 'white' : 'green-9'" size="20px" />
            </q-item-section>
            <q-item-section>
              <q-item-label :class="reporteActivo === 'df14' ? 'text-white text-weight-bold' : 'text-green-9 text-weight-medium'">
                Procesar DF-14
              </q-item-label>
              <q-item-label caption :class="reporteActivo === 'df14' ? 'text-green-2' : ''">
                Marcar juicios automáticamente
              </q-item-label>
            </q-item-section>
            <q-item-section side v-if="reporteActivo === 'df14'">
              <q-icon name="chevron_right" color="white" />
            </q-item-section>
          </q-item>
        </div>

        <!-- Panel derecho -->
        <div class="col q-pa-lg panel-right" style="overflow-y:auto">

          <!-- Placeholder inicial -->
          <div v-if="!reporteActivo" class="text-center q-pa-xl">
            <q-icon name="touch_app" color="green-3" size="64px" />
            <div class="text-grey-5 q-mt-md" style="font-size:15px">Selecciona un reporte o la auditoría DF-14 del panel izquierdo</div>
          </div>

          <!-- Reportes GET -->
          <template v-else-if="reporteActivo !== 'df14'">
            <ReporteContenido
              :tipo="reporteActivo"
              :instructores-reporte="instructoresReporte"
              :loading-instructores="loadingInstructores"
              :rows-reporte="rowsReporte"
              :resumen-reporte="resumenReporte"
              :total-reporte="totalReporte"
              :loading-reporte="loadingReporte"
              @consultar="$emit('consultar', $event)"
            />
          </template>

          <!-- Auditoría DF-14 -->
          <template v-else>
            <div class="section-box q-mb-md">
              <div class="section-box__title">
                <q-icon name="upload_file" size="15px" class="q-mr-xs" />Cargar archivo DF-14 (Excel)
              </div>
              <div class="q-pa-md">
                <div class="text-caption text-grey-6 q-mb-md">
                  Sube el reporte DF-14 exportado de SOFIA Plus. El sistema procesará cada ficha y notificará las que tienen rutas o juicios pendientes.
                </div>
                <q-file
                  v-model="archivoDf14"
                  outlined dense color="green-9"
                  label="Seleccionar archivo Excel (.xlsx)"
                  accept=".xlsx,.xls"
                  :disable="loadingAuditoria"
                  class="q-mb-md"
                >
                  <template v-slot:prepend><q-icon name="attach_file" color="green-9" /></template>
                </q-file>
                <q-btn
                  label="PROCESAR DF-14"
                  icon="play_arrow"
                  unelevated
                  class="style-btn"
                  :loading="loadingAuditoria"
                  :disable="!archivoDf14 || loadingAuditoria"
                  @click="procesarDf14"
                />
              </div>
            </div>

            <!-- Resultados DF-14 -->
            <template v-if="resultadoAuditoria">
              <div class="row q-col-gutter-sm q-mb-md">
                <div class="col-6 col-sm-3">
                  <q-card flat bordered class="text-center q-pa-sm result-card">
                    <div class="text-h6 text-green-9 text-weight-bold">{{ resultadoAuditoria.results?.totalProcesadas || 0 }}</div>
                    <div class="text-caption text-grey-6">Procesadas</div>
                  </q-card>
                </div>
                <div class="col-6 col-sm-3">
                  <q-card flat bordered class="text-center q-pa-sm result-card">
                    <div class="text-h6 text-green-8 text-weight-bold">{{ resultadoAuditoria.results?.fichasEvaluadas || 0 }}</div>
                    <div class="text-caption text-grey-6">Evaluadas auto.</div>
                  </q-card>
                </div>
                <div class="col-6 col-sm-3">
                  <q-card flat bordered class="text-center q-pa-sm result-card">
                    <div class="text-h6 text-orange-8 text-weight-bold">{{ resultadoAuditoria.results?.faltanRutas?.length || 0 }}</div>
                    <div class="text-caption text-grey-6">Sin ruta</div>
                  </q-card>
                </div>
                <div class="col-6 col-sm-3">
                  <q-card flat bordered class="text-center q-pa-sm result-card">
                    <div class="text-h6 text-red-8 text-weight-bold">{{ resultadoAuditoria.results?.faltanJuicios?.length || 0 }}</div>
                    <div class="text-caption text-grey-6">Sin juicios</div>
                  </q-card>
                </div>
              </div>

              <div v-if="resultadoAuditoria.results?.fichasNoEncontradas > 0" class="q-mb-sm">
                <q-banner dense rounded class="bg-grey-2 text-grey-8">
                  <template v-slot:avatar><q-icon name="search_off" color="grey-7" /></template>
                  {{ resultadoAuditoria.results.fichasNoEncontradas }} ficha(s) no encontradas en el sistema
                </q-banner>
              </div>

              <div class="row q-col-gutter-xs q-mb-md">
                <div v-if="resultadoAuditoria.notificacionRutas" class="col-auto">
                  <q-chip :icon="resultadoAuditoria.notificacionRutas.enviada ? 'mark_email_read' : 'email'"
                    :color="resultadoAuditoria.notificacionRutas.enviada ? 'green-2' : 'grey-3'"
                    :text-color="resultadoAuditoria.notificacionRutas.enviada ? 'green-9' : 'grey-7'" size="sm">
                    Notif. rutas: {{ resultadoAuditoria.notificacionRutas.enviada ? 'enviada' : 'no enviada' }}
                  </q-chip>
                </div>
                <div v-if="resultadoAuditoria.notificacionJuicios" class="col-auto">
                  <q-chip :icon="resultadoAuditoria.notificacionJuicios.enviada ? 'mark_email_read' : 'email'"
                    :color="resultadoAuditoria.notificacionJuicios.enviada ? 'green-2' : 'grey-3'"
                    :text-color="resultadoAuditoria.notificacionJuicios.enviada ? 'green-9' : 'grey-7'" size="sm">
                    Notif. juicios: {{ resultadoAuditoria.notificacionJuicios.enviada ? 'enviada' : 'no enviada' }}
                  </q-chip>
                </div>
              </div>

              <div v-if="resultadoAuditoria.results?.faltanRutas?.length" class="section-box q-mb-md">
                <div class="section-box__title">
                  <q-icon name="alt_route" size="15px" class="q-mr-xs" />Fichas con tránsito pendiente
                </div>
                <q-list dense bordered separator class="rounded-borders">
                  <q-item v-for="f in resultadoAuditoria.results.faltanRutas" :key="f.fichaNumber">
                    <q-item-section>
                      <q-item-label class="text-weight-medium">Ficha {{ f.fichaNumber }}</q-item-label>
                      <q-item-label caption>{{ f.enTransito }} aprendiz(ces) en tránsito</q-item-label>
                    </q-item-section>
                    <q-item-section side><q-icon name="warning" color="orange-8" /></q-item-section>
                  </q-item>
                </q-list>
              </div>

              <div v-if="resultadoAuditoria.results?.faltanJuicios?.length" class="section-box q-mb-md">
                <div class="section-box__title">
                  <q-icon name="gavel" size="15px" class="q-mr-xs" />Fichas terminadas con juicios pendientes
                </div>
                <q-list dense bordered separator class="rounded-borders">
                  <q-item v-for="f in resultadoAuditoria.results.faltanJuicios" :key="f.fichaNumber">
                    <q-item-section>
                      <q-item-label class="text-weight-medium">Ficha {{ f.fichaNumber }}</q-item-label>
                      <q-item-label caption>{{ f.enFormacion }} aprendiz(ces) en formación sin juicio</q-item-label>
                    </q-item-section>
                    <q-item-section side><q-icon name="error" color="red-8" /></q-item-section>
                  </q-item>
                </q-list>
              </div>

              <div v-if="!resultadoAuditoria.results?.faltanRutas?.length && !resultadoAuditoria.results?.faltanJuicios?.length"
                class="text-center q-pa-md">
                <q-icon name="check_circle" color="green-8" size="40px" />
                <div class="text-green-8 text-weight-bold q-mt-sm">Todo en orden — sin pendientes detectados</div>
              </div>
            </template>

            <q-separator class="q-my-lg" />
            <div class="section-box">
              <div class="section-box__title">
                <q-icon name="smart_toy" size="15px" class="q-mr-xs" />DF-14A Automático
              </div>
              <div class="q-pa-md">
                <q-banner dense rounded class="bg-amber-1">
                  <template v-slot:avatar><q-icon name="construction" color="amber-9" /></template>
                  <div class="text-amber-9 text-weight-bold">Pendiente de configuración en servidor</div>
                  <div class="text-caption text-grey-7 q-mt-xs">
                    Requiere Playwright y credenciales de SOFIA Plus en el servidor. Contacta al equipo backend para habilitarlo.
                  </div>
                </q-banner>
              </div>
            </div>
          </template>

        </div>
      </div>

    </q-card>
  </q-dialog>
</template>

<script setup>
// ── 1. IMPORTS
import { ref, computed } from 'vue'
import { REPORTES_JUICIOS as reportes } from '../../../../static/complementarias/ConstantesComplementarias.js'
import ReporteContenido from './ReporteContenido.vue'

// ── 3. PROPS Y EMITS
const props = defineProps({
  modelValue:          { type: Boolean, required: true },
  resultadoAuditoria:  { type: Object,  default: null },
  loadingAuditoria:    { type: Boolean, default: false },
  instructoresReporte: { type: Array,   default: () => [] },
  loadingInstructores: { type: Boolean, default: false },
  rowsReporte:         { type: Array,   default: () => [] },
  resumenReporte:      { type: Array,   default: () => [] },
  totalReporte:        { type: Number,  default: null },
  loadingReporte:      { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'procesar', 'consultar'])

// ── 4. ESTADO REACTIVO
const reporteActivo = ref(null)
const archivoDf14   = ref(null)

// ── 5. COMPUTED
const model = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

// ── 10. MANEJADORES DEL TEMPLATE
function seleccionarReporte(tipo) {
  reporteActivo.value = tipo
  if (tipo !== 'df14') archivoDf14.value = null
}

// arma el FormData del DF-14 y lo emite al padre para procesarlo
function procesarDf14() {
  if (!archivoDf14.value) return
  const formData = new FormData()
  formData.append('file', archivoDf14.value)
  emit('procesar', formData)
}
</script>

<style scoped>
.panel-left {
  width: 280px;
  min-width: 240px;
  max-width: 320px;
  border-right: 1px solid #c8e6c9;
  overflow-y: auto;
  background: color-mix(in srgb, var(--color_button) 5%, white);
}
.panel-right {
  background: #fff;
}
.seccion-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--color_button);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  display: flex;
  align-items: center;
}
.reporte-item {
  border-radius: 8px !important;
  transition: background 0.15s;
}
.reporte-activo {
  background: var(--color_button) !important;
}
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
.result-card {
  border-radius: 8px;
}
</style>
