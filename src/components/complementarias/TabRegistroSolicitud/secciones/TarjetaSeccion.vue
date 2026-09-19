<template>
  <q-card v-if="visible" flat bordered class="q-mb-md section-card">
    <div class="section-header row items-center q-px-md q-py-sm cursor-pointer" @click="$emit('toggle')">
      <q-icon :name="icon" color="green-9" size="20px" class="q-mr-sm" />
      <div class="text-green-9 text-weight-bold text-uppercase col section-title">{{ title }}</div>
      <slot name="badge" />
      <q-icon :name="collapsed ? 'chevron_right' : 'expand_more'" color="green-9" size="20px" />
    </div>
    <q-separator color="green-3" />
    <div v-show="!collapsed" class="q-pa-md">
      <slot />
    </div>
  </q-card>
</template>

<script setup>
// ── 3. PROPS Y EMITS
defineProps({
  title: { type: String, required: true },
  icon: { type: String, required: true },
  collapsed: { type: Boolean, default: false },
  visible: { type: Boolean, default: true },
})

defineEmits(['toggle'])
</script>

<style scoped>
.section-card { border-radius: 8px; }
.section-title { font-size: 18px; }
.section-header { background-color: color-mix(in srgb, var(--color_button) 10%, white); transition: background 0.2s; }
.section-header:hover { background-color: color-mix(in srgb, var(--color_button) 20%, white); }
</style>
