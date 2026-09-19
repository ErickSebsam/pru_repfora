<template>
  <div class="q-pt-md">

    <!-- Advertencia -->
    <div class="row justify-center q-mb-md">
      <div class="col-12 col-sm-10 col-md-7 col-lg-6">
        <q-banner dense rounded class="bg-orange-1 text-orange-9">
          <template v-slot:avatar>
            <q-icon name="info" color="orange-7" size="18px" />
          </template>
          El archivo debe ser <strong>Excel</strong> (.xlsx, .xls, .xlsm). Esta carga reemplazará todo el catálogo actual.
        </q-banner>
      </div>
    </div>

    <!-- Zona de carga -->
    <div class="row justify-center">
      <div class="col-12 col-sm-10 col-md-7 col-lg-6 column items-center">

        <!-- Área drag & drop -->
        <div
          ref="dropAreaRef"
          class="drop-area text-center full-width"
          :class="{ active: isActive, 'has-file': !!archivoLocal }"
        >
          <q-icon
            :name="archivoLocal ? 'check_circle' : 'cloud_upload'"
            :color="archivoLocal ? 'green-7' : 'grey-5'"
            size="56px" class="q-mb-sm"
          />
          <div class="drop-text q-mb-sm">{{ dragText }}</div>

          <div v-if="archivoLocal" class="file-info q-mb-sm">
            <q-icon name="description" color="green-8" size="18px" class="q-mr-xs" />
            <span class="text-green-9 text-weight-medium">{{ archivoLocal.name }}</span>
            <span class="text-grey-6 q-ml-sm" style="font-size: 12px">
              ({{ (archivoLocal.size / 1024).toFixed(1) }} KB)
            </span>
          </div>

          <div v-if="!archivoLocal" class="text-grey-6 q-mb-sm" style="font-size: 13px">o</div>

          <q-btn
            unelevated
            :color="archivoLocal ? 'green-8' : 'green-9'"
            text-color="white"
            :label="archivoLocal ? 'Cambiar archivo' : 'Seleccionar archivo'"
            icon="folder_open" size="sm"
            :disable="props.loading"
            @click="openFileInput"
          />

          <input
            type="file" ref="fileInput"
            style="display: none"
            accept=".xlsx,.xls,.xlsm"
            @input="handleFileSelect"
          />
        </div>

        <!-- Botón subir -->
        <div class="q-mt-md">
          <q-btn
            unelevated color="green-9" text-color="white"
            icon="cloud_upload" label="Subir archivo" size="md"
            :disable="!archivoLocal || props.loading"
            :loading="props.loading"
            @click="emit('upload', archivoLocal)"
          >
            <template v-slot:loading>
              <q-spinner-oval color="white" size="1em" class="q-mr-sm" />
              Subiendo...
            </template>
          </q-btn>
        </div>

        <!-- Progreso asíncrono -->
        <div v-if="props.loading" class="q-mt-md full-width">
          <q-linear-progress
            :value="props.progreso / 100"
            color="green-9" track-color="green-2"
            rounded size="12px" class="q-mb-xs"
          />
          <div class="text-green-9 text-weight-medium q-mb-sm" style="font-size: 13px; text-align: center">
            Procesando... {{ Math.floor(props.progreso) }}%
          </div>
          <div v-if="props.estadoProceso" class="row justify-center q-gutter-xs">
            <div class="result-chip bg-green-2 text-green-9">
              <q-icon name="add_circle" size="14px" class="q-mr-xs" />
              {{ props.estadoProceso.created }} creados
            </div>
            <div class="result-chip bg-blue-1 text-blue-9">
              <q-icon name="skip_next" size="14px" class="q-mr-xs" />
              {{ props.estadoProceso.skippedVirtual }} virtuales omitidos
            </div>
            <div class="result-chip bg-orange-2 text-orange-9">
              <q-icon name="error_outline" size="14px" class="q-mr-xs" />
              {{ props.estadoProceso.errors }} errores
            </div>
          </div>
        </div>

        <!-- Resultado de la carga -->
        <div v-if="props.resultado" class="q-mt-md full-width">
          <q-card flat bordered :class="props.resultado.errors > 0 ? 'bg-orange-1' : 'bg-green-1'">
            <q-card-section class="q-py-sm q-px-md">
              <div :class="props.resultado.errors > 0 ? 'text-orange-9' : 'text-green-9'" class="text-weight-bold q-mb-sm">
                <q-icon :name="props.resultado.errors > 0 ? 'warning' : 'check_circle'" class="q-mr-xs" />
                {{ props.resultado.errors > 0 ? 'Carga completada con errores' : 'Carga completada' }}
              </div>
              <div class="row q-gutter-sm">
                <div class="result-chip bg-green-2 text-green-9">
                  <q-icon name="add_circle" size="16px" class="q-mr-xs" />
                  {{ props.resultado.created }} creados
                </div>
                <div class="result-chip bg-blue-1 text-blue-9">
                  <q-icon name="skip_next" size="16px" class="q-mr-xs" />
                  {{ props.resultado.skippedVirtual }} virtuales omitidos
                </div>
                <div v-if="props.resultado.errors > 0" class="result-chip bg-orange-2 text-orange-9">
                  <q-icon name="error_outline" size="16px" class="q-mr-xs" />
                  {{ props.resultado.errors }} con error
                </div>
                <div class="result-chip bg-grey-2 text-grey-8">
                  <q-icon name="table_rows" size="16px" class="q-mr-xs" />
                  {{ props.resultado.total }} filas totales
                </div>
              </div>
            </q-card-section>

            <!-- Detalle de errores -->
            <template v-if="props.resultado.errorDetails?.length > 0">
              <q-separator />
              <q-card-section class="q-py-sm q-px-md">
                <div class="text-orange-9 text-weight-bold q-mb-sm" style="font-size: 12px">
                  <q-icon name="list" class="q-mr-xs" />
                  DETALLE DE ERRORES
                </div>
                <q-markup-table flat dense separator="horizontal" style="font-size: 12px">
                  <thead>
                    <tr class="bg-orange-2">
                      <th class="text-left text-orange-9">Fila</th>
                      <th class="text-left text-orange-9">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(err, i) in props.resultado.errorDetails" :key="i">
                      <td class="text-orange-9 text-weight-bold" style="width: 60px">{{ err.row }}</td>
                      <td class="text-grey-8">{{ err.reason }}</td>
                    </tr>
                  </tbody>
                </q-markup-table>
              </q-card-section>
            </template>
          </q-card>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
// ── 1. IMPORTS
import { ref, onMounted, onBeforeUnmount } from "vue"
import { useQuasar } from "quasar"

// ── 2. COMPOSABLES Y STORES
const $q = useQuasar()

// ── 3. PROPS Y EMITS
const props = defineProps({
  loading:       { type: Boolean, default: false },
  resultado:     { type: Object,  default: null  },
  progreso:      { type: Number,  default: 0     },
  estadoProceso: { type: Object,  default: null  },
})

const emit = defineEmits(["file-selected", "upload"])

// ── 4. ESTADO REACTIVO
const isActive     = ref(false)
const archivoLocal = ref(null)
const fileInput    = ref(null)
const dropAreaRef  = ref(null)
const dragText     = ref("Arrastra y suelta tu archivo Excel aquí")

// ── 7. CICLO DE VIDA
onMounted(() => {
  if (dropAreaRef.value) {
    dropAreaRef.value.addEventListener("dragover",   onDragOver)
    dropAreaRef.value.addEventListener("dragleave",  onDragLeave)
    dropAreaRef.value.addEventListener("drop",       onDrop)
  }
})

// limpieza de listeners para evitar memory leak al desmontar
onBeforeUnmount(() => {
  if (dropAreaRef.value) {
    dropAreaRef.value.removeEventListener("dragover",  onDragOver)
    dropAreaRef.value.removeEventListener("dragleave", onDragLeave)
    dropAreaRef.value.removeEventListener("drop",      onDrop)
  }
})

// ── 8. HELPERS
// valida extension y registra el archivo seleccionado
function setFile(f) {
  const ext = f.name.split(".").pop().toLowerCase()
  if (!["xlsx", "xls", "xlsm"].includes(ext)) {
    $q.notify({ type: "negative", icon: "error", message: "El archivo debe ser .xlsx, .xls o .xlsm", position: "top" })
    return
  }
  archivoLocal.value = f
  dragText.value = "Archivo listo para subir"
  emit("file-selected", f)
}

function reset() {
  archivoLocal.value = null
  dragText.value = "Arrastra y suelta tu archivo Excel aquí"
}

// ── 10. MANEJADORES DEL TEMPLATE
function openFileInput() {
  fileInput.value.value = null
  fileInput.value.click()
}

function handleFileSelect(e) {
  if (e.target.files[0]) setFile(e.target.files[0])
}

function onDragOver(e) {
  e.preventDefault()
  dragText.value = "Suelta para cargar el archivo"
  isActive.value = true
}

function onDragLeave(e) {
  e.preventDefault()
  isActive.value = false
  dragText.value = archivoLocal.value ? "Archivo listo para subir" : "Arrastra y suelta tu archivo Excel aquí"
}

function onDrop(e) {
  e.preventDefault()
  isActive.value = false
  if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0])
}

// ── 11. EXPOSE
defineExpose({ reset })
</script>

<style scoped>
.drop-area {
  min-height: 200px;
  border: 3px dashed #bdbdbd;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 28px 20px;
  transition: border-color 0.2s, background 0.2s;
  background: #fafafa;
}
.drop-area.active   { background-color: #e8f5e9; border-color: #43a047; }
.drop-area.has-file { border-color: #66bb6a;     background-color: #f1f8e9; }
.drop-text {
  font-size: 15px;
  font-weight: 500;
  color: #555;
}
.file-info {
  display: flex;
  align-items: center;
  background: #fff;
  border: 1px solid #c8e6c9;
  border-radius: 8px;
  padding: 5px 12px;
  font-size: 13px;
}
.result-chip {
  display: flex;
  align-items: center;
  border-radius: 20px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
}
</style>
