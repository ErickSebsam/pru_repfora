<template>
  <q-layout view="hHh lpR fFf">
    <!-- Topbar matching REPFORA image exactly -->
    <q-header elevated class="bg-green-9 text-white">
      <q-toolbar class="q-px-lg" style="height: 64px;">
        <q-btn flat round dense icon="arrow_back" :to="backRoute" class="q-mr-sm">
                   <q-tooltip class="bg-grey-9">Volver</q-tooltip>
        </q-btn>

        <q-toolbar-title class="text-weight-bolder text-h6 tracking-wide">
          REPFORA — BUZÓN DE NOTIFICACIONES
        </q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-page-container class="bg-grey-2">
      <q-page class="q-pa-md">
        <div class="fill-height">
          <q-card square class="shadow-5 bg-white">
            <q-card-section class="row items-center justify-between q-py-md bg-green-10 border-bottom">
              <div>
                <div class="text-subtitle2 text-white text-weight-bolder text-uppercase">TAREAS Y ALERTAS</div>
                <div class="text-h5 text-weight-bolder text-white">
                  Buzón Principal
                </div>
                <div class="text-caption text-white q-mt-xs">
                  Revisa el estado de las asignaciones y notificaciones del sistema
                </div>
              </div>
            </q-card-section>

            <q-card-section class="q-pa-none">
              <q-table class="q-table my-sticky-header-table" flat :rows="notifications" :columns="columns" row-key="id"
                :pagination="{ rowsPerPage: 10 }">
                <template v-slot:body-cell-status="props">
                  <q-td :props="props">
                    <q-chip :color="props.row.read ? 'grey-4' : 'orange-9'"
                      :text-color="props.row.read ? 'grey-8' : 'white'" class="text-weight-bold" size="sm">
                      {{ props.row.read ? 'LEÍDO' : 'NUEVO' }}
                    </q-chip>
                  </q-td>
                </template>
                <template v-slot:body-cell-actions="props">
                  <q-td :props="props" class="text-center">
                    <q-btn v-if="!props.row.read" flat round color="green-9" icon="done" size="sm"
                      @click="markAsRead(props.row)">
                      <q-tooltip class="bg-green-9">Marcar como leído</q-tooltip>
                    </q-btn>
                    <q-btn flat round color="blue-9" icon="visibility" size="sm"
                      @click="viewNotification(props.row)">
                      <q-tooltip class="bg-blue-9">Ir a Planeación</q-tooltip>
                    </q-btn>
                  </q-td>
                </template>
              </q-table>
            </q-card-section>
          </q-card>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { NotificationService } from '../services/notification.service';
import { storeUser } from '../store/users';
import { date } from 'quasar';

const router = useRouter();

const columns = [
  { name: 'date', label: 'FECHA', align: 'left', field: row => date.formatDate(row.date, 'YYYY-MM-DD HH:mm'), sortable: true, style: 'width: 150px' },
  { name: 'sender', label: 'REMITENTE', align: 'left', field: 'sender', sortable: true },
  { name: 'subject', label: 'ASUNTO', align: 'left', field: 'subject', sortable: true },
  { name: 'fiche', label: 'FICHA RELACIONADA', align: 'center', field: 'fiche', sortable: true },
  { name: 'status', label: 'ESTADO', align: 'center', field: 'read', sortable: true },
  { name: 'actions', label: 'ACCIONES', align: 'center', field: 'actions' }
];

const useUser = storeUser ();
const  backRoute = computed(() =>{
  const token = useUser.token;
  if (token){
    try{
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(base64));

    if(decoded.rol === 'INSTRUCTOR') return '/planning-dashboard'
  }catch(e){}
  }
  return '/scheduler'
})


const notifications = ref([]);

const loadNotifications = async () => {
  try {
    const data = await NotificationService.getNotifications();
    notifications.value = data;
  } catch (error) {
    console.error('Error loading notifications:', error);
  }
};

const markAsRead = async (row) => {
  try {
    await NotificationService.markAsRead(row._id);
    row.read = true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};

const viewNotification = async (row) => {
  if (!row.read) {
    await markAsRead(row);
  }
  router.push(`/scheduler?fiche=${row.fiche}`);
};

onMounted(() => {
  loadNotifications();
});

</script>


