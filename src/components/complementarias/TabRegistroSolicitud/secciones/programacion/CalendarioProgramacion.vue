<template>
  <div class="calendar-wrapper">
    <FullCalendar
      ref="calendarRef"
      class="text-uppercase"
      :options="calendarOptions"
    >
      <template v-slot:eventContent="arg">
        <div
          class="event-content"
          :class="{ 'event-existing': arg.event.extendedProps.isExisting }"
        >
          <template v-if="arg.event.extendedProps.isExisting">
            <template v-if="arg.event.extendedProps.tipo === 'titulada'">
              <div class="event-hours">
                <q-icon name="school" size="10px" class="q-mr-xs" />Ficha
                {{ arg.event.extendedProps.fiche?.number }}
              </div>
            </template>
            <template
              v-else-if="arg.event.extendedProps.tipo === 'complementaria'"
            >
              <div class="event-hours">
                <q-icon name="menu_book" size="10px" class="q-mr-xs" />{{
                  arg.event.extendedProps.complementaryRequest
                    ?.catalogCourseName
                }}
              </div>
            </template>
            <template v-else>
              <div class="event-hours">
                <q-icon name="event_busy" size="10px" class="q-mr-xs" />{{
                  arg.event.extendedProps.typeactivity ||
                  arg.event.extendedProps.otheractivity
                }}
              </div>
            </template>
            <div class="event-time">
              {{ arg.event.extendedProps.tstart }} –
              {{ arg.event.extendedProps.tend }}
            </div>
          </template>
          <template v-else>
            <div class="event-hours">
              <q-icon
                name="menu_book"
                size="10px"
                class="q-mr-xs"
              />Complementaria {{ arg.event.extendedProps.totalHoras }}h
            </div>
            <div class="event-time">
              {{ arg.event.extendedProps.horaInicio }} –
              {{ arg.event.extendedProps.horaFin }}
            </div>
          </template>
        </div>
      </template>
    </FullCalendar>
  </div>
</template>

<script setup>
// ── 1. IMPORTS
import { ref, computed, watch, onActivated, onMounted, nextTick } from "vue";
import FullCalendar from "@fullcalendar/vue3";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";

// ── 3. PROPS Y EMITS
const props = defineProps({
  sesiones: { type: Array, default: () => [] },
  fechaInicio: { type: String, default: "" },
  fechaFin: { type: String, default: "" },
  readonly: { type: Boolean, default: false },
  tieneCurso: { type: Boolean, default: false },
  tieneRangoFechas: { type: Boolean, default: false },
  eventosHorariosExistentes: { type: Array, default: () => [] },
});

const emit = defineEmits(["date-click", "event-click", "event-drop", "rango-visible"]);

// ── 4. ESTADO REACTIVO
const calendarRef = ref(null);

// ── 5. COMPUTED
// genera la configuracion del calendario segun props y estado de interaccion
const calendarOptions = computed(() => {
  const interactivo =
    !props.readonly && props.tieneCurso && props.tieneRangoFechas;

  const hoy = new Date();
  let rangoStart, rangoEnd;

  if (props.fechaInicio && props.fechaFin) {
    rangoStart = props.fechaInicio;
    const endD = new Date(props.fechaFin + "T00:00:00");
    endD.setDate(endD.getDate() + 1);
    rangoEnd = endD.toISOString().slice(0, 10);
  } else {
    rangoStart = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
    rangoEnd = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1).toISOString().slice(0, 10);
  }

  return {
    plugins: [dayGridPlugin, interactionPlugin],
    locale: esLocale,
    initialView: "dayGridMonth",
    selectable: interactivo,
    editable: interactivo,
    eventDurationEditable: false,
    headerToolbar: { left: "prev,next today", center: "title", right: "" },
    events: [],
    eventClick: handleEventClick,
    eventDrop: handleEventDrop,
    dateClick: handleDateClick,
    datesSet: handleDatesSet,
    height: "auto",
    validRange: { start: rangoStart, end: rangoEnd },
  };
});

// transforma las sesiones en eventos compatibles con fullcalendar
const eventosCalendario = computed(() =>
  props.sesiones.map((s, i) => ({
    id: `${s.fecha}__${s.horaInicio}__${s.horaFin}`,
    title: `${s.totalHoras}h`,
    start: s.fecha,
    backgroundColor: "#4caf50",
    borderColor: "#388e3c",
    textColor: "#ffffff",
    extendedProps: {
      horaInicio: s.horaInicio,
      horaFin: s.horaFin,
      totalHoras: s.totalHoras,
      sesionIndex: i,
    },
  })),
);

// ── 6. WATCHERS
// recarga eventos cuando cambian sesiones u horarios existentes
// sin debounce: el hash guard de cargarEventos evita trabajo innecesario.
// se mantiene nextTick porque FullCalendar necesita el DOM listo para getApi()
watch(
  [eventosCalendario, () => props.eventosHorariosExistentes],
  () => nextTick(cargarEventos),
  { immediate: true },
);

// ── 7. CICLO DE VIDA
// carga inicial de eventos (reemplaza el watch de calendarRef)
onMounted(() => nextTick(cargarEventos));

// reajusta el tamano del calendario al reactivar el componente
onActivated(() => {
  nextTick(() => calendarRef.value?.getApi()?.updateSize());
});

// ── 8. HELPERS
let lastEventHash = "";

// recarga los eventos del calendario solo si cambiaron (hash guard)
function cargarEventos() {
  const api = calendarRef.value?.getApi();
  if (!api) return;

  const todos = [
    ...eventosCalendario.value,
    ...props.eventosHorariosExistentes,
  ];
  // hash guard: si los eventos no cambiaron, no se toca el calendario
  const hash = JSON.stringify(
    todos.map((e) => (e.id || "") + (e.start || "") + (e.startRecur || "") + (e.endRecur || "") + (e.title || "")),
  );
  if (hash === lastEventHash) return;
  lastEventHash = hash;

  api.getEventSources().forEach((source) => source.remove());
  if (todos.length > 0) api.addEventSource(todos);
}

// ── 10. MANEJADORES DEL TEMPLATE
// avisa el mes visible para que el padre recalcule la ventana de carga (desde/hasta)
function handleDatesSet(info) {
  const d = info.view.currentStart; // primer dia del mes visible
  emit("rango-visible", { anio: d.getFullYear(), mes: d.getMonth() + 1 });
}

// emite click en una fecha del calendario si no es readonly
function handleDateClick(info) {
  if (props.readonly) return;
  emit("date-click", info.dateStr);
}

// emite click en un evento con sus props extendidas e indice
function handleEventClick(info) {
  const ep = info.event.extendedProps;
  emit("event-click", ep, ep.sesionIndex);
}

// emite el drop de un evento con el nuevo dia o revierte si no tiene indice
function handleEventDrop(info) {
  const index = info.event.extendedProps.sesionIndex;
  if (index === undefined) {
    info.revert();
    return;
  }
  emit("event-drop", index, info.event.startStr.slice(0, 10), info.revert);
}

// ── 11. EXPOSE
// expone metodo para forzar el recalculo del tamano del calendario
function updateCalendarSize() {
  nextTick(() => calendarRef.value?.getApi()?.updateSize());
}

defineExpose({ updateCalendarSize });
</script>

<style scoped>
.calendar-wrapper {
  width: 100%;
  min-height: 425px;
}
.event-content {
  padding: 2px 5px;
  cursor: grab;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.event-content:active {
  cursor: grabbing;
}
.event-content.event-existing {
  cursor: pointer;
}
.event-content.event-existing:active {
  cursor: pointer;
}
.event-hours {
  font-size: 11px;
  font-weight: 700;
  line-height: 1.3;
  display: flex;
  align-items: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.event-time {
  font-size: 9px;
  opacity: 0.88;
  line-height: 1.2;
}
:deep(.fc-event) {
  border-radius: 6px !important;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18) !important;
  transition:
    opacity 0.15s,
    box-shadow 0.15s !important;
}
:deep(.fc-event:hover) {
  opacity: 0.88;
  box-shadow: 0 3px 8px rgba(56, 142, 60, 0.35) !important;
}
:deep(.fc-event.fc-event-dragging) {
  opacity: 0.7;
  box-shadow: 0 6px 16px rgba(56, 142, 60, 0.4) !important;
}
:deep(.fc-daygrid-event) {
  margin-top: 2px !important;
}
:deep(.fc-daygrid-day-frame) {
  min-height: 110px;
}
:deep(.fc-event-dashed) {
  border-style: dashed !important;
  border-width: 2px !important;
}
</style>
