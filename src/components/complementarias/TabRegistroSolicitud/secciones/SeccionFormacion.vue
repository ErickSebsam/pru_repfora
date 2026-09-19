<template>
  <SectionCard title="Formación" icon="school" :collapsed="collapsed" @toggle="collapsed = !collapsed">
    <div v-if="!readonly && !competencies.length" class="q-mb-md">
      <q-banner v-if="!tieneCurso" dense rounded class="bg-orange-1 text-orange-9 q-mb-sm">
        <template v-slot:avatar><q-icon name="warning" color="orange-8" /></template>
        Debe <strong>confirmar un curso</strong> desde el <strong>Catálogo</strong> antes de subir el documento del programa.
      </q-banner>
      <div class="row items-center q-mb-sm">
        <q-icon name="picture_as_pdf" color="green-9" size="20px" class="q-mr-xs" />
        <span class="text-subtitle2 text-green-9 text-weight-bold cursor-pointer" @click="mostrarAyudaPdf">¿No sabes de dónde obtener el PDF?</span>
        <q-btn round flat dense icon="help_outline" color="green-9" size="sm" class="q-ml-xs" @click="mostrarAyudaPdf" />
      </div>
      <div class="row q-col-gutter-sm items-start">
        <div class="col-12 col-sm-8">
          <q-file v-model="formacionPdfFile" outlined dense color="green-9" label="Subir documento del programa (PDF)"
            accept="application/pdf" :disable="loading || !tieneCurso">
            <template v-slot:prepend><q-icon name="attach_file" /></template>
          </q-file>
        </div>
        <div class="col-12 col-sm-4">
          <q-btn label="EXTRAER DATOS" icon="auto_fix_high" color="green-9" unelevated class="full-width"
            :disable="!formacionPdfFile || loading || !tieneCurso" :loading="loadingExtraccion" @click="extraerDatosFormacion" />
        </div>
      </div>
      <div v-if="loadingExtraccion" class="text-caption text-grey-6 q-mt-xs">
        Esto puede tardar hasta 1 minuto...
      </div>
    </div>

    <q-banner v-if="programInfo" dense rounded class="bg-green-1 text-green-9 q-mb-md">
      <template v-slot:avatar><q-icon name="info" color="green-9" /></template>
      <strong>{{ programInfo.programName }}</strong>
      ({{ programInfo.programCode === '000000' ? 'Código no detectado' : programInfo.programCode }})
      — {{ programInfo.totalProgramHours }}h totales
    </q-banner>

    <div class="q-mb-sm">
      <div class="text-caption text-grey-7 q-mb-xs">Competencias</div>
      <div v-if="competencies.length" class="column q-gutter-sm">
        <q-card v-for="(c, idx) in competencies" :key="idx" flat bordered class="competencia-card">
          <q-card-section class="competencia-header q-py-sm q-px-md">
            <div class="row items-center no-wrap">
              <q-badge
                :label="!c.code || c.code === '000000' ? 'Código no detectado' : c.code"
                color="green-9"
                class="text-weight-bold q-pa-xs"
                style="font-size: 13px; letter-spacing: 0.5px;"
              />
              <q-badge
                v-if="c.totalCompetenceHours"
                :label="c.totalCompetenceHours + 'h'"
                outline color="green-9"
                class="q-ml-sm q-pa-xs"
                style="font-size: 12px;"
              />
              <q-space />
              <q-btn v-if="!readonly" flat round dense icon="close" color="red-7" size="sm"
                @click="eliminarCompetencia(idx)">
                <q-tooltip>Quitar competencia</q-tooltip>
              </q-btn>
            </div>
          </q-card-section>

          <q-separator color="green-2" />

          <q-card-section class="q-py-sm q-px-md">
            <div class="competencia-label">Competencia</div>
            <div class="competencia-name">{{ c.name || 'Sin nombre' }}</div>
          </q-card-section>

          <template v-if="c.resultados && c.resultados.length">
            <q-separator color="green-2" />
            <q-card-section class="q-py-sm q-px-md">
              <div class="competencia-label">
                <q-icon name="school" size="16px" class="q-mr-xs" style="vertical-align: -2px;" />
                Resultados de aprendizaje
                <q-badge :label="c.resultados.length" color="green-7" class="q-ml-xs" />
              </div>
              <div class="column q-gutter-xs q-mt-xs">
                <div v-for="(resultado, rIdx) in c.resultados" :key="rIdx" class="req-chip">
                  <span class="req-chip__number">{{ rIdx + 1 }}</span>
                  <span class="req-chip__text">{{ resultado }}</span>
                </div>
              </div>
            </q-card-section>
          </template>

          <template v-if="c.criteria && c.criteria.length">
            <q-separator color="green-2" />
            <q-card-section class="q-py-sm q-px-md">
              <div class="competencia-label">
                <q-icon name="checklist" size="16px" class="q-mr-xs" style="vertical-align: -2px;" />
                Criterios de evaluación
                <q-badge :label="c.criteria.length" color="green-7" class="q-ml-xs" />
              </div>
              <div class="column q-gutter-xs q-mt-xs">
                <div v-for="(crit, cIdx) in c.criteria" :key="cIdx" class="req-chip">
                  <q-icon name="check_circle" color="green-7" size="16px" class="req-chip__icon" />
                  <span class="req-chip__text">{{ crit }}</span>
                </div>
              </div>
            </q-card-section>
          </template>

          <template v-if="(!c.resultados || !c.resultados.length) && (!c.criteria || !c.criteria.length)">
            <q-separator color="green-2" />
            <q-card-section class="q-py-sm q-px-md">
              <div class="text-caption text-grey-5 text-italic">
                Sin resultados ni criterios detectados
              </div>
            </q-card-section>
          </template>
        </q-card>
      </div>
      <q-banner v-else dense rounded class="bg-grey-2 text-grey-7">
        <template v-slot:avatar><q-icon name="info" color="grey-6" /></template>
        Las competencias se cargan automáticamente al extraer datos del documento PDF del programa.
      </q-banner>
    </div>

  </SectionCard>
</template>

<script setup>
// ── 1. IMPORTS
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import SectionCard from './TarjetaSeccion.vue'

// ── 2. COMPOSABLES Y STORES
const $q = useQuasar()

// ── 3. PROPS Y EMITS
const props = defineProps({
  modelValue:          { type: Object,  required: true },
  loading:             { type: Boolean, default: false },
  readonly:            { type: Boolean, default: false },
  tieneCurso:          { type: Boolean, default: false },
  resultadoExtraccion: { type: Object,  default: null },
  programInfo:         { type: Object,  default: null },
})

const emit = defineEmits(['update:modelValue', 'extraer', 'update:programInfo'])

// ── 4. ESTADO REACTIVO
const collapsed = ref(!props.readonly)
const formacionPdfFile = ref(null)
const loadingExtraccion = ref(false)

// ── 5. COMPUTED
// devuelve el arreglo de competencias del modelo o un arreglo vacio
const competencies = computed(() =>
  Array.isArray(props.modelValue.competencies) ? props.modelValue.competencies : []
)

// ── 6. WATCHERS
// procesa el resultado de la extraccion del pdf y actualiza competencias
watch(() => props.resultadoExtraccion, (res) => {
  if (!res) return
  loadingExtraccion.value = false
  if (res.error) {
    notificar('negative', 'error', 'No se pudo extraer la información del documento. Intente nuevamente o contacte al administrador')
    return
  }

  if (res?.data) {
    emit('update:programInfo', {
      programName:       res.data.programName  || '',
      programCode:       res.data.programCode  || '',
      totalProgramHours: res.data.totalProgramHours ?? 0,
      version:           res.data.version || '',
    })

    const extraidas = (res.data.competencies || []).map(c => ({
      name:                 c.name || '',
      code:                 c.code || '',
      totalCompetenceHours: c.totalCompetenceHours ?? null,
      criteria:             Array.isArray(c.criteria) ? [...c.criteria] : [],
      resultados:           Array.isArray(c.resultados) ? [...c.resultados] : [],
      conocimientos:        c.conocimientos ? {
        conceptos: Array.isArray(c.conocimientos.conceptos) ? [...c.conocimientos.conceptos] : [],
        proceso:   Array.isArray(c.conocimientos.proceso)   ? [...c.conocimientos.proceso]   : [],
      } : { conceptos: [], proceso: [] },
    }))

    if (extraidas.length) {
      const current = [...competencies.value]
      const merged = current.length === 0 ? extraidas : [...current, ...extraidas]
      emit('update:modelValue', { ...props.modelValue, competencies: merged })
      notificar('positive', 'auto_fix_high', `Se extrajeron ${extraidas.length} competencia(s) del documento`)
    } else {
      notificar('warning', 'description', 'El documento no contiene información de competencias')
    }
  } else {
    notificar('warning', 'description', 'El documento no contiene información de competencias')
  }
})

// ── 8. HELPERS
// muestra una notificacion quasar con tipo, icono y mensaje
const notificar = (type, icon, message, timeout = 3000) =>
  $q.notify({ type, icon, message, position: 'top', timeout })

// ── 10. MANEJADORES DEL TEMPLATE
function mostrarAyudaPdf() {
  $q.dialog({
    title: '',
    message: `
      <div style="text-align:center;margin-bottom:14px;">
        <span class="material-icons" style="font-size:48px;color:#2e7d32;">picture_as_pdf</span>
        <div style="font-size:16px;font-weight:700;color:#2e7d32;margin-top:6px;">¿De dónde puedo obtener el PDF del informe del curso?</div>
      </div>
      <div style="font-size:14px;line-height:1.7;color:#424242;">
        <div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;"><span style="background:#e8f5e9;color:#2e7d32;border-radius:50%;min-width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">1</span> Ingresa a <strong>Sofía Plus</strong></div>
        <div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;"><span style="background:#e8f5e9;color:#2e7d32;border-radius:50%;min-width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">2</span> Dirígete a <strong>Equipo de Diseño Curricular</strong></div>
        <div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;"><span style="background:#e8f5e9;color:#2e7d32;border-radius:50%;min-width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">3</span> Selecciona <strong>Diseño Curricular</strong></div>
        <div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;"><span style="background:#e8f5e9;color:#2e7d32;border-radius:50%;min-width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">4</span> Haz clic en <strong>Generar PDF</strong></div>
        <div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;"><span style="background:#e8f5e9;color:#2e7d32;border-radius:50%;min-width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">5</span> Escoge <strong>Diseño Titulada y Complementaria</strong> (no a la medida)</div>
        <div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;"><span style="background:#e8f5e9;color:#2e7d32;border-radius:50%;min-width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">6</span> Ingresa el <strong>código</strong> correspondiente</div>
        <div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;"><span style="background:#e8f5e9;color:#2e7d32;border-radius:50%;min-width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">7</span> Descarga el formato en <strong>PDF</strong></div>
      </div>`,
    html: true,
    ok: { label: 'Cerrar', flat: true, color: 'green-9' },
    style: 'width: 520px; max-width: 95vw;',
  })
}

// emite el evento de extraccion con el archivo pdf seleccionado
function extraerDatosFormacion() {
  if (!formacionPdfFile.value) return
  loadingExtraccion.value = true
  emit('extraer', formacionPdfFile.value)
}

// elimina una competencia por indice y emite el modelo actualizado
function eliminarCompetencia(idx) {
  const updated = [...competencies.value]
  updated.splice(idx, 1)
  emit('update:modelValue', { ...props.modelValue, competencies: updated })
}
</script>

<style scoped>
.competencia-card {
  border-color: color-mix(in srgb, var(--color_button) 30%, transparent);
  background-color: color-mix(in srgb, var(--color_button) 4%, white);
  border-radius: 8px;
  overflow: hidden;
}
.competencia-header {
  background-color: color-mix(in srgb, var(--color_button) 8%, white);
}
.competencia-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #616161;
  margin-bottom: 4px;
}
.competencia-name {
  font-size: 15px;
  font-weight: 600;
  color: #212121;
  line-height: 1.45;
}
.req-chip {
  display: flex;
  align-items: flex-start;
  background-color: color-mix(in srgb, var(--color_button) 6%, white);
  border: 1px solid color-mix(in srgb, var(--color_button) 20%, transparent);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: #212121;
  line-height: 1.45;
}
.req-chip__number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  border-radius: 50%;
  background-color: color-mix(in srgb, var(--color_button) 20%, white);
  color: var(--color_button, #2E7D32);
  font-size: 11px;
  font-weight: 700;
  margin-right: 10px;
  flex-shrink: 0;
}
.req-chip__icon {
  margin-right: 8px;
  margin-top: 1px;
  flex-shrink: 0;
}
.req-chip__text {
  flex: 1;
}
</style>
