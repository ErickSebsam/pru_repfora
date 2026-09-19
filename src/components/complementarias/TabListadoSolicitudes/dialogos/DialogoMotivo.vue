<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent>
    <q-card class="dialog-card">
      <q-card-section :class="[headerColor, 'q-px-lg q-py-sm']">
        <div class="row items-center justify-center q-gutter-sm">
          <q-icon :name="icon" color="white" size="28px" />
          <div>
            <div class="text-white text-weight-bold text-center dialog-title">{{ titulo }}</div>
            <div :class="[subtextoColor, 'text-center text-caption']">{{ subtexto }}</div>
          </div>
        </div>
      </q-card-section>
      <q-card-section class="q-pa-md">
        <q-input v-model="motivo" type="textarea" outlined autogrow :color="inputColor"
          :label="inputLabel" :placeholder="inputPlaceholder" />
      </q-card-section>
      <q-card-actions align="center" class="q-pb-lg">
        <q-btn :label="volverLabel" flat color="dark" v-close-popup />
        <q-btn :label="confirmLabel" color="red-7" unelevated
          :disable="!motivo.trim()" @click="onConfirmar" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
// ── 1. IMPORTS
import { ref, watch } from 'vue'

// ── 3. PROPS Y EMITS
const props = defineProps({
  modelValue:      { type: Boolean, default: false },
  headerColor:     { type: String,  default: 'bg-grey-8' },
  icon:            { type: String,  default: 'block' },
  titulo:          { type: String,  default: '' },
  subtexto:        { type: String,  default: '' },
  subtextoColor:   { type: String,  default: 'text-grey-4' },
  confirmLabel:    { type: String,  default: 'CONFIRMAR' },
  volverLabel:     { type: String,  default: 'VOLVER' },
  inputLabel:      { type: String,  default: 'Motivo *' },
  inputPlaceholder:{ type: String,  default: 'Indique el motivo...' },
  inputColor:      { type: String,  default: 'grey-8' },
})

const emit = defineEmits(['update:modelValue', 'confirmar'])

// ── 4. ESTADO REACTIVO
const motivo = ref('')

// ── 6. WATCHERS
// limpia el campo de motivo al abrir el dialogo
watch(() => props.modelValue, (val) => { if (val) motivo.value = '' })

// ── 10. MANEJADORES DEL TEMPLATE
// emite el motivo ingresado al confirmar
function onConfirmar() {
  emit('confirmar', motivo.value)
}
</script>

<style scoped>
.dialog-card  { width: 420px; max-width: 90vw; }
.dialog-title { font-size: 16px; }
</style>
