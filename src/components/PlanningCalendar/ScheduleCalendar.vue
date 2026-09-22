<template>
  <q-card square flat bordered class="schedule-calendar"
    style="width: 800px; max-width: 95vw; max-height: 90vh; display: flex; flex-direction: column;">
    <!-- Header Repfora: Cuadrado y Sólido -->
    <q-card-section class="bg-green-9 q-px-lg row items-center justify-between" style="flex: 0 0 auto;">
      <div>
        <h5 class="q-my-none text-white text-weight-bold flex items-center text-uppercase">
          <q-icon name="calendar_month" class="q-mr-sm" />
          PROGRAMACIÓN DE CALENDARIO
        </h5>
        <div class="text-green-1 text-caption q-mt-xs text-weight-medium text-uppercase">
          {{ activityLabel }}
        </div>
      </div>
      <q-btn square icon="close" flat round dense color="white" @click="$emit('close')" />
    </q-card-section>

    <q-separator color="white" size="2px" />

    <!-- Contenedor con Scroll para el Formulario y Calendario -->
    <div class="col scroll" style="overflow-y: auto; flex: 1 1 auto;">

      <!-- Banner Informativo de Ventana de Tiempo (REFORA STYLE) -->
      <q-card-section class="q-pa-sm bg-blue-1 text-blue-10 text-center text-weight-bold border-bottom">
        <q-icon name="info" size="xs" class="q-mr-xs" />
        VENTANA DE PROGRAMACIÓN: {{ formatDateCO(lectivaStartDate) }} AL {{ formatDateCO(lectivaEndDate) }}
      </q-card-section>

      <!-- Sección de Entrada de Horas -->
      <q-card-section class="q-pa-md bg-grey-1 border-bottom">
        <div class="row q-col-gutter-md items-center">
          <div class="col-12 col-md-6">
            <q-input square filled type="number" v-model.number="localHours.direct" label="Horas Directas" min="0"
              color="green-9">
              <template v-slot:prepend><q-icon name="schedule" color="green-9" /></template>
            </q-input>
            <!-- actualizacion horas luis llanos 15-09-2026 -->
            <div v-if="suggestedHours > 0" class="row items-center q-mt-xs q-gutter-x-xs">
              <span class="text-caption text-grey-8">
                💡 Sugerido: <strong class="text-green-9">{{ suggestedHours }}h</strong>
              </span>
              <q-btn
                v-if="localHours.direct !== suggestedHours"
                flat
                dense
                size="xs"
                color="green-9"
                class="text-weight-bold"
                label="Usar sugerido"
                @click="applySuggestedHours"
              >
                <q-tooltip class="bg-green-9">Aplicar sugerencia calculada ({{ suggestedHours }}h)</q-tooltip>
              </q-btn>
            </div>
          </div>
          <div class="col-12 col-md-6">
            <q-input square filled type="number" v-model.number="localHours.independent" label="Horas Indirectas"
              min="0" color="grey-8">
              <template v-slot:prepend><q-icon name="psychology" color="grey-8" /></template>
            </q-input>
          </div>
        </div>
      </q-card-section>

      <q-card-section class="q-pa-md">
        <div class="row q-col-gutter-md">
          <!-- Fecha de inicio -->
          <div class="col-12 col-md-4">
            <q-input square filled type="date" v-model="config.startDate" label="Fecha de Inicio"
              :disable="!localHours.direct" color="green-9">
              <template v-slot:prepend><q-icon name="event" color="green-9" /></template>
            </q-input>
          </div>

          <!-- Jornada -->
          <div class="col-12 col-md-4">
            <q-select square filled v-model="config.shift" :options="shiftOptions" label="Jornada" emit-value
              map-options :display-value="displayShiftLabel" :disable="!localHours.direct"
              @update:model-value="handleShiftUpdate" color="green-9" 
               behavior = "menu">             
              <template v-slot:prepend><q-icon name="light_mode" color="green-9" /></template>
            </q-select>
          </div>

          <div v-if="isCurrentShiftCustom" class="row q-col-gutter-sm q-mt-sm">
            <div class="col-6">
              <q-input square filled type="time" v-model="config.tstart" label="Hora de Inicio" color="green-9">
              </q-input>
            </div>
            <div class="col-6">
              <q-input square filled type="time" v-model="config.tend" label="Hora Fin" color="green-9"> </q-input>
            </div>
          </div>

          <!-- Info calculada -->
          <div class="col-12 col-md-4">
            <q-card square flat bordered class="bg-green-1 q-pa-sm full-height flex flex-center text-center">
              <div>
                <div class="text-caption text-green-9 text-weight-bolder uppercase">Resumen</div>
                <div class="text-subtitle2 text-grey-9 text-weight-medium q-mt-xs" v-if="localHours.direct > 0">
                  <span class="text-green-9 text-weight-bolder">{{ localHours.direct }}h</span> directas ÷
                  <span class="text-green-9 text-weight-bolder">{{ hoursPerDay }}h</span>/día =
                  <span class="text-green-9 text-weight-bolder">{{ daysNeeded }}</span> sesiones
                </div>
                <div class="text-caption text-grey-6" v-else>
                  Ingresa horas directas
                </div>
              </div>
            </q-card>
          </div>

          <!-- Días de la semana -->
          <div class="col-12">
            <div class="text-caption text-bold text-green-9 q-mb-sm flex items-center text-uppercase">
              <q-icon name="today" class="q-mr-xs" />
              Días de clase en la semana:
            </div>
            <div class="row q-gutter-sm">
              <q-checkbox square v-for="day in weekDays" :key="day.value" v-model="config.selectedDays" :val="day.value"
                :label="day.label" color="green-9" dense :disable="!localHours.direct" class="text-weight-medium" />
            </div>
          </div>

          <!-- Novedades de Horarios Activas (DÍAS CUADRADOS) -->
          <div v-if="globalVacations.length > 0" class="col-12 q-mt-md">
            <q-card flat bordered square class="bg-amber-1 q-pa-md" style="border: 1px solid #ffe082;">
              <div class="text-caption text-bold text-amber-9 q-mb-sm flex items-center justify-between text-uppercase">
                <span class="flex items-center">
                  <q-icon name="beach_access" class="q-mr-xs" size="18px" />
                  DÍAS NO PROGRAMABLES / VACACIONES
                </span>
              </div>
              <div class="q-gutter-y-xs q-mt-xs">
                <div v-for="v in globalVacations" :key="v.id" class="text-caption text-amber-9 text-weight-medium">
                  • <strong>{{ formatDateCO(v.start) }} al {{ formatDateCO(v.end) }}</strong>: {{ v.reason }}
                </div>
              </div>
            </q-card>
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <!-- Vista Previa de Sesiones -->
      <q-card-section class="bg-grey-1" v-if="localHours.direct > 0 || hasSavedDays || fichaHasDays">
        <div class="text-subtitle2 text-green-10 text-bold q-mb-md flex items-center text-uppercase">
          <q-icon name="visibility" class="q-mr-sm" />
          VISTA PREVIA Y SELECCIÓN DE SESIONES
        </div>

        <!-- Aviso: solo se están visualizando los días programados de la ficha -->
        <div v-if="!localHours.direct && !hasSavedDays && fichaHasDays"
          class="text-caption text-weight-medium text-green-9 bg-green-1 q-pa-sm q-mb-md border-all flex items-center">
          <q-icon name="info" size="16px" class="q-mr-xs" />
          Vista de referencia: los días en rojo ya están programados en otros resultados de la ficha. Ingresa las horas directas para generar las fechas de este resultado.
        </div>

        <div v-if="!config.startDate" class="text-grey text-caption q-pa-lg text-center bg-white border-all">
          <q-icon name="calendar_today" size="3em" color="grey-4" class="q-mb-sm" />
          <div class="text-weight-medium">Selecciona la fecha de inicio y días válidos para generar el calendario.</div>
        </div>

        <!-- CONTENEDOR DE CALENDARIO INLINE -->
        <div v-else class="calendar-wrapper q-pa-sm bg-white border-all">
          <!-- Calendar Header Navigation -->
          <div class="row items-center justify-between q-py-md q-px-md bg-green-1 q-mb-sm">
            <q-btn square flat round dense icon="chevron_left" color="green-9" @click="prevMonth" />
            <div class="text-subtitle1 text-weight-bolder text-green-10 tracking-wide text-uppercase">
              {{ monthName }} — {{ currentYear }}
            </div>
            <q-btn square flat round dense icon="chevron_right" color="green-9" @click="nextMonth" />
          </div>

          <div class="calendar-grid">
            <!-- Week Days Header -->
            <div v-for="day in calendarWeekDays" :key="day"
              class="weekday-header text-center text-weight-bolder text-green-9 q-py-xs">
              {{ day }}
            </div>

            <!-- Days Grid -->
            <div v-for="(day, index) in calendarDays" :key="index" class="calendar-day" :class="{
              'inactive-day': !day.currentMonth,
              'out-of-range-day': day.isOutOfRange,
              'today-day': day.isToday,
              'programmed-day': day.session && !day.isHoliday,
              'holiday-day': day.isHoliday,
              'occupied-day': day.isOccupied,
              'vacation-day': day.isVacation && !day.session,
              'clickable-day': day.currentMonth && !day.isOccupied && !day.isHoliday && !day.isOutOfRange
            }" @click="handleDayClick(day)">
              <div class="row justify-between items-center full-width">
                <span class="day-number">{{ day.date.getDate() }}</span>
                <q-badge square v-if="day.isToday" color="green-8" class="today-dot" />
              </div>

              <!-- Indicador de horas programadas -->
              <div class="day-hours text-weight-bold" v-if="day.session && !day.isHoliday && day.session.horas > 0">
                <q-badge square color="white" text-color="green-10" dense class="q-px-xs text-weight-bolder"
                  style="font-size: 10px;">
                  {{ day.session.horas }}h
                </q-badge>
              </div>

              <!-- Indicadores de estado (BADGES CUADRADOS) -->
              <div class="day-status-indicator full-width text-center" v-if="day.isOccupied">
                <span class="micro-badge bg-red-2 text-red-9">Ocupado</span>
              </div>

              <div class="day-status-indicator full-width text-center" v-if="day.isHoliday">
                <span class="micro-badge bg-red-2 text-red-9">Festivo</span>
              </div>

              <div class="day-status-indicator full-width text-center" v-if="day.isOutOfRange && day.currentMonth">
                <span class="micro-badge bg-grey-3 text-grey-7">No Válido</span>
              </div>

              <div class="day-status-indicator full-width text-center" v-if="day.isVacation && !day.session">
                <span class="micro-badge bg-amber-2 text-amber-9 text-weight-bold">Novedad</span>
              </div>

              <q-tooltip v-if="day.isOutOfRange && day.currentMonth" class="bg-grey-9 text-weight-bold">
                🚫 Fuera del rango de la ficha ({{ formatDateCO(lectivaStartDate) }} - {{ formatDateCO(lectivaEndDate)
                }})
              </q-tooltip>

              <q-tooltip v-if="day.isHoliday" class="bg-red-8 text-weight-bold">
                🚫 Festivo: {{ day.holidayName }}
              </q-tooltip>
            </div>
          </div>
        </div>

        <!-- Resumen de sesiones -->
        <div v-if="sessions.length > 0" class="row q-gutter-md q-mt-md">
          <q-badge square color="green-1" text-color="green-10" class="q-pa-sm text-weight-bolder"
            style="font-size: 12px; border: 1px solid #c8e6c9;">
            <q-icon name="check_circle" size="xs" class="q-mr-xs" />
            {{ effectiveSessions }} sesiones hábiles
          </q-badge>
          <q-badge square color="blue-1" text-color="blue-10" class="q-pa-sm text-weight-bolder"
            style="font-size: 12px; border: 1px solid #bbdefb;">
            <q-icon name="schedule" size="xs" class="q-mr-xs" />
            {{ effectiveHours }}h programadas
          </q-badge>
        </div>
      </q-card-section>
    </div> <!-- Fin contenedor con Scroll -->

    <q-separator />

    <!-- Acciones Repfora: Cuadradas y Sólidas -->
    <q-card-actions align="right" class="q-pa-md bg-grey-2" style="flex: 0 0 auto;">
      <q-btn square flat label="CANCELAR" color="grey-8" class="text-bold q-px-lg" @click="$emit('close')" />
      <q-btn square label="CONFIRMAR PROGRAMACIÓN" class="bg-green-9 text-white text-bold q-px-xl" icon="save"
        :disabled="localHours.direct > 0 && effectiveSessions === 0" @click="confirmSchedule" unelevated />
    </q-card-actions>
  </q-card>
</template>

<script setup>
import { ref, computed, watch, reactive, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { getDayName, getHoursPerDay, calculateWorkDays, generateSessions, formatDateCO, getMonthName } from '../../utils/planeacion/dateUtils';
import { isHoliday, getHolidayName } from '../../utils/planeacion/holidays';
import { usePlanningStore } from '../../store/planning.store';
import { VacationService, ShiftService } from '../../services/planning.service';

const $q = useQuasar();
const store = usePlanningStore();

const props = defineProps({
  initialHours: { type: Object, default: () => ({ direct: 0, independent: 0 }) },
  initialShift: { type: String, default: 'diurna' },
  activityLabel: { type: String, default: 'Actividad de aprendizaje' },
  currentActivity: { type: Object, default: null }
});

const emit = defineEmits(['close', 'confirm']);

// true cuando el usuario edita horas/fecha/jornada/días en el formulario.
// Mientras sea false, el calendario SIEMPRE muestra los días guardados en BD.
const userEdited = ref(false);

// --- Metadatos de la ficha ---
const lectivaStartDate = computed(() => {
  const d = store.planning?.pedagogicalPlanning?.metadata?.lectivaStartDate;
  return d ? d.slice(0, 10) : '2024-01-01';
});
const lectivaEndDate = computed(() => {
  const d = store.planning?.pedagogicalPlanning?.metadata?.lectivaEndDate;
  return d ? d.slice(0, 10) : '2025-12-31';
});

// Clave de identidad de una actividad: descripción + fechas programadas.
// Sirve para detectar duplicados de la misma programación en el documento.
const buildActivityKey = (act) => {
  const desc = ((act?.description || act?.observations) || '').trim().toUpperCase();
  const days = (act?.scheduleDetails?.assignedDays || []).slice().sort().join(',');
  return `${desc}||${days}`;
};

const occupiedDates = computed(() => {
  if (!store.planning) return [];
  const dates = [];
  const content = store.planning.pedagogicalPlanning.content;
  const currentAct = props.currentActivity;
  const currentKey = currentAct ? buildActivityKey(currentAct) : null;

  content.forEach(phase => {
    phase.competencies.forEach(comp => {
      comp.learningOutcomes.forEach(rap => {
        rap.pedagogicalActivities.forEach(act => {
          // Se excluye la actividad que se está editando (por referencia o por
          // identidad descripción+fechas) para que sus propias fechas ya
          // programadas NO se marquen como ocupadas, sino como seleccionadas.
          if (act === currentAct) return;
          if (currentKey && buildActivityKey(act) === currentKey) return;
          if (act.scheduleDetails && act.scheduleDetails.assignedDays) {
            act.scheduleDetails.assignedDays.forEach(dayStr => dates.push(dayStr));
          }
        });
      });
    });
  });
  return dates;
});

const localHours = reactive({
  direct: props.initialHours.direct || 0,
  independent: props.initialHours.independent || 0
});

// actualizacion horas luis llanos 15-09-2026
const suggestedHours = computed(() => {
  if (props.initialHours && props.initialHours.suggestedDirect) {
    return props.initialHours.suggestedDirect;
  }
  if (props.currentActivity && store.planning) {
    const content = store.planning?.pedagogicalPlanning?.content || [];
    for (const phase of content) {
      for (const comp of (phase.competencies || [])) {
        for (const rap of (comp.learningOutcomes || [])) {
          if (rap.pedagogicalActivities && rap.pedagogicalActivities.includes(props.currentActivity)) {
            return store.getSuggestedHours(comp, rap, props.currentActivity).direct;
          }
        }
      }
    }
  }
  return 0;
});

// actualizacion horas luis llanos 15-09-2026
const applySuggestedHours = () => {
  if (suggestedHours.value > 0) {
    localHours.direct = suggestedHours.value;
  }
};

const savedDetails = props.currentActivity?.scheduleDetails;

// true si la actividad ya tiene días programados guardados en la BD
// (aunque sus horas directas estén en 0, el calendario debe mostrarlos)
const hasSavedDays = computed(
  () => !!(savedDetails?.assignedDays && savedDetails.assignedDays.length > 0)
);

// true si algún resultado de la ficha ya tiene días programados
// (para que el calendario se muestre siempre y se puedan ver esos días)
const fichaHasDays = computed(() => {
  if (!store.planning) return false;
  const content = store.planning.pedagogicalPlanning?.content || [];
  return content.some((phase) =>
    (phase?.competencies || []).some((comp) =>
      (comp?.learningOutcomes || []).some((rap) =>
        (rap?.pedagogicalActivities || []).some(
          (act) =>
            act.scheduleDetails &&
            Array.isArray(act.scheduleDetails.assignedDays) &&
            act.scheduleDetails.assignedDays.length > 0
        )
      )
    )
  );
});

// Deducir días seleccionados de la semana
const inferSelectedDays = (assignedDays) => {
  if (!assignedDays || assignedDays.length === 0) return [1, 2, 3, 4, 5];
  const days = assignedDays.map(dateStr => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    let day = date.getDay();
    return day === 0 ? 7 : day;
  });
  return [...new Set(days)].filter(d => d >= 1 && d <= 7);
};

// Obtener fecha de inicio guardada o la primera programada
const fallbackStartDate = (savedDetails?.assignedDays && savedDetails.assignedDays.length > 0)
  ? savedDetails.assignedDays[0]
  : new Date().toISOString().split('T')[0];

// Definición de config
const config = ref({
  startDate: savedDetails?.startDate || fallbackStartDate,
  shift: savedDetails?.shift || props.initialShift,
  selectedDays: savedDetails?.selectedDays || inferSelectedDays(savedDetails?.assignedDays),
  tstart: savedDetails?.tstart || '',
  tend: savedDetails?.tend || '',
});

const customHoursCalculated = computed(() => {
  if (!config.value.tstart || !config.value.tend) return 0;
  const [h1, m1] = config.value.tstart.split(':').map(Number);
  const [h2, m2] = config.value.tend.split(':').map(Number);
  const diffMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
  return Math.max(0, diffMinutes / 60);
});

const isCurrentShiftCustom = computed(() => {
  const selected = shiftsList.value.find(s => s.code === config.value.shift);
  return selected ? selected.isCustom : (config.value.shift === 'personalizado');
});

const previousShift = ref(config.value.shift);

const displayShiftLabel = computed(() => {
  if (config.value.shift === 'mixta_manana') return 'Mixta (Mañana)';
  if (config.value.shift === 'mixta_manana_tarde') return 'Mixta (Mañana/Tarde)';
  if (config.value.shift === 'mixta') return 'Mixta';
  const matched = shiftOptions.value.find(o => o.value === config.value.shift);
  return matched ? matched.label : config.value.shift;
});

const handleShiftUpdate = (val) => {
  if (val === 'mixta') {
    $q.dialog({
      title: 'Jornada Mixta',
      message: 'Seleccione el tipo de Jornada Mixta:',
      options: {
        type: 'radio',
        model: 'mixta_manana',
        items: [
          { label: 'Mañana (7:00 AM - 12:00 PM)', value: 'mixta_manana' },
          { label: 'Mañana y Tarde (7:00 AM - 12:00 PM / 1:00 PM - 5:59 PM)', value: 'mixta_manana_tarde' }
        ]
      },
      cancel: true,
      persistent: true
    }).onOk(selectedVal => {
      config.value.shift = selectedVal;
      previousShift.value = selectedVal;
      applyDefaultTimes(selectedVal);
    }).onCancel(() => {
      config.value.shift = previousShift.value;
    });
  } else {
    previousShift.value = val;
    applyDefaultTimes(val);
  }
};

const applyDefaultTimes = (shiftCode) => {
  const selected = shiftsList.value.find(s => s.code === shiftCode);
  if (selected) {
    if (!selected.isCustom) {
      config.value.tstart = selected.defaultStartTime || '';
      config.value.tend = selected.defaultEndTime || '';
    }
  }
};

// Forzar que la fecha de inicio esté dentro del rango
watch(() => config.value.startDate, (newVal) => {
  if (newVal < lectivaStartDate.value) config.value.startDate = lectivaStartDate.value;
  if (newVal > lectivaEndDate.value) config.value.startDate = lectivaEndDate.value;
}, { immediate: true });

// ── Estado de vacaciones globales cargadas de localStorage ──
const globalVacations = ref([]);
const loadGlobalVacations = async () => {
  try {
    const data = await VacationService.getAll();
    globalVacations.value = Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('Error al cargar vacaciones globales:', e);
    globalVacations.value = [];
  }
};

// ── Estado de jornadas dinamicas ──
const shiftsList = ref([]);
const shiftOptions = ref([]);

const loadShifts = async () => {
  try {
    const data = await ShiftService.getAll();
    shiftsList.value = data;
    const activeList = data.filter(s => s.status === 0 || s.code === 'personalizado');
    shiftOptions.value = activeList.map(s => ({
      label: s.name,
      value: s.code
    }));
  } catch (e) {
    console.error('Error al cargar jornadas:', e);
    shiftOptions.value = [
      { label: 'Mañana / Tarde (6h/día)', value: 'diurna' },
      { label: 'Noche (5h/día)', value: 'nocturna' },
      { label: 'Mixta (Mañana)', value: 'mixta_manana' },
      { label: 'Mixta (Mañana/Tarde)', value: 'mixta_manana_tarde' },
      { label: 'Jornada Especial', value: 'personalizado' },
    ];
  }
};

onMounted(() => {
  loadGlobalVacations();
  loadShifts();
});

const weekDays = [
  { label: 'Lun', value: 1 }, { label: 'Mar', value: 2 }, { label: 'Mié', value: 3 },
  { label: 'Jue', value: 4 }, { label: 'Vie', value: 5 }, { label: 'Sáb', value: 6 },
  { label: 'Dom', value: 7 }
];

const hoursPerDay = computed(() => {
  const selected = shiftsList.value.find(s => s.code === config.value.shift);
  if (selected) {
    if (selected.isCustom) {
      return customHoursCalculated.value;
    }
    return selected.hoursPerDay;
  }
  return getHoursPerDay(config.value.shift, customHoursCalculated.value);
});

const daysNeeded = computed(() => {
  if (hoursPerDay.value <= 0) return 0;
  return Math.ceil(localHours.direct / hoursPerDay.value);
});

const sessions = ref([]);

watch(
  [() => config.value.startDate, () => config.value.shift, () => config.value.selectedDays, () => localHours.direct, hoursPerDay],
  () => {
    const savedDays = savedDetails?.assignedDays || [];

    // Mientras el usuario no haya editado el formulario, mostrar SIEMPRE
    // los días guardados en BD (sin importar si las horas están en 0 o si
    // el watch se vuelve a disparar por la carga de jornadas).
    if (savedDays.length > 0 && !userEdited.value) {
      sessions.value = savedDetails.sessions
        ? [...savedDetails.sessions]
        : savedDays.map((dateStr) => ({
            fecha: dateStr,
            horas: Math.min(hoursPerDay.value, localHours.direct) || 0,
            festivo: isHoliday(dateStr),
          }));
      return;
    }

    if (!localHours.direct || localHours.direct <= 0 || config.value.selectedDays.length === 0 || !config.value.startDate) {
      sessions.value = [];
      return;
    }

    sessions.value = generateSessions(
      localHours.direct,
      config.value.startDate,
      config.value.selectedDays,
      'personalizado',
      occupiedDates.value,
      globalVacations.value,
      hoursPerDay.value
    ).filter(s => s.fecha >= lectivaStartDate.value && s.fecha <= lectivaEndDate.value);
  },
  { immediate: true, deep: true }
);

// Detectar edición del usuario: desde ese momento las sesiones se generan
// a partir del formulario en lugar de mostrar los días guardados en BD.
watch(
  () => [
    localHours.direct,
    localHours.independent,
    config.value.startDate,
    config.value.shift,
    config.value.selectedDays,
  ],
  () => {
    userEdited.value = true;
  }
);

const effectiveSessions = computed(() => sessions.value.filter((s) => !s.festivo).length);
const effectiveHours = computed(() =>
  sessions.value.filter((s) => !s.festivo).reduce((sum, s) => sum + s.horas, 0)
);

  const confirmSchedule = () => {
      const selectedShiftObj = shiftsList.value.find(s => s.code === config.value.shift);
      // 1. VALIDACIÓN DE DÍAS HABILITADOS TRASPASADA A CONFIRMACIÓN EN CALENDARIO (Se remueve bloqueo estricto)
    
      // 2. VALIDAR QUE LAS HORAS QUEDAN PAREJAS SEGÚN LA JORNADA (solo para jornadas no personalizadas o con hoursPerDay > 0)
      if (hoursPerDay.value > 0 && selectedShiftObj && !selectedShiftObj.isCustom) {
        const residuo = localHours.direct % hoursPerDay.value;
        if (residuo !== 0) {
          const horasEsperadas = hoursPerDay.value;
          $q.notify({
            message: `Atención: Las horas directas (${localHours.direct}h) no encajan con la jornada de ${horasEsperadas}h/día. Para poder guardar, el total de horas debe ser un múltiplo de ${horasEsperadas} para que todos los días de clase queden con el horario completo. Por favor, ajuste las horas.`,
            color: 'red-9',
            icon: 'error',
            position: 'top',
            timeout: 5000
          });
          return;
        }
      }
    
      // 3. VALIDAR QUE LAS HORAS PROGRAMADAS COINCIDEN CON LAS REQUERIDAS
      if (effectiveHours.value < localHours.direct) {
        const horasFaltantes = localHours.direct - effectiveHours.value;
        $q.notify({
          message: `No se puede guardar: Le faltan programar ${horasFaltantes} horas de clase.`,
          color: 'red-9',
          icon: 'error',
          position: 'top',
          timeout: 5000
        });
        return;
      }
    
      // 4. VALIDAR SI SE PASAN DE LAS HORAS ASIGNADAS
      if (effectiveHours.value > localHours.direct) {
        $q.notify({
          message: 'No se puede guardar: Ha programado más horas de las asignadas.',
          color: 'red-8',
          icon: 'error',
          position: 'top'
        });
        return;
      }

      // 5. EMITIR RESULTADO (GUARDAR Y CERRAR)
      emit('confirm', {
        sessions: sessions.value,
        shift: config.value.shift,
        tstart: (selectedShiftObj?.isCustom || config.value.shift === 'personalizado') ? config.value.tstart : (selectedShiftObj?.defaultStartTime || null),
        tend: (selectedShiftObj?.isCustom || config.value.shift === 'personalizado') ? config.value.tend : (selectedShiftObj?.defaultEndTime || null),
        hours: { ...localHours },
        startDate: config.value.startDate,
        selectedDays: config.value.selectedDays,
        vacation: globalVacations.value
      });
    };
    
// --- Control del Calendario Visual ---
const currentMonth = ref(new Date().getMonth());
const currentYear = ref(new Date().getFullYear());
const calendarWeekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const monthName = computed(() => getMonthName(currentMonth.value));

// Día de referencia para abrir el calendario en el mes correcto:
// 1) el propio día guardado de la actividad, 2) el primer día programado
// de toda la ficha, 3) la fecha de inicio del formulario.
const getReferenceDateForView = () => {
  if (savedDetails?.startDate) return savedDetails.startDate;
  if (hasSavedDays.value) return savedDetails.assignedDays[0];
  const ficheDays = occupiedDates.value;
  if (ficheDays.length > 0) return [...ficheDays].sort()[0];
  return config.value.startDate || null;
};

watch(
  () => [config.value.startDate, hasSavedDays.value, store.planning],
  () => {
    const ref = getReferenceDateForView();
    if (!ref) return;
    const d = new Date(ref + 'T00:00:00');
    if (!isNaN(d.getTime())) {
      currentMonth.value = d.getMonth();
      currentYear.value = d.getFullYear();
    }
  },
  { immediate: true }
);

const calendarDays = computed(() => {
  const year = currentYear.value;
  const month = currentMonth.value;
  const firstDay = new Date(year, month, 1).getDay();
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
  const days = [];

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const getVacationReasonForDate = (dateStr) => {
    const match = globalVacations.value.find(v => dateStr >= v.start && dateStr <= v.end);
    return match ? match.reason : null;
  };

  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = adjustedFirstDay - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month - 1, prevMonthLastDay - i), currentMonth: false });
  }

  const lastDay = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= lastDay; i++) {
    const date = new Date(year, month, i);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    const session = sessions.value.find(s => s.fecha === dateStr);
    const isOccupied = occupiedDates.value.includes(dateStr);
    const holiday = isHoliday(dateStr);
    const holidayName = getHolidayName(dateStr);
    const vacationReason = getVacationReasonForDate(dateStr);
    const isOutOfRange = dateStr < lectivaStartDate.value || dateStr > lectivaEndDate.value;

    days.push({
      date,
      currentMonth: true,
      isToday: dateStr === todayStr,
      session: session || null,
      isOccupied,
      isHoliday: holiday,
      holidayName,
      isVacation: !!vacationReason,
      vacationReason,
      isOutOfRange
    });
  }

  const remainingCells = 42 - days.length;
  for (let i = 1; i <= remainingCells; i++) {
    days.push({ date: new Date(year, month + 1, i), currentMonth: false });
  }
  return days;
});

const handleDayClick = (day) => {
  if (!day.currentMonth || day.isOccupied || day.isOutOfRange) return;

  // Vista de referencia (sin horas directas ni días guardados):
  // no permitir editar hasta que se ingresen las horas
  if (localHours.direct <= 0 && !hasSavedDays.value) {
    $q.notify({
      message: 'Ingresa las horas directas para poder asignar fechas.',
      color: 'orange-8',
      position: 'top',
    });
    return;
  }

  const dateStr = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.date.getDate()).padStart(2, '0')}`;

  const sessionIndex = sessions.value.findIndex(s => s.fecha === dateStr);
  const yaExisteSesion = sessionIndex !== -1;

  const proceedWithClick = () => {
    if (yaExisteSesion) {
      // Si ya existe la sesión, la removemos (te deja quitar los sábados viejos sin líos)
      sessions.value.splice(sessionIndex, 1);
    } else {
      // Agregar nueva sesión si no se han completado las horas
      const currentProgrammedHours = sessions.value.filter(s => !s.festivo).reduce((sum, s) => sum + s.horas, 0);
      const remainingHours = localHours.direct - currentProgrammedHours;

      if (remainingHours <= 0) {
        $q.notify({ message: 'Ya se han programado todas las horas requeridas.', color: 'warning', position: 'top' });
        return;
      }

      const hrs = Math.min(hoursPerDay.value, remainingHours);
      const addSess = () => {
        sessions.value.push({ fecha: dateStr, horas: hrs, festivo: false });
        sessions.value.sort((a, b) => a.fecha.localeCompare(b.fecha));
      };

      if (day.isVacation) {
        $q.dialog({
          title: '⚠️ Programar en Vacaciones / Novedad',
          message: `¿Está seguro de que desea programar clases en este día de vacaciones?`,
          html: true,
          cancel: { color: 'grey-8', flat: true, label: 'Cancelar' },
          ok: { color: 'amber-9', label: 'Sí, Programar' },
          persistent: true
        }).onOk(addSess);
      } else addSess();
    }
  };

  // RESTRICCIÓN DE DÍAS HABILITADOS DINÁMICOS (Solo al intentar agregar)
  const selectedShiftObj = shiftsList.value.find(s => s.code === config.value.shift);
  let isNotAllowedDay = false;
  let dayLabel = '';

  if (selectedShiftObj && selectedShiftObj.allowedDays && !yaExisteSesion) {
    let dayIndex = day.date.getDay(); // 0 = Dom, 1 = Lun, ..., 6 = Sáb
    if (dayIndex === 0) dayIndex = 7;
    
    if (!selectedShiftObj.allowedDays.includes(dayIndex)) {
      isNotAllowedDay = true;
      const dayLabels = { 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 7: 'Domingo' };
      dayLabel = dayLabels[dayIndex];
    }
  }

  if (!yaExisteSesion && (isNotAllowedDay || day.isHoliday)) {
    let dialogMessage = '';
    if (isNotAllowedDay && day.isHoliday) {
      dialogMessage = `El día seleccionado es un día festivo y además los ${dayLabel}s no están habilitados para la jornada ${selectedShiftObj.name}. ¿Está seguro de que desea programar clases en este día?`;
    } else if (isNotAllowedDay) {
      dialogMessage = `Los ${dayLabel}s no están habilitados para la jornada ${selectedShiftObj.name}. ¿Está seguro de que desea programar clases en este día?`;
    } else {
      dialogMessage = `El día seleccionado es un día festivo. ¿Está seguro de que desea programar clases en este día festivo?`;
    }

    $q.dialog({
      title: '⚠️ Confirmación de programación especial',
      message: dialogMessage,
      cancel: { label: 'Cancelar', flat: true, color: 'grey-8' },
      ok: { color: 'red-9', label: 'Sí, programar', unelevated: true, square: true },
      persistent: true
    }).onOk(() => {
      proceedWithClick();
    });
  } else {
    proceedWithClick();
  }
};

const prevMonth = () => { if (currentMonth.value === 0) { currentMonth.value = 11; currentYear.value--; } else currentMonth.value--; };
const nextMonth = () => { if (currentMonth.value === 11) { currentMonth.value = 0; currentYear.value++; } else currentMonth.value++; };
</script>
<style scoped>
.schedule-calendar {
  overflow: hidden;
}

.border-bottom {
  border-bottom: 1px solid #e0e0e0;
}

.calendar-wrapper {
  border: 1px solid #e0e0e0;
  background: white;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-left: 1px solid #e0e0e0;
  border-top: 1px solid #e0e0e0;
}

.weekday-header {
  border-right: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
  font-size: 0.85rem;
  background: #f1f8e9;
}

.calendar-day {
  min-height: 70px;
  border-right: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
  padding: 6px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  border-radius: 0 !important;
}

.day-number {
  font-size: 0.8rem;
  font-weight: 700;
  color: #555;
}

.inactive-day {
  background-color: #fafafa;
  color: #ccc;
}

.out-of-range-day {
  background-color: #f5f5f5;
  color: #bbb;
  cursor: not-allowed;
  opacity: 0.6;
}

.programmed-day {
  background-color: #2e7d32 !important;
  color: white !important;
}

.holiday-day,
.occupied-day {
  background-color: #ffebee !important;
  color: #c62828 !important;
}

.vacation-day {
  background-color: #fff8e1 !important;
  color: #b78103 !important;
}

.clickable-day {
  cursor: pointer;
}

.micro-badge {
  font-size: 8px;
  font-weight: 800;
  padding: 2px 4px;
  text-transform: uppercase;
  border-radius: 0 !important;
}

.q-btn,
.q-card,
.q-badge,
.q-field__control {
  border-radius: 0 !important;
}
</style>
