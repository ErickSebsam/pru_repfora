<template>
  <div>
    <q-card-section class="bg-white q-py-sm">
      <div class="row items-center no-wrap justify-between">
        <div class="col">
          <div class="row items-center q-gutter-x-sm">
            <span class="text-overline text-green-8 text-bold text-uppercase">Resultado de Aprendizaje</span>
            <!-- actualizacion horas luis llanos 15-09-2026 -->
            <q-badge v-if="rapSuggestedHours" outline color="green-9" class="text-weight-bold q-px-xs">
              💡 Sugerido RAP: {{ rapSuggestedHours }}h
            </q-badge>
          </div>
          <div class="text-subtitle2 text-weight-bold text-green-10 leading-tight">
            {{ rap.description }}
          </div>
        </div>
        <!-- Controles para reordenar RAPs de forma simple -->
        <div class="row items-center q-gutter-x-xs self-center" v-if="store.isLeader">

          <q-btn flat round dense icon="arrow_upward" size="md" color="green-9" :disable="rIdx === 0"
            @click="moveRap(-1)">
            <q-tooltip class="bg-green-9 text-weight-bold">Mover hacia arriba</q-tooltip>
          </q-btn>

          <q-btn flat round dense icon="arrow_downward" size="md" color="green-9"
            :disable="rIdx === comp.learningOutcomes.length - 1" @click="moveRap(1)">
            <q-tooltip class="bg-green-9 text-weight-bold">Mover hacia abajo</q-tooltip>
          </q-btn>
        </div>
      </div>
    </q-card-section>

    <!-- ACORDEÓN CON EFECTO SUTIL DE ELEVACIÓN Y HOVER -->
    <q-expansion-item 
      square 
      expand-icon="none"
      header-class="q-pa-none" 
      :class="[
        knowledgeProgress.complete ? 'bg-green-1' : 'bg-orange-1',
        'accordion-header-custom'
      ]"
      class="q-mx-md q-mt-sm q-mb-md rounded-borders overflow-hidden"
    >
      <template v-slot:header>
        <!-- Slot de la izquierda: Únicamente la flecha expandible con estilo propio -->
        <q-item-section avatar center class="q-pr-none" style="min-width: 40px; margin-left: 6px;">
          <q-icon 
            name="expand_more" 
            :color="knowledgeProgress.complete ? 'green-9' : 'orange-9'" 
            size="28px" 
            class="accordion-arrow-custom"
          />
        </q-item-section>
        <q-item-section>
          <div class="text-weight-bolder text-uppercase"
            :class="knowledgeProgress.complete ? 'text-green-9' : 'text-orange-9'"
            style="font-size: 13px; letter-spacing: .3px">
            Saberes y criterios — {{ knowledgeProgress.done }} de {{ knowledgeProgress.total }} secciones completas
          </div>
        </q-item-section>
      </template>

      <q-card flat square class="bg-grey-1 q-pa-sm">
        <q-card-section class="row q-col-gutter-md q-pa-sm">

          <!-- Saberes Conceptos y Principios -->
          <div class="col-12 col-md-4">
            <q-card flat bordered :class="displayKnowledge.concepts?.length ? 'border-filled' : 'border-empty'">
              <q-card-section class="q-py-sm">
                <div class="row items-center justify-between no-wrap">
                  <div class="row items-center q-gutter-x-xs">
                    <q-icon :name="displayKnowledge.concepts?.length ? 'check_circle' : 'radio_button_unchecked'"
                      :color="displayKnowledge.concepts?.length ? 'green-9' : 'grey-5'" size="18px" />
                    <div class="text-bold text-green-9 text-caption text-uppercase">Saberes Conceptos y Principios</div>
                  </div>
                  <div class="row items-center q-gutter-x-xs">
                    <q-badge v-if="displayKnowledge.concepts?.length" color="green-9"
                      :label="displayKnowledge.concepts.length" />
                     <q-btn flat round dense icon="add" size="md" color="grey-10" class="btn-plus-custom" @click="addListItem('processes', 'Añadir Proceso')" v-if="canEdit" />
                  </div>
                </div>
                <q-scroll-area style="height: 150px; max-height: 150px;" class="q-pr-sm q-mt-xs"
                  v-if="displayKnowledge.concepts?.length">
                  <div v-for="(s, idx) in displayKnowledge.concepts" :key="idx"
                    class="row items-center no-wrap q-my-xs">
                    <div class="col text-caption text-grey-9 text-uppercase">- {{ s }}</div>
                    <q-btn square flat round dense icon="edit" size="xs" color="blue-8"
                      @click="editListItem('conceptsAndPrinciples', idx, 'Editar Concepto')" v-if="canEdit" />
                    <q-btn square flat round dense icon="delete" size="xs" color="red-8"
                      @click="removeListItem('conceptsAndPrinciples', idx)" v-if="canEdit" />
                  </div>
                </q-scroll-area>
                <div class="text-caption text-orange-9 q-mt-sm" v-else>⚠ Falta definir</div>
              </q-card-section>
            </q-card>
          </div>

          <!-- Saberes de Proceso -->
          <div class="col-12 col-md-4">
            <q-card flat bordered :class="displayKnowledge.processes?.length ? 'border-filled' : 'border-empty'">
              <q-card-section class="q-py-sm">
                <div class="row items-center justify-between no-wrap">
                  <div class="row items-center q-gutter-x-xs">
                    <q-icon :name="displayKnowledge.processes?.length ? 'check_circle' : 'radio_button_unchecked'"
                      :color="displayKnowledge.processes?.length ? 'green-9' : 'grey-5'" size="18px" />
                    <div class="text-bold text-green-9 text-caption text-uppercase">Saberes de Proceso</div>
                  </div>
                  <div class="row items-center q-gutter-x-xs">
                    <q-badge v-if="displayKnowledge.processes?.length" color="green-9"
                      :label="displayKnowledge.processes.length" />
                     <q-btn flat round dense icon="add" size="md" color="grey-10" class="btn-plus-custom" @click="addListItem('processes', 'Añadir Proceso')" v-if="canEdit" />
                  </div>
                </div>
                <q-scroll-area style="height: 150px; max-height: 150px;" class="q-pr-sm q-mt-xs"
                  v-if="displayKnowledge.processes?.length">
                  <div v-for="(s, idx) in displayKnowledge.processes" :key="idx"
                    class="row items-center no-wrap q-my-xs">
                    <div class="col text-caption text-grey-9 text-uppercase">- {{ s }}</div>
                    <q-btn square flat round dense icon="edit" size="xs" color="blue-8"
                      @click="editListItem('processes', idx, 'Editar Proceso')" v-if="canEdit" />
                    <q-btn square flat round dense icon="delete" size="xs" color="red-8"
                      @click="removeListItem('processes', idx)" v-if="canEdit" />
                  </div>
                </q-scroll-area>
                <div class="text-caption text-orange-9 q-mt-sm" v-else>⚠ Falta definir</div>
              </q-card-section>
            </q-card>
          </div>

          <!-- Criterios de Evaluación -->
          <div class="col-12 col-md-4">
            <q-card flat bordered :class="displayKnowledge.criteria?.length ? 'border-filled' : 'border-empty'">
              <q-card-section class="q-py-sm">
                <div class="row items-center justify-between no-wrap">
                  <div class="row items-center q-gutter-x-xs">
                    <q-icon :name="displayKnowledge.criteria?.length ? 'check_circle' : 'radio_button_unchecked'"
                      :color="displayKnowledge.criteria?.length ? 'green-9' : 'grey-5'" size="18px" />
                    <div class="text-bold text-green-9 text-caption text-uppercase">Criterios de Evaluación</div>
                  </div>
                  <div class="row items-center q-gutter-x-xs">
                    <q-badge v-if="displayKnowledge.criteria?.length" color="green-9"
                      :label="displayKnowledge.criteria.length" />
                     <q-btn flat round dense icon="add" size="md" color="grey-10" class="btn-plus-custom" @click="addListItem('processes', 'Añadir Proceso')" v-if="canEdit" />
                  </div>
                </div>
                <q-scroll-area style="height: 150px; max-height: 150px;" class="q-pr-sm q-mt-xs"
                  v-if="displayKnowledge.criteria?.length">
                  <div v-for="(c, idx) in displayKnowledge.criteria" :key="idx"
                    class="row items-center no-wrap q-my-xs">
                    <div class="col text-caption text-grey-9 text-uppercase">- {{ c }}</div>
                    <q-btn square flat round dense icon="edit" size="xs" color="blue-8"
                      @click="editListItem('evaluationCriteria', idx, 'Editar Criterio')" v-if="canEdit" />
                    <q-btn square flat round dense icon="delete" size="xs" color="red-8"
                      @click="removeListItem('evaluationCriteria', idx)" v-if="canEdit" />
                  </div>
                </q-scroll-area>
                <div class="text-caption text-orange-9 q-mt-sm" v-else>⚠ Falta definir</div>
              </q-card-section>
            </q-card>
          </div>

          <!-- Perfil Académico Mínimo del Instructor (4.8.1) -->
          <div class="col-12 q-mt-sm">
            <q-card flat bordered :class="academicRequirementsList.length ? 'border-filled' : 'border-empty'">
              <q-card-section class="q-py-xs row items-center justify-between no-wrap">
                <div class="row items-center q-gutter-x-xs">
                  <q-icon :name="academicRequirementsList.length ? 'check_circle' : 'radio_button_unchecked'"
                    :color="academicRequirementsList.length ? 'green-9' : 'grey-5'" size="18px" />
                  <div class="text-bold text-green-9 text-caption text-uppercase">Requisitos Académicos</div>
                </div>
                <div class="row items-center q-gutter-x-xs">
                  <q-badge v-if="academicRequirementsList.length" color="green-9"
                    :label="academicRequirementsList.length" />
                  <q-btn flat round dense icon="add" size="md" color="grey-10" class="btn-plus-custom" @click="addListItem('processes', 'Añadir Proceso')" v-if="canEdit" />
                </div>
              </q-card-section>
              <q-card-section class="q-pt-none q-pb-sm">
                <div class="q-mt-xs" v-if="academicRequirementsList.length">
                  <div v-for="(req, idx) in academicRequirementsList" :key="idx"
                    class="row items-center no-wrap q-my-xs">
                    <div class="col text-caption text-grey-9 text-uppercase" style="white-space: pre-wrap;">• {{ req }}
                    </div>
                    <q-btn square flat round dense icon="edit" size="xs" color="blue-8"
                      @click="editAcademicRequirement(idx)" v-if="canEdit" />
                    <q-btn square flat round dense icon="delete" size="xs" color="red-8"
                      @click="removeAcademicRequirement(idx)" v-if="canEdit" />
                  </div>
                </div>
                <div class="text-caption text-orange-9 q-pl-md" v-else>⚠ Falta definir</div>
              </q-card-section>
            </q-card>
          </div>

          <q-separator class="col-12 q-my-sm" color="green-3" />

          <div v-for="(act, aIdx) in rap.pedagogicalActivities" :key="aIdx" class="col-12 row q-col-gutter-md">
            <div class="col-12 text-weight-bold text-green-10 q-mt-sm" v-if="rap.pedagogicalActivities.length > 1">
              ACTIVIDAD {{ aIdx + 1 }}: {{ act.description || act.observations || 'Sin descripción' }}
            </div>

            <div class="col-12 col-md-6">
              <q-card flat bordered :class="act.didacticStrategies?.length ? 'border-filled' : 'border-empty'">
                <q-card-section class="q-py-sm">
                  <div class="row items-center justify-between no-wrap">
                    <div class="row items-center q-gutter-x-xs">
                      <q-icon :name="act.didacticStrategies?.length ? 'check_circle' : 'radio_button_unchecked'"
                        :color="act.didacticStrategies?.length ? 'green-9' : 'grey-5'" size="18px" />
                      <div class="text-bold text-green-9 text-caption text-uppercase">Estrategias Didácticas</div>
                    </div>
                    <div class="row items-center q-gutter-x-xs">
                      <q-badge v-if="act.didacticStrategies?.length" color="green-9"
                        :label="act.didacticStrategies.length" />
                      <q-btn flat round dense icon="add" size="md" color="grey-10" class="btn-plus-custom" @click="addListItem('processes', 'Añadir Proceso')" v-if="canEdit" />
                    </div>
                  </div>
                  <div v-for="(s, idx) in act.didacticStrategies" :key="idx" class="row items-center no-wrap q-my-xs">
                    <div class="col text-caption text-grey-9 text-uppercase">- {{ s }}</div>  
                    <q-btn square flat round dense icon="edit" size="xs" color="blue-8"
                      @click="editListItem(act.didacticStrategies, idx, 'Editar Estrategia')"
                      v-if="store.isLeader || isMyActivity(act)" />
                    <q-btn square flat round dense icon="delete" size="xs" color="red-8"
                      @click="removeListItem(act.didacticStrategies, idx)" v-if="store.isLeader || isMyActivity(act)" />
                  </div>
                  <div class="text-caption text-orange-9 q-mt-xs" v-if="!act.didacticStrategies?.length">⚠ Falta definir
                  </div>
                </q-card-section>
              </q-card>
            </div>

            <div class="col-12 col-md-6">
              <q-card flat bordered :class="act.learningEvidences?.length ? 'border-filled' : 'border-empty'">
                <q-card-section class="q-py-sm">
                  <div class="row items-center justify-between no-wrap">
                    <div class="row items-center q-gutter-x-xs">
                      <q-icon :name="act.learningEvidences?.length ? 'check_circle' : 'radio_button_unchecked'"
                        :color="act.learningEvidences?.length ? 'green-9' : 'grey-5'" size="18px" />
                      <div class="text-bold text-green-9 text-caption text-uppercase">Evidencias de Aprendizaje</div>
                    </div>
                    <div class="row items-center q-gutter-x-xs">
                      <q-badge v-if="act.learningEvidences?.length" color="green-9"
                        :label="act.learningEvidences.length" />
                     <q-btn flat round dense icon="add" size="md" color="grey-10" class="btn-plus-custom" @click="addListItem('processes', 'Añadir Proceso')" v-if="canEdit" />
                    </div>
                  </div>
                  <div v-for="(e, idx) in act.learningEvidences" :key="idx" class="row items-center no-wrap q-my-xs">
                    <div class="col text-caption text-grey-9 text-uppercase">- {{ e }}</div>
                    <q-btn square flat round dense icon="edit" size="xs" color="blue-8"
                      @click="editListItem(act.learningEvidences, idx, 'Editar Evidencia')"
                      v-if="store.isLeader || isMyActivity(act)" />
                    <q-btn square flat round dense icon="delete" size="xs" color="red-8"
                      @click="removeListItem(act.learningEvidences, idx)" v-if="store.isLeader || isMyActivity(act)" />
                  </div>
                  <div class="text-caption text-orange-9 q-mt-xs" v-if="!act.learningEvidences?.length">⚠ Falta definir
                  </div>
                </q-card-section>
              </q-card>
            </div>

            <div class="col-12 col-md-6">
              <q-card flat bordered :class="act.environment?.type ? 'border-filled' : 'border-empty'">
                <q-card-section class="q-py-sm">
                  <div class="row items-center justify-between no-wrap">
                    <div class="row items-center q-gutter-x-xs">
                      <q-icon :name="act.environment?.type ? 'check_circle' : 'radio_button_unchecked'"
                        :color="act.environment?.type ? 'green-9' : 'grey-5'" size="18px" />
                      <div class="text-bold text-green-9 text-caption text-uppercase">Ambientes Tipificados</div>
                    </div>
                    <q-btn square flat round dense icon="edit" size="xs" color="blue-8"
                      @click="editEnvironmentType(act)" v-if="store.isLeader || isMyActivity(act)" />
                  </div>
                  <div class="text-caption text-grey-9 text-uppercase q-mt-xs" v-if="act.environment?.type">- {{
                    act.environment.type }}</div>
                  <div class="text-caption text-orange-9 q-mt-xs" v-else>⚠ Falta definir</div>
                </q-card-section>
              </q-card>
            </div>

            <div class="col-12 col-md-6">
              <q-card flat bordered :class="act.environment?.materials?.length ? 'border-filled' : 'border-empty'">
                <q-card-section class="q-py-sm">
                  <div class="row items-center justify-between no-wrap">
                    <div class="row items-center q-gutter-x-xs">
                      <q-icon :name="act.environment?.materials?.length ? 'check_circle' : 'radio_button_unchecked'"
                        :color="act.environment?.materials?.length ? 'green-9' : 'grey-5'" size="18px" />
                      <div class="text-bold text-green-9 text-caption text-uppercase">Materiales</div>
                    </div>
                    <div class="row items-center q-gutter-x-xs">
                      <q-badge v-if="act.environment?.materials?.length" color="green-9"
                        :label="act.environment.materials.length" />
                      <q-btn flat round dense icon="add" size="md" color="grey-10" class="btn-plus-custom" @click="addListItem('processes', 'Añadir Proceso')" v-if="canEdit" />
                    </div>
                  </div>
                  <div v-for="(m, idx) in act.environment?.materials" :key="idx"
                    class="row items-center no-wrap q-my-xs">
                    <div class="col text-caption text-grey-9 text-uppercase">- {{ m }}</div>
                    <q-btn square flat round dense icon="edit" size="xs" color="blue-8"
                      @click="editListItem(act.environment.materials, idx, 'Editar Material')"
                      v-if="store.isLeader || isMyActivity(act)" />
                    <q-btn square flat round dense icon="delete" size="xs" color="red-8"
                      @click="removeListItem(act.environment.materials, idx)"
                      v-if="store.isLeader || isMyActivity(act)" />
                  </div>
                  <div class="text-caption text-orange-9 q-mt-xs" v-if="!act.environment?.materials?.length">⚠ Falta
                    definir
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-expansion-item>

    <ActivityManager :rap="rap" :comp="comp" :instructors="instructors"
      @open-scheduler="$emit('open-scheduler', $event)" />

    <EditKnowledgeDialog v-model="editDialog.isOpen" :title="editDialog.title" :initial-value="editDialog.initialValue"
      @save="handleDialogSave" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { usePlanningStore } from '../../store/planning.store';
import { storeUser } from '../../store/users';
import { useQuasar } from 'quasar';
import ActivityManager from './ActivityManager.vue';
import EditKnowledgeDialog from './EditKnowledgeDialog.vue';

// ── Helpers para identificar si el usuario es el instructor de una actividad ──
const decodeTokenSafely = (token) => {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
    return JSON.parse(atob(padded));
  } catch (e) {
    return null;
  }
};

const _normalizeName = (name) => {
  return (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
};

const _isSameInstructor = (name1, name2) => {
  if (!name1 || !name2) return false;
  const n1 = _normalizeName(name1);
  const n2 = _normalizeName(name2);
  if (n1 === n2) return true;
  const words1 = n1.split(/\s+/).filter(w => w.length > 2);
  const words2 = n2.split(/\s+/).filter(w => w.length > 2);
  if (words1.length === 0 || words2.length === 0) return false;
  const match1 = words1.every(w => words2.includes(w));
  const match2 = words2.every(w => words1.includes(w));
  const firstTwo1 = words1.slice(0, 2).join(' ');
  const firstTwo2 = words2.slice(0, 2).join(' ');
  return match1 || match2 || (firstTwo1 && firstTwo2 && firstTwo1 === firstTwo2);
};

/**
 * Devuelve true si la actividad está confirmada y asignada al usuario actual.
 * Permite a los instructores ver sus propios botones de edición.
 */
const isMyActivity = (act) => {
  const userStore = storeUser();
  const token = userStore.token;
  if (!token) return false;
  const decoded = decodeTokenSafely(token);
  if (!decoded) return false;

  let instructorName = userStore.instructorData?.name || userStore.newConsult?.name || '';
  if (!instructorName && decoded.name) instructorName = decoded.name;
  if (!instructorName) return false;

  const sugg = act.suggestedInstructor || act.instructors;
  if (!sugg || !sugg.name) return false;
  const isAssigned = _isSameInstructor(sugg.name, instructorName);
  const isConfirmed = sugg.assignmentStatus === 'confirmed';
  return isAssigned && isConfirmed;
};

const canEdit = computed(() => {
  return store.isLeader || (props.rap.pedagogicalActivities && props.rap.pedagogicalActivities.some(act => isMyActivity(act)));
});

const syncChanges = (listOrFieldName) => {
  if (typeof listOrFieldName === 'string') {
    store.updateRAPFieldInStore(props.comp.code, props.rap.description, listOrFieldName, props.rap[listOrFieldName]);
  } else {
    const act = props.rap.pedagogicalActivities.find(a => {
      return a.didacticStrategies === listOrFieldName ||
        a.learningEvidences === listOrFieldName ||
        a.environment?.materials === listOrFieldName;
    });
    if (act) {
      store.updateActivityInStore(props.comp.code, props.rap.description, act.description, act);
    }
  }
};

const props = defineProps({
  rap: { type: Object, required: true },
  comp: { type: Object, required: true },
  rIdx: { type: Number, required: true },
  instructors: { type: Array, required: true }
});

defineEmits(['open-scheduler']);

const store = usePlanningStore();
const $q = useQuasar();

// actualizacion horas luis llanos 15-09-2026
const rapSuggestedHours = computed(() => {
  return store.getSuggestedHours(props.comp, props.rap).rapTotal;
});

const moveRap = async (direction) => {
  try {
    if (!store.planning) return;

    // 1. Encontrar la fase en el store
    const phaseIndex = store.planning.pedagogicalPlanning.content.findIndex(
      p => p.phase === store.selectedPhase
    );
    if (phaseIndex === -1) return;

    // 2. Encontrar la competencia en el store
    const compIndex = store.planning.pedagogicalPlanning.content[phaseIndex].competencies.findIndex(
      c => c.code === props.comp.code
    );
    if (compIndex === -1) return;

    const storeList = store.planning.pedagogicalPlanning.content[phaseIndex].competencies[compIndex].learningOutcomes;

    // 3. Encontrar los RAPs correspondientes en la lista real por descripción
    const currentRapDesc = props.rap.description;
    const targetRap = props.comp.learningOutcomes[props.rIdx + direction];
    if (!targetRap) return;

    const idxA = storeList.findIndex(r => r.description === currentRapDesc);
    const idxB = storeList.findIndex(r => r.description === targetRap.description);

    if (idxA === -1 || idxB === -1) return;

    $q.loading.show({ message: 'Reordenando...' });

    // Intercambiar en la lista real del store
    const temp = storeList[idxA];
    storeList[idxA] = storeList[idxB];
    storeList[idxB] = temp;

    // Guardar el borrador en la base de datos
    await store.saveDraft();
    $q.loading.hide();

    $q.notify({
      message: '¡Orden de Resultados actualizado!',
      color: 'green-9',
      icon: 'check_circle',
      position: 'top',
      timeout: 2000
    });
  } catch (error) {
    $q.loading.hide();
    console.error('Error al mover el RAP:', error);
    $q.notify({
      message: 'No se pudo actualizar el orden.',
      color: 'red-9',
      icon: 'error',
      position: 'top'
    });
  }
};

// Estado para el diálogo de edición personalizado
const editDialog = ref({
  isOpen: false,
  title: '',
  initialValue: '',
  onSave: null
});

// Fallback robusto y lógica de "Pool" distribuido para saberes y criterios
const displayKnowledge = computed(() => {
  // 1. Obtener los pools globales de la competencia (Source of Truth del nuevo extractor)
  const k = props.comp.knowledge || props.comp.Knowledge || props.comp.conocimientos || {};


  const globalPools = {
    conceptsAndPrinciples: k.conceptsAndPrinciples || k.conceptos_y_principios || k.conceptos || k.saberes || k['4.6.2'] || k.del_saber || k.conocimientos_del_saber || [],
    processes: k.processes || k.procesos || k.procedimientos || k['4.6.1'] || k.de_proceso || k.conocimientos_de_proceso || [],
    // Aceptamos cualquier variante de nombre que el backend pueda enviar
    evaluationCriteria: props.comp.evaluationCriteria || props.comp.criterios_de_evaluacion || props.comp['4.7'] || props.comp.criteria || []
  };

  // 2. Función para filtrar lo que debe ver este RA específico
  const filterList = (fieldNameInRAP) => {
    const globalPool = globalPools[fieldNameInRAP] || [];
    const localList = props.rap[fieldNameInRAP] || [];

    // Si el pool está vacío, retornar vacío
    if (globalPool.length === 0) return [];

    // Caso A: Hay prefijos específicos "RA X:" o "R.A. X:" en el pool global
    const prefix = `RA ${props.rIdx + 1}:`;
    const prefixAlt = `R.A. ${props.rIdx + 1}:`;
    const specific = globalPool.filter(item => {
      const upperItem = String(item).toUpperCase();
      return upperItem.includes(prefix) || upperItem.includes(prefixAlt);
    });
    if (specific.length > 0) return specific;

    // Caso B: Lógica de "Lo que se dejó en RAs anteriores se oculta aquí"
    const takenInPrevious = new Set();
    for (let i = 0; i < props.rIdx; i++) {
      const prevRap = props.comp.learningOutcomes[i];
      const prevList = prevRap[fieldNameInRAP] || [];

      // Si el RA anterior tiene una lista "limpiada" (menor que el pool), sus items están tomados
      if (prevList.length > 0 && prevList.length < globalPool.length) {
        prevList.forEach(item => takenInPrevious.add(String(item).trim()));
      }
    }

    // Si este RA tiene su propia lista definida (ya empezó limpieza), mostrar esa
    if (localList.length > 0 && localList.length < globalPool.length) {
      return localList;
    }

    // Si no, mostrar el pool filtrando lo de los anteriores
    return globalPool.filter(item => !takenInPrevious.has(String(item).trim()));
  };

  return {
    concepts: filterList('conceptsAndPrinciples'),
    processes: filterList('processes'),
    criteria: filterList('evaluationCriteria')
  };
});

// Función para inicializar la lista local antes de editar/borrar
const ensureAndGetList = (fieldName) => {
  const sourceMap = {
    'conceptsAndPrinciples': 'concepts',
    'processes': 'processes',
    'evaluationCriteria': 'criteria'
  };

  const currentDisplayed = displayKnowledge.value[sourceMap[fieldName]] || [];

  if (!props.rap[fieldName] || props.rap[fieldName].length === 0 || props.rap[fieldName].length >= currentDisplayed.length) {
    props.rap[fieldName] = [...currentDisplayed];
  }
  return props.rap[fieldName];
};

const handleDialogSave = async (data) => {
  if (editDialog.value.onSave) {
    await editDialog.value.onSave(data);
  }
};

const addListItem = (listOrFieldName, promptTitle) => {
  let list;
  if (typeof listOrFieldName === 'string') {
    list = ensureAndGetList(listOrFieldName);
  } else {
    list = listOrFieldName;
  }

  if (!list) return;

  editDialog.value = {
    isOpen: true,
    title: promptTitle,
    initialValue: '',
    onSave: async (data) => {
      list.push(data);
      syncChanges(listOrFieldName);
      await store.saveDraft();
      $q.notify({ message: 'Elemento añadido ✅', color: 'green-7', position: 'bottom-right' });
    }
  };
};

const editListItem = (listOrFieldName, index, promptTitle) => {
  let list;
  if (typeof listOrFieldName === 'string') {
    list = ensureAndGetList(listOrFieldName);
  } else {
    list = listOrFieldName;
  }

  editDialog.value = {
    isOpen: true,
    title: promptTitle,
    initialValue: list[index],
    onSave: async (data) => {
      list[index] = data;
      syncChanges(listOrFieldName);
      await store.saveDraft();
      $q.notify({ message: 'Elemento actualizado ✏️', color: 'blue-7', position: 'bottom-right' });
    }
  };
};

const removeListItem = async (listOrFieldName, index) => {
  let list;
  if (typeof listOrFieldName === 'string') {
    list = ensureAndGetList(listOrFieldName);
  } else {
    list = listOrFieldName;
  }

  list.splice(index, 1);
  syncChanges(listOrFieldName);
  await store.saveDraft(); // Guardado inmediato para reactividad
  $q.notify({ message: 'Elemento eliminado 🗑️', color: 'grey-7', position: 'bottom-right' });
};

const editEnvironmentType = (act) => {
  editDialog.value = {
    isOpen: true,
    title: 'Ambiente Tipificado',
    initialValue: act.environment?.type || '',
    onSave: async (data) => {
      if (!act.environment) {
        act.environment = { type: data, materials: [] };
      } else {
        // Rompemos la referencia para que no se cambie en todos lados si comparten el mismo objeto
        act.environment = { ...act.environment, type: data };
      }
      store.updateActivityInStore(props.comp.code, props.rap.description, act.description, act);
      await store.saveDraft();
      $q.notify({ message: 'Ambiente actualizado ✏️', color: 'blue-7', position: 'bottom-right' });
    }
  };
};

// Obtener el perfil académico como lista de líneas formateada y separada dinámicamente
const academicRequirementsList = computed(() => {
  let raw = props.comp.academicRequirements || '';

  // Agregar salto de línea antes de cada ALTERNATIVA o OPCIÓN para separarlas en viñetas
  raw = raw
    .replace(/(ALTERNATIVA\s+\d+|OPCI[ÓO]N\s+\d+)/gi, '\n$1')
    .replace(/;\s*/g, ';\n') // Separar también por punto y coma si existen
    .replace(/(\bTARJETA\s+PROFESIONAL)/gi, '\n$1'); // Separar la tarjeta profesional en su propia línea

  return raw
    .split('\n')
    .map(x => x.trim())
    .filter(x => x.length > 0);
});

const knowledgeProgress = computed(() => {
  const dk = displayKnowledge.value;
  const sections = [
    dk.concepts?.length > 0,
    dk.processes?.length > 0,
    dk.criteria?.length > 0,
    academicRequirementsList.value?.length > 0
  ];
  const done = sections.filter(Boolean).length;
  return { done, total: sections.length, complete: done === sections.length };
});

const addAcademicRequirement = () => {
  editDialog.value = {
    isOpen: true,
    title: 'Nuevo Requisito Académico',
    initialValue: '',
    onSave: async (data) => {
      if (!data.trim()) return;
      const currentList = [...academicRequirementsList.value];
      currentList.push(data.trim());
      props.comp.academicRequirements = currentList.join('\n');
      store.updateCompetenceFieldInStore(props.comp.code, 'academicRequirements', props.comp.academicRequirements);
      await store.saveDraft();
      $q.notify({ message: 'Requisito añadido ✅', color: 'green-7', position: 'bottom-right' });
    }
  };
};

const editAcademicRequirement = (index) => {
  const currentList = [...academicRequirementsList.value];
  editDialog.value = {
    isOpen: true,
    title: 'Editar Requisito Académico',
    initialValue: currentList[index],
    onSave: async (data) => {
      if (!data.trim()) return;
      currentList[index] = data.trim();
      props.comp.academicRequirements = currentList.join('\n');
      store.updateCompetenceFieldInStore(props.comp.code, 'academicRequirements', props.comp.academicRequirements);
      await store.saveDraft();
      $q.notify({ message: 'Requisito actualizado ✏️', color: 'blue-7', position: 'bottom-right' });
    }
  };
};

const removeAcademicRequirement = async (index) => {
  const currentList = [...academicRequirementsList.value];
  currentList.splice(index, 1);
  props.comp.academicRequirements = currentList.join('\n');
  store.updateCompetenceFieldInStore(props.comp.code, 'academicRequirements', props.comp.academicRequirements);
  await store.saveDraft();
  $q.notify({ message: 'Requisito eliminado 🗑️', color: 'grey-7', position: 'bottom-right' });
};
</script>

<style scoped>
.border-filled {
  border-left: 4px solid #2e7d32 !important;
}

.border-empty {
  border-left: 4px solid #f57c00 !important;
}

/* ======================================================== */
/* EFECTO HOVER: ELEVACIÓN SUTIL Y CAMBIO DE TONO (OSCURECIMIENTO) */
/* ======================================================== */

.accordion-header-custom {
  border-left: 1px solid #2e7d32;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), 
              filter 0.25s ease, 
              box-shadow 0.25s ease;
  cursor: pointer;
  will-change: transform;
}

/* Al pasar el mouse: baja un poquito, se oscurece sutilmente y muestra una sombra elegante */
.accordion-header-custom:hover {
  transform: translateY(4px);
  filter: brightness(0.95);
  box-shadow: 0 6px 15px -3px rgba(0, 0, 0, 0.1), 
              0 4px 6px -4px rgba(0, 0, 0, 0.05);
}

/* Animación exclusiva de rotación limpia para la flecha */
.accordion-arrow-custom {
  font-weight: 900 !important;
  stroke: currentColor;
  stroke-width: 1px;
  transition: transform 0.3s ease !important;
}

.accordion-arrow-custom.is-open {
  transform: rotate(180deg);
}
.q-expansion-item__toggle-icon {
  display: none !important;
}
.q-expansion-item--expanded .accordion-arrow-custom {
  transform: rotate(180deg);
}
</style>