<template>
  <div>
    <BtnBack route="/planning-dashboard" />
    <HeaderLayout title="GESTIÓN DE DÍAS NO PROGRAMABLES (VACACIONES)" />

    <div class="row justify-center q-px-md">
      <div class="col-12 col-md-10 col-lg-8">
        <!-- Tarjeta de Formulario: Agregar o Editar Novedad -->
        <q-card square flat bordered class="my-card q-mb-xl q-pa-md shadow-5" style="border-radius: 12px; background: white;">
          <q-card-section class="bg-green-9 text-white q-py-md text-subtitle2 text-weight-bolder text-uppercase" style="border-radius: 8px 8px 0 0;">
            <q-icon :name="isEditing ? 'edit' : 'add_circle'" class="q-mr-xs" size="20px" />
            {{ isEditing ? 'Editar Novedad Establecida' : 'Establecer Nuevo Rango No Programable (Vacaciones)' }}
          </q-card-section>

          <q-card-section class="q-pt-lg">
            <q-form ref="formRef" @submit.prevent="saveVacation" class="row q-col-gutter-md">
              <div class="col-12 col-sm-6">
                <q-input
                  square
                  filled
                  type="date"
                  v-model="form.start"
                  label="Fecha de Inicio"
                  color="green-9"
                  :rules="[val => !!val || 'La fecha de inicio es requerida']"
                >
                  <template v-slot:prepend>
                    <q-icon name="event" color="green-9" />
                  </template>
                </q-input>
              </div>

              <div class="col-12 col-sm-6">
                <q-input
                  square
                  filled
                  type="date"
                  v-model="form.end"
                  label="Fecha de Fin"
                  color="green-9"
                  :rules="[
                    val => !!val || 'La fecha de fin es requerida',
                    val => !form.start || val >= form.start || 'La fecha de fin debe ser posterior o igual a la de inicio'
                  ]"
                >
                  <template v-slot:prepend>
                    <q-icon name="event" color="green-9" />
                  </template>
                </q-input>
              </div>

              <div class="col-12">
                <q-input
                  square
                  filled
                  v-model="form.reason"
                  label="Motivo de la Novedad (ej: Vacaciones Colectivas, Licencia, Semana Santa, etc.)"
                  color="green-9"
                  :rules="[val => !!val && val.trim().length > 0 || 'El motivo es requerido']"
                >
                  <template v-slot:prepend>
                    <q-icon name="beach_access" color="green-9" />
                  </template>
                </q-input>
              </div>

              <div class="col-12 flex justify-end q-gutter-sm q-mt-md">
                <q-btn
                  v-if="isEditing"
                  square
                  flat
                  label="Cancelar"
                  color="grey-8"
                  @click="cancelEdit"
                />
                <q-btn
                  square
                  type="submit"
                  :label="isEditing ? 'Actualizar Novedad' : 'Establecer Días No Programables'"
                  class="bg-green-9 text-white text-bold q-px-md"
                  :icon="isEditing ? 'edit' : 'save'"
                />
              </div>
            </q-form>
          </q-card-section>
        </q-card>

        <!-- Tarjeta de Listado: Previsualizar y Administrar -->
        <q-card square flat bordered class="my-card shadow-5" style="border-radius: 12px; background: white;">
          <q-card-section class="bg-grey-2 text-grey-9 q-py-md text-subtitle2 text-weight-bolder text-uppercase" style="border-radius: 8px 8px 0 0;">
            <q-icon name="visibility" class="q-mr-xs" size="20px" />
            Previsualizar Novedades Establecidas
          </q-card-section>

          <q-card-section class="q-pa-none">
            <q-table
              flat
              bordered
              :rows="vacations"
              :columns="columns"
              row-key="id"
              no-data-label="No hay días no programables establecidos en este momento"
              rows-per-page-label="Registros por página"
              :pagination="{ rowsPerPage: 10 }"
              class="text-center"
            >
              <!-- Rango de Fechas Formateado -->
              <template v-slot:body-cell-dates="props">
                <q-td :props="props">
                  <div class="text-weight-bold">
                    {{ formatDateCO(props.row.start) }} <span class="text-grey-5">al</span> {{ formatDateCO(props.row.end) }}
                  </div>
                </q-td>
              </template>

              <!-- Motivo -->
              <template v-slot:body-cell-reason="props">
                <q-td :props="props">
                  <q-chip outline color="green-9" text-color="green-9" class="text-weight-bold uppercase" dense>
                    {{ props.row.reason }}
                  </q-chip>
                </q-td>
              </template>

              <!-- Opciones de Acción -->
              <template v-slot:body-cell-options="props">
                <q-td :props="props" class="q-gutter-xs">
                  <q-btn
                    round
                    icon="edit"
                    size="sm"
                    color="blue-9"
                    @click="startEdit(props.row)"
                  >
                    <q-tooltip class="bg-blue-9">Modificar Novedad</q-tooltip>
                  </q-btn>
                  <q-btn
                    round
                    icon="delete"
                    size="sm"
                    color="red-9"
                    @click="confirmDelete(props.row)"
                  >
                    <q-tooltip class="bg-red-9">Eliminar Novedad</q-tooltip>
                  </q-btn>
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import BtnBack from '../layouts/btnBackLayout.vue';
import HeaderLayout from '../layouts/headerViewsLayout.vue';
import { VacationService } from '../services/planning.service.js';

const $q = useQuasar();
const formRef = ref(null);

const form = ref({
  _id: null,
  start: '',
  end: '',
  reason: ''
});

const vacations = ref([]);
const isEditing = ref(false);

const columns = [
  {
    name: 'dates',
    label: 'RANGO DE FECHAS',
    align: 'center',
    sortable: true
  },
  {
    name: 'reason',
    label: 'MOTIVO / EVENTO',
    field: 'reason',
    align: 'center',
    sortable: true
  },
  {
    name: 'options',
    label: 'ACCIONES',
    align: 'center'
  }
];

onMounted(() => {
  loadVacations();
});

const loadVacations = async () => {
  try {
    const data = await VacationService.getAll();
    vacations.value = Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('Error cargando vacaciones', e);
    vacations.value = [];
  }
};

const formatDateCO = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

const saveVacation = async () => {
  if (isEditing.value) {
    // Editar
    try {
      await VacationService.update(form.value._id, {
        start: form.value.start,
        end: form.value.end,
        reason: form.value.reason
      });
      await loadVacations();
      $q.notify({ message: 'Novedad modificada con éxito ✅', color: 'green-9', icon: 'check_circle' });
      cancelEdit();
    } catch (e) {
      $q.notify({ message: 'Error al modificar novedad', color: 'red-9' });
    }
  } else {
    // Crear nuevo
    try {
      await VacationService.create({
        start: form.value.start,
        end: form.value.end,
        reason: form.value.reason
      });
      await loadVacations();
      $q.notify({ message: 'Novedad registrada con éxito ✅', color: 'green-9', icon: 'check_circle' });
      resetForm();
    } catch (e) {
      $q.notify({ message: 'Error al registrar novedad', color: 'red-9' });
    }
  }
};

const startEdit = (vacationItem) => {
  form.value = { ...vacationItem };
  isEditing.value = true;
};

const cancelEdit = () => {
  resetForm();
  isEditing.value = false;
};

const resetForm = () => {
  form.value = {
    _id: null,
    start: '',
    end: '',
    reason: ''
  };
  if (formRef.value) {
    formRef.value.resetValidation();
  }
};

const confirmDelete = (vacationItem) => {
  $q.dialog({
    title: '⚠️ Confirmar Eliminación',
    message: `¿Está seguro de que desea eliminar la novedad de vacaciones de las fechas del <b>${formatDateCO(vacationItem.start)}</b> al <b>${formatDateCO(vacationItem.end)}</b> por el motivo: <br><strong>"${vacationItem.reason}"</strong>?`,
    html: true,
    cancel: { color: 'grey-8', flat: true, label: 'Cancelar' },
    ok: { color: 'red-9', label: 'Eliminar' },
    persistent: true
  }).onOk(async () => {
    try {
      await VacationService.delete(vacationItem._id);
      await loadVacations();
      $q.notify({ message: 'Novedad eliminada con éxito 🗑️', color: 'red-8', icon: 'delete' });
      if (isEditing.value && form.value._id === vacationItem._id) {
        cancelEdit();
      }
    } catch (e) {
      $q.notify({ message: 'Error al eliminar novedad', color: 'red-9' });
    }
  });
};
</script>

<style scoped>
.my-card {
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}
</style>
