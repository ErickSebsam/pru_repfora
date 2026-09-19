<template>
  <q-card
    class="item-card shadow-2"
    :class="{ 'hover-active': isHovered }"
    flat bordered
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <q-card-section class="q-pa-md">
      <div class="row items-center justify-between">
        <div class="col">
          <div class="row items-center q-gutter-md">
            <div class="item-title" :class="{ 'text-white': isHovered }">
              {{ title }}
            </div>
            <div
              v-for="badge in badges" :key="badge.label"
              class="item-badge q-px-sm q-py-xs"
              :class="isHovered ? 'bg-green-2 text-white' : badge.bgClass"
            >
              {{ badge.label }}
            </div>
          </div>
          <div class="row q-gutter-md q-mt-sm">
            <div
              v-if="code"
              class="meta-item meta-code"
              :class="{ 'text-white': isHovered }"
            >
              <q-icon name="numbers" size="14px" class="q-mr-xs" />{{ code }}
            </div>
            <div
              v-for="item in meta" :key="item.text"
              class="meta-item"
              :class="{ 'text-white': isHovered }"
            >
              <q-icon :name="item.icon" size="14px" class="q-mr-xs" />{{ item.text }}
            </div>
          </div>
        </div>
        <q-btn
          round size="md" icon="arrow_forward"
          class="arrow-btn"
          :class="isHovered ? 'bg-white text-green-9' : 'bg-green-9 text-white'"
          :loading="loading"
          @click.stop="$emit('select')"
        />
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
// ── 1. IMPORTS
import { ref } from 'vue'

// ── 3. PROPS Y EMITS
defineProps({
  code:    { type: [String, Number], default: '' },
  title:   { type: String, required: true },
  badges:  { type: Array,  default: () => [] },
  meta:    { type: Array,  default: () => [] },
  loading: { type: Boolean, default: false },
})

defineEmits(['select'])

// ── 4. ESTADO REACTIVO
const isHovered = ref(false)
</script>

<style scoped>
.item-card {
  border-radius: 8px;
  cursor: default;
  transition: background 0.18s ease;
  border: 1px solid #e0e0e0;
}
.item-card.hover-active {
  background-color: #66bb6a;
  border-color: #66bb6a;
}
.item-badge {
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}
.item-title {
  font-size: 20px;
  font-weight: bold;
  color: var(--color_card);
  line-height: 1.4;
}
.meta-item {
  font-size: 16px;
  color: #616161;
}
.meta-code {
  color: var(--color_button);
  font-weight: 600;
}
.arrow-btn {
  width: 40px;
  height: 40px;
}
</style>
