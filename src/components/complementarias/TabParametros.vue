<template>
  <div>
    <div class="row q-col-gutter-md">
      <!-- ── Tipos de Programa ── -->
      <div class="col-12 col-md-6">
        <div class="row items-center justify-between q-mb-sm">
          <div class="row items-center no-wrap">
            <q-icon name="category" color="blue-7" size="20px" class="q-mr-xs" />
            <span class="text-blue-7 text-weight-bold" style="font-size: 15px">Tipos de Programa</span>
          </div>
          <q-btn v-if="esPermitido" color="blue-7" unelevated icon="add" size="sm"
            label="Nuevo" @click="abrirDialogCrear('programa')" />
        </div>
        <q-table
          flat bordered
          :rows="parametrosPrograma"
          :columns="columnasParametros"
          :loading="loadingTabla"
          rows-per-page-label="Por página"
          :pagination="{ rowsPerPage: 7 }"
          no-data-label="Sin tipos de programa registrados"
        >
          <template v-slot:body-cell-status="props">
            <q-td :props="props">
              <q-badge :color="props.value === 0 ? 'green-8' : 'grey-6'"
                style="padding: 4px 12px; border-radius: 20px">
                {{ props.value === 0 ? 'Activo' : 'Inactivo' }}
              </q-badge>
            </q-td>
          </template>
          <template v-slot:body-cell-acciones="props">
            <q-td :props="props">
              <template v-if="esPermitido">
                <q-btn round icon="edit" size="sm" color="orange-8" class="q-mx-xs"
                  @click="abrirDialogEditar(props.row)"><q-tooltip>Editar</q-tooltip></q-btn>
                <q-btn v-if="props.row.status === 0" round icon="block" size="sm" color="red-7" class="q-mx-xs"
                  @click="abrirDialogDesactivar(props.row)"><q-tooltip>Desactivar</q-tooltip></q-btn>
                <q-btn v-else round icon="check_circle" size="sm" color="green-7" class="q-mx-xs"
                  @click="abrirDialogActivar(props.row)"><q-tooltip>Activar</q-tooltip></q-btn>
              </template>
              <span v-else class="text-grey-5 text-caption">Sin permisos</span>
            </q-td>
          </template>
        </q-table>
      </div>

      <!-- ── Tipos de Población ── -->
      <div class="col-12 col-md-6">
        <div class="row items-center justify-between q-mb-sm">
          <div class="row items-center no-wrap">
            <q-icon name="diversity_3" color="deep-purple-6" size="20px" class="q-mr-xs" />
            <span class="text-deep-purple-6 text-weight-bold" style="font-size: 15px">Tipos de Población</span>
          </div>
          <q-btn v-if="esPermitido" color="deep-purple-6" unelevated icon="add" size="sm"
            label="Nuevo" @click="abrirDialogCrear('poblacion')" />
        </div>
        <q-table
          flat bordered
          :rows="parametrosPoblacion"
          :columns="columnasParametros"
          :loading="loadingTabla"
          rows-per-page-label="Por página"
          :pagination="{ rowsPerPage: 7 }"
          no-data-label="Sin tipos de población registrados"
        >
          <template v-slot:body-cell-status="props">
            <q-td :props="props">
              <q-badge :color="props.value === 0 ? 'green-8' : 'grey-6'"
                style="padding: 4px 12px; border-radius: 20px">
                {{ props.value === 0 ? 'Activo' : 'Inactivo' }}
              </q-badge>
            </q-td>
          </template>
          <template v-slot:body-cell-acciones="props">
            <q-td :props="props">
              <template v-if="esPermitido">
                <q-btn round icon="edit" size="sm" color="orange-8" class="q-mx-xs"
                  @click="abrirDialogEditar(props.row)"><q-tooltip>Editar</q-tooltip></q-btn>
                <q-btn v-if="props.row.status === 0" round icon="block" size="sm" color="red-7" class="q-mx-xs"
                  @click="abrirDialogDesactivar(props.row)"><q-tooltip>Desactivar</q-tooltip></q-btn>
                <q-btn v-else round icon="check_circle" size="sm" color="green-7" class="q-mx-xs"
                  @click="abrirDialogActivar(props.row)"><q-tooltip>Activar</q-tooltip></q-btn>
              </template>
              <span v-else class="text-grey-5 text-caption">Sin permisos</span>
            </q-td>
          </template>
        </q-table>
      </div>
    </div>

    <!-- Dialog CREAR / EDITAR -->
    <q-dialog v-model="dialogForm" persistent>
      <q-card style="width: 420px; max-width: 90vw">
        <q-card-section class="bg-green-9 q-px-lg q-py-md">
          <div class="row items-center justify-center q-gutter-sm">
            <q-icon name="tune" color="white" size="28px" />
            <div class="text-white text-weight-bold text-center" style="font-size: 16px">
              {{ modoForm === 'crear' ? 'NUEVO PARÁMETRO' : 'EDITAR PARÁMETRO' }}
            </div>
          </div>
        </q-card-section>
        <q-card-section class="q-pa-md q-gutter-sm">
          <q-input
            v-model="nombreForm"
            outlined color="green-9"
            label="Nombre *"
            autofocus :disable="loadingForm"
          >
            <template v-slot:prepend><q-icon name="label" /></template>
          </q-input>
          <q-select
            v-model="tipoForm"
            :options="opcionesTipo"
            emit-value map-options
            outlined color="green-9"
            label="Tipo *"
            :disable="loadingForm"
          >
            <template v-slot:prepend><q-icon name="category" /></template>
          </q-select>
        </q-card-section>
        <q-card-actions align="center" class="q-pb-lg">
          <q-btn label="CANCELAR" flat color="dark" :disable="loadingForm" v-close-popup />
          <q-btn
            :label="modoForm === 'crear' ? 'CREAR' : 'GUARDAR'"
            color="green-9" unelevated
            :loading="loadingForm"
            :disable="!nombreForm.trim() || !tipoForm || loadingForm"
            @click="confirmarForm"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog DESACTIVAR -->
    <q-dialog v-model="dialogDesactivar" persistent>
      <q-card style="width: 380px; max-width: 90vw">
        <q-card-section class="bg-red-8 q-px-lg q-py-sm">
          <div class="row items-center justify-center q-gutter-sm">
            <q-icon name="block" color="white" size="28px" />
            <div class="text-white text-weight-bold text-center" style="font-size: 16px">DESACTIVAR PARÁMETRO</div>
          </div>
        </q-card-section>
        <q-card-section class="text-center q-pa-md">
          <q-icon name="block" size="48px" color="red-7" />
          <div class="q-mt-md text-body1 text-weight-medium">¿Desactivar "{{ parametroSeleccionado?.nombre }}"?</div>
          <div class="text-grey-6 q-mt-sm text-caption">Ya no aparecerá disponible en los formularios.</div>
        </q-card-section>
        <q-card-actions align="center" class="q-pb-lg">
          <q-btn label="CANCELAR" flat color="dark" :disable="loadingForm" v-close-popup />
          <q-btn label="DESACTIVAR" color="red-7" unelevated :loading="loadingForm" @click="confirmarDesactivar" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog ACTIVAR -->
    <q-dialog v-model="dialogActivar" persistent>
      <q-card style="width: 380px; max-width: 90vw">
        <q-card-section class="bg-green-8 q-px-lg q-py-sm">
          <div class="row items-center justify-center q-gutter-sm">
            <q-icon name="check_circle" color="white" size="28px" />
            <div class="text-white text-weight-bold text-center" style="font-size: 16px">ACTIVAR PARÁMETRO</div>
          </div>
        </q-card-section>
        <q-card-section class="text-center q-pa-md">
          <q-icon name="check_circle" size="48px" color="green-7" />
          <div class="q-mt-md text-body1 text-weight-medium">¿Activar "{{ parametroSeleccionado?.nombre }}"?</div>
          <div class="text-grey-6 q-mt-sm text-caption">Volverá a estar disponible en los formularios.</div>
        </q-card-section>
        <q-card-actions align="center" class="q-pb-lg">
          <q-btn label="CANCELAR" flat color="dark" :disable="loadingForm" v-close-popup />
          <q-btn label="ACTIVAR" color="green-7" unelevated :loading="loadingForm" @click="confirmarActivar" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
// ── 1. IMPORTS
import { ref, computed, onMounted } from "vue"
import { get, post, put } from "../../services/api.js"
import { OPCIONES_TIPO_PARAMETRO as opcionesTipo, COLUMNAS_PARAMETROS as columnasParametros } from "../../static/complementarias/ConstantesComplementarias.js"
import { notifySuccessRequest, notifyErrorRequest } from "../../common/notify.js"
import { storeUser } from "../../store/users.js"

// ── 2. COMPOSABLES Y STORES
const userStore = storeUser()

// ── 4. ESTADO REACTIVO
const parametros            = ref([])
const loadingTabla          = ref(false)
const loadingForm           = ref(false)
const dialogForm            = ref(false)
const dialogDesactivar      = ref(false)
const dialogActivar         = ref(false)
const modoForm              = ref('crear')
const nombreForm            = ref('')
const tipoForm              = ref(null)
const parametroSeleccionado = ref(null)

// ── 5. COMPUTED
const esPermitido         = computed(() => ['COORDINADOR', 'PROGRAMADOR'].includes(userStore.getRole()))
const parametrosPrograma  = computed(() => parametros.value.filter(p => p.tipo === 'programa'))
const parametrosPoblacion = computed(() => parametros.value.filter(p => p.tipo === 'poblacion'))

// ── 7. CICLO DE VIDA
onMounted(cargarParametros)

// ── 9. API / ENDPOINTS
async function cargarParametros() {
  loadingTabla.value = true
  try {
    const res = await get('/complementary/parametros')
    parametros.value = Array.isArray(res) ? res : []
  } catch {
    notifyErrorRequest('Error al cargar los parámetros')
  }
  loadingTabla.value = false
}

async function confirmarForm() {
  if (!nombreForm.value.trim() || !tipoForm.value) return
  loadingForm.value = true
  try {
    const body = { nombre: nombreForm.value.trim(), tipo: tipoForm.value }
    let res
    if (modoForm.value === 'crear') {
      res = await post('/complementary/parametros', body)
    } else {
      res = await put(`/complementary/parametros/${parametroSeleccionado.value._id}`, body)
    }
    notifySuccessRequest(res?.msg || 'Operación realizada correctamente')
    dialogForm.value = false
    await cargarParametros()
  } catch (err) {
    notifyErrorRequest(err?.response?.data?.msg || 'Error al guardar')
  }
  loadingForm.value = false
}

async function confirmarDesactivar() {
  if (!parametroSeleccionado.value) return
  loadingForm.value = true
  try {
    const res = await put(`/complementary/parametros/${parametroSeleccionado.value._id}/deactivate`)
    notifySuccessRequest(res?.msg || 'Parámetro desactivado')
    dialogDesactivar.value = false
    const item = parametros.value.find(p => p._id === parametroSeleccionado.value._id)
    if (item) item.status = 1
  } catch (err) {
    notifyErrorRequest(err?.response?.data?.msg || 'Error al desactivar')
  }
  loadingForm.value = false
}

async function confirmarActivar() {
  if (!parametroSeleccionado.value) return
  loadingForm.value = true
  try {
    const res = await put(`/complementary/parametros/${parametroSeleccionado.value._id}/activate`)
    notifySuccessRequest(res?.msg || 'Parámetro activado')
    dialogActivar.value = false
    const item = parametros.value.find(p => p._id === parametroSeleccionado.value._id)
    if (item) item.status = 0
  } catch (err) {
    notifyErrorRequest(err?.response?.data?.msg || 'Error al activar')
  }
  loadingForm.value = false
}

// ── 10. MANEJADORES DEL TEMPLATE
function abrirDialogCrear(tipo) {
  modoForm.value              = 'crear'
  nombreForm.value            = ''
  tipoForm.value              = tipo
  parametroSeleccionado.value = null
  dialogForm.value            = true
}

function abrirDialogEditar(row) {
  modoForm.value              = 'editar'
  nombreForm.value            = row.nombre
  tipoForm.value              = row.tipo
  parametroSeleccionado.value = row
  dialogForm.value            = true
}

function abrirDialogDesactivar(row) {
  parametroSeleccionado.value = row
  dialogDesactivar.value      = true
}

function abrirDialogActivar(row) {
  parametroSeleccionado.value = row
  dialogActivar.value         = true
}
</script>
