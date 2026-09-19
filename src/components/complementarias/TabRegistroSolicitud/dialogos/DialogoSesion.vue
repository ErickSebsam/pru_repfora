<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent>
    <q-card class="dialog-card">
      <q-card-section class="bg-green-9 q-px-lg q-py-sm">
        <h5 class="q-mt-sm q-mb-sm text-white text-center text-weight-bold">
          {{ editandoSesion ? 'EDITAR SESIÓN' : 'NUEVA SESIÓN' }}
        </h5>
      </q-card-section>
      <q-card-section class="q-pa-md q-pt-lg">
        <q-input v-model="sesionForm.fecha" type="date" outlined color="green-9" label="Fecha *"
          :disable="loading"
          :min="fechaInicio || undefined"
          :max="fechaFin || undefined"
          :rules="[
            (val) => (val && val.length > 0) || 'La fecha es obligatoria',
          ]" lazy-rules>
          <template v-slot:prepend><q-icon name="event" /></template>
        </q-input>
        <div class="row q-col-gutter-md q-mt-md">
          <div class="col-6">
            <q-input
              :model-value="horaToNum(sesionForm.horaInicio)"
              @update:model-value="v => sesionForm.horaInicio = numToHora(v)"
              type="number" :min="0" :max="23"
              outlined color="green-9" label="Hora inicio (0–23)"
              suffix=":00" :disable="loading"
              :rules="[(val) => (val !== '' && val !== null) || 'Requerido']" lazy-rules>
              <template v-slot:prepend><q-icon name="schedule" /></template>
            </q-input>
          </div>
          <div class="col-6">
            <q-input
              :model-value="horaToNum(sesionForm.horaFin)"
              @update:model-value="v => sesionForm.horaFin = numToHora(v)"
              type="number" :min="0" :max="23"
              outlined color="green-9" label="Hora fin (0–23)"
              suffix=":00" :disable="loading"
              :rules="[
                (val) => (val !== '' && val !== null) || 'Requerido',
                (val) => !sesionForm.horaInicio || parseInt(val) > horaToNum(sesionForm.horaInicio) || 'Posterior al inicio'
              ]" lazy-rules>
              <template v-slot:prepend><q-icon name="schedule" /></template>
            </q-input>
          </div>
        </div>
        <div v-if="sesionForm.horaInicio && sesionForm.horaFin && calcularHoras(sesionForm.horaInicio, sesionForm.horaFin) > 0"
          class="text-center q-mt-md q-pa-sm bg-green-1 rounded-borders">
          <div class="text-subtitle1 text-green-9 text-weight-bold">
            {{ calcularHoras(sesionForm.horaInicio, sesionForm.horaFin) }} horas
          </div>
          <div class="text-caption text-grey-7">{{ sesionForm.horaInicio }} → {{ sesionForm.horaFin }}</div>
        </div>

        <template v-if="instructores.length">
          <q-separator class="q-my-md" />
          <q-select
            v-model="sesionForm.instructor"
            :options="instructores"
            option-label="name" option-value="_id"
            emit-value map-options
            outlined color="green-9" label="Instructor de la sesión *"
            :disable="loading || instructores.length === 1"
            :rules="[v => !!v || 'Seleccione un instructor']" lazy-rules>
            <template v-slot:prepend><q-icon name="person" /></template>
          </q-select>
        </template>

        <template v-if="competencies.length">
          <q-separator class="q-my-md" />
          <q-select
            v-model="sesionForm.competencia"
            :options="opcionesCompetencia"
            emit-value map-options
            outlined color="green-9" label="Competencia *"
            :disable="loading || competencies.length === 1"
            :rules="[v => !!v || 'Seleccione una competencia']" lazy-rules>
            <template v-slot:prepend><q-icon name="verified" /></template>
            <template v-slot:option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section>
                  <q-item-label class="text-body2">{{ scope.opt.label }}</q-item-label>
                  <q-item-label caption>{{ scope.opt.code }}</q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>
          <q-select
            v-model="sesionForm.resultado"
            :options="opcionesResultado"
            outlined color="green-9" label="Resultado de aprendizaje *"
            class="q-mt-md"
            :disable="loading || !sesionForm.competencia || opcionesResultado.length <= 1"
            :rules="[v => !!v || 'Seleccione un resultado de aprendizaje']" lazy-rules>
            <template v-slot:prepend><q-icon name="school" /></template>
          </q-select>
        </template>
        <template v-else-if="sesionForm.competencia || sesionForm.resultado">
          <q-separator class="q-my-md" />
          <q-input v-if="sesionForm.competencia" :model-value="sesionForm.competencia"
            outlined readonly bg-color="grey-3" color="green-9" label="Competencia">
            <template v-slot:prepend><q-icon name="verified" /></template>
          </q-input>
          <q-input v-if="sesionForm.resultado" :model-value="sesionForm.resultado"
            outlined readonly bg-color="grey-3" color="green-9" label="Resultado de aprendizaje" class="q-mt-md">
            <template v-slot:prepend><q-icon name="school" /></template>
          </q-input>
        </template>
      </q-card-section>
      <q-card-actions align="center" class="q-pb-lg">
        <q-btn v-if="editandoSesion" label="ELIMINAR" flat color="red-7"
          icon="delete" :disable="loading" @click="$emit('eliminar')" />
        <q-btn v-if="editandoSesion" label="DUPLICAR" flat color="blue-7"
          icon="content_copy" :disable="loading" @click="$emit('duplicar')" />
        <q-btn label="CANCELAR" flat color="grey-7" v-close-popup :disable="loading" />
        <q-btn label="GUARDAR" class="save_as q-mx-sm" :disable="loading" @click="$emit('guardar')" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
// ── 1. IMPORTS
import { computed, watch } from 'vue'
import { calcularHoras, horaToNum, numToHora } from '../../../../utils/complementarias/DateUtils.js'

// ── 3. PROPS Y EMITS
const props = defineProps({
  modelValue:     { type: Boolean, default: false },
  sesionForm:     { type: Object,  required: true },
  editandoSesion: { type: Boolean, default: null },
  fechaInicio:    { type: String,  default: undefined },
  fechaFin:       { type: String,  default: undefined },
  loading:        { type: Boolean, default: false },
  competencies:   { type: Array,   default: () => [] },
  instructores:   { type: Array,   default: () => [] },
})

defineEmits(['update:modelValue', 'guardar', 'eliminar', 'duplicar'])

// ── 5. COMPUTED
// genera las opciones del select de competencias con label, value y code
const opcionesCompetencia = computed(() =>
  props.competencies.map(c => ({
    label: c.name || 'Sin nombre',
    value: c.name,
    code: (!c.code || c.code === '000000') ? '' : c.code,
  }))
)

// encuentra la competencia seleccionada en el formulario
const competenciaSeleccionada = computed(() =>
  props.competencies.find(c => c.name === props.sesionForm.competencia) || null
)

// devuelve los resultados de aprendizaje de la competencia seleccionada
const opcionesResultado = computed(() => {
  if (!competenciaSeleccionada.value) return []
  return competenciaSeleccionada.value.resultados || []
})

// ── 6. WATCHERS
watch(() => props.modelValue, (open) => {
  if (!open) return
  if (props.instructores.length === 1) {
    props.sesionForm.instructor = props.instructores[0]._id
  }
  if (props.competencies.length === 1) {
    props.sesionForm.competencia = props.competencies[0].name
  }
  if (props.sesionForm.competencia) {
    const comp = props.competencies.find(c => c.name === props.sesionForm.competencia)
    if (comp && (comp.resultados || []).length === 1) {
      props.sesionForm.resultado = comp.resultados[0]
    }
  }
})

// al cambiar la competencia, ajusta o limpia el resultado de aprendizaje
watch(() => props.sesionForm.competencia, (nombre) => {
  if (!nombre) { props.sesionForm.resultado = ''; return }
  const comp = props.competencies.find(c => c.name === nombre)
  if (!comp) { props.sesionForm.resultado = ''; return }
  const resultados = comp.resultados || []
  if (resultados.length === 1) {
    props.sesionForm.resultado = resultados[0]
  } else if (!resultados.includes(props.sesionForm.resultado)) {
    props.sesionForm.resultado = ''
  }
})
</script>

<style scoped>
.dialog-card { width: 700px; max-width: 95vw; }
.save_as { font-size: 18px; background-color: var(--color_button); color: var(--color_text_button); }
</style>
