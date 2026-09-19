<template>
  <div>
    <q-layout view="hHh lpR fff">
      <HeaderLayout :logout="logout" :toggleLeftDrawer="toggleLeftDrawer" />
      <DrawerLayout
        :toggleLeftDrawer="toggleLeftDrawer"
        v-model:left-drawer-open="leftDrawerOpen"
      />

      <q-page-container style="padding-left: 0">
        <router-view />
      </q-page-container>

      <FooterLayout />
    </q-layout>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { storeUser } from "./store/users.js";
import { storeMenu } from "./store/menu.store.js";
import { useRouter } from "vue-router";

import FooterLayout from "./layouts/footerLayout.vue";
import HeaderLayout from "./layouts/headerLayout.vue";
import DrawerLayout from "./layouts/drawerLayout.vue";
import { useQuasar } from "quasar";

const userStore = storeUser();
const menuStore = storeMenu();
const router = useRouter();
const $q = useQuasar();

const currentDate = new Date();
const dateLogin = new Date(userStore.dateLogin);

const leftDrawerOpen = computed({
  get: () => menuStore.leftDrawerOpen,
  set: (value) => {
    menuStore.leftDrawerOpen = value;
  },
});

function toggleLeftDrawer() {
  menuStore.toggleLeftDrawer();
}

watch(
  () => router.currentRoute.value.fullPath,
  () => {
    leftDrawerOpen.value = false;
  }
);

const logout = () => {
  $q.dialog({
    title: "Cerrar Sesión",
    message: "¿Está seguro que desea cerrar la sesión?",
    cancel: { label: "Cancelar", flat: true, color: "grey-7" },
    ok: { label: "Cerrar Sesión", color: "green-9" },
    persistent: true,
  }).onOk(() => {
    performLogout();
  });
};

const performLogout = () => {
  userStore.logoutUser();
  leftDrawerOpen.value = false;
  sessionStorage.removeItem("storeUser");
  sessionStorage.clear();
  localStorage.removeItem("token");
  router.replace({ name: "login" });
};

//si la fecha actual es mayor a la fecha de inicio de sesion + 1 dia
if (currentDate > dateLogin.setDate(dateLogin.getDate() + 1)) {
  logout();
}

//set title to page
document.title = import.meta.env.VITE_APP_TITLE;

</script>

<style scoped>
.hide-menu {
  display: none;
}

.header {
  background-color: var(--color_header);
}

.btnSlider:hover {
  background-color: transparent !important;
}
</style>
