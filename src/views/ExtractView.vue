<template>
  <div>
    <!-- Back Button matching REPFORA views layout -->
    <BtnBack :route="backRoute" />

    <!-- Title layout matching standard Home/HomeSchedules views -->
    <div class="row q-my-xl justify-center row-tittle">
      <div class="col-12 text-center text-h5 text-weight-bold text-uppercase">
        PLANEACIÓN PEDAGÓGICA AUTOMÁTICA
      </div>
      <div class="col-12 text-center text-subtitle1 text-grey-6 q-mt-sm">
        Cargue los documentos oficiales de la plataforma SENA para generar la planeación pedagógica automáticamente.
      </div>
    </div>

    <!-- MAIN CARD FOR UPLOADING DOCUMENTS -->
    <div class="row justify-center q-px-md">
      <div class="col-12 col-md-10 col-lg-9" style="max-width: 1000px;">
        <q-card class="my-card-1 shadow-5 full-width q-pa-lg bg-white">
          <q-card-section class="text-center q-pb-none">
            <q-chip outline color="green-9" class="text-weight-bold text-uppercase">Plataforma SENA</q-chip>
            <div class="text-h6 text-weight-bold q-mt-md q-mb-xs">Cargue de Documentos</div>
            <p class="text-grey-7 text-body2">Suba los 3 documentos requeridos para generar la planeación con asignación de instructores.</p>
          </q-card-section>

          <q-separator class="q-my-md" />

          <!-- Drop Zones Grid -->
          <q-card-section class="row q-col-gutter-lg">
            <!-- Drop Zone 1 -->
            <div class="col-12 col-sm-4">
              <div class="drop-zone flex flex-center column q-pa-xl cursor-pointer"
                :class="{ 'drop-zone-active': file1 }" @click="$refs.fileInput1.click()">
                <q-icon :name="file1 ? 'check_circle' : 'description'" :color="file1 ? 'green-9' : 'grey-5'"
                  size="56px" />
                <div class="text-subtitle2 text-weight-bold q-mt-sm text-center">1. Programa de Formación</div>
                <input type="file" ref="fileInput1" class="hidden" accept=".pdf" @change="handleFile1" />
                <div v-if="file1" class="text-caption text-green-9 text-center q-mt-sm text-weight-bold">
                  {{ file1.name }}
                </div>
              </div>
            </div>

            <!-- Drop Zone 2 -->
            <div class="col-12 col-sm-4">
              <div class="drop-zone flex flex-center column q-pa-xl cursor-pointer"
                :class="{ 'drop-zone-active': file2 }" @click="$refs.fileInput2.click()">
                <q-icon :name="file2 ? 'check_circle' : 'bar_chart'" :color="file2 ? 'green-9' : 'grey-5'"
                  size="56px" />
                <div class="text-subtitle2 text-weight-bold q-mt-sm text-center">2. Proyecto Formativo</div>
                <input type="file" ref="fileInput2" class="hidden" accept=".pdf" @change="handleFile2" />
                <div v-if="file2" class="text-caption text-green-9 text-center q-mt-sm text-weight-bold">
                  {{ file2.name }}
                </div>
              </div>
            </div>

            <!-- Drop Zone 3 -->
            <div class="col-12 col-sm-4">
              <div class="drop-zone flex flex-center column q-pa-xl cursor-pointer"
                :class="{ 'drop-zone-active': file3 }" @click="$refs.fileInput3.click()">
                <q-icon :name="file3 ? 'check_circle' : 'group'" :color="file3 ? 'green-9' : 'grey-5'"
                  size="56px" />
                <div class="text-subtitle2 text-weight-bold q-mt-sm text-center">3. Equipo Ejecutor</div>
                <input type="file" ref="fileInput3" class="hidden" accept=".pdf" @change="handleFile3" />
                <div v-if="file3" class="text-caption text-green-9 text-center q-mt-sm text-weight-bold">
                  {{ file3.name }}
                </div>
              </div>
            </div>
          </q-card-section>

          <!-- Upload / Extract Button -->
          <q-card-actions class="flex flex-center q-mt-md q-pb-md">
            <q-btn class="button_style q-px-xl text-weight-bold text-uppercase" size="lg" :loading="loading"
              :disabled="!file1 || !file2 || !file3" @click="processDocuments">
              CRUZAR Y EXTRAER DOCUMENTOS
            </q-btn>
          </q-card-actions>
        </q-card>


      </div>
    </div>

    <!-- Modal de validación estilo REPFORA -->
    <q-dialog v-model="showValidationDialog" persistent>
      <q-card flat bordered style="width: 560px; max-width: 94vw; border-radius: 12px">
        <q-card-section class="bg-green-10 text-white q-py-md row items-center">
          <q-avatar color="white" text-color="green-10" :icon="validationDialog?.icon || 'info'" size="40px"
            class="q-mr-md" />
          <div>
            <div class="text-h6 text-weight-bolder text-uppercase">{{ validationDialog?.title }}</div>
            <div class="text-caption text-green-2">Planeación Pedagógica Automática</div>
          </div>
        </q-card-section>

        <q-card-section class="q-pa-md">
          <div class="text-body2 text-grey-9" v-html="validationDialog?.message"></div>

          <div v-if="validationDialog?.notice"
            class="q-pa-md q-mt-md rounded-borders row items-start no-wrap"
            :class="validationDialog?.noticeType === 'warning' ? 'bg-orange-1 text-orange-9' : 'bg-green-1 text-green-10'"
            :style="validationDialog?.noticeType === 'warning' ? 'border: 1px solid #ffe082' : 'border: 1px solid #c8e6c9'">
            <q-icon :name="validationDialog?.noticeType === 'warning' ? 'warning' : 'info'"
              :color="validationDialog?.noticeType === 'warning' ? 'orange-8' : 'green-9'" size="20px"
              class="q-mr-sm q-mt-xs" />
            <div class="text-caption" v-html="validationDialog?.notice"></div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md bg-grey-1 border-top">
          <q-btn flat label="Cancelar" color="grey-8" v-close-popup @click="validationDialog = null" />
          <q-btn class="bg-green-10 text-white text-weight-bolder" :label="validationDialog?.okLabel"
            @click="confirmValidationDialog" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { PlanningService } from '../services/planning.service';
import { storeUser } from '../store/users.js';
import BtnBack from "../layouts/btnBackLayout.vue";

const router = useRouter();
const $q = useQuasar();

const backRoute = '/planning-dashboard';
const ficheNumber = ref('');

const file1 = ref(null);
const file2 = ref(null);
const file3 = ref(null);
const loading = ref(false);

const showValidationDialog = ref(false);
const validationDialog = ref(null);

const openValidationDialog = (config) => {
  validationDialog.value = config;
  showValidationDialog.value = true;
};

const confirmValidationDialog = () => {
  const cfg = validationDialog.value;
  showValidationDialog.value = false;
  validationDialog.value = null;
  if (cfg && typeof cfg.onOk === 'function') cfg.onOk();
};

const handleFile1 = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
    $q.notify({
      message: 'Tipo de archivo no permitido. Solo se aceptan documentos PDF.',
      color: 'red-8',
      icon: 'warning',
      position: 'top'
    });
    e.target.value = ''; // Limpia el input para que pueda volver a intentar
    file1.value = null;
    return;
  }
  file1.value = file;
};

const handleFile2 = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
    $q.notify({
      message: 'Tipo de archivo no permitido. Solo se aceptan documentos PDF.',
      color: 'red-8',
      icon: 'warning',
      position: 'top'
    });
    e.target.value = '';
    file2.value = null;
    return;
  }

  file2.value = file;
};

const handleFile3 = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
    $q.notify({
      message: 'Tipo de archivo no permitido. Solo se aceptan documentos PDF.',
      color: 'red-8',
      icon: 'warning',
      position: 'top'
    });
    e.target.value = '';
    file3.value = null;
    return;
  }
  file3.value = file;
};


const getActiveUserEmail = () => {
  const useUser = storeUser();
  if (useUser.email) return useUser.email;

  const activeToken = useUser.token;
  if (activeToken) {
    try {
      const decoded = JSON.parse(atob(activeToken.split('.')[1]));
      if (decoded.email) return decoded.email;
    } catch (e) { }
  }

  const repforaUserRaw = localStorage.getItem('repfora_user');
  if (repforaUserRaw) {
    try {
      const user = JSON.parse(repforaUserRaw);
      if (user.email) return user.email;
    } catch (e) { }
  }
  return '';
};

const processDocuments = async () => {
  
  const name1 = file1.value?.name?.toLowerCase() || '';
  const name2 = file2.value?.name?.toLowerCase() || '';
  const name3 = file3.value?.name?.toLowerCase() || '';

 
  let ordenIncorrecto = false;


  if (name1.includes('proyecto') || name1.includes('equipo') || name1.includes('ejecutor')) {
    ordenIncorrecto = true;
  }

  if (name2.includes('programa') || name2.includes('estructura') || name2.includes('equipo') || name2.includes('ejecutor')) {
    ordenIncorrecto = true;
  }
 
  if (name3.includes('programa') || name3.includes('estructura') || name3.includes('proyecto')) {
    ordenIncorrecto = true;
  }

  if (ordenIncorrecto) {
    $q.notify({
      message: 'Orden de los documentos incorrectos. Por favor, revise el orden de subida',
      color: 'orange-9',
      icon: 'swap_horizontal_circle',
      timeout: 6000,
      position: 'top'
    });
    return; 
  }

  // 3. PROCESO DE EXTRACCIÓN (BACKEND)
  const leaderEmail = getActiveUserEmail();

  const doExtract = async (mergeOptions = {}) => {
    const finalFiche = ficheNumber.value || 'EXTRACTED_' + Date.now();
    loading.value = true;
    try {
      const response = await PlanningService.extractFromPDFs(
        file1.value, file2.value, file3.value, finalFiche, leaderEmail, 'fill-missing', mergeOptions
      );
      const finalRealFiche = response?.finalFiche || finalFiche;

      $q.notify({ message: '¡Extracción exitosa! Redirigiendo...', color: 'green-9', icon: 'check_circle' });
      router.push({ name: 'planning', query: { fiche: finalRealFiche } });
    } catch (error) {
      console.error('Error en extracción:', error);

      // El backend detectó que la ficha ya tiene información (planeación, ficha u horarios)
      // y pide confirmación antes de guardar.
      const data = error.response?.data || {};
      if (error.response?.status === 409 && data.code === 'MERGE_CONFIRMATION_REQUIRED') {
        ficheNumber.value = data.fiche || ficheNumber.value;
        openMergeConfirmation(data);
        return;
      }

      const backendMsg = data.message || '';
      const timeoutMsg = error.code === 'ECONNABORTED' || error.message?.includes('timeout')
        ? 'La extracción está tardando demasiado. Verifique su conexión e intente de nuevo.'
        : '';
      $q.notify({
        message: backendMsg || timeoutMsg || 'Error en la extracción. Verifique los archivos o intente de nuevo.',
        color: 'red-8',
        icon: 'error',
        timeout: backendMsg ? 10000 : 5000,
        position: 'top'
      });
    } finally {
      loading.value = false;
    }
  };

  // Validación cuando la ficha ya tiene planeación, horarios o está registrada.
  // La extracción solo continúa cuando el usuario acepta el diálogo.
  const openMergeConfirmation = (data) => {
    const fiche = data.fiche || '';
    const programName = data.programName || '';
    const schedulesCount = Number(data.schedulesCount) || 0;
    const retry = () => doExtract({ confirmedMerge: true, mergeToken: data.mergeToken });

    if (data.existsPlanning) {
      openValidationDialog({
        icon: 'warning',
        title: 'La planeación ya existe',
        message: `La planeación de la ficha <b>${fiche}</b> ya existe en Repfora${programName ? ` (${programName})` : ''}.`,
        notice: `Volver a subirla no borrará la información existente (asignaciones de instructores, programaciones, etc.). Se conservará la información actual y se completará únicamente lo que falte.${schedulesCount > 0 ? ` También se traerán las <b>${schedulesCount}</b> programaciones registradas en Horarios.` : ''}`,
        noticeType: 'warning',
        okLabel: 'Continuar y completar',
        onOk: retry,
      });
    } else if (schedulesCount > 0) {
      openValidationDialog({
        icon: 'event_available',
        title: 'La ficha ya tiene horarios programados',
        message: `La ficha <b>${fiche}</b> ya tiene <b>${schedulesCount}</b> horario(s) programado(s) en Repfora${programName ? ` (${programName})` : ''}.`,
        notice: 'Se extraerá la información de esos horarios (fechas, jornadas, instructores) y se integrará a la planeación generada, conservando lo que ya está establecido.',
        noticeType: 'info',
        okLabel: 'Entendido, continuar',
        onOk: retry,
      });
    } else {
      openValidationDialog({
        icon: 'info',
        title: 'La ficha ya está registrada',
        message: `La ficha <b>${fiche}</b> ya existe en la base de datos de planeación${programName ? ` (${programName})` : ''}.`,
        notice: 'Se traerá toda la información existente (fechas, programaciones, datos del programa, etc.) para completar la planeación extraída.',
        noticeType: 'info',
        okLabel: 'Entendido, continuar',
        onOk: retry,
      });
    }
  };

  await doExtract();
};
</script>

<style scoped>
.drop-zone {
  border: 2px dashed #ccc;
  border-radius: 12px;
  background: #f9f9f9;
  transition: all 0.3s;
}

.drop-zone:hover {
  border-color: #2e7d32;
  background: #f1f8e9;
}

.drop-zone-active {
  border-color: #2e7d32;
  background: #e8f5e9;
}

.button_style {
  background-color: var(--color_button);
  color: var(--color_text_button);
}

.row-tittle {
  margin-top: 50px;
}
</style>
