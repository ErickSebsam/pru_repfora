<template>
  <div>
    <!-- ÁREA EDITABLE PARA EL INSTRUCTOR (ASIGNACIÓN) -->
    <q-card-section square class="q-mx-md q-mb-md q-pa-md border-green bg-white shadow-1" v-if="store.isLeader || isEditingOwnAct">
      <div class="text-weight-bold text-green-9 q-mb-md text-uppercase">
        {{ isEditingAct ? 'Modificar asignación de instructor y actividad' : 'Asignación de instructor y actividad' }}
      </div>

      <div class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-4">
          <q-select square outlined v-model="formState.instructor" :options="filteredInstructors" option-label="name"
            label="Instructor Sugerido" bg-color="white" dense use-input input-debounce="0" color="green-9"
            @filter="filterInstructors" :disable="!store.isLeader">
            <template v-slot:prepend><q-icon name="person" color="green-9" /></template>
          </q-select>
        </div>
        <div class="col-12 col-md-6">
          <q-input square outlined v-model="formState.newActivity"
            label="Descripción de la actividad (Sugerido por Instructor)" bg-color="white" dense color="green-9">
            <template v-slot:prepend><q-icon name="add_task" color="green-9" /></template>
          </q-input>
        </div>
        <div class="col-12 col-md-2 row items-center q-gutter-x-sm no-wrap">
          <q-btn square :class="isEditingAct ? 'bg-blue-9' : 'bg-green-9'"
            :label="isEditingAct ? 'ACTUALIZAR' : 'GUARDAR'" class="col text-bold text-white"
            @click="handleSaveActivity" unelevated />
          <q-btn v-if="isEditingAct" flat round square dense color="grey-7" icon="close" @click="cancelEditAct">
            <q-tooltip class="bg-grey-9">Cancelar edición</q-tooltip>
          </q-btn>
        </div>
      </div>

      <!-- Lista de actividades registradas -->
      <div class="q-mt-md" v-if="rap.pedagogicalActivities.length > 0">
        <q-list bordered separator square>
          <q-item v-for="(act, aIdx) in rap.pedagogicalActivities" :key="aIdx" square>
            <q-item-section>
              <div class="text-weight-bold">{{ act.description || act.observations || 'Actividad sin descripción' }}</div>
              <div class="text-caption text-grey-7" v-if="act.suggestedInstructor?.name || act.instructors?.name || (Array.isArray(act.instructors) && act.instructors.length > 0)">
                Instructor: {{ act.suggestedInstructor?.name || (Array.isArray(act.instructors) ? act.instructors.map(i => i.name).join(', ') : act.instructors?.name) }}
              </div>
              <div class="row items-center q-gutter-x-sm text-caption q-mt-xs">
                <span :class="(Number(act.hours?.direct) > 0) ? 'text-grey-9 text-weight-bold' : 'text-grey-6'">
                  Horas: {{ Number(act.hours?.direct) || 0 }}D / {{ Number(act.hours?.independent) || 0 }}I
                </span>
                <!-- actualizacion horas luis llanos 15-09-2026 -->
                <q-chip
                  v-if="!act.hours?.direct || act.hours.direct === 0"
                  outline
                  dense
                  color="green-9"
                  icon="lightbulb"
                  clickable
                  @click="applySuggestedHours(act)"
                  class="text-weight-bold cursor-pointer"
                  style="font-size: 11px;"
                >
                  Sugerido: {{ getSuggestedHoursForAct(act).direct }}h directas (Clic para usar)
                  <q-tooltip class="bg-green-9">
                    Sugerencia calculada según la etapa lectiva de la competencia (múltiplo de {{ getSuggestedHoursForAct(act).multiple }}h). Clic para asignar estas horas.
                  </q-tooltip>
                </q-chip>
                <q-badge v-else outline color="green-8" class="text-weight-medium" style="font-size: 10px;">
                  💡 Sugerido: {{ getSuggestedHoursForAct(act).direct }}h
                </q-badge>
              </div>
              <div class="text-caption text-green-9 text-weight-bold q-mt-xs"
                v-if="act.scheduleDetails && act.scheduleDetails.assignedDays && act.scheduleDetails.assignedDays.length > 0">
                <q-icon name="calendar_month" class="q-mr-xs" size="16px" />
                Fechas Asignadas: {{ act.scheduleDetails.assignedDays.join(', ') }}
              </div>
              <div class="text-caption text-grey-6 italic q-mt-xs" v-else>
                <q-icon name="calendar_today" class="q-mr-xs" size="16px" />
                Sin fechas asignadas aún
              </div>
            </q-item-section>
            <q-item-section side v-if="store.isLeader">
              <div class="row q-gutter-xs">

                <q-btn square flat round color="green-9" icon="calendar_month" size="sm"
                  @click="$emit('open-scheduler', { comp, rap, act })">
                  <q-tooltip class="bg-green-9 text-weight-bold">Programar fechas y horas</q-tooltip>
                </q-btn>

                <q-btn square flat round color="blue-8" icon="edit" size="sm"  :disable="act.isScheduledInCalendar"  @click="editActivity(act, aIdx)">
                  <q-tooltip class="bg-blue-8 text-weight-bold"> {{act.isScheduledInCalendar ? 'No se puede editar: Ya está programada en el calendario' : 'Editar instructor y descripción'}}</q-tooltip>
                </q-btn>

                <q-btn square flat round color="red-8" icon="delete" size="sm" :disable="act.isScheduledInCalendar" @click="confirmDeleteActivity(act, aIdx)">
                  <q-tooltip class="bg-red-8 text-weight-bold">{{ act.isScheduledInCalendar ? 'No se puede eliminar: ya está programada en el calendario' : 'Eliminar actividad' }}</q-tooltip>
                </q-btn>

              </div>
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </q-card-section>

    <!-- ÁREA DE LECTURA PARA EL INSTRUCTOR SUGERIDO -->
    <q-card-section square class="q-mx-md q-mb-md q-pa-md border-all bg-white shadow-1"
      v-if="!store.isLeader && !isEditingOwnAct && rap.pedagogicalActivities.length > 0">
      <div class="text-weight-bold text-green-9 q-mb-sm text-uppercase">
        Actividades Asignadas y Fechas
      </div>
      <q-list bordered separator square>
        <q-item v-for="(act, aIdx) in rap.pedagogicalActivities" :key="aIdx" square>
          <q-item-section>
            <div class="text-weight-bold text-grey-9">{{ act.description || act.observations || 'Actividad sin descripción' }}</div>
            <div class="text-caption text-grey-7" v-if="act.suggestedInstructor?.name || act.instructors?.name || (Array.isArray(act.instructors) && act.instructors.length > 0)">
              Instructor Responsable: <strong>{{ act.suggestedInstructor?.name || (Array.isArray(act.instructors) ? act.instructors.map(i => i.name).join(', ') : act.instructors?.name) }}</strong>
            </div>
            <div class="row items-center q-gutter-x-sm text-caption q-mt-xs">
              <span>Horas Directas: <strong>{{ Number(act.hours?.direct) || 0 }}h</strong></span>
              <!-- actualizacion horas luis llanos 15-09-2026 -->
              <q-badge outline color="green-8" class="text-weight-medium" style="font-size: 10px;">
                💡 Sugerido: {{ getSuggestedHoursForAct(act).direct }}h
              </q-badge>
            </div>

            <div class="text-caption text-green-9 text-weight-bold q-mt-xs"
              v-if="act.scheduleDetails && act.scheduleDetails.assignedDays && act.scheduleDetails.assignedDays.length > 0">
              <q-icon name="calendar_month" class="q-mr-xs" size="16px" />
              Fechas Asignadas por el Líder: {{ act.scheduleDetails.assignedDays.join(', ') }} (Jornada: {{
                act.scheduleDetails.shift === 'nocturna' ? 'Noche' :
                act.scheduleDetails.shift === 'mixta_manana' ? 'Mixta Mañana' :
                act.scheduleDetails.shift === 'mixta_manana_tarde' ? 'Mixta Mañana Tarde' : 'Mañana / Tarde' }})
            </div>
            <div class="text-caption text-grey-6 italic q-mt-xs" v-else>
              <q-icon name="calendar_today" class="q-mr-xs" size="16px" />
              Sin fechas asignadas aún
            </div>
          </q-item-section>

          <!-- Lápiz de edición: solo visible para el instructor asignado en su propia actividad -->
          <q-item-section side v-if="isMyOwnActivity(act)">
            <q-btn square flat round color="blue-8" icon="edit" size="sm" @click="editActivity(act, aIdx)">
              <q-tooltip class="bg-blue-8 text-weight-bold">Editar mi actividad</q-tooltip>
            </q-btn>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card-section>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { usePlanningStore } from '../../store/planning.store';
import { storeUser } from '../../store/users';
import { useQuasar } from 'quasar';

const props = defineProps({
  comp: { type: Object, required: true },
  rap: { type: Object, required: true },
  instructors: { type: Array, required: true }
});

defineEmits(['open-scheduler']);

const store = usePlanningStore();
const $q = useQuasar();

const formState = reactive({
  instructor: null,
  newActivity: ''
});

const filteredInstructors = ref(props.instructors);
const editingActIdx = ref(null);
const isEditingAct = ref(false);

// ── Helpers para identificar si la actividad pertenece al instructor activo ──
const _decodeToken = (token) => {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    return JSON.parse(atob(pad ? base64 + '='.repeat(4 - pad) : base64));
  } catch { return null; }
};

const _normInst = (name) =>
  (name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

const _sameInst = (a, b) => {
  if (!a || !b) return false;
  const na = _normInst(a), nb = _normInst(b);
  if (na === nb) return true;
  const wa = na.split(/\s+/).filter(w => w.length > 2);
  const wb = nb.split(/\s+/).filter(w => w.length > 2);
  return wa.length > 0 && wb.length > 0 &&
    (wa.every(w => wb.includes(w)) || wb.every(w => wa.includes(w)));
};

/** Retorna true si esta actividad está asignada y confirmada para el usuario actual */
const isMyOwnActivity = (act) => {
  const userStore = storeUser();
  const decoded = _decodeToken(userStore.token);
  if (!decoded) return false;
  const myName = userStore.instructorData?.name || userStore.newConsult?.name || decoded.name || '';
  if (!myName) return false;
  const sugg = act.suggestedInstructor || act.instructors;
  if (!sugg?.name) return false;
  return _sameInst(sugg.name, myName) && sugg.assignmentStatus === 'confirmed';
};

/** true cuando el instructor no-líder está editando su propia actividad */
const isEditingOwnAct = computed(() =>
  !store.isLeader &&
  isEditingAct.value &&
  editingActIdx.value !== null &&
  !!props.rap.pedagogicalActivities[editingActIdx.value] &&
  isMyOwnActivity(props.rap.pedagogicalActivities[editingActIdx.value])
);

const normalize = (text) => {
  return (text || '')
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

const filterInstructors = (val, update) => {
  if (val === '') {
    update(() => {
      filteredInstructors.value = props.instructors;
    });
    return;
  }
  update(() => {
    const needle = normalize(val);
    filteredInstructors.value = props.instructors.filter(
      v => normalize(v.name).indexOf(needle) > -1
    );
  });
};

const handleSaveActivity = async () => {
  // Para instructores no-líderes editando su propia actividad,
  // el selector está deshabilitado, no se valida.
  if (!formState.instructor && !isEditingOwnAct.value) {
    $q.notify({ message: 'Debe seleccionar un instructor sugerido', color: 'red-8' });
    return;
  }

  if (isEditingAct.value && editingActIdx.value !== null) {
    const act = props.rap.pedagogicalActivities[editingActIdx.value];
    if (act) {
      const originalDescription = act.description || '';
      act.description = formState.newActivity || '';
      
      act.suggestedInstructor = {
        id: formState.instructor?._id || act.suggestedInstructor?.id,
        name: formState.instructor?.name || act.suggestedInstructor?.name,
        assignmentStatus: act.suggestedInstructor?.assignmentStatus || 'pending'
      };

      // EXTRA FIX: Sincronizar el objeto de actividad actualizado en el store
      store.updateActivityInStore(props.comp.code, props.rap.description, originalDescription, act);
    }
    isEditingAct.value = false;
    editingActIdx.value = null;
    $q.notify({ message: 'Asignación actualizada con éxito ✅', color: 'blue-9' });
  } else {
    const newAct = {
      description: formState.newActivity || '',
      suggestedInstructor: {
        id: formState.instructor._id,
        name: formState.instructor.name,
        assignmentStatus: 'pending'
      },
      hours: { direct: 0, independent: 0 }
    };
    store.addActivityToRAP(props.comp.code, props.rap.description, newAct);
    $q.notify({ message: 'Asignación registrada ✅', color: 'green-9' });
  }

  await store.saveDraft();
  formState.newActivity = '';
};

const editActivity = (act, aIdx) => {
  formState.newActivity = act.description || '';
  
  const instructorId = act.suggestedInstructor?.id || act.instructors?.id;
  const instructorName = act.suggestedInstructor?.name || (Array.isArray(act.instructors) ? act.instructors[0]?.name : act.instructors?.name);
  
  let found = null;

  // 1. Intentar match por ID exacto (_id)
  if (instructorId) {
    found = props.instructors.find(i => i._id === instructorId || String(i._id) === String(instructorId));
  }
  
  // 2. Fallback: Match inteligente por nombre
  if (!found && instructorName) {
    const needle = normalize(instructorName);
    found = props.instructors.find(i => {
      const dbName = normalize(i.name);
      return dbName.includes(needle) || needle.includes(dbName);
    });
  }

  // 3. Último recurso: construir objeto mínimo desde los datos de la actividad
  // (cubre el caso del instructor no-líder cuyo selector está deshabilitado)
  if (!found) {
    const sugg = act.suggestedInstructor || act.instructors;
    if (sugg && sugg.name) {
      found = { _id: sugg.id || sugg._id || '', name: sugg.name };
    }
  }

  // 4. Resetear filtro y asignar el objeto encontrado
  filteredInstructors.value = props.instructors;
  formState.instructor = found || null;
  
  isEditingAct.value = true;
  editingActIdx.value = aIdx;
};

const cancelEditAct = () => {
  formState.newActivity = '';
  isEditingAct.value = false;
  editingActIdx.value = null;
};

const confirmDeleteActivity = (act, aIdx) => {
  const nombre = act.description || act.observations || 'esta actividad';
  $q.dialog({
    title: 'Eliminar Actividad',
    message: '¿Estás seguro de que deseas eliminar <b>"${nombre}"</b>? Esta acción no se puede deshacer.',
    html: true,
    ok: { color: 'green-10', label: 'ELIMINAR' },
    cancel: { color: 'grey-8', flat: true, label: 'CANCELAR' },
    persistent: true
  }).onOk(async () => {
    await deleteActivity(aIdx);
  });
};

const deleteActivity = async (aIdx) => {
  store.deleteActivityFromStore(props.comp.code, props.rap.description, aIdx);
  await store.saveDraft();
  $q.notify({ message: 'Actividad eliminada 🗑️', color: 'orange-9' });
};

// actualizacion horas luis llanos 15-09-2026
const getSuggestedHoursForAct = (act) => {
  return store.getSuggestedHours(props.comp, props.rap, act);
};

// actualizacion horas luis llanos 15-09-2026
const applySuggestedHours = async (act) => {
  const sugg = getSuggestedHoursForAct(act);
  if (!act.hours) act.hours = { direct: 0, independent: 0 };
  const originalDesc = act.description || '';
  act.hours.direct = sugg.direct;
  store.updateActivityInStore(props.comp.code, props.rap.description, originalDesc, act);
  await store.saveDraft();
  $q.notify({
    message: `Horas sugeridas aplicadas: ${sugg.direct}h directas. Puedes cambiarlas en el calendario según tu necesidad.`,
    color: 'green-9',
    icon: 'lightbulb',
    position: 'top',
    timeout: 3500
  });
};
</script>

<style scoped>
.border-green {
  border: 1px solid #2e7d32;
}

.border-all {
  border: 1px solid #e0e0e0;
}
</style>
