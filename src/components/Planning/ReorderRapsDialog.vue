<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent square>
    <q-card style="width: 800px; max-width: 90vw; display: flex; flex-direction: column; max-height: 85vh;">
      
      <!-- Cabecera Verde Sólida -->
      <q-card-section class="bg-green-9 text-white row items-center justify-between q-py-md q-px-lg" style="flex: 0 0 auto;">
        <div class="row items-center">
          <q-icon name="swap_vert" size="24px" class="q-mr-sm" />
          <div class="text-h6 text-weight-bold text-uppercase tracking-wider">Reordenar Resultados de Aprendizaje</div>
        </div>
        <q-btn icon="close" flat round dense v-close-popup color="white" />
      </q-card-section>

      <!-- Selector de Competencia -->
      <q-card-section class="q-pa-md bg-grey-2 border-bottom" style="flex: 0 0 auto;">
        <div class="text-caption text-bold text-green-9 q-mb-xs text-uppercase">1. Seleccione la Competencia a organizar:</div>
        <q-select
          v-model="selectedCompetenceCode"
          :options="competenceOptions"
          outlined
          square
          dense
          emit-value
          map-options
          color="green-9"
          bg-color="white"
          class="full-width"
        />
      </q-card-section>

      <!-- Lista Draggable de RAPs -->
      <q-card-section class="col q-pa-md scroll" style="overflow-y: auto; flex: 1 1 auto;">
        <div v-if="!selectedCompetenceCode" class="text-center text-grey q-pa-xl">
          <q-icon name="arrow_upward" size="48px" class="q-mb-md" />
          <div class="text-subtitle1 text-weight-medium">Seleccione una competencia arriba para ver sus resultados</div>
        </div>

        <div v-else-if="localRaps.length === 0" class="text-center text-grey q-pa-xl">
          <q-icon name="info" size="48px" class="q-mb-md" />
          <div class="text-subtitle1 text-weight-medium">Esta competencia no tiene resultados registrados</div>
        </div>

        <div v-else>
          <div class="text-caption text-bold text-green-9 q-mb-md text-uppercase">2. Arrastre los resultados para cambiar su orden:</div>
          
          <q-list class="q-gutter-y-sm">
            <q-item
              v-for="(rap, index) in localRaps"
              :key="rap.description"
              draggable="true"
              @dragstart="onDragStart(index, $event)"
              @dragover.prevent="onDragOver(index, $event)"
              @drop="onDrop(index, $event)"
              @dragend="draggedIndex = null"
              class="bg-white border-all rounded-borders q-py-md cursor-pointer transition-all item-rap-drag"
              :class="{ 'dragging-item': draggedIndex === index }"
            >
              <!-- Grab Handle Icon -->
              <q-item-section avatar class="min-width-drag-icon">
                <q-icon name="drag_indicator" color="grey-6" class="cursor-grab drag-handle" size="22px" />
              </q-item-section>

              <!-- Número y Descripción -->
              <q-item-section>
                <q-item-label class="text-body2 text-grey-9 text-weight-medium">
                  <span class="text-green-9 text-bold q-mr-xs">{{ index + 1 }}.</span> {{ rap.description }}
                </q-item-label>
                <q-item-label caption class="q-mt-xs text-grey-6" v-if="rap.pedagogicalActivities && rap.pedagogicalActivities[0]">
                  Instructor: {{ rap.pedagogicalActivities[0].suggestedInstructor?.name || 'No asignado' }} 
                  | Horas: {{ rap.pedagogicalActivities[0].hours?.direct || 0 }}D / {{ rap.pedagogicalActivities[0].hours?.independent || 0 }}I
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </div>
      </q-card-section>

      <q-separator />

      <!-- Botones de Acción -->
      <q-card-actions align="right" class="q-pa-md bg-grey-2" style="flex: 0 0 auto;">
        <q-btn square flat label="CANCELAR" color="grey-8" class="text-bold q-px-lg" v-close-popup />
        <q-btn
          square
          label="GUARDAR ORDEN"
          color="green-9"
          class="text-white text-bold q-px-xl"
          :disable="!selectedCompetenceCode || localRaps.length <= 1"
          @click="saveOrder"
          unelevated
        />
      </q-card-actions>

    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { usePlanningStore } from '../../store/planning.store';
import { useQuasar } from 'quasar';

const props = defineProps({
  modelValue: { type: Boolean, default: false }
});

const emit = defineEmits(['update:modelValue']);

const store = usePlanningStore();
const $q = useQuasar();

const selectedCompetenceCode = ref(null);
const localRaps = ref([]);
const draggedIndex = ref(null);

// Obtener las competencias disponibles en la fase seleccionada actualmente
const competenceOptions = computed(() => {
  const phaseData = store.planning?.pedagogicalPlanning?.content?.find(
    p => p.phase === store.selectedPhase
  );
  if (!phaseData || !phaseData.competencies) return [];

  return phaseData.competencies.map(c => ({
    label: `[Cód. ${c.code}] ${c.name.slice(0, 80)}${c.name.length > 80 ? '...' : ''}`,
    value: c.code
  }));
});

// Cargar RAPs locales cuando se selecciona la competencia
watch(selectedCompetenceCode, (newCode) => {
  if (!newCode) {
    localRaps.value = [];
    return;
  }
  const phaseData = store.planning?.pedagogicalPlanning?.content?.find(
    p => p.phase === store.selectedPhase
  );
  const comp = phaseData?.competencies?.find(c => c.code === newCode);
  if (comp && comp.learningOutcomes) {
    localRaps.value = JSON.parse(JSON.stringify(comp.learningOutcomes));
  } else {
    localRaps.value = [];
  }
});

// Resetea el diálogo cuando se abre/cierra
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    if (competenceOptions.value.length > 0) {
      selectedCompetenceCode.value = competenceOptions.value[0].value;
    } else {
      selectedCompetenceCode.value = null;
    }
  }
});

// --- Lógica Drag & Drop HTML5 ---
const onDragStart = (index, event) => {
  draggedIndex.value = index;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', index);
};

const onDragOver = (index, event) => {
  if (draggedIndex.value === null || draggedIndex.value === index) return;
  // Reordenar reactivamente en la lista local durante el arrastre
  const list = [...localRaps.value];
  const item = list.splice(draggedIndex.value, 1)[0];
  list.splice(index, 0, item);
  localRaps.value = list;
  draggedIndex.value = index;
};

const onDrop = (index, event) => {
  draggedIndex.value = null;
};

// --- Guardar Cambios ---
const saveOrder = async () => {
  if (!store.planning || !selectedCompetenceCode.value) return;

  try {
    const phaseIndex = store.planning.pedagogicalPlanning.content.findIndex(
      p => p.phase === store.selectedPhase
    );
    if (phaseIndex === -1) return;

    const compIndex = store.planning.pedagogicalPlanning.content[phaseIndex].competencies.findIndex(
      c => c.code === selectedCompetenceCode.value
    );
    if (compIndex === -1) return;

    // Actualizar el arreglo original de RAPs con el nuevo orden local
    store.planning.pedagogicalPlanning.content[phaseIndex].competencies[compIndex].learningOutcomes = JSON.parse(
      JSON.stringify(localRaps.value)
    );

    $q.loading.show({ message: 'Guardando nuevo orden...' });
    await store.saveDraft();
    $q.loading.hide();

    $q.notify({
      message: '¡El orden de los Resultados ha sido actualizado exitosamente!',
      color: 'green-9',
      icon: 'check_circle',
      position: 'top'
    });

    emit('update:modelValue', false);
  } catch (error) {
    $q.loading.hide();
    console.error('Error al guardar el nuevo orden:', error);
    $q.notify({
      message: 'Hubo un error al guardar el orden. Intente de nuevo.',
      color: 'red-9',
      icon: 'error',
      position: 'top'
    });
  }
};
</script>

<style scoped>
.border-bottom {
  border-bottom: 1px solid #e0e0e0;
}
.border-all {
  border: 1px solid #e0e0e0;
}
.rounded-borders {
  border-radius: 4px;
}
.min-width-drag-icon {
  min-width: 32px !important;
  padding-right: 2px;
}
.item-rap-drag {
  transition: transform 0.2s, box-shadow 0.2s;
  user-select: none;
}
.item-rap-drag:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  background-color: #fcfcfc !important;
}
.dragging-item {
  opacity: 0.5;
  background-color: #f1f8e9 !important;
  border: 1px dashed #2e7d32 !important;
}
.drag-handle {
  cursor: grab;
}
.drag-handle:active {
  cursor: grabbing;
}
</style>
