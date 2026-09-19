<template>
  <div>
    <FiltrosSolicitudes
      v-model:tab-activo="tabActivo"
      v-model:search-text="searchText"
      v-model:search-ficha="searchFicha"
      v-model:sort-mode="sortMode"
      :modo="modo"
      :tab-label="TAB_LABEL"
      :tab-counts="tabCounts"
      :opciones-orden="opcionesOrden"
      @limpiar="limpiarFiltros"
      @toggle-filtro="toggleFiltro"
      @sort-change="onSortChange"
    />

    <!-- Estado vacío inicial -->
    <div v-if="!hasSearched" class="text-center q-pa-xl">
      <q-icon name="manage_search" size="64px" color="grey-4" />
      <div class="text-grey-5 q-mt-md empty-title">Sin registros aún</div>
      <div class="text-grey-4 q-mt-xs text-body2">Selecciona un filtro o busca por nombre de curso</div>
    </div>

    <!-- Tabla -->
    <div v-else class="row justify-center flex q-mb-md" style="position: relative">
      <q-table
        class="full-width my-sticky-header-table"
        :style="solicitudesFiltradas.length > 0 ? 'height: 62vh' : ''"
        flat bordered
        :rows="solicitudesFiltradas"
        :columns="columnas"
        rows-per-page-label="Registros por página"
        :pagination="{ rowsPerPage: 30 }"
      >
        <template v-slot:no-data>
          <div class="full-width text-center q-pa-xl">
            <q-icon name="inbox" size="64px" color="grey-4" />
            <div class="text-grey-5 q-mt-md empty-title">
              Sin solicitudes {{ tabActivo ? TAB_LABEL[tabActivo]?.toLowerCase() + ' ' : '' }}aún
            </div>
          </div>
        </template>

        <!-- Headers de dos líneas -->
        <template v-slot:header-cell-fichaCaracterizacion="props">
          <q-th :props="props" class="text-center">
            Ficha de<br>Caracterización
          </q-th>
        </template>
        <template v-slot:header-cell-fechaInicio="props">
          <q-th :props="props" class="text-center">
            Fecha de<br>Inicio
          </q-th>
        </template>

        <!-- Nombre del curso truncado con tooltip -->
        <template v-slot:body-cell-curso="props">
          <q-td :props="props" class="cell-curso">
            {{ props.value }}
            <q-tooltip v-if="props.row._cursoCompleto?.length > 40" anchor="top middle" self="bottom middle">
              {{ props.row._cursoCompleto }}
            </q-tooltip>
          </q-td>
        </template>

        <!-- Badge: estado principal -->
        <template v-slot:body-cell-estado="props">
          <q-td :props="props">
            <q-badge
              :color="estadoColor(props.value)"
              class="badge-estado"
            >
              {{ props.value }}
            </q-badge>
          </q-td>
        </template>

        <!-- Columna opciones -->
        <template v-slot:body-cell-opciones="props">
          <q-td :props="props">
            <AccionesSolicitud
              :row="props.row"
              :modo="modo"
              :tab-activo="tabActivo"
              :loading-detalle="loadingDetalle"
              :loading-accion="loadingAccion"
              @ver="abrirDetalle"
              @aprobar="aprobarSolicitud"
              @rechazar="abrirDialogRechazo"
              @asignar-ficha="abrirAsignarFicha"
              @avanzar-programada="avanzarProgramada"
              @programar="abrirProgramar"
              @avanzar-inscripcion="avanzarInscripcion"
              @avanzar-matriculada="avanzarMatriculada"
              @reprogramar="abrirReprogramar"
              @avanzar-ejecucion="avanzarEjecucion"
              @cancelar="abrirCancelar"
              @evaluar="abrirEvaluar"
              @eventos="abrirEventos"
              @ampliacion-coordinador="(id) => abrirAmpliacion(id, 'coordinador')"
              @ampliacion-instructor="(id) => abrirAmpliacion(id, 'instructor')"
              @cerrar-ficha="abrirCerrarFicha"
              @editar="abrirEditar"
              @reenviar="abrirReenviar"
            />
          </q-td>
        </template>
      </q-table>

      <q-inner-loading :showing="loadingTabla">
        <q-spinner-gears size="50px" color="green-9" />
      </q-inner-loading>
    </div>

    <!-- Dialog VER / EDITAR -->
    <DialogoVerEditarSolicitud
      v-if="solicitudSeleccionada"
      v-model="dialogVerEditar"
      :solicitud="solicitudSeleccionada"
      :modo-edicion="modoEdicion"
      :parametros="parametros"
      @guardado="onGuardarEdicion"
    />

    <!-- Dialog RECHAZAR -->
    <DialogoMotivo
      v-model="dialogRechazo"
      header-color="bg-red-8"
      icon="cancel"
      titulo="RECHAZAR SOLICITUD"
      subtexto="El instructor recibirá un correo con el motivo"
      subtexto-color="text-red-2"
      confirm-label="RECHAZAR"
      input-label="Motivo de rechazo *"
      input-placeholder="Indique el motivo por el cual se rechaza la solicitud..."
      input-color="red-8"
      volver-label="CANCELAR"
      @confirmar="(motivo) => confirmarRechazo(motivo)"
    />

    <!-- Dialog CANCELAR -->
    <DialogoMotivo
      v-model="dialogCancelar"
      header-color="bg-grey-8"
      icon="block"
      titulo="CANCELAR SOLICITUD"
      subtexto="Esta acción no se puede deshacer"
      subtexto-color="text-grey-4"
      confirm-label="CANCELAR SOLICITUD"
      input-label="Motivo de cancelación *"
      input-placeholder="Indique el motivo por el cual se cancela la solicitud..."
      input-color="grey-8"
      volver-label="VOLVER"
      @confirmar="(motivo) => confirmarCancelar(motivo)"
    />

    <!-- Dialog REENVIAR -->
    <DialogoReenviarSolicitud
      v-model="dialogReenviar"
      :loading="loadingReenviar"
      @confirmar="confirmarReenviar"
      @cancelar="cerrarDialogReenviar"
    />

    <!-- Dialog ASIGNAR FICHA -->
    <DialogoAsignarFicha
      v-if="idParaFicha"
      v-model="dialogAsignarFicha"
      :solicitud-id="idParaFicha"
      :solicitud-data="solicitudDataParaFicha"
      :parametros="parametros"
      :loading-parametros="loadingParametros"
      @guardado="onAsignarFicha"
    />


    <!-- Dialog CERRAR FICHA -->
    <DialogoCerrarFicha
      v-if="idParaCerrar"
      v-model="dialogCerrar"
      :solicitud-id="idParaCerrar"
      @guardado="fetchSolicitudes"
    />

    <!-- Dialog PROGRAMAR / RE-PROGRAMAR -->
    <DialogoProgramar
      v-if="solicitudParaProgramar"
      v-model="dialogProgramar"
      :modo="modoProgramar"
      :solicitud-id="solicitudParaProgramar._id"
      :schedule-id="scheduleIdProgramar"
      :instructor-id="solicitudParaProgramar._detalle?.instructor?._id || ''"
      :duracion-max="solicitudParaProgramar.horas || 0"
      :schedule-data="solicitudParaProgramar._detalle?.schedule || {}"
      :solicitud-data="solicitudParaProgramar._detalle || {}"
      :ambientes="ambientes"
      @guardado="onProgramar"
    />

    <!-- Dialog EVALUAR RESULTADOS -->
    <DialogoEvaluarResultados
      v-if="idParaAccion"
      v-model="dialogEvaluar"
      :solicitud-id="idParaAccion"
      @guardado="fetchSolicitudes"
    />

    <!-- Dialog AGREGAR EVENTOS -->
    <DialogoAgregarEventos
      v-if="idParaAccion"
      v-model="dialogEventos"
      :solicitud-id="idParaAccion"
    />

    <!-- Dialog AMPLIACION -->
    <DialogoAmpliacion
      v-if="idParaAccion"
      v-model="dialogAmpliacion"
      :solicitud-id="idParaAccion"
      :modo="modoAmpliacion"
    />

  </div>
</template>

<script setup>
// ── 1. IMPORTS
import { ref, computed, watch, onMounted } from 'vue'
import { get, put } from '../../../services/api.js'
import { estadoColor } from '../../../utils/complementarias/EstadoColorUtils.js'
import { TAB_LABEL, ESTADOS_APROBADAS, OPCIONES_ORDEN } from '../../../static/complementarias/ConstantesComplementarias.js'
import { formatearFilaSolicitud, columnasListado, mapTabCounts, FILTROS_LISTADO, PARAMS_LISTADO } from '../../../utils/complementarias/SolicitudUtils.js'
import { notifySuccessRequest, notifyErrorRequest, notifyWarningRequest } from '../../../common/notify.js'
import AccionesSolicitud from './acciones/AccionesSolicitud.vue'
import FiltrosSolicitudes from './filtros/FiltrosSolicitudes.vue'
import DialogoMotivo from './dialogos/DialogoMotivo.vue'
import DialogoReenviarSolicitud from './dialogos/DialogoReenviarSolicitud.vue'
import DialogoCerrarFicha from './dialogos/DialogoCerrarFicha.vue'
import DialogoVerEditarSolicitud from './dialogos/DialogoVerEditarSolicitud.vue'
import DialogoAsignarFicha from './dialogos/DialogoAsignarFicha.vue'
import DialogoProgramar from './dialogos/DialogoProgramar.vue'
import DialogoEvaluarResultados from './dialogos/DialogoEvaluarResultados.vue'
import DialogoAgregarEventos from './dialogos/DialogoAgregarEventos.vue'
import DialogoAmpliacion from './dialogos/DialogoAmpliacion.vue'

// ── 3. PROPS & EMITS
const props = defineProps({
  modo: { type: String, required: true }, // 'instructor' | 'admin'
})

// ── 4. ESTADO REACTIVO
// 4a. Control UI
const hasSearched                = ref(false)
const cargadoInstructor          = ref(false)
const loadingTabla               = ref(false)
const loadingDetalle             = ref(null)
const loadingAccion              = ref(null)
const tabActivo                  = ref(null)
const searchText                 = ref('')
const searchFicha                = ref('')
const sortBy                     = ref('createdAt')
const sortOrder                  = ref('desc')
const sortMode                   = ref('recientes')
const opcionesOrden              = OPCIONES_ORDEN

// 4b. Datos cargados
const parametros        = ref([])
const ambientes         = ref([])
const loadingParametros = ref(false)
const counts            = ref({})   // conteos por estado (server-side) para badges de tabs

// 4c. Datos de trabajo
const solicitudes                = ref([])
const todasSolicitudesInstructor = ref([])
const solicitudSeleccionada      = ref(null)

// 4d. Control de diálogos
// Dialog VER/EDITAR
const dialogVerEditar = ref(false)
const modoEdicion     = ref(false)
// Dialog RECHAZAR
const dialogRechazo  = ref(false)
const idParaRechazar = ref(null)
// Dialog CANCELAR
const dialogCancelar    = ref(false)
const idParaCancelar    = ref(null)
// Dialog REENVIAR
const dialogReenviar  = ref(false)
const idParaReenviar  = ref(null)
const loadingReenviar = ref(false)
// Dialog ASIGNAR FICHA
const dialogAsignarFicha     = ref(false)
const idParaFicha            = ref(null)
const solicitudDataParaFicha = ref({})
// Dialog PROGRAMAR / RE-PROGRAMAR
const dialogProgramar        = ref(false)
const modoProgramar          = ref('programar')
const solicitudParaProgramar = ref(null)
const scheduleIdProgramar    = ref('')
// Dialog CERRAR FICHA
const dialogCerrar = ref(false)
const idParaCerrar = ref(null)
// Dialogs EJECUCION
const dialogEvaluar    = ref(false)
const dialogEventos    = ref(false)
const dialogAmpliacion = ref(false)
const modoAmpliacion   = ref('coordinador')
const idParaAccion     = ref(null)

// ── 5. COMPUTED
// columnas de la tabla según el rol (admin agrega la columna instructor)
const columnas = computed(() => columnasListado(props.modo))

const solicitudesFiltradas = computed(() => {
  let list = solicitudes.value
  const textoBusqueda = searchText.value?.toLowerCase()
  const busquedaFicha = searchFicha.value?.toLowerCase()
  if (textoBusqueda) list = list.filter(s => s.curso?.toLowerCase().includes(textoBusqueda))
  if (busquedaFicha) list = list.filter(s => s.fichaCaracterizacion?.toLowerCase().includes(busquedaFicha))

  if (sortMode.value === 'inicio_asc' || sortMode.value === 'inicio_desc') {
    const dir = sortMode.value === 'inicio_asc' ? 1 : -1
    list = [...list].sort((a, b) => {
      if (!a.fechaInicio || a.fechaInicio === '—') return 1
      if (!b.fechaInicio || b.fechaInicio === '—') return -1
      return dir * a.fechaInicio.localeCompare(b.fechaInicio)
    })
  }

  return list
})

// conteos por tab (mapea grupos de estados a los counts del backend)
const tabCounts = computed(() => mapTabCounts(counts.value))

// ── 6. WATCHERS
watch(tabActivo, (val) => {
  if (val) { hasSearched.value = true; fetchSolicitudes() }
})

watch(searchText, (val) => {
  if (val && val.trim()) {
    hasSearched.value = true
    if (!cargadoInstructor.value || props.modo === 'admin') fetchSolicitudes()
  } else if (!tabActivo.value) {
    if (props.modo === 'instructor') {
      solicitudes.value = todasSolicitudesInstructor.value
      hasSearched.value = true
    } else {
      hasSearched.value = false
    }
  }
})

// ── 7. CICLO DE VIDA
onMounted(() => {
  cargarCounts()
  if (props.modo === 'instructor') cargarTodoInstructor()
  if (props.modo === 'admin') {
    cargarParametros()
    cargarAmbientes()
  }
})

// ── 9. API / ENDPOINTS
async function fetchSolicitudes() {
  if (!tabActivo.value) {
    // Sin filtro activo: el instructor ve todas sus solicitudes; el coordinador/programador no muestra nada
    if (props.modo === 'instructor') await cargarTodoInstructor()
    return
  }
  loadingTabla.value = true
  try {
    if (props.modo === 'instructor') {
      /* Carga todas las solicitudes del instructor una sola vez y filtra localmente */
      if (!cargadoInstructor.value) {
        const res = await get('/complementary/instructor/requests')
        todasSolicitudesInstructor.value = (res || []).map(formatearFilaSolicitud)
        cargadoInstructor.value = true
      }
      solicitudes.value = todasSolicitudesInstructor.value.filter(FILTROS_LISTADO[tabActivo.value] || (() => true))
    } else {
      // Preserva el scheduleData local antes de re-poblar la lista desde la API
      const scheduleCache = {}
      for (const s of solicitudes.value) {
        if (s._scheduleId || s._scheduleData) {
          scheduleCache[s._id] = { _scheduleId: s._scheduleId, _scheduleData: s._scheduleData }
        }
      }

      const res  = await get('/complementary/requests', {
        ...(PARAMS_LISTADO[tabActivo.value] || {}),
        sortBy: sortBy.value,
        sortOrder: sortOrder.value,
      })
      let list   = (res || []).map(r => {
        const row = formatearFilaSolicitud(r)
        return scheduleCache[row._id] ? { ...row, ...scheduleCache[row._id] } : row
      })
      if (tabActivo.value === 'aprobadas') {
        // Incluye únicamente los estados del flujo de aprobación activa
        list = list.filter(r => ESTADOS_APROBADAS.includes(r._stateRaw))
      }
      solicitudes.value = list
    }
  } catch (err) {
    notifyErrorRequest(err?.response?.data?.msg || 'Error al cargar las solicitudes')
  }
  loadingTabla.value = false
  cargarCounts()
}

// conteos por estado para los badges de las tabs (instructor→las suyas, admin→todas)
async function cargarCounts() {
  try {
    const res = await get('/complementary/requests/counts')
    counts.value = res || {}
  } catch (e) { console.error(e) }
}

async function cargarParametros() {
  loadingParametros.value = true
  try {
    const res = await get('/complementary/parametros')
    parametros.value = Array.isArray(res) ? res : []
  } catch (err) {
    notifyErrorRequest(err?.response?.data?.msg || 'Error al cargar los parámetros')
  }
  loadingParametros.value = false
}

async function cargarAmbientes() {
  try {
    const res = await get('/environments?status=0')
    ambientes.value = (res || []).map(a => ({ label: a.name, value: a._id }))
  } catch (err) {
    notifyErrorRequest(err?.response?.data?.msg || 'Error al cargar los ambientes')
  }
}

// ── 10. MANEJADORES DEL TEMPLATE
function onSortChange(val) {
  if (val === 'recientes')   { sortBy.value = 'createdAt';   sortOrder.value = 'desc' }
  if (val === 'inicio_asc')  { sortBy.value = 'fechaInicio'; sortOrder.value = 'asc'  }
  if (val === 'inicio_desc') { sortBy.value = 'fechaInicio'; sortOrder.value = 'desc' }
  if (props.modo === 'admin') fetchSolicitudes()
}

function toggleFiltro(val) {
  if (tabActivo.value === val) {
    tabActivo.value = null
    if (props.modo === 'instructor') {
      solicitudes.value = todasSolicitudesInstructor.value
      hasSearched.value = true
    } else {
      hasSearched.value = false
      solicitudes.value = []
    }
  } else {
    tabActivo.value = val
  }
}

// Limpiar filtros: el instructor vuelve a ver todas sus solicitudes, el coordinador/programador
// vuelve al estado vacío inicial
function limpiarFiltros() {
  tabActivo.value  = null
  searchText.value = ''
  searchFicha.value = ''
  if (props.modo === 'instructor') {
    solicitudes.value = todasSolicitudesInstructor.value
    hasSearched.value = true
  } else {
    hasSearched.value = false
    solicitudes.value = []
  }
}

// Coordinador/programador: solo se muestran solicitudes al buscar o activar un filtro.
// Instructor: se cargan y muestran todas sus solicitudes desde el inicio, conservando los filtros.
async function cargarTodoInstructor() {
  hasSearched.value = true
  loadingTabla.value = true
  try {
    if (!cargadoInstructor.value) {
      const res = await get('/complementary/instructor/requests')
      todasSolicitudesInstructor.value = (res || []).map(formatearFilaSolicitud)
      cargadoInstructor.value = true
    }
    solicitudes.value = todasSolicitudesInstructor.value
  } catch (err) {
    notifyErrorRequest(err?.response?.data?.msg || 'Error al cargar tus solicitudes')
  }
  loadingTabla.value = false
}

// Ver / Editar — carga el detalle de la solicitud y abre el dialog en modo ver o editar
async function abrirVerEditar(row, edicion) {
  loadingDetalle.value = row._id
  try {
    const res = await get(`/complementary/requests/${row._id}`)
    solicitudSeleccionada.value = {
      ...row,
      _detalle: { ...res, _scheduleData: row._scheduleData || null },
    }
  } catch {
    solicitudSeleccionada.value = { ...row, _detalle: row._detalle || {} }
  }
  loadingDetalle.value  = null
  modoEdicion.value     = edicion
  dialogVerEditar.value = true
}

const abrirDetalle = (row) => abrirVerEditar(row, false)
const abrirEditar  = (row) => abrirVerEditar(row, true)

async function onGuardarEdicion({ id, data }) {
  loadingAccion.value   = id
  dialogVerEditar.value = false
  try {
    const payload = { ...data }
    const res = await put(`/complementary/requests/${id}`, payload)
    notifySuccessRequest(res?.msg || 'Solicitud guardada correctamente')
    cargadoInstructor.value = false
    todasSolicitudesInstructor.value = []
    await fetchSolicitudes()
  } catch (err) {
    notifyErrorRequest(err?.response?.data?.msg || 'No se pudo guardar la solicitud')
  }
  loadingAccion.value = null
}

// ejecutarAccion: wrapper loading → petición → notificar → refrescar
async function ejecutarAccion(id, peticion, msgExtra = '') {
  loadingAccion.value = id
  try {
    const res = await peticion()
    if (res?.msg) notifySuccessRequest(res.msg + msgExtra)
    await fetchSolicitudes()
  } catch (err) {
    notifyErrorRequest(err?.response?.data?.msg || 'Error al procesar la acción')
  }
  loadingAccion.value = null
}

const aprobarSolicitud = (id) =>
  ejecutarAccion(id, () => put(`/complementary/approvals/${id}/approve`))

// Rechazar
function abrirDialogRechazo(id) {
  idParaRechazar.value = id
  dialogRechazo.value  = true
}

async function confirmarRechazo(motivo) {
  if (!motivo.trim()) return
  const id = idParaRechazar.value
  dialogRechazo.value = false
  await ejecutarAccion(id, () =>
    put(`/complementary/approvals/${id}/reject`, { observations: motivo.trim() }))
  idParaRechazar.value = null
}

// Cancelar
function abrirCancelar(id) {
  idParaCancelar.value    = id
  dialogCancelar.value    = true
}

async function confirmarCancelar(motivo) {
  if (!motivo.trim()) return
  const id = idParaCancelar.value
  dialogCancelar.value = false
  await ejecutarAccion(id, () => put(`/complementary/requests/${id}/state`, {
    newState:     'CANCELADA',
    observations: motivo.trim(),
  }))
  idParaCancelar.value = null
}

// Reenviar
function abrirReenviar(id) {
  idParaReenviar.value  = id
  loadingReenviar.value = false
  dialogReenviar.value  = true
}

function cerrarDialogReenviar() {
  dialogReenviar.value  = false
  idParaReenviar.value  = null
  loadingReenviar.value = false
}

async function confirmarReenviar() {
  const id = idParaReenviar.value
  if (!id || loadingReenviar.value) return
  loadingReenviar.value = true
  try {
    const res = await put(`/complementary/requests/${id}/resubmit`)
    dialogReenviar.value = false
    notifySuccessRequest(res?.msg || 'Solicitud reenviada correctamente')
    cargadoInstructor.value = false
    todasSolicitudesInstructor.value = []
    await fetchSolicitudes()
  } catch (err) {
    notifyErrorRequest(err?.response?.data?.msg || 'No se pudo reenviar la solicitud')
  }
  loadingReenviar.value = false
  idParaReenviar.value  = null
}

// Asignar ficha
async function abrirAsignarFicha(row) {
  idParaFicha.value  = row._id
  loadingAccion.value = row._id
  try {
    const res = await get(`/complementary/requests/${row._id}`)
    solicitudDataParaFicha.value = { ...res }
  } catch {
    solicitudDataParaFicha.value = row._detalle || {}
  }
  loadingAccion.value      = null
  dialogAsignarFicha.value = true
}

const onAsignarFicha = ({ id, data }) =>
  ejecutarAccion(id, () => put(`/complementary/requests/${id}/assign-ficha`, data))

// Avanzar de estado (Inscripcion / Matriculada / Programada / Ejecución)
const avanzarInscripcion = (id) =>
  ejecutarAccion(id, () => put(`/complementary/requests/${id}/state`, { newState: 'INSCRIPCION' }))

const avanzarMatriculada = (id) =>
  ejecutarAccion(id, () => put(`/complementary/requests/${id}/state`, { newState: 'MATRICULADA' }))

const avanzarProgramada = (id) =>
  ejecutarAccion(id, () => put(`/complementary/requests/${id}/state`, { newState: 'PROGRAMADA' }))

const avanzarEjecucion = (id) =>
  ejecutarAccion(id, async () => {
    const res = await put(`/complementary/requests/${id}/state`, { newState: 'EJECUCION' })
    return { msg: res?.msg || 'Estado actualizado' }
  }, ' — Correo enviado al instructor')

// Acciones de ejecución (abrir dialogs)
function abrirEvaluar(id) {
  idParaAccion.value  = id
  dialogEvaluar.value = true
}

function abrirEventos(id) {
  idParaAccion.value  = id
  dialogEventos.value = true
}

function abrirAmpliacion(id, modo) {
  idParaAccion.value     = id
  modoAmpliacion.value   = modo
  dialogAmpliacion.value = true
}

// Programar / Re-programar
// Helper: carga detalle + schedules y extrae el scheduleId de múltiples fuentes
async function _cargarDatosSchedule(row) {
  const [res, schedulesRes] = await Promise.all([
    get(`/complementary/requests/${row._id}`),
    get(`/complementary/requests/${row._id}/schedules`),
  ])
  const schedules       = Array.isArray(schedulesRes) ? schedulesRes : (schedulesRes?.data || [])
  const scheduleFromApi = schedules[0]
  const scheduleFromRes = res?.schedule || null
  const id   = row._scheduleData?._id || row._scheduleId || scheduleFromApi?._id || scheduleFromRes?._id || ''
  const data = row._scheduleData || scheduleFromApi || scheduleFromRes || null
  return { res, scheduleId: id, scheduleData: data }
}

async function abrirProgramar(row) {
  solicitudParaProgramar.value = row
  modoProgramar.value          = 'programar'
  scheduleIdProgramar.value    = ''
  loadingAccion.value          = row._id
  try {
    const { res, scheduleId, scheduleData } = await _cargarDatosSchedule(row)
    scheduleIdProgramar.value    = scheduleId
    solicitudParaProgramar.value = {
      ...row,
      _detalle: { ...res, _scheduleData: scheduleData, schedule: scheduleData || res?.schedule },
    }
  } catch (err) {
    notifyErrorRequest(err?.response?.data?.msg || 'Error al cargar datos para programar')
  }
  loadingAccion.value = null
  dialogProgramar.value = true
}

async function abrirReprogramar(row) {
  solicitudParaProgramar.value = row
  modoProgramar.value          = 'reprogramar'
  scheduleIdProgramar.value    = ''
  loadingAccion.value          = row._id
  try {
    const { res, scheduleId, scheduleData } = await _cargarDatosSchedule(row)
    scheduleIdProgramar.value    = scheduleId
    solicitudParaProgramar.value = {
      ...row,
      _detalle: { ...res, _scheduleData: scheduleData, schedule: scheduleData || res?.schedule },
    }
  } catch (err) {
    notifyErrorRequest(err?.response?.data?.msg || 'Error al cargar datos para reprogramar')
  }
  loadingAccion.value = null
  if (!scheduleIdProgramar.value) {
    notifyErrorRequest('No se encontró el schedule de esta solicitud.')
    return
  }
  dialogProgramar.value = true
}

async function onProgramar({ modo, solicitudId, scheduleId, data }) {
  const loadId = solicitudId || scheduleId
  loadingAccion.value            = loadId
  dialogProgramar.value          = false
  solicitudParaProgramar.value   = null
  try {
    let res
    if (scheduleId) {
      res = await put(`/complementary/schedule/${scheduleId}/reschedule`, data)
    } else {
      res = await put(`/complementary/requests/${solicitudId}/schedule`, data)
    }
    if (res?.data) {
      const sid = solicitudId || solicitudes.value.find(s => s._scheduleId === scheduleId)?._id
      if (sid) {
        const idx = solicitudes.value.findIndex(s => s._id === sid)
        if (idx !== -1) {
          solicitudes.value.splice(idx, 1, {
            ...solicitudes.value[idx],
            _scheduleId:   res.data._id || scheduleId,
            _scheduleData: res.data,
          })
        }
      }
    }
    if (res?.msg) notifySuccessRequest(res.msg)
    if (modo === 'programar') {
      notifyWarningRequest('Recuerde avanzar el estado de la solicitud para activar el horario.')
    }
    await fetchSolicitudes()
  } catch (err) {
    notifyErrorRequest(err?.response?.data?.msg || 'Error al programar el horario')
  }
  loadingAccion.value = null
}

// Cerrar ficha
function abrirCerrarFicha(id) {
  idParaCerrar.value = id
  dialogCerrar.value = true
}

// ── 11. EXPOSE
defineExpose({
  resetCache: () => {
    cargadoInstructor.value = false
    todasSolicitudesInstructor.value = []
    if (tabActivo.value) fetchSolicitudes()
  },
})
</script>

<style scoped>
.empty-title {
  font-size: 20px;
  font-weight: 600;
}
.badge-estado {
  padding: 5px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.3px;
}
.cell-curso {
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
