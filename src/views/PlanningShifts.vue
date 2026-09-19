<template>
  <div>
    <BtnBack route="/planning-dashboard" />
    <HeaderLayout title="PARAMETRIZACIÓN DE JORNADAS DE FORMACIÓN" />

    <div class="row justify-center q-px-md">
      <div class="col-12 col-md-10 col-lg-8">
        <!-- Tarjeta de Formulario: Agregar o Editar Jornada -->
        <q-card square flat bordered class="my-card q-mb-xl q-pa-md shadow-5" style="border-radius: 12px; background: white;">
          <q-card-section class="bg-green-9 text-white q-py-md text-subtitle2 text-weight-bolder text-uppercase" style="border-radius: 8px 8px 0 0;">
            <q-icon :name="isEditing ? 'edit' : 'add_circle'" class="q-mr-xs" size="20px" />
            {{ isEditing ? 'Editar Jornada Establecida' : 'Registrar Nueva Jornada de Formación' }}
          </q-card-section>

          <q-card-section class="q-pt-lg">
            <q-form ref="formRef" @submit.prevent="saveShift" class="row q-col-gutter-md">
              <div class="col-12 col-sm-6">
                <q-input
                  square
                  filled
                  v-model="form.name"
                  label="Nombre de la Jornada"
                  color="green-9"
                  :rules="[val => !!val && val.trim().length > 0 || 'El nombre es requerido']"
                >
                  <template v-slot:prepend>
                    <q-icon name="light_mode" color="green-9" />
                  </template>
                </q-input>
              </div>

              <div class="col-12 col-sm-6">
                <q-input
                  square
                  filled
                  v-model="form.code"
                  label="Código Único (minúsculas, sin espacios)"
                  color="green-9"
                  :disable="isEditing"
                  :rules="[
                    val => !!val && val.trim().length > 0 || 'El código es requerido',
                    val => /^[a-z0-9_]+$/.test(val) || 'Solo letras minúsculas, números y guiones bajos (_)'
                  ]"
                >
                  <template v-slot:prepend>
                    <q-icon name="code" color="green-9" />
                  </template>
                </q-input>
              </div>

              <div class="col-12 col-sm-4">
                <q-input
                  square
                  filled
                  type="number"
                  v-model.number="form.hoursPerDay"
                  label="Horas por Día"
                  color="green-9"
                  :disable="form.isCustom"
                  :rules="[
                    val => val !== undefined && val !== null || 'Las horas son requeridas',
                    val => val >= 0 || 'Las horas deben ser mayores o iguales a 0'
                  ]"
                >
                  <template v-slot:prepend>
                    <q-icon name="schedule" color="green-9" />
                  </template>
                </q-input>
              </div>

              <div class="col-12 col-sm-4">
                <q-input
                  square
                  filled
                  type="time"
                  v-model="form.defaultStartTime"
                  label="Hora de Inicio Sugerida"
                  color="green-9"
                  :disable="form.isCustom"
                >
                  <template v-slot:prepend>
                    <q-icon name="play_arrow" color="green-9" />
                  </template>
                </q-input>
              </div>

              <div class="col-12 col-sm-4">
                <q-input
                  square
                  filled
                  type="time"
                  v-model="form.defaultEndTime"
                  label="Hora Fin Sugerida"
                  color="green-9"
                  :disable="form.isCustom"
                >
                  <template v-slot:prepend>
                    <q-icon name="stop" color="green-9" />
                  </template>
                </q-input>
              </div>

              <div class="col-12">
                <div class="row items-center q-gutter-md q-mb-xs">
                  <q-checkbox 
                    square
                    v-model="form.isCustom" 
                    label="¿Jornada Especial? (Permite ingresar horario libre en el programador)" 
                    color="green-9" 
                    class="text-weight-bold"
                  />
                </div>
              </div>

              <!-- Días Habilitados -->
              <div class="col-12">
                <div class="text-caption text-bold text-green-9 q-mb-sm flex items-center text-uppercase">
                  <q-icon name="today" class="q-mr-xs" />
                  Días Habilitados para Programar en esta Jornada:
                </div>
                <div class="row q-gutter-md">
                  <q-checkbox 
                    square 
                    v-for="day in weekDays" 
                    :key="day.value" 
                    v-model="form.allowedDays" 
                    :val="day.value"
                    :label="day.label" 
                    color="green-9" 
                    dense 
                    class="text-weight-medium" 
                  />
                </div>
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
                  :label="isEditing ? 'Actualizar Jornada' : 'Registrar Jornada'"
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
            Jornadas Registradas en el Sistema
          </q-card-section>

          <q-card-section class="q-pa-none">
            <q-table
              flat
              bordered
              :rows="shifts"
              :columns="columns"
              row-key="_id"
              :loading="loading"
              :pagination="{ rowsPerPage: 10 }"
              no-data-label="No hay jornadas registradas"
              class="no-shadow"
            >
              <template v-slot:body-cell-hoursPerDay="props">
                <q-td :props="props">
                  <q-badge square :color="props.row.isCustom ? 'orange-9' : 'green-9'">
                    {{ props.row.isCustom ? 'Personalizado' : `${props.row.hoursPerDay}h / día` }}
                  </q-badge>
                </q-td>
              </template>

              <template v-slot:body-cell-allowedDays="props">
                <q-td :props="props">
                  <span class="text-caption text-weight-medium">
                    {{ formatAllowedDays(props.value) }}
                  </span>
                </q-td>
              </template>

              <template v-slot:body-cell-times="props">
                <q-td :props="props">
                  <div class="text-caption" v-if="props.row.isCustom">
                    Ingreso manual
                  </div>
                  <div class="text-caption text-weight-bold text-green-10" v-else-if="props.row.defaultStartTime">
                    {{ props.row.defaultStartTime }} - {{ props.row.defaultEndTime }}
                  </div>
                  <div class="text-caption text-grey-5" v-else>
                    Sin horario definido
                  </div>
                </q-td>
              </template>

              <template v-slot:body-cell-acciones="props">
                <q-td :props="props" class="q-gutter-xs">
                  <q-btn
                    flat
                    round
                    square
                    dense
                    color="green-9"
                    icon="edit"
                    size="sm"
                    @click="editShift(props.row)"
                  >
                    <q-tooltip class="bg-green-9 text-weight-bold">Editar Jornada</q-tooltip>
                  </q-btn>
                  <q-btn
                    flat
                    round
                    square
                    dense
                    color="red-9"
                    icon="delete"
                    size="sm"
                    :disable="props.row.code === 'personalizado'"
                    @click="deleteShift(props.row)"
                  >
                    <q-tooltip class="bg-red-9 text-weight-bold">Eliminar Jornada</q-tooltip>
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
import { ShiftService } from '../services/planning.service';
import BtnBack from '../layouts/btnBackLayout.vue';
import HeaderLayout from '../layouts/headerViewsLayout.vue';

const $q = useQuasar();
const formRef = ref(null);

const shifts = ref([]);
const loading = ref(false);
const isEditing = ref(false);
const editingId = ref(null);

const weekDays = [
  { label: 'Lun', value: 1 },
  { label: 'Mar', value: 2 },
  { label: 'Mié', value: 3 },
  { label: 'Jue', value: 4 },
  { label: 'Vie', value: 5 },
  { label: 'Sáb', value: 6 },
  { label: 'Dom', value: 7 }
];

const form = ref({
  name: '',
  code: '',
  hoursPerDay: 6,
  allowedDays: [1, 2, 3, 4, 5],
  defaultStartTime: '',
  defaultEndTime: '',
  isCustom: false
});

const columns = [
  { name: 'name', label: 'Jornada', field: 'name', align: 'left', sortable: true },
  { name: 'code', label: 'Código', field: 'code', align: 'left', sortable: true },
  { name: 'hoursPerDay', label: 'Horas/Día', field: 'hoursPerDay', align: 'center', sortable: true },
  { name: 'allowedDays', label: 'Días Permitidos', field: 'allowedDays', align: 'left' },
  { name: 'times', label: 'Horario Sugerido', align: 'center' },
  { name: 'acciones', label: 'Acciones', align: 'center' }
];

const loadShifts = async () => {
  loading.value = true;
  try {
    const data = await ShiftService.getAll();
    shifts.value = data;
  } catch (error) {
    console.error('Error al cargar jornadas:', error);
    $q.notify({
      message: 'No se pudieron cargar las jornadas.',
      color: 'red-9',
      icon: 'error'
    });
  } finally {
    loading.value = false;
  }
};

const formatAllowedDays = (days) => {
  if (!days || days.length === 0) return 'Ninguno';
  if (days.length === 7) return 'Lunes a Domingo';
  if (days.length === 5 && days.every(d => d >= 1 && d <= 5)) return 'Lunes a Viernes';
  if (days.length === 6 && days.every(d => d >= 1 && d <= 6)) return 'Lunes a Sábado';

  const dayLabels = { 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb', 7: 'Dom' };
  return days.map(d => dayLabels[d]).join(', ');
};

const resetForm = () => {
  form.value = {
    name: '',
    code: '',
    hoursPerDay: 6,
    allowedDays: [1, 2, 3, 4, 5],
    defaultStartTime: '',
    defaultEndTime: '',
    isCustom: false
  };
  isEditing.value = false;
  editingId.value = null;
  if (formRef.value) formRef.value.resetValidation();
};

const saveShift = async () => {
  $q.loading.show({ message: isEditing.value ? 'Actualizando jornada...' : 'Guardando nueva jornada...' });
  try {
    // Si es personalizada, las horas son 0
    if (form.value.isCustom) {
      form.value.hoursPerDay = 0;
      form.value.defaultStartTime = '';
      form.value.defaultEndTime = '';
    }

    if (isEditing.value) {
      await ShiftService.update(editingId.value, form.value);
      $q.notify({
        message: '¡Jornada actualizada con éxito! 🚀',
        color: 'green-9',
        icon: 'check_circle'
      });
    } else {
      await ShiftService.create(form.value);
      $q.notify({
        message: '¡Jornada registrada con éxito! 🚀',
        color: 'green-9',
        icon: 'check_circle'
      });
    }
    resetForm();
    await loadShifts();
  } catch (error) {
    console.error('Error al guardar jornada:', error);
    $q.notify({
      message: error.response?.data?.message || 'Error al guardar la jornada.',
      color: 'red-9',
      icon: 'error'
    });
  } finally {
    $q.loading.hide();
  }
};

const editShift = (row) => {
  form.value = {
    name: row.name,
    code: row.code,
    hoursPerDay: row.hoursPerDay,
    allowedDays: [...row.allowedDays],
    defaultStartTime: row.defaultStartTime || '',
    defaultEndTime: row.defaultEndTime || '',
    isCustom: !!row.isCustom
  };
  isEditing.value = true;
  editingId.value = row._id;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const cancelEdit = () => {
  resetForm();
};

const deleteShift = (row) => {
  $q.dialog({
    title: '⚠️ Eliminar Jornada',
    message: `¿Estás seguro de que deseas eliminar la jornada "${row.name}"?<br>Esta acción no se puede deshacer.`,
    html: true,
    ok: { color: 'red-9', label: 'ELIMINAR' },
    cancel: { color: 'grey-8', flat: true, label: 'CANCELAR' },
    persistent: true
  }).onOk(async () => {
    $q.loading.show({ message: 'Eliminando jornada...' });
    try {
      await ShiftService.delete(row._id);
      $q.notify({
        message: 'Jornada eliminada correctamente',
        color: 'green-9',
        icon: 'check_circle'
      });
      await loadShifts();
      if (editingId.value === row._id) {
        resetForm();
      }
    } catch (error) {
      console.error('Error al eliminar jornada:', error);
      $q.notify({
        message: error.response?.data?.message || 'Error al eliminar la jornada.',
        color: 'red-9',
        icon: 'error'
      });
    } finally {
      $q.loading.hide();
    }
  });
};

onMounted(() => {
  loadShifts();
});
</script>

<style scoped>
.my-card {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
</style>
