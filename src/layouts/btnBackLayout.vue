<template>
    <div>
      <q-page-sticky
        position="top-left"
        :offset="stickyOffset"
        :style="props.shiftWithMenu
          ? 'z-index: 500; transition: left 0.25s ease'
          : 'z-index: 3000'"
      >
        <q-btn
          icon="arrow_back"
          color="green-10"
          size="12px"
          round
          :to="props.route"
        />
      </q-page-sticky>
    </div>
  </template>
  
  <script setup>
  import { computed, defineProps } from "vue";
  import { storeMenu } from "../store/menu.store.js";

  const menuStore = storeMenu();

  const props = defineProps({
    route: {
      type: String,
      default: "/home",
    },
    shiftWithMenu: {
      type: Boolean,
      default: false,
    },
  });

  // Solo cuando la vista lo pide (ej. Programador), la flecha se desplaza
  // junto con el menú principal al abrirse; en el resto de vistas se mantiene
  // fija como siempre.
  const stickyOffset = computed(() => {
    if (!props.shiftWithMenu) return [20, 20];
    return [menuStore.leftDrawerOpen ? 320 : 20, 20];
  });
  </script>