<template>
  <div>
    <BtnBack route="/homeSchedules" />
    <HeaderLayout title="Horarios" />
    <div class="row justify-center">
      <div class="col-sm-2 col-12 justify-center flex justify-sm-start">
        <q-btn class="bg-green-9 text-white" to="/newSchedule"
          ><span
            class="material-symbols-outlined q-mr-sm"
            style="font-size: 20px"
          >
            add_circle
          </span>
          Crear
        </q-btn>
      </div>
      <div
        class="col-sm-8 col-12 row "
        :class="$q.screen.width < 600 ? 'q-mt-md q-gutter-y-md' : ''"
      >
        <div class="col-sm-4 col-12 q-px-md">
          <q-select
            :label="!isLoadingFiche ? 'Ficha' : 'Cargando...'"
            v-model="ficheSelected"
            :options="filterOptionsFiche"
            :disable="isLoadingFiche"
            dense
            filled
            hide-selected
            outlined
            options-dense
            use-input
            fill-input
            input-debounce="0"
            :popup-content-style="{ width: '300px' }"
            @filter="filterFiche"
            @update:model-value="
              searchSchedule();
              outcomeSelected = { label: 'Todos', value: 0 };
              intructorSelected = { label: 'Todos', value: 0 };
            "
          />
        </div>

        <div class="col-sm-4 col-12 q-px-md">
          <q-select
            dense
            filled
            hide-selected
            outlined
            options-dense
            use-input
            fill-input
            input-debounce="0"
            :disable="isLoadingFiche || isLoadingData"
            v-model="outcomeSelected"
            label="Seleccione el resultado"
            :options="filterOutcomes"
            @filter="filterOutco"
            :popup-content-style="{ width: '350px' }"
            @update:model-value="searchInstructor()"
          />
        </div>

        <div class="col-sm-4 col-12 q-px-md">
          <q-select
            dense
            filled
            hide-selected
            outlined
            options-dense
            use-input
            fill-input
            input-debounce="0"
            :disable="isLoadingFiche || isLoadingData"
            v-model="intructorSelected"
            label="Seleccione el instructor"
            :options="filterInstructors"
            @filter="filterInstru"
            :popup-content-style="{ width: '350px' }"
            @update:model-value="searchDataInstructor()"
          />
        </div>
      </div>
      <div
        class="col-1 justify-center flex q-mt-md"
        v-if="isLoadingData"
      >
        <q-spinner color="green-9" size="2em" :thickness="8" />
      </div>
      <div class="col-1"></div>
    </div>
    <!-- TABLE INFO -->
    <div class="row q-mt-md justify-center flex">
      <div class="col-11 q-mb-lg">
        <q-table
          class="my-sticky-header-table2 text-center q-mx-md"
          flat
          bordered
          :rows="rows"
          :columns="columns"
          row-key="index"
          rows-per-page-label="Numero de documentos"
          :rows-per-page-options="[10, 20, 30, 40, 50, 0]"
          :pagination="{
            rowsPerPage: 50,
          }"
        >
          <template v-slot:body-cell-results="props">
            <q-td :props="props">
              <div>
                <span v-text="props.value"></span>
                <q-tooltip max-width="350px">
                  {{ props.value }}
                </q-tooltip>
              </div>
            </q-td>
          </template>

          <template v-slot:body-cell-competence="props">
            <q-td :props="props">
              <div>
                <span v-text="props.value"></span>
                <q-tooltip max-width="350px">
                  {{ props.value }}
                </q-tooltip>
              </div>
            </q-td>
          </template>

          <template v-slot:body-cell-program="props">
            <q-td :props="props">
              <div>
                <span v-text="props.value"></span>
                <q-tooltip max-width="350px">
                  {{ props.value }}
                </q-tooltip>
              </div>
            </q-td>
          </template>

          <template v-slot:body-cell-environment="props">
            <q-td :props="props">
              <div>
                <span v-text="props.value"></span>
                <q-tooltip max-width="350px">
                  {{ props.value }}
                </q-tooltip>
              </div>
            </q-td>
          </template>

          <template v-slot:body-cell-status="props">
            <q-td :props="props">
              <div>
                <q-badge v-if="props.value === 'Activo'" class="bg-green-10">{{
                  props.value
                }}</q-badge>
                <q-badge v-else class="bg-red">{{ props.value }}</q-badge>
              </div>
            </q-td>
          </template>

          <template v-slot:body-cell-options="props">
            <q-td :props="props">
              <div>
                <q-btn
                  round
                  icon="edit"
                  class="q-mx-md"
                  size="xs"
                  color="green-10"
                  :to="`/editSchedule/${props.row._id}`"
                />
              </div>
            </q-td>
          </template>
        </q-table>
      </div>
    </div>

  </div>
</template>

<script setup>
import { onBeforeMount, ref } from "vue";
import { useQuasar } from "quasar";
import { get } from "../services/api.js";

import BtnBack from "../layouts/btnBackLayout.vue";
import HeaderLayout from "../layouts/headerViewsLayout.vue";


const $q = useQuasar();
let ficheSelected = ref("");
let isLoadingFiche = ref(true);
let isLoadingData = ref(false);
let optionsFiches = ref([]);
let filterOptionsFiche = ref([]);
let rows = ref([]);
let allData = ref([]);
let intructorSelected = ref({
  label: "Todos",
  value: 0,
});

let filterInstructors = ref([]);
let outcomeSelected = ref({
  label: "Todos",
  value: 0,
});
let filterOutcomes = ref([]);

onBeforeMount(async () => {
  await getFiches();
  if (filterOptionsFiche.value.length > 0) {
    ficheSelected.value = filterOptionsFiche.value[0];
    await searchSchedule();
  }
});

const getFiches = async () => {
  isLoadingFiche.value = true;
  try {
    const res = await get("/fiches?status=0");
    optionsFiches.value = (Array.isArray(res) ? res : []).map((row) => {
      const programName = row.program?.name || "Programa sin nombre";
      return {
        label: `${row.number} ${programName}`,
        value: row,
      };
    });
    filterOptionsFiche.value = optionsFiches.value;
  } catch (error) {
    optionsFiches.value = [];
    filterOptionsFiche.value = [];
    $q.notify({
      message: "No se puede conectar con el servidor de horarios.",
      color: "red-8",
      icon: "cloud_off",
    });
  } finally {
    isLoadingFiche.value = false;
  }
};

const searchSchedule = async () => {
  const ficheId = ficheSelected.value?.value?._id;
  if (!ficheId) {
    rows.value = [];
    allData.value = [];
    return;
  }

  isLoadingData.value = true;
  try {
    const data = await get(`/schedules/fiche/${ficheId}`);
    rows.value = Array.isArray(data) ? data : [];
    allData.value = rows.value;
  } catch (error) {
    rows.value = [];
    allData.value = [];
    $q.notify({
      message:
        error.response?.data?.msg ||
        error.response?.data?.message ||
        "No fue posible cargar los horarios de la ficha.",
      color: "red-8",
      icon: "error",
    });
  } finally {
    isLoadingData.value = false;
  }
};

let columns = ref([
  {
    name: "instructor",
    label: "INSTRUCTOR",
    field: (row) => row.instructor?.name || "No disponible",
    align: "center",
    sortable: true,
  },
  {
    name: "program",
    label: "PROGRAMA",
    field: (row) =>
      row.program
        ? `${row.program.name || ""} ${row.program.code || ""}`.trim()
        : "No disponible",
    align: "center",
    style:
      "max-width: 150px; white-space: nowrap; text-overflow: ellipsis !important;overflow: hidden;",
  },
  {
    name: "results",
    label: "RESULTADOS",
    field: (row) => row.outcome?.outcomes || "No disponible",
    align: "center",
    style:
      "max-width: 150px; white-space: nowrap; text-overflow: ellipsis !important;overflow: hidden;",
  },

  {
    name: "environment",
    label: "AMBIENTE",
    field: (row) => row.environment?.name || "No disponible",
    align: "center",
    style:
      "max-width: 150px; white-space: nowrap; text-overflow: ellipsis !important;overflow: hidden;",
  },
  {
    name: "fiche",
    label: "FICHA",
    field: (row) => row.fiche?.number || "No disponible",
    align: "center",
  },

  {
    name: "fstart",
    label: "FECHA INICIAL",
    field: (row) => (row.fstart ? row.fstart.split("T")[0] : ""),
    align: "center",
  },
  {
    name: "fend",
    label: "FECHA FINAL",
    field: (row) => (row.fend ? row.fend.split("T")[0] : ""),
    align: "center",
  },
  {
    name: "status",
    label: "ESTADO",
    field: (row) => (row.status == 1 ? "Inactivo" : "Activo"),
    align: "center",
  },
  {
    name: "options",
    label: "OPCIONES",
    align: "center",
  },
]);

function filterFiche(val, update, abort) {
  update(() => {
    const needle = val.toLocaleLowerCase();

    filterOptionsFiche.value = optionsFiches.value.filter(
      (v) => v.label.toLocaleLowerCase().indexOf(needle) > -1
    );
  });
}

function searchInstructor() {
  //seleccionar los intructores de la ficha según el resultado
  if (outcomeSelected.value.value == 0) {
    intructorSelected.value = {
      label: "Todos",
      value: 0,
    };

    //listar en la tabla los resultados de la ficha
    rows.value = allData.value;
  } else {
    intructorSelected.value = {
      label: "Todos",
      value: 0,
    };
    //selecionar todas las programaciones de la ficha según el resultado
    rows.value = allData.value.filter(
      (item) => item.outcome?._id == outcomeSelected.value.value
    );

    //listar los instructores del o los resultados elegidos
    rows.value.forEach((item) => {
      if (item.instructor?._id) {
        filterInstructors.value.push({
          label: item.instructor.name || "No disponible",
          value: item.instructor._id,
        });
      }
    });
  }
}

function searchDataInstructor() {
  //mostrar solo los resultados de dicho instructor
  if (intructorSelected.value.value == 0) {
    //listar en la tabla los resultados de la ficha
    if (outcomeSelected.value.value == 0) {
      rows.value = allData.value;
    } else {
      //selecionar todas las programaciones de la ficha según el resultado
      rows.value = allData.value.filter(
        (item) => item.outcome?._id == outcomeSelected.value.value
      );
    }
  } else {
    if (outcomeSelected.value.value == 0) {
      //selecionar todas las programaciones de la ficha según el resultado
      rows.value = allData.value.filter(
        (item) => item.instructor?._id == intructorSelected.value.value
      );
    } else {
      //selecionar todas las programaciones de la ficha según el resultado
      rows.value = allData.value.filter(
        (item) =>
          item.outcome?._id == outcomeSelected.value.value &&
          item.instructor?._id == intructorSelected.value.value
      );
    }
  }
}

function filterOutco(val, update, abort) {
  if (val == "") {
    update(() => {
      filterOutcomes.value = [
        {
          label: "Todos",
          value: 0,
        },
      ];

      allData.value.forEach((item) => {
        if (item.outcome?._id) {
          filterOutcomes.value.push({
            label: item.outcome.outcomes || "No disponible",
            value: item.outcome._id,
          });
        }
      });
    });
  } else {
    update(() => {
      const needle = val.toLocaleLowerCase();
      filterOutcomes.value = filterOutcomes.value.filter((v) =>
        v.label.toLocaleLowerCase().includes(needle)
      );
    });
  }
}

function filterInstru(val, update, abort) {
  if (val == "") {
    update(() => {
      filterInstructors.value = [
        {
          label: "Todos",
          value: 0,
        },
      ];

      //agregar los instructores de la ficha sin repetir en el select
      let array = [];
      rows.value.forEach((item) => {
        if (item.instructor?._id && !array.includes(item.instructor._id)) {
          array.push(item.instructor._id);
          filterInstructors.value.push({
            label: item.instructor.name || "No disponible",
            value: item.instructor._id,
          });
        }
      });
    });
  } else {
    update(() => {
      const needle = val.toLocaleLowerCase();
      filterInstructors.value = filterInstructors.value.filter((v) =>
        v.label.toLocaleLowerCase().includes(needle)
      );
    });
  }
}
</script>

<style scoped>
.save_as {
  background-color: var(--color_button);
  color: var(--color_text_button);
}

.my_card {
  color: var(--color_text_card);
}

.card_header {
  background-color: var(--color_card);
}

.button_closed {
  color: var(--color_button_closed);
}

/* .textTable {
} */
</style>
