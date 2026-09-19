<template>
  <div>
    <BtnBack route="/home/instructor" />
    <HeaderLayout :title="tituloTab" />

    <q-tabs
      v-model="tab"
      class="q-mx-lg text-weight-bolder row"
      dense
      align="justify"
      active-color="lime-2"
      active-bg-color="green-9"
      indicator-color="black"
    >
      <q-tab class="text-green-9 bg-white col-4" name="catalogo"  icon="menu_book"  :label="$q.screen.lt.sm ? '' : 'Catálogo'" />
      <q-tab class="text-green-9 bg-white col-4" name="solicitud" icon="edit_note"  :label="$q.screen.lt.sm ? '' : 'Registro de solicitud'" />
      <q-tab class="text-green-9 bg-white col-4" name="historial" icon="history"    :label="$q.screen.lt.sm ? '' : 'Historial de registros'" />
    </q-tabs>

    <q-tab-panels v-model="tab" keep-alive>

      <q-tab-panel class="q-px-lg" name="catalogo">
        <TabCatalogo :mostrar-confirmar="true" @confirm="confirmarCurso" />
      </q-tab-panel>

      <q-tab-panel class="q-px-lg" name="solicitud">
        <div class="row q-mt-md">
          <div class="col-12">
            <TabRegistroSolicitud
              v-model="formData"
              :loading="loadingSolicitud"
              :supervisores="supervisores"
              :parametros="parametros"
              :hide-fechas="true"
              @submit="enviarSolicitud"
              @limpiar-curso="onLimpiarCurso"
            />
          </div>
        </div>
      </q-tab-panel>

      <q-tab-panel class="q-px-lg" name="historial">
        <TabListadoSolicitudes ref="tabHistorialRef" modo="instructor" />
      </q-tab-panel>
    </q-tab-panels>

    <!-- Diálogo de confirmación de solicitud registrada -->
    <q-dialog v-model="dialogExito" persistent>
      <q-card style="width: 440px; max-width: 92vw; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%); padding: 32px 24px 24px; text-align: center;">
          <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(255,255,255,0.2); margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
            <q-icon name="check_circle" color="white" size="40px" />
          </div>
          <div class="text-white text-weight-bold" style="font-size: 20px; letter-spacing: 0.3px;">
            Solicitud registrada
          </div>
          <div v-if="solicitudNumero" class="text-green-2 q-mt-xs" style="font-size: 13px;">
            N° {{ solicitudNumero }}
          </div>
        </div>
        <q-card-section class="text-center q-px-lg q-pt-lg q-pb-sm">
          <div class="text-grey-8" style="font-size: 14px; line-height: 1.6;">
            Tu solicitud ha sido enviada al coordinador para revisión. Recibirás una notificación cuando sea procesada.
          </div>
        </q-card-section>
        <q-card-section class="text-center q-px-lg q-pt-sm q-pb-lg">
          <div class="text-grey-5" style="font-size: 12px;">¿Qué deseas hacer ahora?</div>
          <div class="row q-gutter-sm q-mt-md justify-center">
            <q-btn outline color="grey-7" icon="add_circle_outline" label="Nueva solicitud"
              style="border-radius: 8px;" @click="onExitoNueva" />
            <q-btn unelevated color="green-9" icon="history" label="Ver historial"
              style="border-radius: 8px;" @click="onExitoHistorial" />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
// ── 1. IMPORTS
import { ref, computed, onMounted, nextTick } from "vue";
import { get, post } from "../services/api.js";
import { fechaHoy, horaActual } from "../utils/complementarias/DateUtils.js";
import { storeUser } from "../store/users.js";
import { useQuasar } from "quasar";
import BtnBack from "../layouts/btnBackLayout.vue";
import HeaderLayout from "../layouts/headerViewsLayout.vue";
import TabRegistroSolicitud from "../components/complementarias/TabRegistroSolicitud/TabRegistroSolicitud.vue";
import TabCatalogo from "../components/complementarias/TabCatalogo/TabCatalogo.vue";
import TabListadoSolicitudes from "../components/complementarias/TabListadoSolicitudes/TabListadoSolicitudes.vue";

// ── 2. COMPOSABLES Y STORES
const $q       = useQuasar();
const userStore = storeUser();

// ── 4. ESTADO REACTIVO
const tab             = ref("catalogo");
const tabHistorialRef = ref(null);
const supervisores    = ref([]);
const parametros      = ref([]);
const loadingSolicitud = ref(false);
const formData        = ref(crearFormDataInicial());
const dialogExito     = ref(false);
const solicitudNumero = ref('');

// ── 5. COMPUTED
const tituloTab = computed(() => {
  if (tab.value === "catalogo")  return "Catálogo";
  if (tab.value === "solicitud") return "Registro de solicitud";
  return "Historial de registros";
});

// ── 7. CICLO DE VIDA
onMounted(async () => {
  // peticiones en paralelo; el catálogo lo carga TabCatalogo por su cuenta y los
  // instructores ahora se buscan server-side (autocomplete) en el selector adicional.
  const [coordRes, paramRes] = await Promise.all([
    get("/complementary/coordinators").catch((e) => { console.error(e); return []; }),
    get("/complementary/parametros").catch((e) => { console.error(e); return []; }),
  ]);
  supervisores.value = Array.isArray(coordRes) ? coordRes : [];
  parametros.value   = Array.isArray(paramRes) ? paramRes : [];
});

// ── 8. HELPERS
// genera el estado inicial del formulario con fecha/hora actual y datos del instructor autenticado
function crearFormDataInicial() {
  const i = userStore.instructorData || {};
  return {
    fechaRegistro:            fechaHoy(),
    horaRegistro:             horaActual(),
    catalogCourse:            "",
    prfCodigo:                "",
    prfVersion:               "",
    prfDuracionMaxima:        null,
    prfDenominacion:          "",
    tipoPrograma:             "",
    numAprendices:            null,
    tipoPoblacion:            "",
    coordinator:              "",
    instructorId:             i._id           || "",
    nombreInstructor:         i.name          || "",
    cedulaInstructor:         i.numdocument   || "",
    telefonoInstructor:       i.phone         || "",
    correoInstructor:         i.email         || "",
    correoPersonalInstructor: i.emailpersonal || "",
    municipio:                "",
    vereda:                   "",
    direccion:                "",
    nombreEmpresa:            "",
    nitEmpresa:               "",
    contactoEmpresa:          "",
    telefonoEmpresa:          "",
    fechaInicio:              "",
    fechaFin:                 "",
    fechaInscripcion:         "",
    fechaMatriculaInicio:     "",
    fechaMatriculaFin:        "",
    requisitosIngreso:        "",
    recursosNecesarios:       "",
    competencies:             [],
    learningActivity:         "",
    environment:              "",
    formationDocument:        null,
    codigoSolicitud:          "",
    fichaCaracterizacion:     "",
    numeroSolicitud:          "",
    supervisor:               "",
    campesena:                "",
    ambienteNombre:           "",
    ambienteDireccion:        "",
    sesiones:                 [],
  };
}

// ── 9. API / ENDPOINTS
// registra la solicitud, muestra el diálogo de éxito y reinicia el formulario
async function enviarSolicitud(payload) {
  loadingSolicitud.value = true;
  try {
    const res = await post("/complementary/requests/register", payload);
    const numero = res?.data?.numeroSolicitud || '';
    dialogExito.value     = true;
    solicitudNumero.value = numero;
    formData.value = crearFormDataInicial();
    tabHistorialRef.value?.resetCache();
  } catch {}
  finally {
    loadingSolicitud.value = false;
  }
}

function onExitoHistorial() {
  dialogExito.value = false;
  tab.value = "historial";
}

function onExitoNueva() {
  dialogExito.value = false;
}

// ── 10. MANEJADORES DEL TEMPLATE
// precarga el formulario con los datos del curso seleccionado y navega al tab de registro
async function confirmarCurso(course) {
  formData.value.catalogCourse     = course._id || "";
  formData.value.prfCodigo         = course.prfCodigo || "";
  formData.value.prfVersion        = course.prfVersion || "";
  formData.value.prfDuracionMaxima = course.prfDuracionMaxima || null;
  formData.value.prfDenominacion   = course.prfDenominacion || "";
  formData.value.requisitosIngreso = course.prfDescripcionRequisito || "";
  formData.value.sesiones          = [];
  await nextTick();
  tab.value = "solicitud";
}

function onLimpiarCurso() {
  formData.value.catalogCourse     = "";
  formData.value.prfCodigo         = "";
  formData.value.prfVersion        = "";
  formData.value.prfDuracionMaxima = null;
  formData.value.prfDenominacion   = "";
  formData.value.requisitosIngreso = "";
  formData.value.sesiones          = [];
}
</script>
