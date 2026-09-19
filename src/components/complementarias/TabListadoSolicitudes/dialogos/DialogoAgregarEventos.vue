<template>
  <q-dialog v-model="model" persistent>
    <q-card class="dialog-card">
      <q-card-section class="bg-green-9 q-px-lg q-py-md">
        <div class="row items-center justify-between">
          <div class="row items-center q-gutter-sm">
            <q-icon name="event_note" color="white" size="28px" />
            <div class="text-white text-weight-bold dialog-title">AGREGAR EVENTOS MENSUALES</div>
          </div>
          <q-btn flat round icon="close" color="white" v-close-popup />
        </div>
      </q-card-section>

      <q-card-section class="q-pa-lg text-center">
        <q-icon name="engineering" size="64px" color="grey-5" />
        <div class="text-h6 text-grey-7 q-mt-md">En proceso de desarrollo</div>
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat label="CERRAR" color="dark" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
// ── 1. IMPORTS
import { computed } from 'vue'

// ── 3. PROPS Y EMITS
const props = defineProps({
  modelValue:  { type: Boolean, required: true },
  solicitudId: { type: String,  required: true },
})
const emit = defineEmits(['update:modelValue'])

// ── 5. COMPUTED
const model = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})
</script>

<style scoped>
.dialog-card  { width: 600px; max-width: 95vw; }
.dialog-title { font-size: 16px; }
</style>
