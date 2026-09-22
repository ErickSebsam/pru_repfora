<template>
  <div>
    <!-- ÁREA EDITABLE PARA EL INSTRUCTOR (ASIGNACIÓN) -->
    <q-card-section square class="q-mx-md q-mb-md q-pa-lg border-green bg-white shadow-1" v-if="store.isLeader">
      <div class="row items-center justify-between" style="margin-bottom: 28px;">
        <div class="text-weight-bold text-green-9 text-uppercase">
          Asignación de instructor y actividad
        </div>
        <q-btn unelevated square color="green-9" icon="add" label="Nueva asignación" class="text-weight-bold q-px-md q-mb-sm" @click="openCreateDialog" />
      </div>

      <!-- Lista de actividades registradas -->
      <div class="q-mt-lg" v-if="rap.pedagogicalActivities.length > 0">
        <div class="q-gutter-y-lg">
          <q-card v-for="(act, aIdx) in rap.pedagogicalActivities" :key="aIdx" flat bordered square class="activity-card">

            <!-- Encabezado de la tarjeta: etiqueta "Actividad #N" + íconos de acción -->
            <div class="row items-center justify-between activity-card__header q-px-md q-py-sm">
              <span class="text-caption text-weight-bold text-green-9 text-uppercase">
                Actividad #{{ aIdx + 1 }}
              </span>
              <div class="row q-gutter-sm" v-if="store.isLeader">
                <q-btn square flat round dense color="green-9" icon="calendar_month" size="sm"
                  @click="$emit('open-scheduler', { comp, rap, act })">
                  <q-tooltip class="bg-green-9 text-weight-bold">Programar fechas y horas</q-tooltip>
                </q-btn>

                <q-btn square flat round dense color="blue-8" icon="edit" size="sm" :disable="act.isScheduledInCalendar"
                  @click="editActivity(act, aIdx)">
                  <q-tooltip class="bg-blue-8 text-weight-bold">{{ act.isScheduledInCalendar ? 'No se puede editar: Ya está programada en el calendario' : 'Editar instructor y descripción' }}</q-tooltip>
                </q-btn>

                <q-btn square flat round dense color="red-8" icon="delete" size="sm" :disable="act.isScheduledInCalendar"
                  @click="confirmDeleteActivity(act, aIdx)">
                  <q-tooltip class="bg-red-8 text-weight-bold">{{ act.isScheduledInCalendar ? 'No se puede eliminar: ya está programada en el calendario' : 'Eliminar actividad' }}</q-tooltip>
                </q-btn>
              </div>
            </div>

            <!-- Sección: actividad + instructor (izquierda) y fechas (derecha), lado a lado -->
            <q-card-section class="q-pa-md">
              <div class="row no-wrap items-stretch">

                <!-- Columna izquierda: actividad + instructor -->
                <div class="col-6 q-pr-md column">
                  <div class="text-weight-bold text-body2 q-mb-sm">
                    {{ act.description || act.observations || 'Actividad sin descripción' }}
                  </div>

                  <div v-if="getInstructorName(act)" class="q-mt-sm">
                    <div class="row items-center q-gutter-x-sm">
                      <q-avatar size="44px" color="green-1" text-color="green-9" class="text-weight-bold" style="font-size:30px">
                        {{ getInitials(getInstructorName(act)) }}
                      </q-avatar>
                      <div>
                        <div class="text-caption text-weight-medium text-grey-9">{{ getInstructorName(act) }}</div>
                        <div class="text-grey-6" style="font-size:10.5px">Instructor</div>
                      </div>
                    </div>
                    <div class="row items-center q-mt-md" style="gap: 8px">
                      <q-chip square dense color="green-1" text-color="green-9" size="sm" class="q-ma-none text-weight-bold" icon="schedule">
                        Directas: {{ act.hours?.direct ?? 0 }}D
                      </q-chip>
                      <q-chip square dense color="blue-1" text-color="blue-9" size="sm" class="q-ma-none text-weight-bold" icon="update">
                        Indirectas: {{ act.hours?.independent ?? 0 }}I
                      </q-chip>
                    </div>
                  </div>
                </div>

                <q-separator vertical class="q-mx-md" />

                <!-- Columna derecha: fechas -->
                <div class="col-6 flex flex-center column dates-section-inline">
                  <div class="text-caption text-weight-bold text-grey-7 text-uppercase q-mb-sm self-start">
                    Fechas programadas
                  </div>

                  <q-badge
                    v-if="!hasAssignedDates(act)"
                    rounded
                    color="orange-8"
                    class="text-weight-medium q-px-sm q-py-xs self-start"
                  >
                    <q-icon name="calendar_today" size="14px" class="q-mr-xs" />
                    Sin fechas asignadas aún
                  </q-badge>

                  <div v-else class="row justify-start items-center q-gutter-x-sm q-gutter-y-sm">
                    <q-badge
                      v-for="(date, dIdx) in act.scheduleDetails.assignedDays"
                      :key="dIdx"
                      rounded
                      color="green-9"
                      class="date-chip text-weight-bold"
                    >
                      <q-icon name="calendar_month" size="16px" class="q-mr-xs" />
                      {{ formatFullDate(date) }}
                    </q-badge>
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </q-card-section>

    <!-- ÁREA DE LECTURA PARA EL INSTRUCTOR SUGERIDO -->
    <q-card-section square class="q-mx-md q-mb-md q-pa-md border-all bg-white shadow-1"
      v-if="!store.isLeader && rap.pedagogicalActivities.length > 0">
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

    <!-- Modal para crear una nueva asignación de instructor y actividad -->
    <q-dialog v-model="showCreateDialog" persistent square>
      <q-card square style="width: 520px; max-width: 92vw;">
        <q-card-section class="bg-green-9 text-white">
          <div class="text-h6 text-weight-bolder">NUEVA ASIGNACIÓN</div>
          <div class="text-caption text-green-1">Selecciona el instructor sugerido y describe la actividad de aprendizaje.</div>
        </q-card-section>

        <q-card-section class="q-pa-md q-gutter-y-md">
          <q-select square outlined v-model="formState.instructor" :options="filteredInstructors" option-label="name"
            label="Instructor Sugerido" bg-color="white" dense use-input input-debounce="0" color="green-9" clearable
            @filter="filterInstructors" :disable="!store.isLeader">
            <template v-slot:prepend><q-icon name="person" color="green-9" /></template>
          </q-select>
          <q-input square outlined v-model="formState.newActivity" type="textarea" autogrow
            label="Actividad de aprendizaje (Sugerido por Instructor)" bg-color="white" color="green-9">
            <template v-slot:prepend><q-icon name="add_task" color="green-9" /></template>
          </q-input>
        </q-card-section>

        <q-card-actions align="right" class="bg-grey-1 q-pa-md">
          <q-btn flat label="Cancelar" color="grey-7" @click="closeCreateDialog" />
          <q-btn color="green-9" label="Guardar asignación" icon="save" unelevated class="text-weight-bold"
            @click="handleSaveActivity" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Modal para editar una actividad existente -->
    <q-dialog v-model="showEditDialog" persistent square>
      <q-card square style="width: 520px; max-width: 92vw;">
        <q-card-section class="bg-green-9 text-white">
          <div class="text-h6 text-weight-bolder">EDITAR ACTIVIDAD</div>
          <div class="text-caption text-green-1">Modifica el instructor sugerido y la descripción de la actividad.</div>
        </q-card-section>

        <q-card-section class="q-pa-md q-gutter-y-md">
          <q-select square outlined v-model="editForm.instructor" :options="filteredInstructors" option-label="name"
            label="Instructor Sugerido" bg-color="white" dense use-input input-debounce="0" color="green-9" clearable
            @filter="filterInstructors" :disable="!store.isLeader">
            <template v-slot:prepend><q-icon name="person" color="green-9" /></template>
          </q-select>
          <q-input square outlined v-model="editForm.description" type="textarea" autogrow
            label="Descripción de la actividad" bg-color="white" color="green-9" />
        </q-card-section>

        <q-card-actions align="right" class="bg-grey-1 q-pa-md">
          <q-btn flat label="Cancelar" color="grey-7" @click="closeEditDialog" />
          <q-btn color="green-9" label="Guardar cambios" icon="save" unelevated class="text-weight-bold"
            @click="handleUpdateActivity" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
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
const showCreateDialog = ref(false);
const showEditDialog = ref(false);
const editingActIdx = ref(null);
const editForm = reactive({
  instructor: null,
  description: ''
});

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

/** Nombre del instructor sugerido de una actividad, sin importar el shape (objeto o arreglo) */
const getInstructorName = (act) => {
  if (act.suggestedInstructor?.name) return act.suggestedInstructor.name;
  if (Array.isArray(act.instructors) && act.instructors.length > 0) {
    return act.instructors.map(i => i.name).join(', ');
  }
  return act.instructors?.name || '';
};

/** true si la actividad ya tiene fechas asignadas */
const hasAssignedDates = (act) =>
  !!(act.scheduleDetails?.assignedDays && act.scheduleDetails.assignedDays.length > 0);

const MONTH_ABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** Divide una fecha 'YYYY-MM-DD' en { day, month } para las tarjetas tipo ticket */
const formatDateParts = (dateStr) => {
  if (!dateStr) return { day: '--', month: '' };
  const [year, month, day] = dateStr.split('-');
  const monthIdx = parseInt(month, 10) - 1;
  return {
    day: day || '--',
    month: MONTH_ABBR[monthIdx] || ''
  };
};

/** Formatea 'YYYY-MM-DD' como '18 sep 2026' para los chips de la tarjeta de fechas */
const formatFullDate = (dateStr) => {
  const { day, month } = formatDateParts(dateStr);
  const year = dateStr?.split('-')[0] || '';
  return `${day} ${month.toLowerCase()} ${year}`;
};

/** Iniciales para el avatar del instructor (máx. 2 letras) */
const getInitials = (name) => {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('');
};

const normalize = (text) => {
  return (text || '')
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

// Instructores ya asignados a otras actividades del mismo resultado de aprendizaje
const getTakenInstructors = (excludeIdx = -1) => {
  const takenIds = new Set();
  const takenNames = new Set();

  (props.rap.pedagogicalActivities || []).forEach((act, idx) => {
    if (idx === excludeIdx) return;
    const sugg = act.suggestedInstructor || act.instructors;
    const list = Array.isArray(sugg) ? sugg : sugg ? [sugg] : [];
    list.forEach((i) => {
      if (!i) return;
      if (i.id) takenIds.add(String(i.id));
      if (i._id) takenIds.add(String(i._id));
      if (i.name) takenNames.add(normalize(i.name));
    });
  });

  return { takenIds, takenNames };
};

const isInstructorTaken = (instructor, excludeIdx = -1) => {
  if (!instructor) return false;
  const { takenIds, takenNames } = getTakenInstructors(excludeIdx);
  const id = instructor._id || instructor.id;
  if (id && takenIds.has(String(id))) return true;
  if (instructor.name && takenNames.has(normalize(instructor.name))) return true;
  return false;
};

const filterInstructors = (val, update) => {
  const excludeIdx = showEditDialog.value ? editingActIdx.value : -1;
  if (val === '') {
    update(() => {
      filteredInstructors.value = props.instructors.filter(
        (v) => !isInstructorTaken(v, excludeIdx)
      );
    });
    return;
  }
  update(() => {
    const needle = normalize(val);
    filteredInstructors.value = props.instructors.filter(
      (v) => normalize(v.name).indexOf(needle) > -1 && !isInstructorTaken(v, excludeIdx)
    );
  });
};

const openCreateDialog = () => {
  formState.instructor = null;
  formState.newActivity = '';
  filteredInstructors.value = props.instructors;
  showCreateDialog.value = true;
};

const closeCreateDialog = () => {
  showCreateDialog.value = false;
  formState.instructor = null;
  formState.newActivity = '';
};

const handleSaveActivity = async () => {
  if (!formState.instructor) {
    $q.notify({ message: 'Debe seleccionar un instructor sugerido', color: 'red-8' });
    return;
  }

  if (isInstructorTaken(formState.instructor)) {
    $q.notify({
      message: 'El instructor ya está asignado a otra actividad de este resultado',
      color: 'red-8',
    });
    return;
  }

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

  await store.saveDraft();
  formState.newActivity = '';
  formState.instructor = null;
  showCreateDialog.value = false;
};

const editActivity = (act, aIdx) => {
  editForm.description = act.description || '';

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
  editForm.instructor = found || null;

  editingActIdx.value = aIdx;
  showEditDialog.value = true;
};

const closeEditDialog = () => {
  showEditDialog.value = false;
  editingActIdx.value = null;
  editForm.description = '';
  editForm.instructor = null;
};

const handleUpdateActivity = async () => {
  const act = props.rap.pedagogicalActivities[editingActIdx.value];
  if (!act) return;

  if (!editForm.instructor && store.isLeader) {
    $q.notify({ message: 'Debe seleccionar un instructor sugerido', color: 'red-8' });
    return;
  }

  if (editForm.instructor && isInstructorTaken(editForm.instructor, editingActIdx.value)) {
    $q.notify({
      message: 'El instructor ya está asignado a otra actividad de este resultado',
      color: 'red-8',
    });
    return;
  }

  const originalDescription = act.description || '';
  act.description = editForm.description || '';

  if (store.isLeader && editForm.instructor) {
    act.suggestedInstructor = {
      id: editForm.instructor._id || act.suggestedInstructor?.id,
      name: editForm.instructor.name || act.suggestedInstructor?.name,
      assignmentStatus: act.suggestedInstructor?.assignmentStatus || 'pending'
    };
  }

  // Sincronizar el objeto de actividad actualizado en el store
  store.updateActivityInStore(props.comp.code, props.rap.description, originalDescription, act);

  closeEditDialog();
  $q.notify({ message: 'Asignación actualizada con éxito ✅', color: 'blue-9' });

  await store.saveDraft();
};

const confirmDeleteActivity = (act, aIdx) => {
  const instructorName =
    act.suggestedInstructor?.name ||
    (Array.isArray(act.instructors) ? act.instructors.map(i => i.name).join(', ') : act.instructors?.name) ||
    'sin instructor asignado';
  $q.dialog({
    title: 'Eliminar Actividad',
    message: `¿Estás seguro de que deseas eliminar la actividad asignada al instructor <b>"${instructorName}"</b>? Esta acción no se puede deshacer.`,
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

.activity-card {
  border: 1px solid #dcdcdc;
  border-radius: 6px;
  background: #ffffff;
  overflow: hidden;
  transition: box-shadow 0.15s ease;
}

.activity-card:hover {
  box-shadow: 0 1px 6px rgba(46, 125, 50, 0.15);
}

.activity-card__header {
  background: #f5f8f5;
  border-bottom: 1px solid #dcdcdc;
}

.dates-section-inline {
  align-items: flex-start;
}

.date-chip {
  font-size: 12px;
  padding: 6px 12px !important;
}
</style>