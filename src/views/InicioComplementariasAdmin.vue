<template>
  <div>
    <BtnBack route="/home" />
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
      <q-tab class="text-green-9 bg-white col" name="solicitudes"    icon="assignment" :label="$q.screen.lt.sm ? '' : 'Solicitudes'" />
      <q-tab class="text-green-9 bg-white col" name="catalogo"       icon="menu_book"  :label="$q.screen.lt.sm ? '' : 'Catálogo'" />
      <q-tab class="text-green-9 bg-white col" name="actualizacion"  icon="update"     :label="$q.screen.lt.sm ? '' : 'Actualización Catálogo'" />
      <q-tab class="text-green-9 bg-white col" name="parametros"     icon="tune"       :label="$q.screen.lt.sm ? '' : 'Parámetros'" />
      <q-tab class="text-green-9 bg-white col" name="juiciosreportes" icon="assessment" :label="$q.screen.lt.sm ? '' : 'Juicios y Reportes'" />
    </q-tabs>

    <q-tab-panels v-model="tab" keep-alive>
      <q-tab-panel class="q-px-lg" name="solicitudes">
        <TabListadoSolicitudes modo="admin" />
      </q-tab-panel>

      <q-tab-panel class="q-px-lg" name="catalogo">
        <TabCatalogo :mostrar-confirmar="false" />
      </q-tab-panel>

      <q-tab-panel class="q-pa-xl" name="actualizacion">
        <TabActualizacion
          ref="tabActualizacionRef"
          :loading="loadingUpload"
          :resultado="resultadoUpload"
          :progreso="progresoUpload"
          :estado-proceso="estadoProceso"
          @upload="subirCatalogo"
        />
      </q-tab-panel>

      <q-tab-panel class="q-pa-xl" name="parametros">
        <TabParametros />
      </q-tab-panel>

      <q-tab-panel class="q-pa-xl" name="juiciosreportes">
        <TabJuiciosReportes />
      </q-tab-panel>
    </q-tab-panels>
  </div>
</template>

<script setup>
// ── 1. IMPORTS
import { ref, computed, nextTick, onBeforeUnmount } from "vue";
import { post } from "../services/api.js";
import { requestAxios } from "../common/axios.js";
import { notifySuccessRequest, notifyErrorRequest, notifyWarningRequest } from "../common/notify.js";
import BtnBack from "../layouts/btnBackLayout.vue";
import HeaderLayout from "../layouts/headerViewsLayout.vue";
import TabCatalogo from "../components/complementarias/TabCatalogo/TabCatalogo.vue";
import TabListadoSolicitudes from "../components/complementarias/TabListadoSolicitudes/TabListadoSolicitudes.vue";
import TabActualizacion from "../components/complementarias/TabActualizacion.vue";
import TabParametros from "../components/complementarias/TabParametros.vue";
import TabJuiciosReportes from "../components/complementarias/TabJuiciosReportes/TabJuiciosReportes.vue";

// ── 4. ESTADO REACTIVO
const tab                 = ref("solicitudes");
const tabActualizacionRef = ref(null);
const loadingUpload       = ref(false);
const resultadoUpload     = ref(null);
const progresoUpload      = ref(0);
const estadoProceso       = ref(null);
let pollInterval          = null;
let isMounted             = true;

// ── 5. COMPUTED
const tituloTab = computed(() => {
  if (tab.value === "solicitudes")     return "Solicitudes";
  if (tab.value === "catalogo")        return "Catálogo";
  if (tab.value === "parametros")      return "Parámetros";
  if (tab.value === "juiciosreportes") return "Juicios y Reportes";
  return "Actualización Catálogo";
});

// ── 7. CICLO DE VIDA
onBeforeUnmount(() => { isMounted = false; detenerPolling(); });

// ── 8. HELPERS
function detenerPolling() {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
  loadingUpload.value  = false;
  progresoUpload.value = 0;
  estadoProceso.value  = null;
}

// ── 9. API / ENDPOINTS
async function subirCatalogo(file) {
  loadingUpload.value   = true;
  resultadoUpload.value = null;
  progresoUpload.value  = 0;
  estadoProceso.value   = null;

  let jobId = null;
  try {
    const formData = new FormData();
    formData.append("file", file);
    const res = await post("/complementary/catalog/upload", formData);
    jobId = res?.jobId;
  } catch {
    loadingUpload.value = false;
    return;
  }

  if (!jobId) {
    notifyErrorRequest("No se recibió un ID de proceso. Intente nuevamente.");
    loadingUpload.value = false;
    return;
  }

  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }

  pollInterval = setInterval(async () => {
    if (!isMounted) return;
    let res;
    try {
      res = await requestAxios.get(
        `/complementary/catalog/upload-status/${jobId}`,
        { validateStatus: (s) => s === 200 || s === 404 }
      );
    } catch {
      detenerPolling();
      return;
    }

    if (res.status === 404) {
      detenerPolling();
      notifyWarningRequest("El proceso expiró. Intente nuevamente.");
      return;
    }

    if (!isMounted) return;
    const state = res.data;
    progresoUpload.value = state.percent ?? 0;
    estadoProceso.value  = {
      created:        state.created        ?? 0,
      skippedVirtual: state.skippedVirtual ?? 0,
      errors:         state.errors         ?? 0,
      total:          state.total          ?? 0,
    };

    if (!state.done) return;

    detenerPolling();

    if (state.failed) {
      notifyErrorRequest(state.error || "El proceso terminó con un error inesperado.");
      return;
    }

    resultadoUpload.value = state;
    notifySuccessRequest(state.msg || "Catálogo actualizado exitosamente");
    await nextTick();
    tabActualizacionRef.value?.reset();
  }, 1000);
}
</script>
