<template>
  <div>
    <q-banner v-if="catalogUpdateAlert" class="bg-orange-1 text-orange-9 q-mb-md" rounded>
      <template v-slot:avatar>
        <q-icon name="warning" color="orange" />
      </template>
      El catálogo puede estar desactualizado. Última carga: {{ formatDate(lastUploadDate) }}
    </q-banner>

    <div class="row q-col-gutter-md q-mt-sm">

      <div class="col-12 col-md-3">
        <div class="q-mb-sm">
          <div class="ultima-actualizacion full-width">
            <div class="ultima-icon-wrapper row items-center justify-center">
              <q-icon name="update" color="white" size="20px" />
            </div>
            <div class="column">
              <span class="ultima-label">ÚLTIMA ACTUALIZACIÓN DEL CATÁLOGO</span>
              <div class="ultima-fecha">
                {{ lastUploadDate ? formatDate(lastUploadDate) : 'Sin registros' }}
              </div>
            </div>
          </div>
        </div>

        <FiltrosCurso
          :model-value="filtrosActivos"
          @update:model-value="onFiltrosChange"
          :config="CONFIGURACION_FILTROS"
          :counts="counts"
        />
      </div>

      <div class="col-12 col-md-9">

        <div class="row q-gutter-sm q-mb-md">
          <q-input
            v-model="textoBusqueda"
            label="Buscar por nombre o código del curso"
            outlined dense clearable class="col"
          >
            <template v-slot:prepend>
              <q-icon name="search" />
            </template>
          </q-input>
          <q-select
            v-model="ordenSeleccionado"
            :options="OPCIONES_ORDENAMIENTO"
            outlined dense emit-value map-options
            color="green-9" class="sort-select" label="Ordenar"
          >
            <q-tooltip v-if="!haBuscado" anchor="top middle" self="bottom middle">
              Realiza una búsqueda primero
            </q-tooltip>
          </q-select>
        </div>

        <div v-if="!haBuscado && !loading" class="text-center q-pa-xl">
          <q-icon name="manage_search" size="64px" color="grey-4" />
          <div class="text-grey-5 q-mt-md" style="font-size: 20px; font-weight: 600">Sin registros aún</div>
          <div class="text-grey-4 q-mt-xs" style="font-size: 14px">Usa el buscador o aplica un filtro para ver los cursos</div>
        </div>

        <div v-else-if="haBuscado && cursos.length === 0 && !loading" class="text-center q-pa-xl">
          <q-icon name="search_off" size="64px" color="grey-4" />
          <div class="text-grey-6 q-mt-md" style="font-size: 16px">No se encontraron cursos con los criterios aplicados</div>
        </div>

        <div v-if="haBuscado && !loading" class="text-grey-7 q-mb-md" style="font-size: 14px">
          {{ total }}
          {{ total === 1 ? 'curso encontrado' : 'cursos encontrados' }}
        </div>

        <div style="position: relative; min-height: 100px">
          <div class="column q-gutter-sm">
            <div v-for="course in cursos" :key="course._id" class="col-12">
              <TarjetaItem
                :code="course.prfCodigoStr || course.prfCodigo"
                :title="course.prfDenominacion"
                :badges="[{ label: course.modalidad, bgClass: course.modalidad === 'Presencial' ? 'bg-green-1 text-green-9' : 'bg-blue-1 text-blue-9' }]"
                :meta="[
                  { icon: 'school',    text: course.tipoFormacion },
                  { icon: 'schedule',  text: course.prfDuracionMaxima + ' horas' },
                  { icon: 'park',      text: course.redConocimiento },
                ]"
                :loading="cargandoCurso === course._id"
                @select="abrirDetalleCurso(course)"
              />
            </div>
          </div>
          <q-inner-loading :showing="loading">
            <q-spinner-gears size="50px" color="green-9" />
          </q-inner-loading>
        </div>

        <div v-if="totalPages > 1" class="q-mt-lg flex justify-center">
          <q-pagination
            :model-value="page" @update:model-value="onPageChange"
            :max="totalPages" :max-pages="5"
            direction-links flat color="green-9" active-color="green-9"
          />
        </div>
      </div>
    </div>

    <DialogoDetalleCurso
      v-if="cursoSeleccionado"
      v-model="dialogoAbierto"
      :course="cursoSeleccionado"
      :show-confirm="mostrarConfirmar"
      @confirm="confirmarCurso"
    />
  </div>
</template>

<script setup>
// ── 1. IMPORTS
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { get } from "../../../services/api.js";
import { formatDate } from "../../../utils/complementarias/DateUtils.js";
import { CONFIGURACION_FILTROS, OPCIONES_ORDENAMIENTO } from "../../../static/complementarias/ConstantesComplementarias.js";
import TarjetaItem from "./tarjetas/TarjetaItem.vue";
import FiltrosCurso from "./filtros/FiltrosCurso.vue";
import DialogoDetalleCurso from "./dialogos/DialogoDetalleCurso.vue";

// ── 3. PROPS Y EMITS
const props = defineProps({
  mostrarConfirmar: { type: Boolean, default: true },
});

const emit = defineEmits(["confirm"]);

// ── 4. ESTADO REACTIVO
const CURSOS_POR_PAGINA = 11;

const cursos             = ref([]);   // página actual (server-side)
const total              = ref(0);    // total de resultados (server-side)
const counts             = ref({});   // conteos de facetas (GLOBALES, del backend)
const loading            = ref(false);
const catalogUpdateAlert = ref(false);
const lastUploadDate     = ref(null);
const dialogoAbierto         = ref(false);
const cursoSeleccionado     = ref(null);
const filtrosActivos      = ref({});
const textoBusqueda      = ref("");
const ordenSeleccionado          = ref(null);
const page               = ref(1);
const haBuscado        = ref(false);
const cargandoCurso       = ref(null);
let temporizadorBusqueda        = null;
let reqCatalogo                 = 0;    // secuencia para descartar respuestas obsoletas

// ── 5. COMPUTED
// indica si hay algún filtro (checkbox o rango de horas) aplicado
const tieneAlgunFiltro = computed(() => {
  const hayCheckbox = CONFIGURACION_FILTROS
    .filter((f) => f.type === "checkbox")
    .some((f) => (filtrosActivos.value[f.field] || []).length > 0);
  const cfgHoras = CONFIGURACION_FILTROS.find((f) => f.type === "hours-range");
  const hayHoras = cfgHoras && (
    (filtrosActivos.value[cfgHoras.field + "Min"] !== undefined && filtrosActivos.value[cfgHoras.field + "Min"] !== cfgHoras.min) ||
    (filtrosActivos.value[cfgHoras.field + "Max"] !== undefined && filtrosActivos.value[cfgHoras.field + "Max"] !== cfgHoras.max)
  );
  return hayCheckbox || hayHoras;
});

// total de páginas según el total de resultados del backend
const totalPages = computed(() => Math.ceil(total.value / CURSOS_POR_PAGINA));

// ── 6. WATCHERS
// búsqueda con debounce (setTimeout) → reinicia página y refresca desde el backend
// si se borra el texto (y no hay filtros), limpia de inmediato sin esperar el debounce
watch(textoBusqueda, (val) => {
  clearTimeout(temporizadorBusqueda);
  if (!val?.trim() && !tieneAlgunFiltro.value) { page.value = 1; refrescar(); return; }
  temporizadorBusqueda = setTimeout(() => { page.value = 1; refrescar(); }, 400);
});
// cambio de orden → reinicia página y refresca
watch(ordenSeleccionado, () => { page.value = 1; refrescar(); });

// ── 7. CICLO DE VIDA
onMounted(cargarMeta);
onBeforeUnmount(() => clearTimeout(temporizadorBusqueda));

// ── 9. API / ENDPOINTS (server-side: paginar/filtrar/buscar/contar)
// arma los query params (página, búsqueda, orden, filtros y rango de horas)
function buildParams() {
  const params = { status: 0, page: page.value, limit: CURSOS_POR_PAGINA };
  const q = textoBusqueda.value?.trim();
  if (q) params.q = q;                                  // dígitos→código (literal con ceros), texto→nombre
  if (ordenSeleccionado.value) params.orden = ordenSeleccionado.value;
  const fa = filtrosActivos.value;
  if (fa.modalidad?.length)            params.modalidad            = fa.modalidad.join(",");
  if (fa.lineaTecnologica?.length)     params.lineaTecnologica     = fa.lineaTecnologica.join(",");
  if (fa.redConocimiento?.length)      params.redConocimiento      = fa.redConocimiento.join(",");
  if (fa.apuestasPrioritarias?.length) params.apuestasPrioritarias = fa.apuestasPrioritarias.join(",");
  const cfg = CONFIGURACION_FILTROS.find((f) => f.type === "hours-range");
  if (cfg) {
    const min = fa[cfg.field + "Min"];
    const max = fa[cfg.field + "Max"];
    if (min != null && min !== cfg.min) params.horasMin = min;
    if (max != null && max !== cfg.max) params.horasMax = max;
  }
  return params;
}

// pide al backend la página actual con filtros/búsqueda/orden y sus conteos
// usa un guard de secuencia: si llega una respuesta vieja (búsqueda ya cambiada/borrada) se ignora
async function cargarCatalogo() {
  const seq = ++reqCatalogo;
  loading.value = true;
  try {
    const res = await get("/complementary/catalog", buildParams());
    if (seq !== reqCatalogo) return;   // respuesta obsoleta → no pisar el estado actual
    cursos.value             = res?.data ?? [];
    total.value              = res?.total ?? 0;
    if (res?.counts) counts.value = res.counts;
    catalogUpdateAlert.value = res?.catalogUpdateAlert;
    lastUploadDate.value     = res?.lastUploadDate;
  } catch (e) {
    if (seq === reqCatalogo) { console.error(e); cursos.value = []; total.value = 0; }
  }
  if (seq === reqCatalogo) loading.value = false;
}

// carga inicial liviana: facetas (counts) + banner; sin mostrar cursos (flujo "buscar primero")
async function cargarMeta() {
  try {
    const res = await get("/complementary/catalog", { status: 0, page: 1, limit: 1 });
    counts.value             = res?.counts ?? {};
    catalogUpdateAlert.value = res?.catalogUpdateAlert;
    lastUploadDate.value     = res?.lastUploadDate;
  } catch (e) { console.error(e); }
}

// refresca según haya o no búsqueda/filtros (preserva el estado "Sin registros aún")
function refrescar() {
  const hayQuery = !!(textoBusqueda.value?.trim()) || tieneAlgunFiltro.value;
  if (!hayQuery) {
    reqCatalogo++;            // invalida cualquier búsqueda en curso
    haBuscado.value = false;
    cursos.value = [];
    total.value = 0;
    loading.value = false;
    return;
  }
  haBuscado.value = true;
  cargarCatalogo();
}

// aplica los filtros del panel y refresca desde la primera página
function onFiltrosChange(nuevos) {
  filtrosActivos.value = nuevos;
  page.value = 1;
  refrescar();
}

// cambia de página y vuelve a pedir si ya hay una búsqueda activa
function onPageChange(p) {
  page.value = p;
  if (haBuscado.value) cargarCatalogo();
}

// ── 10. MANEJADORES DEL TEMPLATE
// abre el detalle de un curso (lo trae completo del backend)
async function abrirDetalleCurso(course) {
  cargandoCurso.value = course._id;
  try {
    const res = await get(`/complementary/catalog/${course._id}`);
    cursoSeleccionado.value = res || course;
  } catch {
    cursoSeleccionado.value = course;
  }
  cargandoCurso.value = null;
  dialogoAbierto.value   = true;
}

// confirma el curso seleccionado y lo emite al padre
function confirmarCurso(course) {
  dialogoAbierto.value = false;
  emit("confirm", course);
}
</script>

<style scoped>
.sort-select { min-width: 170px; }

.ultima-actualizacion {
  display: flex;
  align-items: center;
  gap: 10px;
  background: color-mix(in srgb, var(--color_button) 8%, white);
  border: 1px solid color-mix(in srgb, var(--color_button) 35%, transparent);
  border-left: 4px solid var(--color_button);
  border-radius: 6px;
  padding: 10px 12px;
}
.ultima-icon-wrapper {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color_button);
  flex-shrink: 0;
}
.ultima-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--color_button);
  letter-spacing: 0.6px;
}
.ultima-fecha {
  font-size: 12px;
  font-weight: 500;
  color: var(--color_card);
  margin-top: 2px;
}
</style>
