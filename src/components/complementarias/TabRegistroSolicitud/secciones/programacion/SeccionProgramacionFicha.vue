<template>
  <SectionCard title="Programación de la ficha" icon="date_range" :collapsed="collapsed" @toggle="collapsed = !collapsed">
    <div v-show="!collapsed" class="q-pa-md">

      <q-banner v-if="!readonly && !tieneCurso" dense rounded class="bg-orange-1 text-orange-9 q-mb-md">
        <template v-slot:avatar><q-icon name="warning" color="orange-8" /></template>
        Debe <strong>confirmar un curso</strong> desde el <strong>Catálogo</strong> antes de programar la ficha (fechas y sesiones).
      </q-banner>

      <q-banner v-else-if="!readonly && !tieneFormacion" dense rounded class="bg-orange-1 text-orange-9 q-mb-md">
        <template v-slot:avatar><q-icon name="school" color="orange-8" /></template>
        Debe <strong>extraer los datos de formación</strong> (competencias y resultados de aprendizaje) desde la sección <strong>Formación</strong> antes de programar la ficha.
      </q-banner>

      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-12 col-sm-6">
          <q-input v-model="fechaInicioLocal" type="date" outlined color="green-9" label="Fecha de inicio"
            :min="fechaInicioMin" :disable="loading || readonly || !tieneCurso || !tieneFormacion"
            :rules="[v => !v || v >= fechaInicioMin || `La fecha debe ser ${fechaInicioMin} o posterior`]">
            <template v-slot:prepend><q-icon name="event" /></template>
          </q-input>
        </div>
        <div class="col-12 col-sm-6">
          <q-input v-model="fechaFinLocal" type="date" outlined color="green-9" label="Fecha de finalización"
            :min="fechaInicioLocal" :disable="loading || readonly || !tieneCurso || !tieneFormacion"
            :rules="[v => !v || !fechaInicioLocal || v >= fechaInicioLocal || 'Debe ser igual o posterior a la fecha de inicio']">
            <template v-slot:prepend><q-icon name="event" /></template>
          </q-input>
        </div>
      </div>

      <SessionViewTable v-if="readonly" :sesiones-columna-izq="sesionesColumnaIzq" :sesiones-columna-der="sesionesColumnaDer" />

      <template v-else>
        <q-banner v-if="tieneCurso && !tieneRangoFechas" dense rounded class="bg-orange-1 text-orange-9 q-mb-md">
          <template v-slot:avatar><q-icon name="event_busy" color="orange-8" /></template>
          Defina la <strong>fecha de inicio</strong> y <strong>fecha de finalización</strong> del programa para poder programar sesiones.
        </q-banner>
        <div class="row items-center q-mb-md q-gutter-sm">
          <q-btn outline color="green-9" icon="event_repeat" label="Programación general"
            :disable="loading || !tieneCurso || !tieneFormacion || !tieneRangoFechas" @click="dialogProgGeneral = true" />
          <q-btn v-if="sesionesLocal.length" flat color="red-7" icon="delete_sweep" label="Borrar todas"
            :disable="loading" @click="borrarTodasSesiones" />
          <q-space />
          <q-badge color="green-9" class="q-px-md q-py-xs text-subtitle2">
            {{ sesionesLocal.length }} sesiones programadas
          </q-badge>
        </div>

        <q-banner v-if="competencies.length && !resultadoUnico && sesionesSinResultado.length && sesionesLocal.length"
          dense rounded class="bg-orange-1 text-orange-9 q-mb-md">
          <template v-slot:avatar><q-icon name="school" color="orange-8" /></template>
          <strong>{{ sesionesSinResultado.length }}</strong> sesión(es) sin resultado de aprendizaje.
          Haga clic en cada sesión del calendario para asignar el resultado correspondiente.
        </q-banner>

        <div v-if="instructoresParaVerHorario.length > 0" class="q-mb-md">
          <div v-if="instructoresParaVerHorario.length === 1" class="text-caption text-grey-7 q-mb-sm">
            <q-icon name="event_available" size="16px" class="q-mr-xs" />
            Horarios ya asignados de <strong>{{ instructoresParaVerHorario[0].name }}</strong>
          </div>
          <q-select
            v-else
            v-model="instructorSeleccionadoHorario"
            :options="instructoresParaVerHorario"
            option-label="name" option-value="_id"
            emit-value map-options
            outlined dense color="green-9"
            label="Ver horario asignado de"
            class="q-mb-sm"
          >
            <template v-slot:prepend><q-icon name="event_available" /></template>
          </q-select>

          <div v-if="programacionesInstructorSeleccionado.length" class="row q-col-gutter-xs">
            <div v-for="(p, idx) in programacionesInstructorSeleccionado" :key="idx" class="col-12 row items-center q-gutter-xs">
              <div class="color-dot" :style="{ backgroundColor: p.color }"></div>
              <span class="text-caption text-grey-7">{{ p.label }}</span>
            </div>
          </div>
          <div v-else class="text-caption text-grey-6">
            <template v-if="fechaInicioLocal && fechaFinLocal">
              Sin programaciones vigentes entre {{ fechaInicioLocal }} y {{ fechaFinLocal }} para este instructor.
            </template>
            <template v-else>
              Sin programaciones registradas para este instructor.
            </template>
          </div>
        </div>

        <CalendarioProgramacion
          ref="calendarioRef"
          :sesiones="sesionesLocal"
          :fecha-inicio="fechaInicioLocal"
          :fecha-fin="fechaFinLocal"
          :readonly="readonly"
          :tiene-curso="tieneCurso"
          :tiene-rango-fechas="tieneRangoFechas"
          :eventos-horarios-existentes="eventosHorariosExistentes"
          @date-click="onDateClick"
          @event-click="onEventClick"
          @event-drop="onEventDrop"
          @rango-visible="onRangoVisible"
        />
      </template>

      <div class="row justify-end q-mt-md q-gutter-x-lg text-weight-bold">
        <div class="text-grey-7">Horas del curso: <span class="text-black">{{ prfDuracionMaxima || 0 }}</span></div>
        <div class="text-green-9">Horas programadas: <span class="text-black">{{ totalHorasProgramadas }}</span></div>
        <div :class="faltanHoras > 0 ? 'text-orange-9' : faltanHoras < 0 ? 'text-red-9' : 'text-green-9'">
          {{ faltanHoras > 0 ? 'Faltan' : faltanHoras < 0 ? 'Excede' : 'Completo' }}:
          <span class="text-black">{{ Math.abs(faltanHoras) }} h</span>
        </div>
      </div>

    </div>

    <DialogSession
      v-model="dialogSesion"
      :sesion-form="sesionForm"
      :editando-sesion="editandoSesion !== null"
      :fecha-inicio="fechaInicioLocal"
      :fecha-fin="fechaFinLocal"
      :loading="loading"
      :competencies="competencies"
      :instructores="instructoresParaVerHorario"
      @guardar="guardarSesion"
      @eliminar="eliminarSesion"
      @duplicar="duplicarSesion"
    />

    <DialogGeneralSchedule
      v-model="dialogProgGeneral"
      :prog-form="progForm"
      :fecha-inicio="fechaInicioLocal"
      :fecha-fin="fechaFinLocal"
      :prf-duracion-maxima="prfDuracionMaxima"
      :sesiones-a-generar="sesionesAGenerar"
      :prog-form-valido="progFormValido"
      :total-horas-programadas="totalHorasProgramadas"
      :dias-semana="DIAS_SEMANA"
      @toggle-dia="toggleDia"
      @generar="generarSesiones"
      @cerrar="cerrarProgGeneral"
    />
  </SectionCard>
</template>

<script setup>
// ── 1. IMPORTS
import { ref, computed, watch, nextTick } from 'vue'
import { useQuasar } from 'quasar'
import { DIAS_SEMANA, COLORES_TIPO, PALETA_FICHAS } from '../../../../../static/complementarias/ConstantesComplementarias.js'
import { toDateStr, calcularHoras, calcularTotalHoras, sumarDias } from '../../../../../utils/complementarias/DateUtils.js'
import { diasLabel, agruparHorarios, calcularVentana, buildHorarioExistenteHtml } from '../../../../../utils/complementarias/HorarioUtils.js'
import SessionViewTable from './TablaVistaSesiones.vue'
import CalendarioProgramacion from './CalendarioProgramacion.vue'
import DialogSession from '../../dialogos/DialogoSesion.vue'
import DialogGeneralSchedule from '../../dialogos/DialogoProgramacionGeneral.vue'
import SectionCard from '../TarjetaSeccion.vue'

// ── 2. COMPOSABLES
const $q = useQuasar()

// ── 3. PROPS & EMITS
const props = defineProps({
  sesiones:                { type: Array,            required: true },
  fechaInicio:             { type: String,           default: '' },
  fechaFin:                { type: String,           default: '' },
  prfCodigo:               { type: String,           default: '' },
  prfDuracionMaxima:       { type: [Number, String], default: null },
  instructorId:            { type: String,           default: '' },
  nombreInstructor:        { type: String,           default: '' },
  instructoresAdicionales: { type: Array,            default: () => [] },
  loading:                 { type: Boolean,          default: false },
  readonly:                { type: Boolean,          default: false },
  allSchedules:            { type: Object,           default: () => ({ titulada: [], complementaria: [], otros: [] }) },
  competencies:            { type: Array,            default: () => [] },
})

const emit = defineEmits(['update:sesiones', 'update:fechaInicio', 'update:fechaFin', 'cargar-schedules'])

// ── 4. ESTADO REACTIVO
const collapsed                    = ref(!props.readonly)
const calendarioRef                = ref(null)
const sesionesLocal                = ref([...props.sesiones])
const instructorSeleccionadoHorario = ref(null)
const dialogSesion                 = ref(false)
const editandoSesion               = ref(null)
const sesionForm                   = ref({ fecha: '', horaInicio: '', horaFin: '', instructor: '', competencia: '', resultado: '' })
const dialogProgGeneral            = ref(false)
const progForm                     = ref({ dias: [], horaInicio: '', horaFin: '' })

// ── 5. COMPUTED — Flags y fechas
const fechaInicioLocal = computed({
  get: () => props.fechaInicio,
  set: (v) => emit('update:fechaInicio', v),
})

const fechaFinLocal = computed({
  get: () => props.fechaFin,
  set: (v) => emit('update:fechaFin', v),
})

// ── 5b. VENTANA = solo el mes visible del calendario
const mesVisible = ref({ anio: new Date().getFullYear(), mes: new Date().getMonth() + 1 })
const ventanaCarga = computed(() => calcularVentana(mesVisible.value))

function onRangoVisible({ anio, mes }) {
  mesVisible.value = { anio, mes }
  if (instructorSeleccionadoHorario.value && tieneRangoFechas.value) {
    emit('cargar-schedules', instructorSeleccionadoHorario.value, ventanaCarga.value)
  }
}

const tieneCurso       = computed(() => !!props.prfCodigo)
const tieneFormacion   = computed(() => props.competencies.length > 0)
const tieneRangoFechas = computed(() => !!(fechaInicioLocal.value && fechaFinLocal.value))
const hoy              = computed(() => new Date().toISOString().slice(0, 10))

const fechaInicioMin = computed(() => {
  const d = new Date()
  let restantes = 2
  while (restantes > 0) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0) restantes--
  }
  return d.toISOString().slice(0, 10)
})

// ── 6. COMPUTED — Horarios del instructor
const instructoresParaVerHorario = computed(() => {
  const map = new Map()
  if (props.instructorId) map.set(props.instructorId, { _id: props.instructorId, name: props.nombreInstructor })
  props.instructoresAdicionales.forEach(i => {
    if (i._id && !map.has(i._id)) map.set(i._id, { _id: i._id, name: i.name })
  })
  return [...map.values()]
})

const allSchedulesInstructor = computed(() => ({
  titulada:       Array.isArray(props.allSchedules?.titulada)       ? props.allSchedules.titulada       : [],
  complementaria: Array.isArray(props.allSchedules?.complementaria) ? props.allSchedules.complementaria : [],
  otros:          Array.isArray(props.allSchedules?.otros)          ? props.allSchedules.otros          : [],
}))

const allSchedulesInstructorVigentes = computed(() => {
  const desde = ventanaCarga.value.desde
  const hasta = ventanaCarga.value.hasta
  const vigente = (item) =>
    toDateStr(item.fstart) <= hasta && toDateStr(item.fend) >= desde

  const keyTitulada       = (it) => it.fiche?.number ?? it.fiche?._id ?? it._id
  const keyComplementaria = (it) => it.complementaryRequest?.fichaNumber ?? it.complementaryRequest?._id ?? it._id
  const keyOtros          = (it) => it.typeactivity ?? it.otheractivity ?? it._id

  return {
    titulada:       agruparHorarios(allSchedulesInstructor.value.titulada.filter(vigente), keyTitulada),
    complementaria: agruparHorarios(allSchedulesInstructor.value.complementaria.filter(vigente), keyComplementaria),
    otros:          agruparHorarios(allSchedulesInstructor.value.otros.filter(vigente), keyOtros),
  }
})

const colorPorFicha = computed(() => {
  const map = new Map()
  for (const it of allSchedulesInstructorVigentes.value.titulada) {
    const key = it.fiche?.number ?? it.fiche?._id ?? it._id
    if (!map.has(key)) map.set(key, PALETA_FICHAS[map.size % PALETA_FICHAS.length])
  }
  return map
})

const programacionesInstructorSeleccionado = computed(() => {
  const out = []
  for (const it of allSchedulesInstructorVigentes.value.titulada) {
    const key = it.fiche?.number ?? it.fiche?._id ?? it._id
    const color = colorPorFicha.value.get(key)
    out.push({
      color: color ? color.bg : COLORES_TIPO.titulada.bg,
      label: `Ficha ${it.fiche?.number || '—'} · ${it.program?.name || ''} · ${diasLabel(it.days)} ${it.tstart}-${it.tend}`,
    })
  }
  for (const it of allSchedulesInstructorVigentes.value.complementaria) {
    out.push({
      color: COLORES_TIPO.complementaria.bg,
      label: `${it.complementaryRequest?.catalogCourseName || 'Complementaria'} · Ficha ${it.complementaryRequest?.fichaNumber || '—'} · ${diasLabel(it.days)} ${it.tstart}-${it.tend}`,
    })
  }
  for (const it of allSchedulesInstructorVigentes.value.otros) {
    out.push({
      color: COLORES_TIPO.otros.bg,
      label: `${it.typeactivity || it.otheractivity || 'Otra actividad'} · ${diasLabel(it.days)} ${it.tstart}-${it.tend}`,
    })
  }
  return out
})

const eventosHorariosExistentes = computed(() => {
  const eventos = []
  const ventanaDesde = ventanaCarga.value.desde
  const ventanaHasta = ventanaCarga.value.hasta
  const crearEventoCalendario = (horario, tipo, indice, colorPersonalizado) => {
    const color = colorPersonalizado || COLORES_TIPO[tipo]
    const fstart = toDateStr(horario.fstart)
    const fend   = toDateStr(horario.fend)
    return {
      id: `existing__${tipo}__${horario._id}__${indice}`,
      daysOfWeek: horario.days || [],
      startTime: horario.tstart,
      endTime: horario.tend,
      startRecur: fstart > ventanaDesde ? fstart : ventanaDesde,
      endRecur:   sumarDias(fend < ventanaHasta ? fend : ventanaHasta, 1),
      display: 'block',
      backgroundColor: color.bg,
      borderColor: color.border,
      textColor: '#ffffff',
      editable: false,
      ...(color.dashed ? { classNames: ['fc-event-dashed'] } : {}),
      extendedProps: { isExisting: true, tipo, ...horario },
    }
  }
  allSchedulesInstructorVigentes.value.titulada.forEach((it, i) => {
    const key = it.fiche?.number ?? it.fiche?._id ?? it._id
    eventos.push(crearEventoCalendario(it, 'titulada', i, colorPorFicha.value.get(key)))
  })
  allSchedulesInstructorVigentes.value.complementaria.forEach((it, i) => eventos.push(crearEventoCalendario(it, 'complementaria', i)))
  allSchedulesInstructorVigentes.value.otros.forEach((it, i) => eventos.push(crearEventoCalendario(it, 'otros', i)))
  return eventos
})

// ── 7. COMPUTED — Horas, sesiones readonly y auto-asignación
const totalHorasProgramadas = computed(() => calcularTotalHoras(sesionesLocal.value))
const faltanHoras           = computed(() => (props.prfDuracionMaxima || 0) - totalHorasProgramadas.value)
const sesionesSinResultado  = computed(() => sesionesLocal.value.filter(s => !s.resultado))

const resultadoUnico = computed(() => {
  if (props.competencies.length !== 1) return null
  const resultados = props.competencies[0].resultados || []
  return resultados.length === 1 ? resultados[0] : null
})

const competenciaUnica = computed(() =>
  props.competencies.length === 1 ? props.competencies[0].name : null
)

const sesionesColumnaIzq = computed(() => {
  const mid = Math.ceil(sesionesLocal.value.length / 2)
  return sesionesLocal.value.slice(0, mid)
})

const sesionesColumnaDer = computed(() => {
  const mid = Math.ceil(sesionesLocal.value.length / 2)
  return sesionesLocal.value.slice(mid)
})

const sesionesAGenerar = computed(() => {
  const { dias } = progForm.value
  if (!fechaInicioLocal.value || !fechaFinLocal.value || !dias.length) return 0
  let count = 0
  const cur = new Date(fechaInicioLocal.value + 'T00:00:00')
  const fin = new Date(fechaFinLocal.value + 'T00:00:00')
  while (cur <= fin) { if (dias.includes(cur.getDay())) count++; cur.setDate(cur.getDate() + 1) }
  return count
})

const progFormValido = computed(() => {
  const { dias, horaInicio, horaFin } = progForm.value
  return dias.length > 0 && horaInicio && horaFin && horaFin > horaInicio
})

// ── 8. WATCHERS
// Padre → hijo: SHALLOW (solo ante reemplazo de referencia del array).
// La salida hijo → padre ya NO usa watcher deep: se emite con emitirSesiones()
// en cada punto que modifica las sesiones (ver HELPERS / HANDLERS).
watch(() => props.sesiones, (val) => {
  sesionesLocal.value = [...val]
})

watch(instructoresParaVerHorario, (lista) => {
  const ids = lista.map(i => i._id)
  if (lista.length === 1) {
    instructorSeleccionadoHorario.value = lista[0]._id
  } else if (!ids.includes(instructorSeleccionadoHorario.value)) {
    instructorSeleccionadoHorario.value = lista[0]?._id || null
  }
}, { immediate: true })

watch(instructorSeleccionadoHorario, (id) => {
  if (tieneRangoFechas.value) {
    emit('cargar-schedules', id, ventanaCarga.value)
  }
}, { immediate: true })

watch([() => props.fechaInicio, () => props.fechaFin], () => {
  ajustarYRevisarSesiones()
  if (tieneRangoFechas.value && instructorSeleccionadoHorario.value) {
    emit('cargar-schedules', instructorSeleccionadoHorario.value, ventanaCarga.value)
  }
})

// reajusta el calendario al expandir la sección (efecto de UI puntual, no circular)
watch(collapsed, (isCollapsed) => {
  if (!isCollapsed) nextTick(() => calendarioRef.value?.updateCalendarSize())
})

// ── 9. HELPERS
const TIPO_HORARIO_LABEL  = { titulada: 'Titulada', complementaria: 'otra Complementaria', otros: 'otra actividad' }

// muestra una notificación arriba con tipo, ícono, mensaje y duración
function notificar(type, icon, message, timeout = 3000) {
  $q.notify({ type, icon, message, position: 'top', timeout })
}

// ordena las sesiones locales por fecha
function ordenarSesiones() {
  sesionesLocal.value.sort((a, b) => a.fecha.localeCompare(b.fecha))
}

// emite las sesiones al padre (reemplaza el watcher deep de salida)
function emitirSesiones() {
  emit('update:sesiones', [...sesionesLocal.value])
}

// al cambiar el rango: elimina sesiones fuera del nuevo rango
function ajustarYRevisarSesiones() {
  if (!sesionesLocal.value.length) return

  const ini = fechaInicioLocal.value, fin = fechaFinLocal.value
  if (ini && fin && ini <= fin) {
    const fuera = sesionesLocal.value.filter(s => s.fecha < ini || s.fecha > fin)
    if (fuera.length) {
      sesionesLocal.value = sesionesLocal.value.filter(s => s.fecha >= ini && s.fecha <= fin)
      emitirSesiones()
      notificar('positive', 'delete_sweep', `Se eliminaron ${fuera.length} sesión(es) fuera del rango.`, 3500)
    }
  }
}

// ── 10. VALIDACIÓN
function cruceConHorarioExistente(fecha, horaInicio, horaFin) {
  const dow = new Date(fecha + 'T00:00:00').getDay()
  for (const tipo of ['titulada', 'complementaria', 'otros']) {
    for (const item of allSchedulesInstructor.value[tipo]) {
      if (fecha < toDateStr(item.fstart) || fecha > toDateStr(item.fend)) continue
      if (!(item.days || []).includes(dow)) continue
      if (horaFin <= item.tstart || horaInicio >= item.tend) continue
      return { tipo, label: TIPO_HORARIO_LABEL[tipo] }
    }
  }
  return null
}

function validarSesion(fecha, horaInicio, horaFin, exceptIdx = null) {
  if ((fechaInicioLocal.value && fecha < fechaInicioLocal.value) ||
      (fechaFinLocal.value && fecha > fechaFinLocal.value)) {
    notificar('negative', 'event_busy', 'Fecha fuera del rango permitido: la sesión debe estar dentro del programa', 3500)
    return false
  }
  const overlap = sesionesLocal.value.some((s, idx) =>
    idx !== exceptIdx && s.fecha === fecha && !(horaFin <= s.horaInicio || horaInicio >= s.horaFin)
  )
  if (overlap) {
    notificar('negative', 'schedule', 'Conflicto de horario: existe solapamiento con otra sesión en ese día', 3500)
    return false
  }
  const cruce = cruceConHorarioExistente(fecha, horaInicio, horaFin)
  if (cruce) {
    notificar('negative', 'event_busy', `Conflicto de horario: el instructor ya tiene programación de ${cruce.label} en ese horario`, 4000)
    return false
  }
  return true
}

// ── 11. HANDLERS CALENDARIO
function onDateClick(dateStr) {
  if (!tieneCurso.value) {
    notificar('warning', 'menu_book', 'Debe confirmar un curso desde el catálogo antes de programar la ficha')
    return
  }
  if (!tieneFormacion.value) {
    notificar('warning', 'school', 'Debe extraer los datos de formación antes de programar sesiones')
    return
  }
  if (!tieneRangoFechas.value) {
    notificar('warning', 'event_busy', 'Defina la fecha de inicio y fin del programa antes de programar sesiones')
    return
  }
  sesionForm.value     = { fecha: dateStr, horaInicio: '', horaFin: '', instructor: '', competencia: '', resultado: '' }
  editandoSesion.value = null
  dialogSesion.value   = true
}

function onEventClick(extendedProps, sesionIndex) {
  if (extendedProps.isExisting) {
    mostrarInfoHorarioExistente(extendedProps)
    return
  }
  if (props.loading || props.readonly) return
  if (sesionIndex === undefined || sesionIndex >= sesionesLocal.value.length) return
  const s = sesionesLocal.value[sesionIndex]
  sesionForm.value     = { fecha: s.fecha, horaInicio: s.horaInicio, horaFin: s.horaFin, instructor: s.instructor || '', competencia: s.competencia || '', resultado: s.resultado || '' }
  editandoSesion.value = sesionIndex
  dialogSesion.value   = true
}

function onEventDrop(index, newFecha, revert) {
  if (index === undefined || index >= sesionesLocal.value.length) { revert(); return }
  if (newFecha < hoy.value) {
    revert()
    notificar('negative', 'event_busy', 'No se puede mover una sesión a una fecha pasada')
    return
  }
  const sesion = sesionesLocal.value[index]
  if (!validarSesion(newFecha, sesion.horaInicio, sesion.horaFin, index)) { revert(); return }
  sesionesLocal.value[index].fecha = newFecha
  ordenarSesiones()
  emitirSesiones()
  notificar('positive', 'event', 'Sesión movida correctamente', 2500)
}

// abre el diálogo con la info del horario ya asignado (HTML armado en util)
function mostrarInfoHorarioExistente(p) {
  $q.dialog({ title: '', message: buildHorarioExistenteHtml(p), html: true, ok: { label: 'Cerrar', flat: true, color: 'green-9' } })
}

// ── 12. SESIÓN INDIVIDUAL
function guardarSesion() {
  const f = sesionForm.value
  if (!f.fecha || !f.horaInicio || !f.horaFin) {
    notificar('negative', 'schedule', 'La fecha, hora de inicio y hora de fin son obligatorias')
    return
  }
  if (f.horaFin <= f.horaInicio) {
    notificar('negative', 'schedule', 'Horario inválido: la hora de fin debe ser posterior a la hora de inicio')
    return
  }
  const total = calcularHoras(f.horaInicio, f.horaFin)
  if (total <= 0) {
    notificar('negative', 'schedule', 'La sesión debe tener duración mayor a cero')
    return
  }
  if (!validarSesion(f.fecha, f.horaInicio, f.horaFin, editandoSesion.value)) return
  if (competenciaUnica.value && !f.competencia) f.competencia = competenciaUnica.value
  if (resultadoUnico.value && !f.resultado) f.resultado = resultadoUnico.value
  if (props.competencies.length && !f.resultado) {
    notificar('negative', 'school', 'Debe seleccionar un resultado de aprendizaje para la sesión')
    return
  }

  const data = { fecha: f.fecha, horaInicio: f.horaInicio, horaFin: f.horaFin, totalHoras: total, instructor: f.instructor || '', competencia: f.competencia || '', resultado: f.resultado || '' }
  if (editandoSesion.value !== null) {
    sesionesLocal.value[editandoSesion.value] = data
    notificar('positive', 'edit_calendar', 'Sesión actualizada correctamente', 2500)
  } else {
    sesionesLocal.value.push(data)
    ordenarSesiones()
    notificar('positive', 'event_available', 'Sesión creada correctamente', 2500)
  }
  emitirSesiones()
  dialogSesion.value   = false
  sesionForm.value     = { fecha: '', horaInicio: '', horaFin: '', instructor: '', competencia: '', resultado: '' }
  editandoSesion.value = null
}

function eliminarSesion() {
  $q.dialog({
    title: 'Eliminar sesión',
    message: '¿Está seguro de eliminar esta sesión?',
    cancel: { label: 'Cancelar', flat: true, color: 'grey-7' },
    ok:     { label: 'Eliminar', color: 'red-7', unelevated: true },
    persistent: true,
  }).onOk(() => {
    if (editandoSesion.value !== null) sesionesLocal.value.splice(editandoSesion.value, 1)
    emitirSesiones()
    dialogSesion.value   = false
    editandoSesion.value = null
    sesionForm.value     = { fecha: '', horaInicio: '', horaFin: '', instructor: '', competencia: '', resultado: '' }
    notificar('positive', 'delete', 'Sesión eliminada correctamente', 2500)
  })
}

async function duplicarSesion() {
  const { horaInicio, horaFin, instructor, competencia, resultado } = sesionForm.value
  dialogSesion.value   = false
  editandoSesion.value = null
  await nextTick()
  sesionForm.value   = { fecha: '', horaInicio, horaFin, instructor, competencia, resultado }
  dialogSesion.value = true
}

// ── 13. PROGRAMACIÓN GENERAL
function toggleDia(val) {
  const idx = progForm.value.dias.indexOf(val)
  if (idx === -1) progForm.value.dias.push(val)
  else progForm.value.dias.splice(idx, 1)
}

function generarSesiones() {
  if (!progFormValido.value) return
  const { dias, horaInicio, horaFin } = progForm.value
  const horasPorSesion = calcularHoras(horaInicio, horaFin)

  // recorre el rango y separa las que se pueden crear de las que cruzan con horarios del instructor
  const nuevas = []
  const omitidas = []   // fechas con cruce de horario
  const cur = new Date(fechaInicioLocal.value + 'T00:00:00')
  const fin = new Date(fechaFinLocal.value + 'T00:00:00')
  while (cur <= fin) {
    if (dias.includes(cur.getDay())) {
      const fecha = cur.toISOString().slice(0, 10)
      if (cruceConHorarioExistente(fecha, horaInicio, horaFin)) {
        omitidas.push(fecha)
      } else {
        nuevas.push({ fecha, horaInicio, horaFin, totalHoras: horasPorSesion, competencia: competenciaUnica.value || '', resultado: resultadoUnico.value || '' })
      }
    }
    cur.setDate(cur.getDate() + 1)
  }

  if (nuevas.length === 0) {
    const message = omitidas.length > 0
      ? `No se generó ninguna sesión: las ${omitidas.length} fecha(s) tienen cruce con horarios del instructor`
      : 'No hay días seleccionados dentro del rango para generar sesiones'
    notificar('warning', 'event_busy', message, 3500)
    return
  }

  // la programación general REEMPLAZA las sesiones (evita duplicados). Confirma si ya había.
  const aplicar = () => {
    sesionesLocal.value = nuevas
    ordenarSesiones()
    emitirSesiones()
    cerrarProgGeneral()
    notificarResultadoGeneracion(nuevas.length, omitidas)
  }

  if (sesionesLocal.value.length) {
    $q.dialog({
      title: 'Reemplazar sesiones',
      message: `Esto reemplazará las ${sesionesLocal.value.length} sesión(es) actuales por la nueva programación general. ¿Continuar?`,
      cancel: { label: 'Cancelar', flat: true, color: 'grey-7' },
      ok:     { label: 'Sí, reemplazar', color: 'green-9', unelevated: true },
      persistent: true,
    }).onOk(aplicar)
  } else {
    aplicar()
  }
}

// avisa cuántas sesiones se crearon y cuáles no se pudieron por cruce de horario (con sus fechas)
function notificarResultadoGeneracion(creadas, omitidas) {
  if (omitidas.length) {
    notificar('warning', 'event_repeat',
      `Se crearon ${creadas} sesión(es). ${omitidas.length} no se pudieron por cruce de horario (${omitidas.join(', ')}). Revisa y agrega una nueva sesión en esos días si aplica.`,
      6500)
  } else {
    notificar('positive', 'event_repeat', `Se crearon ${creadas} sesión(es) correctamente.`, 3000)
  }
}

// borra todas las sesiones programadas (con confirmación)
function borrarTodasSesiones() {
  if (!sesionesLocal.value.length) return
  $q.dialog({
    title: 'Borrar todas las sesiones',
    message: `¿Seguro que quieres borrar las ${sesionesLocal.value.length} sesión(es) programadas?`,
    cancel: { label: 'Cancelar', flat: true, color: 'grey-7' },
    ok:     { label: 'Sí, borrar todas', color: 'red-7', unelevated: true },
    persistent: true,
  }).onOk(() => {
    sesionesLocal.value = []
    emitirSesiones()
    notificar('positive', 'delete', 'Se borraron todas las sesiones.', 2500)
  })
}

function cerrarProgGeneral() {
  dialogProgGeneral.value = false
  progForm.value = { dias: [], horaInicio: '', horaFin: '' }
}

// ── 14. EXPOSE
function updateCalendarSize() {
  calendarioRef.value?.updateCalendarSize()
}

defineExpose({ updateCalendarSize })
</script>

<style scoped>
.color-dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
</style>
