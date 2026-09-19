<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent>
    <q-card class="dialog-card">
      <q-card-section class="bg-green-9 q-px-lg q-py-sm">
        <h5 class="q-mt-sm q-mb-sm text-white text-center text-weight-bold">PROGRAMACIÓN GENERAL</h5>
      </q-card-section>
      <q-card-section class="q-pa-lg q-pb-sm">
        <div class="q-mb-sm text-caption text-grey-7">
          Se generarán sesiones para todo el rango del programa:
          <strong>{{ fechaInicio }}</strong> → <strong>{{ fechaFin }}</strong>
        </div>
        <div class="q-mt-md">
          <div class="text-caption text-grey-7 q-mb-sm">Días de la semana *</div>
          <div class="row q-gutter-sm justify-center">
            <q-btn
              v-for="dia in diasSemana" :key="dia.val"
              :label="dia.label"
              :color="progForm.dias.includes(dia.val) ? 'green-9' : 'grey-4'"
              :text-color="progForm.dias.includes(dia.val) ? 'white' : 'grey-8'"
              size="sm" unelevated
              @click="$emit('toggle-dia', dia.val)"
            />
          </div>
        </div>
        <div class="row q-col-gutter-md q-mt-md">
          <div class="col-6">
            <q-input
              :model-value="horaToNum(progForm.horaInicio)"
              @update:model-value="v => progForm.horaInicio = numToHora(v)"
              type="number" :min="0" :max="23"
              outlined color="green-9" label="Hora inicio (0–23)" suffix=":00">
              <template v-slot:prepend><q-icon name="schedule" /></template>
            </q-input>
          </div>
          <div class="col-6">
            <q-input
              :model-value="horaToNum(progForm.horaFin)"
              @update:model-value="v => progForm.horaFin = numToHora(v)"
              type="number" :min="0" :max="23"
              outlined color="green-9" label="Hora fin (0–23)" suffix=":00">
              <template v-slot:prepend><q-icon name="schedule" /></template>
            </q-input>
          </div>
        </div>
        <div v-if="progForm.horaInicio && progForm.horaFin"
          class="text-center q-mt-sm text-caption text-green-9">
          {{ calcularHoras(progForm.horaInicio, progForm.horaFin) }} horas por sesión
          <span v-if="progForm.dias.length">· {{ sesionesAGenerar }} sesiones a crear
            ({{ parseFloat((sesionesAGenerar * calcularHoras(progForm.horaInicio, progForm.horaFin)).toFixed(2)) }}h en total)</span>
        </div>
        <div v-if="prfDuracionMaxima" class="text-center q-mt-xs text-caption text-grey-7">
          Horas disponibles: <strong>{{ parseFloat((prfDuracionMaxima - totalHorasProgramadas).toFixed(2)) }}h</strong>
          de {{ prfDuracionMaxima }}h del curso
        </div>
      </q-card-section>
      <q-banner dense rounded class="bg-orange-1 text-orange-9 q-mx-lg q-mb-sm">
        <template v-slot:avatar><q-icon name="school" color="orange-8" /></template>
        Después de generar, ingrese a cada sesión en el calendario para asignar su <strong>resultado de aprendizaje</strong>.
      </q-banner>
      <q-card-actions align="center" class="q-pb-lg">
        <q-btn label="CANCELAR" flat color="grey-7" @click="$emit('cerrar')" />
        <q-btn label="GENERAR SESIONES" class="save_as q-mx-sm" icon="event_repeat"
          :disable="!progFormValido" @click="$emit('generar')" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
// ── 1. IMPORTS
import { calcularHoras, horaToNum, numToHora } from '../../../../utils/complementarias/DateUtils.js'

// ── 3. PROPS Y EMITS
defineProps({
  modelValue:            { type: Boolean,          default: false },
  progForm:              { type: Object,           required: true },
  fechaInicio:           { type: String,           default: '' },
  fechaFin:              { type: String,           default: '' },
  prfDuracionMaxima:     { type: [Number, String], default: 0 },
  sesionesAGenerar:      { type: Number,           default: 0 },
  progFormValido:        { type: Boolean,          default: false },
  totalHorasProgramadas: { type: Number,           default: 0 },
  diasSemana:            { type: Array,            required: true },
})

defineEmits(['update:modelValue', 'toggle-dia', 'generar', 'cerrar'])
</script>

<style scoped>
.dialog-card { width: 520px; max-width: 95vw; }
.save_as { font-size: 18px; background-color: var(--color_button); color: var(--color_text_button); }
</style>
