import { defineStore } from "pinia";
import { ref } from "vue";

export const storeMenu = defineStore("storeMenu", () => {
  const leftDrawerOpen = ref(false);

  const toggleLeftDrawer = () => {
    leftDrawerOpen.value = !leftDrawerOpen.value;
  };

  const closeLeftDrawer = () => {
    leftDrawerOpen.value = false;
  };

  return { leftDrawerOpen, toggleLeftDrawer, closeLeftDrawer };
});
