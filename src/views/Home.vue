<template>
  <div>
    <div
      v-if="showStorageBanner"
      class="row no-wrap items-center q-mx-md q-mt-md q-px-lg q-py-sm rounded-borders shadow-3"
      :class="storageBannerClass"
    >
      <q-icon :name="storageBannerIcon" size="26px" class="q-mr-md" />
      <div class="col">
        <div class="text-h6 text-weight-medium">
          {{ userStore.storageSummary?.recommendation }}
          <span class="q-ml-xs text-weight-regular">
            — {{ userStore.storageSummary?.usage }} de {{ userStore.storageSummary?.limit }}
          </span>
        </div>
        <div class="text-caption q-mt-xs">
          Por favor contacte al administrador del sistema para gestionar el espacio.
        </div>
      </div>
      <q-chip
        dense
        :color="storageBannerChipColor"
        text-color="white"
        icon="storage"
        class="q-ml-md text-subtitle1 text-weight-bold q-pa-md"
      >
        {{ userStore.storageSummary?.percentage }}% ocupado
      </q-chip>
      <q-btn
        flat
        round
        dense
        icon="close"
        class="q-ml-sm"
        @click="userStore.dismissStorageBanner()"
      />
    </div>


    <div class="row q-my-xl justify-center">
      <div class="col-8 text-center text-h5 text-weight-bold">
        REGISTRO Y PROGRAMACIÓN DE FORMACIÓN ACTUALIZADA
      </div>
    </div>

    <!-- Formaq 1 -->
    <div
      class="row justify-center"
      :class="$q.screen.width < 500 ? 'q-px-none' : 'q-px-md'"
    >
      <div
        v-for="(card, index) in cards"
        :key="index"
        class="col-10 col-sm-6 col-md-4 col-lg-3 q-my-lg flex"
        :class="$q.screen.width < 500 ? 'q-px-none' : 'q-px-lg'"
      >
        <Card
          :title="card.title"
          :image="card.image"
          :route="card.route"
          :roles="card.roles"
        />
      </div>
    </div>

    <div class="row justify-center">
      <div
        class="col-10 col-sm-6 col-md-4 col-lg-3 q-my-lg flex"
        :class="$q.screen.width < 500 ? 'q-px-none' : 'q-px-lg'"
      >
        <Card
          v-if="userStore.getSuper() === 1"
          title="Bitácora"
          image="/images/binnacle.png"
          route="/binnacle"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { storeUser } from "../store/users.js";
import { useQuasar } from "quasar";

import Card from "../layouts/Card.vue";

const $q = useQuasar();
const userStore = storeUser();

const showStorageBanner = computed(() => {
  if (userStore.storageBannerDismissed) return false;
  if (userStore.getSuper() !== 1) return false;
  const s = userStore.storageSummary;
  return s?.needsAttention === true && s?.status !== "healthy";
});

const storageBannerClass = computed(() => {
  const status = userStore.storageSummary?.status;
  if (status === "critical") return "bg-red-8 text-white";
  if (status === "warning") return "bg-orange-8 text-white";
  return "bg-amber-7 text-dark";
});

const storageBannerIcon = computed(() => {
  const status = userStore.storageSummary?.status;
  if (status === "critical") return "error";
  if (status === "warning") return "warning";
  return "info";
});

const storageBannerChipColor = computed(() => {
  const status = userStore.storageSummary?.status;
  if (status === "critical") return "red-10";
  if (status === "warning") return "deep-orange-9";
  return "orange-9";
});

const cards = ref([
  {
    title: "Instructores",
    route: "/instructors",
    image: "/images/instructor.png",
    roles: ["PROGRAMADOR", "COORDINADOR"],
    super: false,
  },
  {
    title: "Programas",
    route: "/programs",
    image: "/images/programas.png",
    roles: ["PROGRAMADOR", "COORDINADOR"],
    super: false,
  },
  {
    title: "Competencias",
    route: "/competences",
    image: "/images/competencia.png",
    roles: ["PROGRAMADOR", "COORDINADOR"],
    super: false,
  },
  {
    title: "Ambientes",
    route: "/environments",
    image: "/images/ambiente.png",
    roles: ["PROGRAMADOR", "COORDINADOR"],
    super: false,
  },
  {
    title: "Resultados",
    route: "/results",
    image: "/images/resultado.png",
    roles: ["PROGRAMADOR", "COORDINADOR"],
    super: false,
  },
  {
    title: "Fichas",
    route: "/files",
    image: "/images/ficha.png",
    roles: ["PROGRAMADOR", "COORDINADOR"],
    super: false,
  },
   {
    title: "Horarios",
    route: "/homeSchedules",
    image: "/images/calendar.png",
    roles: ["PROGRAMADOR", "COORDINADOR"],
    super: false,
  },
  {
    title: "Reportes",
    route: "/reports",
    image: "/images/reports2.jpg",
    roles: ["PROGRAMADOR", "COORDINADOR"],
    super: false,
  },
  {
    title: "Carga masiva",
    route: "/bulkload",
    image: "/images/cargamasiva.jpg",
    roles: ["PROGRAMADOR", "COORDINADOR"],
    super: false,
  },
  {
    title: "Juicios evaluativos",
    route: "/judgment",
    image: "/images/judgment.png",
    roles: ["PROGRAMADOR", "COORDINADOR", "EVALUADOR","NOVEDADES"],
    super: false,
  },
  {
    title: "Novedades",
    route: "/news",
    image: "/images/news.jpg",
    roles: ["PROGRAMADOR", "COORDINADOR", "NOVEDADES"],
    super: false,
  },
  {
    title: "Auditoria Juicios",
    route: "/audit",
    image: "/images/audit.jpg",
    roles: ["PROGRAMADOR", "COORDINADOR", "NOVEDADES"],
    super: false,
  },
  {
    title: "Usuarios",
    route: "/users",
    image: "/images/users4.jpg",
    roles: ["COORDINADOR"],
    super: false,
  },
  {
      title: "Planeación",
      route: "/planning-dashboard", 
      image: "/images/calendar.png",
      roles: ["PROGRAMADOR", "COORDINADOR"],
      super: false,
    },
  {
    title: "Coordinación",
    route: "/coordination",
    image: "/images/coordination4.jpg",
    roles: ["COORDINADOR"],
    super: false,
  },
  {
    title: "Complementarias",
    route: "/home/complementarias/admin",
    image: "/images/complementary.png", // TODO: Reemplazar con imagen definitiva
    roles: ["PROGRAMADOR", "COORDINADOR"],
    super: false,
  },
  // {
  //   title: "Usarios",
  //   route: "/users",
  //   image: "/images/users4.jpg",
  //   show: false,
  // },
]);
</script>

