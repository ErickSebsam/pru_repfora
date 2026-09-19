<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent>
    <q-card class="dialog-card">
      <q-card-section class="bg-blue-grey-8 q-px-lg q-py-sm">
        <div class="row items-center justify-center q-gutter-sm">
          <q-icon name="lock" color="white" size="28px" />
          <div>
            <div class="text-white text-weight-bold text-center dialog-title">CERRAR FICHA COMPLEMENTARIA</div>
            <div class="text-blue-grey-3 text-center text-caption">Todos los resultados de aprendizaje deben estar evaluados</div>
          </div>
        </div>
      </q-card-section>

      <!-- Cargando -->
      <q-card-section v-if="loadingData" class="text-center q-pa-lg">
        <q-spinner-dots color="blue-grey-7" size="40px" />
      </q-card-section>

      <q-card-section v-else-if="schedulesPendientes.length" class="q-pa-md">
        <div class="text-red-8 text-weight-bold q-mb-sm">
          <q-icon name="warning" /> Hay {{ schedulesPendientes.length }} sesión(es) sin evaluar:
        </div>
        <q-list bordered separator dense>
          <q-item v-for="s in schedulesPendientes" :key="s._id">
            <q-item-section>
              <q-item-label class="text-caption">{{ s.outcome || 'Sesión' }}</q-item-label>
              <q-item-label caption>{{ s.tstart }} – {{ s.tend }} · Días: {{ s.days?.join(', ') }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-card-section v-else class="text-center q-pa-md">
        <q-icon name="lock" size="56px" color="blue-grey-7" />
        <div class="q-mt-md text-body1 text-weight-medium">¿Cerrar esta ficha complementaria?</div>
        <div class="text-grey-6 q-mt-sm text-caption">El estado cambiará a <strong>CERRADA</strong> y no podrá reactivarse.</div>
      </q-card-section>

      <q-card-actions align="center" class="q-pb-lg">
        <q-btn label="VOLVER" flat color="dark" v-close-popup />
        <q-btn v-if="!schedulesPendientes.length && !loadingData"
          label="CERRAR FICHA" icon="lock" color="blue-grey-8" unelevated
          :loading="loadingCierre"
          @click="confirmar" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
// ── 1. IMPORTS
import { ref, watch } from 'vue'
import { get, put } from '../../../../services/api.js'
import { notifySuccessRequest, notifyErrorRequest } from '../../../../common/notify.js'

// ── 3. PROPS Y EMITS
const props = defineProps({
  modelValue:  { type: Boolean, default: false },
  solicitudId: { type: String,  default: '' },
})
const emit = defineEmits(['update:modelValue', 'guardado'])

// ── 4. ESTADO REACTIVO
const schedulesPendientes = ref([])
const loadingData         = ref(false)
const loadingCierre       = ref(false)

// ── 6. WATCHERS
// al abrir el dialogo carga los schedules pendientes de evaluacion
watch(() => props.modelValue, async (val) => {
  if (!val) { schedulesPendientes.value = []; return }
  loadingData.value = true
  try {
    const res = await get(`/complementary/requests/${props.solicitudId}/schedules`)
    schedulesPendientes.value = (Array.isArray(res) ? res : (res?.data || [])).filter(s => !s.rated)
  } catch (err) {
    notifyErrorRequest(err?.response?.data?.msg || 'Error al verificar los horarios')
  }
  loadingData.value = false
})

// ── 10. MANEJADORES DEL TEMPLATE
// cierra la ficha complementaria o muestra los pendientes si falla
async function confirmar() {
  loadingCierre.value = true
  try {
    const res = await put(`/complementary/requests/${props.solicitudId}/close`)
    if (res?.msg) notifySuccessRequest(res.msg)
    emit('update:modelValue', false)
    emit('guardado')
  } catch (err) {
    const pending = err?.response?.data?.pending
    if (pending?.length) schedulesPendientes.value = pending
  }
  loadingCierre.value = false
}
</script>

<style scoped>
.dialog-card  { width: 480px; max-width: 90vw; }
.dialog-title { font-size: 16px; }
</style>
