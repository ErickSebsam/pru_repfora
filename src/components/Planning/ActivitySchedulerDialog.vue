<template>
  <q-dialog v-model="isOpen" persistent square>
    <ScheduleCalendar v-if="isOpen" :initial-hours="schedulerHours" :activity-label="schedulerLabel"
      :current-activity="schedulerContext?.act" @close="isOpen = false" @confirm="handleScheduleConfirm" />
  </q-dialog>

  <!-- Límite de Horas Modal -->
  <q-dialog v-model="showLimitModal" persistent square>
    <q-card style="width: 500px; max-width: 90vw;" class="shadow-10" square>
      <q-card-section class="bg-red-9 q-pa-md border-bottom row items-center q-gutter-sm">
        <q-icon name="report_problem" size="32px" color="white" />
        <div class="text-h6 text-white text-weight-bolder">Límite de Horas Superado</div>
      </q-card-section>
      
      <q-card-section class="q-pa-md text-body1">
        <div class="q-mb-md">No se puede guardar la programación porque excede las horas máximas de la competencia.</div>
        
        <div class="bg-green-1 q-pa-md rounded-borders q-mb-md" style="border-radius: 0 !important;">
          <div class="row justify-between q-mb-sm">
            <span class="text-green-10 text-weight-medium">Horas permitidas:</span>
            <span class="text-weight-bold text-green-10">{{ limitModalData.permitidas }}h</span>
          </div>
          <div class="row justify-between q-mb-sm">
            <span class="text-green-10 text-weight-medium">Horas que intenta asignar:</span>
            <span class="text-weight-bold text-orange-9">{{ limitModalData.asignadas }}h</span>
          </div>
          <q-separator class="q-my-sm" color="green-2" />
          <div class="row justify-between">
            <span class="text-weight-bold text-green-10">Exceso:</span>
            <span class="text-weight-bold text-red-10">{{ limitModalData.exceso }}h</span>
          </div>
        </div>
        
        <div class="text-caption text-grey-8">Por favor, reduzca las horas o modifique las sesiones en el calendario para continuar.</div>
      </q-card-section>
      
      <q-card-actions align="right" class="q-pa-md">
        <q-btn color="red-9" label="Entendido, corregir" class="text-weight-bold" unelevated square v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- Conflicto de Horario Modal -->
  <q-dialog v-model="showConflictModal" persistent square>
    <q-card style="width: 500px; max-width: 90vw;" class="shadow-10" square>
      <q-card-section class="bg-red-9 q-pa-md border-bottom row items-center q-gutter-sm">
        <q-icon name="report_problem" size="32px" color="white" />
        <div class="text-h6 text-white text-weight-bolder">Conflicto de Horario</div>
      </q-card-section>
      
      <q-card-section class="q-pa-md text-body1">
        <div class="q-mb-md">No se puede guardar la programación porque el instructor ya tiene asignaciones en el mismo horario:</div>
        <div class="bg-red-1 q-pa-md rounded-borders q-mb-md text-caption text-red-10" style="border-radius: 0 !important;" v-html="conflictModalData.conflictMsg"></div>
        <div class="text-caption text-grey-8">Por favor, asigne otros días o cambie de instructor para continuar.</div>
      </q-card-section>
      
      <q-card-actions align="right" class="q-pa-md">
        <q-btn color="red-9" label="Entendido, corregir" class="text-weight-bold" unelevated square @click="handleConflictResolve(false)" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useQuasar } from 'quasar';
import { usePlanningStore } from '../../store/planning.store';
import { InstructorService } from '../../services/instructor.service';
import ScheduleCalendar from '../PlanningCalendar/ScheduleCalendar.vue';

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  schedulerHours: { type: Object, required: true },
  schedulerLabel: { type: String, required: true },
  schedulerContext: { type: Object, default: null }
});

const emit = defineEmits(['update:modelValue']);

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const store = usePlanningStore();
const $q = useQuasar();

// Modal States
const showLimitModal = ref(false);
const limitModalData = ref({ permitidas: 0, asignadas: 0, exceso: 0 });

const showConflictModal = ref(false);
const conflictModalData = ref({ conflictMsg: '' });
let conflictResolver = null;

const handleConflictResolve = (decision) => {
  showConflictModal.value = false;
  if (conflictResolver) {
    conflictResolver(decision);
    conflictResolver = null;
  }
};

// ESTA ES LA FUNCIÓN QUE COMENTA EL BOTÓN "CONFIRMAR" DEL CALENDARIO
const handleScheduleConfirm = async (data) => {
  const { comp, act } = props.schedulerContext;

  if (!comp || !act) {
    console.error("Falta el contexto de la competencia o actividad");
    $q.notify({ message: 'Error interno: falta el contexto de la actividad. Por favor cierre y vuelva a abrir el calendario.', color: 'red-8', icon: 'error' });
    return;
  }

  // 1. Regla R1: Bloqueo Estricto por Exceso de Horas en la Competencia
  const progress = store.getCompetenceProgress(comp);
  const alreadyAssignedOtherActs = progress.assigned - (act.hours?.direct || 0) - (act.hours?.independent || 0);
  const newTotal = alreadyAssignedOtherActs + Number(data.hours.direct) + Number(data.hours.independent);

  if (newTotal > comp.totalCompetenceHours) {
    const horasExcedidas = newTotal - comp.totalCompetenceHours;

    limitModalData.value = {
      permitidas: comp.totalCompetenceHours,
      asignadas: newTotal,
      exceso: horasExcedidas
    };
    showLimitModal.value = true;

    return; // 🔥 BLOQUEO TOTAL: Frena el flujo aquí y no deja pasar
  }

  // 2. Regla R4: Detección de Conflictos de Horario del Instructor
  $q.loading.show({ message: 'Verificando disponibilidad del instructor...' });
  try {
    const dates = data.sessions.map(s => s.fecha);
    const instructorId = act.suggestedInstructor?.id || act.instructors?.id;
    const currentFiche = store.planning?.pedagogicalPlanning?.fiche;

    if (instructorId && dates.length > 0) {
      const availability = await InstructorService.checkAvailability(
        instructorId,
        dates,
        data.shift,
        currentFiche,
        data.tstart,
        data.tend
      );

      if (availability.hasConflict) {
        $q.loading.hide();

        const conflictMsg = availability.conflicts.map(c =>
          `• Ficha ${c.fiche}: ${c.activity} (Días: ${c.conflictingDays.join(', ')})`
        ).join('<br>');

        conflictModalData.value = { conflictMsg };

        const proceedConflict = await new Promise(resolve => {
          conflictResolver = resolve;
          showConflictModal.value = true;
        });
        if (!proceedConflict) return;
      }
    }
  } catch (error) {
    console.error('Error verificando disponibilidad:', error);
    $q.notify({ message: 'No se pudo verificar la disponibilidad del instructor. Se guardará de todas formas, pero revise posibles cruces manualmente.', color: 'orange-8', icon: 'warning', timeout: 6000 });
  } finally {
    $q.loading.hide();
  }

  saveActivitySchedule(data);
};

const saveActivitySchedule = async (data) => {
  // Extraemos comp, rap y act del contexto recibido
  const { comp, rap, act } = props.schedulerContext;

  const updatedAct = {
    ...act,
    hours: {
      direct: Number(data.hours.direct),
      independent: Number(data.hours.independent)
    },
    scheduleDetails: {
      assignedDays: data.sessions.map(s => s.fecha),
      shift: data.shift,
      tstart: data.tstart,
      tend: data.tend,
      vacation: data.vacation ? { ...data.vacation } : null,
      startDate: data.startDate,
      selectedDays: data.selectedDays
    }
  };

  // Mutar localmente por si acaso la UI depende de la referencia actual
  act.hours = updatedAct.hours;
  act.scheduleDetails = updatedAct.scheduleDetails;

  // 🔥 SINCRONIZAR CON EL STORE DE PINIA 🔥
  store.updateActivityInStore(comp.code, rap.description, act.description, updatedAct);

  // Ahora sí, guardamos el borrador con los datos reales en el backend
  await store.saveDraft();
  isOpen.value = false;
  $q.notify({ message: 'Programación guardada en base de datos ✅', color: 'green-9' });
};
</script>

