<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :maximized="$q.screen.lt.sm"
  >
    <q-card class="dialog-card">

      <q-card-section class="q-px-lg q-py-sm" style="flex-shrink: 0; background-color: var(--color_button)">
        <div class="row items-center no-wrap">
          <div class="col">
            <div class="text-green-3 text-caption text-uppercase course-code">
              {{ code || course?.codVer }}
            </div>
            <div class="text-white text-weight-bold q-mt-xs course-name">
              {{ title || course?.prfDenominacion }}
            </div>
            <div class="row items-center q-gutter-xs q-mt-xs">
              <template v-if="headerBadges">
                <q-badge v-for="b in headerBadges" :key="b.label"
                  outline :color="b.color || 'green-3'" :label="b.label" class="dialog-badge" />
              </template>
              <template v-else>
                <q-badge outline color="green-3" :label="course?.modalidad || 'Sin modalidad'" class="dialog-badge" />
                <q-badge outline color="green-3"
                  :label="course?.prfDuracionMaxima != null ? course.prfDuracionMaxima + ' horas' : 'Sin duración'"
                  class="dialog-badge" />
                <q-badge outline color="green-3" :label="course?.tipoFormacion || 'Sin tipo'" class="dialog-badge" />
              </template>
            </div>
          </div>
          <q-btn round flat dense icon="close" color="green-3" v-close-popup
            class="q-ml-sm" style="align-self: flex-start" />
        </div>
      </q-card-section>

      <q-separator color="green-8" />

      <q-scroll-area class="dialog-scroll-area">
        <div class="q-pa-md">

          <template v-if="sections">
            <div class="row q-col-gutter-sm q-mb-sm">
              <div v-for="(section, i) in sections" :key="i"
                :class="section.fullWidth ? 'col-12' : 'col-12 col-sm-6'">
                <div class="section-box">
                  <div class="section-box__title">
                    <q-icon :name="section.icon" size="15px" class="q-mr-xs" />
                    {{ section.title }}
                  </div>
                  <div v-if="section.type !== 'list'" class="row section-content-centered">
                    <div v-for="item in section.items" :key="item.name" class="col-6 q-px-lg q-py-md">
                      <div class="data-label">{{ item.name }}</div>
                      <q-badge v-if="item.badge"
                        :color="item.badge.color" :label="item.value || '—'"
                        class="q-mt-xs dialog-badge" />
                      <div v-else class="data-value">{{ item.value || '—' }}</div>
                    </div>
                  </div>
                  <div v-else class="q-px-lg q-py-md">
                    <div v-if="section.items.length">
                      <div v-for="(item, j) in section.items" :key="j"
                        class="row items-start no-wrap q-mb-sm">
                        <q-icon :name="section.listIcon || 'check_circle'"
                          color="green-6" size="15px" class="q-mr-sm" style="margin-top:3px;flex-shrink:0" />
                        <span class="data-value">{{ item }}</span>
                      </div>
                    </div>
                    <span v-else class="data-value text-grey-5">Sin registros</span>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <template v-else>

            <div class="row q-col-gutter-sm q-mb-sm items-stretch">
              <div class="col-12 col-sm-6">
                <div class="section-box full-height">
                  <div class="section-box__title">
                    <q-icon name="info" size="15px" class="q-mr-xs" />Información general
                  </div>
                  <div class="row section-content-centered">
                    <div v-for="item in infoGeneral" :key="item.name" class="col-6 q-px-lg q-py-md">
                      <div class="data-label">{{ item.name }}</div>
                      <q-badge v-if="item.badge"
                        :color="item.badge.color" :text-color="item.badge.textColor" :label="item.value || '—'"
                        class="q-mt-xs dialog-badge dialog-badge--wide" />
                      <div v-else class="data-value">{{ item.value || '—' }}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-12 col-sm-6">
                <div class="section-box full-height">
                  <div class="section-box__title">
                    <q-icon name="label" size="15px" class="q-mr-xs" />Clasificación
                  </div>
                  <div class="row section-content-centered">
                    <div v-for="item in clasificacion" :key="item.name" class="col-6 q-px-lg q-py-md">
                      <div class="data-label">{{ item.name }}</div>
                      <div class="data-value">{{ item.value || '—' }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="row q-col-gutter-sm">
              <div class="col-12">
                <div class="section-box">
                  <div class="section-box__title">
                    <q-icon name="checklist" size="15px" class="q-mr-xs" />
                    Requisitos de ingreso
                    <span class="req-count" v-if="requisitos.length">&nbsp;({{ requisitos.length }})</span>
                  </div>
                  <div class="q-px-lg q-py-md">
                    <div v-if="requisitos.length">
                      <div v-for="(req, i) in requisitos" :key="i"
                        class="row items-start no-wrap q-mb-sm">
                        <q-icon name="check_circle" color="green-6" size="15px"
                          class="q-mr-sm" style="margin-top: 3px; flex-shrink: 0" />
                        <span class="data-value">{{ req }}</span>
                      </div>
                    </div>
                    <span v-else class="data-value text-grey-5">Sin requisitos registrados</span>
                  </div>
                </div>
              </div>
            </div>

          </template>

        </div>
      </q-scroll-area>

      <q-separator />
      <q-card-actions align="right" class="q-px-lg q-py-sm q-gutter-sm" style="flex-shrink: 0">
        <q-btn label="CERRAR" icon="close" flat color="dark" class="btn-cancel" v-close-popup />
        <q-btn v-if="showConfirm"
          label="CONFIRMAR CURSO" icon-right="check_circle"
          unelevated class="style-btn btn-ok"
          @click="confirmar" />
      </q-card-actions>

    </q-card>
  </q-dialog>
</template>

<script setup>
// ── 1. IMPORTS
import { computed } from 'vue'

// ── 3. PROPS Y EMITS
const props = defineProps({
  course:       { type: Object,  default: null  },
  modelValue:   { type: Boolean, required: true },
  title:        { type: String,  default: null  },
  code:         { type: String,  default: null  },
  headerBadges: { type: Array,   default: null  },
  sections:     { type: Array,   default: null  },
  showConfirm:  { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'confirm'])

// ── 5. COMPUTED
const infoGeneral = computed(() => [
  { name: 'Código',             value: props.course?.codVer },
  { name: 'Modalidad',          value: props.course?.modalidad },
  { name: 'Duración',           value: props.course?.prfDuracionMaxima != null ? `${props.course.prfDuracionMaxima} horas` : null },
  { name: 'Tipo formación',     value: props.course?.tipoFormacion },
  { name: 'Nivel de formación', value: props.course?.nivelFormacion },
  {
    name: 'Apoyo FIC',
    value: props.course?.fic || 'NO',
    badge: {
      color: props.course?.fic === 'SI' ? 'green-7' : 'grey-4',
      textColor: props.course?.fic === 'SI' ? 'white' : 'grey-8',
    },
  },
])

const clasificacion = computed(() => [
  { name: 'Línea tecnológica',   value: props.course?.lineaTecnologica },
  { name: 'Red tecnológica',     value: props.course?.redTecnologica },
  { name: 'Red de conocimiento', value: props.course?.redConocimiento },
  { name: 'Apuesta prioritaria', value: props.course?.apuestasPrioritarias },
])

const requisitos = computed(() => {
  const text = props.course?.prfDescripcionRequisito
  if (!text) return []
  return text.split(/[\n\t]+/).map(r => r.trim()).filter(r => r.length > 0)
})

// ── 10. MANEJADORES DEL TEMPLATE
function confirmar() {
  emit('confirm', props.course)
}
</script>

<style scoped>
.dialog-card {
  width: 98vw;
  max-width: 1600px;
  height: 95vh;
  min-width: 320px;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.course-code { letter-spacing: 1.4px; font-size: 13px; }
.course-name { font-size: 22px; line-height: 1.3; }
.dialog-badge { font-size: 13px; padding: 4px 12px; border-radius: 20px; }
.dialog-badge--wide { padding: 4px 14px; }

.btn-cancel { min-width: 120px; }
.btn-ok     { min-width: 220px; }

.dialog-scroll-area { flex: 1; min-height: 0; }

.section-box {
  border: 1.5px solid color-mix(in srgb, var(--color_button) 35%, transparent);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.section-box__title {
  background-color: color-mix(in srgb, var(--color_button) 10%, white);
  color: var(--color_button);
  font-size: 15px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1.1px;
  padding: 11px 16px;
  border-bottom: 3px solid var(--color_button);
  flex-shrink: 0;
  display: flex;
  align-items: center;
}
.section-content-centered { flex: 1; align-content: center; row-gap: 32px; }

.data-label {
  font-size: 13px;
  font-weight: 700;
  color: #424242;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 5px;
  padding-left: 8px;
  border-left: 3px solid var(--color_button);
}
.data-value { font-size: 16px; color: #111111; line-height: 1.5; }
.req-count  { font-weight: 500; font-size: 14px; color: var(--color_button); text-transform: none; letter-spacing: 0; }
</style>
