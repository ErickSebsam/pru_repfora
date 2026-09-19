<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent>
    <q-card class="dialog-card">
      <q-card-section class="bg-green-9 q-px-lg q-py-sm">
        <div class="row items-center justify-center q-gutter-sm">
          <q-icon name="forward_to_inbox" color="white" size="28px" />
          <div>
            <div class="text-white text-weight-bold text-center dialog-title">REENVIAR SOLICITUD</div>
            <div class="text-green-2 text-center text-caption">Vuelve al estado "En proceso"</div>
          </div>
        </div>
      </q-card-section>
      <q-card-section class="text-center q-pa-md">
        <q-icon name="forward_to_inbox" size="56px" color="green-8" />
        <div class="q-mt-md text-body1 text-weight-medium">¿Reenviar esta solicitud para revisión?</div>
        <div class="text-grey-6 q-mt-sm text-caption">
          La solicitud pasará de <strong>Rechazada</strong> → <strong>En proceso</strong> y el coordinador podrá revisarla nuevamente.
        </div>
      </q-card-section>
      <q-card-actions align="center" class="q-pb-lg">
        <q-btn label="CANCELAR" flat color="dark" :disable="loading" @click="$emit('cancelar')" />
        <q-btn label="REENVIAR" icon="forward_to_inbox" color="green-9" unelevated
          :loading="loading" :disable="loading"
          @click="$emit('confirmar')" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
// ── 3. PROPS Y EMITS
defineProps({
  modelValue: { type: Boolean, default: false },
  loading:    { type: Boolean, default: false },
})

defineEmits(['update:modelValue', 'confirmar', 'cancelar'])
</script>

<style scoped>
.dialog-card  { width: 380px; max-width: 90vw; }
.dialog-title { font-size: 16px; }
</style>
