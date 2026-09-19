<template>
  <div>
    <BtnBack route="/extract" />

    <HeaderLayout title="PLANEACIÓN PEDAGÓGICA AUTOMÁTICA" />

    <!-- Barra de acciones superior -->
    <PlanningActionBar :is-synced="!!store.planning" :is-leader="store.isLeader" :has-template="hasTemplate"
      @save-template="handleSaveTemplate" @import-template="handleImportTemplate" @clear-plan="handleClearPlan"
      @export-excel="exportPlanningToExcel(store.planning?.pedagogicalPlanning, $q)" @show-preview="showPreview = true"
      @seleccionarAmbiente="handleSeleccionarAmbiente" />

    <!-- TABS PARA FASES -->
    <q-tabs v-model="store.selectedPhase" class="q-mx-lg text-weight-bolder row q-mb-md" dense square align="justify"
      active-color="lime-2" active-bg-color="green-9" indicator-color="black">
      <q-tab v-for="phase in store.phaseCounts" :key="phase.id" :name="phase.id" class="text-green-9 bg-white"
        :icon="phase.icon" square :label="$q.screen.lt.sm ? '' : `${phase.label} (${phase.count})`"
        @click="store.setPhase(phase.id)" />
    </q-tabs>

    <q-tab-panels v-model="store.selectedPhase" keep-alive>
      <q-tab-panel v-for="phase in store.phaseCounts" :key="phase.id" :name="phase.id" class="q-px-lg">

        <!-- Búsqueda -->
        <div class="row q-gutter-sm q-mb-md justify-end">
          <q-input v-model="store.searchQuery" label="Buscar por código de competencia..." outlined square dense
            clearable style="width: 350px">
            <template v-slot:prepend>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>

        <!-- Tarjetas de Competencia agrupadas por Actividad de Proyecto -->
        <div v-if="groupedCompetenciesByAP.length > 0">
          <div v-for="group in groupedCompetenciesByAP" :key="group.projectActivity" class="q-mb-xl">
            <!-- Cabecera simple de la Actividad de Proyecto -->
            <div class="q-py-sm q-px-md bg-grey-2 border-left-green q-mb-md"
              style="border-left: 4px solid #2e7d32; border-radius: 4px;">
              <div class="text-overline text-green-9 text-bold" style="font-size: 10px; letter-spacing: 1px;">ACTIVIDAD
                DE
                PROYECTO</div>
              <div class="text-subtitle1 text-grey-9 text-weight-bold" style="line-height: 1.2;">
                {{ group.projectActivity }}
              </div>
            </div>

            <!-- Listado de tarjetas de esta AP -->
            <div class="q-gutter-y-md">
              <CompetenceCard v-for="(comp, cIdx) in group.competencies" :key="comp.code + '-' + group.projectActivity"
                :comp="comp" :instructors="instructors" :c-idx="cIdx" :total-comps="group.competencies.length"
                @open-scheduler="handleOpenScheduler"
                @move-competence="direction => handleMoveCompetence(group.competencies, cIdx, direction)" />
            </div>
          </div>
        </div>

        <div v-else-if="!loading" class="text-center q-pa-xl">
          <q-icon name="search_off" size="64px" color="grey-4" />
          <div class="text-grey-6 q-mt-md" style="font-size: 16px">
            No se encontraron competencias para esta fase
          </div>
        </div>

      </q-tab-panel>
    </q-tab-panels>

    <!-- Dialog: Programar Calendario (Validaciones incluidas internamente) -->
    <ActivitySchedulerDialog v-model="showScheduler" :scheduler-hours="schedulerHours" :scheduler-label="schedulerLabel"
      :scheduler-context="schedulerContext" />

    <!-- Dialog: Previsualizar Programación Global -->
    <q-dialog v-model="showPreview" transition-show="scale" transition-hide="scale"
      content-class="custom-preview-dialog" square>
      <ProgramPreviewModal />
    </q-dialog>


    <!-- Spinner de carga -->
    <q-inner-loading :showing="store.loading" color="green-9">
      <q-spinner-dots size="50px" color="green-9" />
      <div class="text-green-9 q-mt-sm text-weight-bold">Cargando planeación...</div>
    </q-inner-loading>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePlanningStore } from '../store/planning.store';
import { InstructorService } from '../services/instructor.service';
import { useQuasar } from 'quasar';
import BtnBack from '../layouts/btnBackLayout.vue';
import HeaderLayout from '../layouts/headerViewsLayout.vue';
import ProgramPreviewModal from '../components/ProgramPreviewModal.vue';
import CompetenceCard from '../components/Planning/CompetenceCard.vue';
import PlanningActionBar from '../components/Planning/PlanningActionBar.vue';
import ActivitySchedulerDialog from '../components/Planning/ActivitySchedulerDialog.vue';

import { exportPlanningToExcel } from '../services/exportPlanningExcel.js';
import { storeUser } from '../store/users';

const route = useRoute();
const router = useRouter();
const store = usePlanningStore();
const userStore = storeUser();
const $q = useQuasar();

// Agrupar competencias y resultados por su Actividad de Proyecto (AP)
const groupedCompetenciesByAP = computed(() => {
  const comps = store.filteredCompetencies || [];
  const groups = {};

  comps.forEach(comp => {
    (comp.learningOutcomes || []).forEach(rap => {
      const ap = (rap.projectActivity || '').trim() || 'ACTIVIDAD GENERAL DE LA FASE';
      
      if (!groups[ap]) {
        groups[ap] = {
          projectActivity: ap,
          competencies: [] // Usamos un arreglo para mantener el orden exacto
        };
      }

      // Buscar si la competencia ya existe en esta AP
      let existingComp = groups[ap].competencies.find(c => c.code === comp.code);
      if (!existingComp) {
        existingComp = {
          ...comp,
          learningOutcomes: []
        };
        groups[ap].competencies.push(existingComp);
      }
      
      existingComp.learningOutcomes.push(rap);
    });
  });

  return Object.values(groups).map(g => {
    return {
      projectActivity: g.projectActivity,
      competencies: g.competencies
    };
  }).sort((a, b) => {
    return a.projectActivity.localeCompare(b.projectActivity, undefined, { numeric: true, sensitivity: 'base' });
  });
});

// --- Lógica de Plantillas ---
const hasTemplate = ref(false);
const savedTemplate = ref(null);

const handleSaveTemplate = async () => {
  if (!store.planning) return;

  $q.dialog({
    title: '💾 Guardar Planilla del Programa',
    message: `¿Estás seguro de que deseas guardar la planeación actual como la planilla oficial del programa?<br><br>Esto servirá de plantilla de sugerencia para cualquier otra ficha de este programa en el futuro.`,
    html: true,
    ok: { color: 'green-9', label: 'GUARDAR' },
    cancel: { color: 'grey-8', flat: true, label: 'CANCELAR' },
    persistent: true
  }).onOk(async () => {
    $q.loading.show({ message: 'Guardando planilla de programa...' });
    try {
      const savedBy = userStore.email || 'Instructor';
      await store.savePlanningTemplate(savedBy);
      $q.loading.hide();
      $q.notify({ message: '¡Planilla guardada con éxito! 💾', color: 'green-9', icon: 'check_circle' });
    } catch (error) {
      $q.loading.hide();
      $q.notify({ message: 'Error al guardar la planilla', color: 'red-9', icon: 'error' });
    }
  });
};

const handleImportTemplate = async () => {
  if (!savedTemplate.value) return;
  $q.loading.show({ message: 'Importando planilla...' });
  try {
    await store.applyPlanningTemplate(savedTemplate.value);
    $q.loading.hide();
    $q.notify({ message: 'Plantilla aplicada con éxito 🚀', color: 'green-9', icon: 'stars' });
  } catch (error) {
    $q.loading.hide();
    $q.notify({ message: 'Error al importar planilla', color: 'red-9', icon: 'error' });
  }
};

const instructors = ref([]);
const loading = ref(false);

const showScheduler = ref(false);
const schedulerHours = ref({ direct: 0, independent: 0 });
const schedulerLabel = ref('');
const schedulerContext = ref(null);
const showPreview = ref(false);

const handleClearPlan = () => {
  store.clearPlan();
  router.push({ name: 'extract' });
};

const handleSeleccionarAmbiente = (ambiente) => {
  store.setGlobalEnvironment(ambiente.name);
  $q.notify({
    message: `Ambiente asignado a todas las competencias: ${ambiente.name}`,
    color: 'green-9',
    icon: 'room',
    position: 'top-right'
  });
};

// actualizacion horas luis llanos 15-09-2026
const handleOpenScheduler = (payload) => {
  const { comp, rap, act } = payload;
  const suggested = store.getSuggestedHours(comp, rap, act);
  const currentDirect = Number(act.hours?.direct) || 0;
  schedulerHours.value = {
    direct: currentDirect,
    independent: Number(act.hours?.independent) || 0,
    suggestedDirect: suggested.direct,
    multiple: suggested.multiple
  };
  schedulerLabel.value = act.description;
  schedulerContext.value = { comp, rap, act };
  showScheduler.value = true;
};

// Verificar si la planeación está en su estado inicial (vacía)
const isPlanningEmpty = (planning) => {
  const content = planning?.pedagogicalPlanning?.content || [];
  if (content.length === 0) return true;

  for (const phase of content) {
    const competencies = phase.competencies || [];
    for (const comp of competencies) {
      const raps = comp.learningOutcomes || [];
      for (const rap of raps) {
        const acts = rap.pedagogicalActivities || [];
        // Si hay más de una actividad, o si la única tiene descripción real, instructor o horas, no está vacía
        if (acts.length > 1) return false;
        if (acts.length === 1) {
          const act = acts[0];
          const hasDesc = act.description && act.description !== 'Actividad sin descripción' && act.description.trim() !== '';
          const hasInst = act.suggestedInstructor?.id || act.instructors?.id;
          const hasHours = (Number(act.hours?.direct) || 0) > 0 || (Number(act.hours?.independent) || 0) > 0;
          if (hasDesc || hasInst || hasHours) {
            return false;
          }
        }
      }
    }
  }
  return true;
};

onMounted(async () => {
  const fiche = route.query.fiche;
  if (fiche) {
    loading.value = true;
    try {
      await store.loadPlanning(fiche);
      if (store.planning) {
        const programCode = store.planning.pedagogicalPlanning.metadata.programCode;
        savedTemplate.value = await store.fetchPlanningTemplate(programCode);
        hasTemplate.value = !!savedTemplate.value;

        // Sugerir importación automática si hay plantilla y la ficha está vacía
        if (hasTemplate.value && isPlanningEmpty(store.planning)) {
          const isDismissed = sessionStorage.getItem(`template_prompt_dismissed_${fiche}`) === 'true';
          if (!isDismissed) {
            // Registrar descarte inmediato para que no salte al recargar/navegar
            sessionStorage.setItem(`template_prompt_dismissed_${fiche}`, 'true');

            $q.dialog({
              title: '✨ Plantilla Oficial Encontrada',
              message: `Se detectó una plantilla guardada para el programa <b>${savedTemplate.value.programName || ''}</b>.<br><br>¿Deseas aplicarla automáticamente a esta ficha para cargar todas las actividades de aprendizaje?`,
              html: true,
              ok: { color: 'green-9', label: 'SÍ, APLICAR PLANTILLA' },
              cancel: { color: 'grey-7', flat: true, label: 'NO, EMPEZAR DE CERO' },
              persistent: true
            }).onOk(async () => {
              $q.loading.show({ message: 'Importando plantilla...' });
              try {
                const res = await store.applyPlanningTemplate(savedTemplate.value);
                $q.loading.hide();
                if (res) {
                  $q.notify({ message: '¡Plantilla aplicada con éxito! 🚀', color: 'green-9', icon: 'stars' });
                } else {
                  $q.notify({ message: 'Error al aplicar la plantilla', color: 'red-9', icon: 'error' });
                }
              } catch (error) {
                $q.loading.hide();
                $q.notify({ message: 'Error al aplicar la plantilla', color: 'red-9', icon: 'error' });
              }
            });
          }
        }
      }
    } catch (e) {
      if (e.message === 'PLANNING_NOT_FOUND' || e.response?.status === 404) {
        $q.dialog({
          title: '🚫 Ficha no encontrada',
          message: `La ficha <b>${fiche}</b> no existe en la base de datos. Realice la extracción primero.`,
          html: true,
          ok: { color: 'green-9', label: 'IR A EXTRACCIÓN' },
          persistent: true
        }).onOk(() => {
          router.push({ name: 'extract' });
        });
      }
    } finally {
      loading.value = false;
    }
  }

  try {
    const instList = await InstructorService.getInstructors();
    instructors.value = instList;
  } catch (e) {
    console.error('Error cargando instructores:', e);
    $q.notify({ message: 'No se pudo cargar la lista de instructores. Algunas asignaciones pueden no estar disponibles.', color: 'orange-8', icon: 'warning', timeout: 5000 });
  }
});

const handleMoveCompetence = async (competenciesList, currentIndex, direction) => {
  try {
    if (!store.planning) return;

    const targetIndex = currentIndex + direction;
    const compCode = competenciesList[currentIndex].code;
    const targetCompCode = competenciesList[targetIndex].code;

    // 1. Encontrar la fase en el store
    const phaseIndex = store.planning.pedagogicalPlanning.content.findIndex(
      p => p.phase === store.selectedPhase
    );
    if (phaseIndex === -1) return;

    const storeList = store.planning.pedagogicalPlanning.content[phaseIndex].competencies;

    // 2. Encontrar los índices reales en el listado del store
    const idxA = storeList.findIndex(c => c.code === compCode);
    const idxB = storeList.findIndex(c => c.code === targetCompCode);

    if (idxA === -1 || idxB === -1) return;

    $q.loading.show({ message: 'Reordenando competencias...' });

    // Intercambiar posiciones
    const temp = storeList[idxA];
    storeList[idxA] = storeList[idxB];
    storeList[idxB] = temp;

    // Guardar los cambios en la base de datos
    await store.saveDraft();
    $q.loading.hide();

    $q.notify({
      message: '¡Orden de Competencias actualizado!',
      color: 'green-9',
      icon: 'check_circle',
      position: 'top',
      timeout: 2000
    });
  } catch (error) {
    $q.loading.hide();
    console.error('Error al mover competencia:', error);
    $q.notify({
      message: 'No se pudo actualizar el orden de las competencias.',
      color: 'red-9',
      icon: 'error',
      position: 'top'
    });
  }
};
</script>

<style>
.custom-preview-dialog .q-dialog__inner>div {
  max-width: 1300px !important;
  width: 95vw !important;
}
</style>
