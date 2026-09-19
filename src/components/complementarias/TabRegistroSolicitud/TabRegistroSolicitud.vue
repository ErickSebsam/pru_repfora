<template>
  <q-form ref="formRef" @submit.prevent="enviarFormulario" novalidate>
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-sm-4">
        <q-input v-model="formData.fechaRegistro" type="date" outlined readonly bg-color="grey-3" color="green-9" label="Fecha de registro">
          <template v-slot:prepend><q-icon name="today" /></template>
        </q-input>
      </div>
      <div class="col-12 col-sm-4">
        <q-input v-model="formData.horaRegistro" outlined readonly bg-color="grey-3" color="green-9" label="Hora de registro">
          <template v-slot:prepend><q-icon name="access_time" /></template>
        </q-input>
      </div>
      <div class="col-12 col-sm-4">
        <q-input v-model="formData.numeroSolicitud" outlined readonly bg-color="green-1" color="green-9" label="N° Consecutivo">
          <template v-slot:prepend><q-icon name="confirmation_number" color="green-9" /></template>
        </q-input>
      </div>
    </div>

    <SectionCard title="Códigos importantes" icon="qr_code_2" :collapsed="collapsed.sofia" @toggle="toggleSection('sofia')">
      <q-banner class="bg-blue-1 text-blue-9 q-mb-md" rounded>
        <template v-slot:avatar>
          <q-icon name="info" color="blue" />
        </template>
        Estos códigos serán asignados posteriormente por el coordinador o programador.
      </q-banner>
      <div class="row q-col-gutter-md">
        <div class="col-12 col-sm-6">
          <q-input v-model="formData.codigoSolicitud" outlined readonly bg-color="green-1" color="green-9"
            label="N° de solicitud" placeholder="Generado al guardar">
            <template v-slot:prepend><q-icon name="confirmation_number" color="green-9" /></template>
          </q-input>
        </div>
        <div class="col-12 col-sm-6">
          <q-input v-model="formData.fichaCaracterizacion" outlined readonly bg-color="grey-3" color="green-9" label="Ficha de caracterización">
            <template v-slot:prepend><q-icon name="description" /></template>
          </q-input>
        </div>
      </div>
    </SectionCard>

    <SectionCard title="Datos del programa" icon="description" :collapsed="collapsed.datosPrograma" @toggle="toggleSection('datosPrograma')">
      <q-input v-if="formData.prfCodigo"
        :model-value="formData.prfDenominacion || formData.prfCodigo"
        outlined readonly bg-color="grey-3" color="green-9" label="Curso confirmado">
        <template v-slot:prepend><q-icon name="menu_book" /></template>
        <template v-if="!props.readonly" v-slot:append>
          <q-btn unelevated round icon="close" color="red-6" size="sm" @click="limpiarCursoConfirmado">
            <q-tooltip>Cambiar curso</q-tooltip>
          </q-btn>
        </template>
      </q-input>

      <q-banner v-if="!formData.prfCodigo" dense rounded class="bg-orange-1 text-orange-9 q-mb-md">
        <template v-slot:avatar><q-icon name="warning" color="orange-8" /></template>
        Ve al <strong>Catálogo</strong>, abre el curso que necesitas y haz clic en
        <strong>Confirmar curso</strong> para continuar el registro.
      </q-banner>

      <div class="row q-col-gutter-md q-mt-sm">
        <div class="col-12 col-sm-6">
          <q-input v-model="formData.prfCodigo" outlined readonly bg-color="grey-3" color="green-9" label="Código del curso">
            <template v-slot:prepend><q-icon name="tag" /></template>
          </q-input>
        </div>
        <div class="col-12 col-sm-6">
          <q-input v-model="formData.prfVersion" outlined readonly bg-color="grey-3" color="green-9" label="Versión">
            <template v-slot:prepend><q-icon name="numbers" /></template>
          </q-input>
        </div>
      </div>
      <div class="row q-col-gutter-md q-mt-sm">
        <div class="col-12 col-sm-6">
          <q-input v-model.number="formData.numAprendices" type="number" outlined
            color="green-9" label="N° de aprendices" :min="1" :disable="props.loading || props.readonly">
            <template v-slot:prepend><q-icon name="groups" /></template>
          </q-input>
        </div>
        <div class="col-12 col-sm-6">
          <q-input v-model="formData.prfDuracionMaxima" outlined readonly bg-color="grey-3" color="green-9" label="Duración en horas">
            <template v-slot:prepend><q-icon name="schedule" /></template>
          </q-input>
        </div>
      </div>
      <div v-if="esCoorOProgramador" class="row q-col-gutter-md q-mt-sm">
        <div class="col-12 col-sm-6">
          <q-select v-model="formData.tipoPrograma" :options="OPCIONES_TIPO_PROGRAMA"
            emit-value map-options outlined color="green-9" label="Tipo de programa" :disable="props.loading || props.readonly">
            <template v-slot:prepend><q-icon name="category" /></template>
          </q-select>
        </div>
        <div class="col-12 col-sm-6">
          <q-select v-model="formData.tipoPoblacion" :options="OPCIONES_TIPO_POBLACION"
            emit-value map-options outlined color="green-9" label="Tipo de población atendida" :disable="props.loading || props.readonly">
            <template v-slot:prepend><q-icon name="diversity_3" /></template>
          </q-select>
        </div>
      </div>
    </SectionCard>

    <SectionCard title="Datos del instructor" icon="person" :collapsed="collapsed.instructor" @toggle="toggleSection('instructor')">
      <div class="row q-col-gutter-md">
        <div class="col-12 col-sm-6">
          <q-input v-model="formData.nombreInstructor" outlined readonly bg-color="grey-3" color="green-9" label="Nombre instructor(a)">
            <template v-slot:prepend><q-icon name="person" /></template>
          </q-input>
        </div>
        <div class="col-12 col-sm-6">
          <q-input v-model="formData.cedulaInstructor" outlined readonly bg-color="grey-3" color="green-9" label="Cédula instructor(a)">
            <template v-slot:prepend><q-icon name="badge" /></template>
          </q-input>
        </div>
      </div>
      <div class="row q-col-gutter-md q-mt-sm">
        <div class="col-12 col-sm-4">
          <q-input v-model="formData.telefonoInstructor" outlined readonly bg-color="grey-3" color="green-9" label="Teléfono instructor(a)">
            <template v-slot:prepend><q-icon name="call" /></template>
          </q-input>
        </div>
        <div class="col-12 col-sm-4">
          <q-input v-model="formData.correoInstructor" outlined readonly bg-color="grey-3" color="green-9" label="Correo institucional">
            <template v-slot:prepend><q-icon name="mail" /></template>
          </q-input>
        </div>
        <div class="col-12 col-sm-4">
          <q-input v-model="formData.correoPersonalInstructor" outlined readonly bg-color="grey-3" color="green-9" label="Correo personal">
            <template v-slot:prepend><q-icon name="mail_outline" /></template>
          </q-input>
        </div>
      </div>
    </SectionCard>

    <SectionCard title="Instructor adicional" icon="group_add" :collapsed="collapsed.instructorAdicional" @toggle="toggleSection('instructorAdicional')">
      <SectionAdditionalInstructors
        v-model="instructoresAdicionales"
        :exclude-document="formData.cedulaInstructor"
        :readonly="props.readonly"
        :disable="props.loading"
      />
    </SectionCard>

    <SectionCard title="Ubicación" icon="location_on" :collapsed="collapsed.ubicacion" @toggle="toggleSection('ubicacion')">
      <SectionLocation
        :form-data="formData"
        :supervisores-options="supervisoresOptions"
        :readonly="props.readonly"
        :loading="props.loading"
      />
    </SectionCard>

    <SectionCard title="Datos de la empresa" icon="business" :collapsed="collapsed.empresa" @toggle="toggleSection('empresa')">
      <div class="q-mb-sm">
        <q-input v-model="formData.nombreEmpresa" outlined color="green-9" label="Nombre de la empresa"
          :disable="props.loading || props.readonly">
          <template v-slot:prepend><q-icon name="business" /></template>
        </q-input>
      </div>
      <div class="row q-col-gutter-md q-mt-sm">
        <div class="col-12 col-sm-4">
          <q-input v-model="formData.nitEmpresa" type="text" inputmode="numeric" maxlength="15" outlined color="green-9" label="NIT"
            :disable="props.loading || props.readonly"
            @keypress="(e) => !/[0-9-]/.test(e.key) && e.preventDefault()">
            <template v-slot:prepend><q-icon name="badge" /></template>
          </q-input>
        </div>
        <div class="col-12 col-sm-4">
          <q-input v-model="formData.contactoEmpresa" outlined color="green-9" label="Nombre contacto empresa"
            :disable="props.loading || props.readonly"
            @keypress="(e) => !/[a-zA-ZÀ-ÿ\s]/.test(e.key) && e.preventDefault()">
            <template v-slot:prepend><q-icon name="person" /></template>
          </q-input>
        </div>
        <div class="col-12 col-sm-4">
          <q-input v-model="formData.telefonoEmpresa" type="text" inputmode="numeric" outlined color="green-9" label="Teléfono de contacto"
            :disable="props.loading || props.readonly"
            @keypress="(e) => !/[0-9]/.test(e.key) && e.preventDefault()">
            <template v-slot:prepend><q-icon name="call" /></template>
          </q-input>
        </div>
      </div>
    </SectionCard>

    <SectionCard title="Fechas del programa" icon="event" :collapsed="collapsed.fechas"
      :visible="!props.hideFechas || props.readonly" @toggle="toggleSection('fechas')">
      <div class="row q-col-gutter-md">
        <div class="col-12 col-sm-4">
          <q-input v-model="formData.fechaInscripcion" type="date" outlined color="green-9" label="Fecha de inscripción"
            :disable="props.loading || props.readonly">
            <template v-slot:prepend><q-icon name="assignment_turned_in" /></template>
          </q-input>
        </div>
        <div class="col-12 col-sm-4">
          <q-input v-model="formData.fechaMatriculaInicio" type="date" outlined color="green-9" label="Inicio de matrícula"
            :disable="props.loading || props.readonly">
            <template v-slot:prepend><q-icon name="how_to_reg" /></template>
          </q-input>
        </div>
        <div class="col-12 col-sm-4">
          <q-input v-model="formData.fechaMatriculaFin" type="date" outlined color="green-9" label="Fin de matrícula"
            :disable="props.loading || props.readonly">
            <template v-slot:prepend><q-icon name="how_to_reg" /></template>
          </q-input>
        </div>
      </div>
    </SectionCard>

    <SeccionFormacion
      :tiene-curso="!!formData.prfCodigo"
      :model-value="{
        competencies: formData.competencies,
        learningActivity: formData.learningActivity,
        recursosNecesarios: formData.recursosNecesarios
      }"
      @update:modelValue="v => {
        formData.competencies = v.competencies
        formData.learningActivity = v.learningActivity
        formData.recursosNecesarios = v.recursosNecesarios
      }"
      :loading="props.loading"
      :readonly="props.readonly"
      :resultado-extraccion="resultadoExtraccionFormacion"
      :program-info="programInfoFormacion"
      @update:programInfo="programInfoFormacion = $event"
      @extraer="onExtraerFormacion"
    />

    <SeccionProgramacionFicha
      ref="seccionProgramacionRef"
      :sesiones="sesiones"
      @update:sesiones="sesiones = $event"
      :fecha-inicio="formData.fechaInicio"
      @update:fechaInicio="formData.fechaInicio = $event"
      :fecha-fin="formData.fechaFin"
      @update:fechaFin="formData.fechaFin = $event"
      :prf-codigo="formData.prfCodigo"
      :prf-duracion-maxima="formData.prfDuracionMaxima"
      :instructor-id="formData.instructorId"
      :nombre-instructor="formData.nombreInstructor"
      :instructores-adicionales="instructoresAdicionales"
      :loading="props.loading"
      :readonly="props.readonly"
      :all-schedules="allSchedules"
      :competencies="formData.competencies || []"
      @cargar-schedules="cargarSchedules"
    />

    <SectionCard title="Requisitos de ingreso" icon="checklist" :collapsed="collapsed.requisitos" @toggle="toggleSection('requisitos')">
      <template #badge>
        <q-badge v-if="requisitosLista.length" color="green-9" :label="requisitosLista.length" class="q-mr-sm" />
      </template>
      <div v-if="requisitosLista.length" class="row q-col-gutter-sm">
        <div v-for="(req, i) in requisitosLista" :key="i" class="col-12 col-sm-6">
          <div class="req-chip">
            <q-icon name="check_circle" color="green-7" size="18px" class="q-mr-sm flex-shrink-0" />
            <span>{{ req }}</span>
          </div>
        </div>
      </div>
      <q-banner v-else dense rounded class="bg-grey-2 text-grey-7">
        <template v-slot:avatar><q-icon name="info" color="grey-6" /></template>
        Los requisitos de ingreso se cargan automáticamente al confirmar el curso desde el catálogo.
      </q-banner>
    </SectionCard>

    <div class="text-caption text-grey-6 q-px-md q-mb-md">
      La firma de este formato refleja que se han validado los requisitos de idoneidad del instructor
      según el diseño curricular y la información del usuario según guía procedimiento de ingreso
      GFPI-G-025 (núm. 7.5)
    </div>

    <div v-if="!props.readonly" class="row justify-end q-gutter-sm q-mt-md q-mb-lg">
      <q-btn label="PREVISUALIZAR PDF" icon="picture_as_pdf" class="style-btn"
        :disable="props.loading" @click="previsualizarPdf" />
      <q-btn label="GUARDAR SOLICITUD" icon="save" type="submit" class="style-btn"
        :loading="props.loading" :disable="props.loading">
        <template v-slot:loading>
          <q-spinner-oval color="white" size="1em" />
        </template>
      </q-btn>
    </div>

  </q-form>
</template>

<script setup>
// ── 1. IMPORTS
import { ref, computed, watch, nextTick } from 'vue'
import { useQuasar, debounce } from 'quasar'
import { get, post } from '../../../services/api.js'
import { generateSolicitudPdf } from '../../../utils/complementarias/generateSolicitudPdf.js'
import { calcularTotalHoras } from '../../../utils/complementarias/DateUtils.js'
import { parsearTextoLista, opcionesDeParametros } from '../../../utils/complementarias/EstadoColorUtils.js'
import SectionCard from './secciones/TarjetaSeccion.vue'
import SectionAdditionalInstructors from './secciones/SeccionInstructoresAdicionales.vue'
import SectionLocation from './secciones/SeccionUbicacion.vue'
import SeccionProgramacionFicha from './secciones/programacion/SeccionProgramacionFicha.vue'
import SeccionFormacion from './secciones/SeccionFormacion.vue'
import { storeUser } from '../../../store/users.js'

// ── 2. COMPOSABLES & STORES
const $q        = useQuasar()
const userStore = storeUser()

// ── 3. PROPS & EMITS
const props = defineProps({
  modelValue:   { type: Object,  required: true },
  loading:      { type: Boolean, default: false },
  readonly:     { type: Boolean, default: false },
  hideFechas:   { type: Boolean, default: false },
  supervisores: { type: Array,   default: () => [] },
  parametros:   { type: Array,   default: () => [] },
})

const emit = defineEmits(['update:modelValue', 'submit', 'limpiarCurso'])

// ── 4. ESTADO REACTIVO
// 4a. Control UI
const formRef              = ref(null)
const seccionProgramacionRef = ref(null)
const collapsed = ref({
  datosPrograma: false, instructor: false,
  instructorAdicional: !props.readonly,
  ubicacion:           !props.readonly,
  empresa:             !props.readonly,
  fechas:              !props.readonly,
  requisitos:          !props.readonly,
  sofia:               !props.readonly,
})

// 4b. Datos cargados
const allSchedules                   = ref({ titulada: [], complementaria: [], otros: [] })
const loadingSchedules               = ref(false)

// 4c. Datos de trabajo
const programInfoFormacion = ref(null)
const formData = ref({ departamento: 'SANTANDER', ...defaultsFormacion(), ...props.modelValue })
const sesiones = ref([...(props.modelValue.sesiones || [])])
const instructoresAdicionales    = ref([...(props.modelValue.instructoresAdicionales || [])])
const resultadoExtraccionFormacion = ref(null)
let _syncingFromParent = false

// ── 5. COMPUTED
const esCoorOProgramador = computed(() =>
  ['COORDINADOR', 'PROGRAMADOR'].includes(userStore.getRole())
)
const OPCIONES_TIPO_PROGRAMA  = computed(() => opcionesDeParametros(props.parametros, 'programa'))
const OPCIONES_TIPO_POBLACION = computed(() => opcionesDeParametros(props.parametros, 'poblaci'))
const requisitosLista         = computed(() => parsearTextoLista(formData.value.requisitosIngreso))
const supervisoresOptions     = computed(() =>
  Array.isArray(props.supervisores)
    ? props.supervisores.map(s => ({ label: s.name, value: s._id }))
    : []
)
const totalHorasProgramadas = computed(() => calcularTotalHoras(sesiones.value))
const faltanHoras           = computed(() =>
  (formData.value.prfDuracionMaxima || 0) - totalHorasProgramadas.value
)

// ── 6. WATCHERS
watch(() => props.modelValue, (val) => {
  _syncingFromParent = true
  formData.value = { departamento: 'SANTANDER', ...defaultsFormacion(), ...val }
  sesiones.value = [...(val.sesiones || [])]
  instructoresAdicionales.value = [...(val.instructoresAdicionales || [])]
  nextTick(() => { _syncingFromParent = false })
}, { deep: true })

watch(programInfoFormacion, (info) => {
  if (!info) return
  if (info.programCode && info.programCode !== '000000')
    formData.value.prfCodigo = info.programCode
  if (info.version)
    formData.value.prfVersion = info.version
  if (info.totalProgramHours)
    formData.value.prfDuracionMaxima = info.totalProgramHours
  if (info.programName)
    formData.value.prfDenominacion = info.programName
})

watch([formData, sesiones, instructoresAdicionales], debounce(() => {
  if (_syncingFromParent) return
  emit('update:modelValue', { ...formData.value, sesiones: sesiones.value, instructoresAdicionales: instructoresAdicionales.value })
}, 300), { deep: true, flush: 'post' })

// ── 8. HELPERS PUROS
function defaultsFormacion() {
  return { competencies: [], learningActivity: '', recursosNecesarios: '' }
}

function toggleSection(section) {
  collapsed.value[section] = !collapsed.value[section]
}

// muestra una notificación arriba con tipo, ícono, mensaje y duración
function notificar(type, icon, message, timeout = 3000) {
  $q.notify({ type, icon, message, position: 'top', timeout })
}

// fuerza el recálculo del tamaño del calendario hijo
function updateCalendarSize() {
  seccionProgramacionRef.value?.updateCalendarSize()
}

// ── 9. API / ENDPOINTS
// extrae competencias del PDF de formación y guarda el resultado
async function onExtraerFormacion(file) {
  resultadoExtraccionFormacion.value = null
  try {
    const fd = new FormData()
    fd.append('pdf', file)
    const res = await post('/complementary/extract-competencies', fd)
    resultadoExtraccionFormacion.value = res
  } catch {
    resultadoExtraccionFormacion.value = { error: true }
  }
}

async function cargarSchedules(instructorId, ventana) {
  if (!instructorId) {
    allSchedules.value = { titulada: [], complementaria: [], otros: [] }
    return
  }
  loadingSchedules.value = true
  try {
    // ventana = { desde, hasta } (YYYY-MM-DD) → el backend acota el histórico.
    // Si no llega ventana, se comporta como antes (trae todo).
    const params = ventana?.desde && ventana?.hasta ? { desde: ventana.desde, hasta: ventana.hasta } : undefined
    const res = await get(`/complementary/instructor/${instructorId}/all-schedules`, params)
    allSchedules.value = {
      titulada:       Array.isArray(res?.titulada)       ? res.titulada       : [],
      complementaria: Array.isArray(res?.complementaria) ? res.complementaria : [],
      otros:          Array.isArray(res?.otros)          ? res.otros          : [],
    }
  } catch {
    allSchedules.value = { titulada: [], complementaria: [], otros: [] }
  }
  loadingSchedules.value = false
}

// ── 10. MANEJADORES DEL TEMPLATE
function limpiarCursoConfirmado() {
  $q.dialog({
    title: 'Cambiar curso',
    message: '¿Está seguro de cambiar el curso? Se limpiarán los datos del curso y las sesiones programadas.',
    cancel: { label: 'Cancelar', flat: true, color: 'grey-7' },
    ok:     { label: 'Sí, cambiar', color: 'green-9' },
    persistent: true,
  }).onOk(() => {
    formData.value.catalogCourse     = ''
    formData.value.prfCodigo         = ''
    formData.value.prfVersion        = ''
    formData.value.prfDuracionMaxima = null
    formData.value.requisitosIngreso = ''
    sesiones.value = []
    emit('limpiarCurso')
    nextTick(() => seccionProgramacionRef.value?.updateCalendarSize())
  })
}

async function previsualizarPdf() {
  const supervisorObj = props.supervisores.find(s => s._id === formData.value.supervisor)
  await generateSolicitudPdf({
    ...formData.value,
    sesiones: [...sesiones.value],
    instructoresAdicionales: [...instructoresAdicionales.value],
    supervisorNombre: supervisorObj?.name || '',
  })
}

async function enviarFormulario() {
  const ok = await formRef.value?.validate()
  if (!ok) {
    notificar('negative', 'event_busy', 'Revisa las fechas del programa: hay valores fuera de rango', 3500)
    return
  }
  const durMax = formData.value.prfDuracionMaxima
  if (durMax && sesiones.value.length > 0) {
    if (totalHorasProgramadas.value > durMax) {
      notificar('negative', 'schedule', `Las sesiones superan las ${durMax}h del curso (programadas: ${totalHorasProgramadas.value}h).`, 4500)
      return
    }
    if (totalHorasProgramadas.value < durMax) {
      notificar('warning', 'schedule', `Faltan ${faltanHoras.value} hora(s). Las sesiones deben cubrir las ${durMax}h del curso.`, 4500)
      return
    }
  }
  if ((formData.value.competencies || []).length && sesiones.value.some(s => !s.resultado)) {
    notificar('negative', 'school', 'Todas las sesiones deben tener un resultado de aprendizaje asignado', 4000)
    return
  }
  const payload = { ...formData.value, sesiones: [...sesiones.value] }
  delete payload.instructorId
  delete payload.proyectoAsociado
  delete payload.idCampesena
  delete payload.rutaCampesena
  delete payload.supervisorNombre
  if (!esCoorOProgramador.value || !payload.tipoPrograma)  delete payload.tipoPrograma
  if (!esCoorOProgramador.value || !payload.tipoPoblacion) delete payload.tipoPoblacion
  delete payload.campesena
  delete payload.instructoresAdicionales
  payload.instructores = instructoresAdicionales.value.map(i => i._id)
  emit('submit', payload)
}

// ── 11. EXPOSE
defineExpose({ updateCalendarSize })
</script>

<style scoped>
.req-chip {
  display: flex;
  align-items: flex-start;
  background-color: color-mix(in srgb, var(--color_button) 8%, white);
  border: 1px solid color-mix(in srgb, var(--color_button) 30%, transparent);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 16px;
  color: #212121;
  line-height: 1.4;
}
</style>

