<template>
  <q-layout view="hHh Lpr lFf">
    <!-- Topbar matching REPFORA image exactly -->
    <q-header elevated class="bg-green-9 text-white">
      <q-toolbar class="q-px-lg" style="height: 64px">
        <q-btn
          flat
          round
          dense
          icon="menu"
          @click="menuStore.toggleLeftDrawer()"
          class="q-mr-sm"
        />

        <q-toolbar-title class="text-weight-bolder text-h6 tracking-wide">
          REPFORA — MÓDULO PROGRAMADOR
        </q-toolbar-title>

        <!-- Notification count badge -->
        <q-btn
          flat
          round
          dense
          icon="notifications"
          class="q-mr-sm"
          to="/notifications"
        >
          <q-badge
            v-if="unreadNotificationsCount > 0"
            floating
            color="orange"
            rounded
            >{{ unreadNotificationsCount }}</q-badge
          >
        </q-btn>

        <q-btn flat round dense icon="logout" @click="handleLogout">
          <q-tooltip class="bg-red-8">Cerrar Sesión</q-tooltip>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-page-container class="bg-grey-2">
      <q-page class="q-pa-md">
        <BtnBack route="/planning-dashboard" shift-with-menu />

        <div class="fill-height" style="min-height: calc(100vh - 100px)">
          <div class="column justify-between full-height">
            <!-- ═══════════════ FICHAS GRID (no ficha selected) ═══════════════ -->
            <div v-if="!selectedPlanning" class="column">
              <!-- Header: icon + title + stats summary -->
              <div
                class="row items-center justify-between q-mb-md q-gutter-y-sm"
              >
                <div class="row items-center q-gutter-x-md">
                  <q-avatar
                    square
                    color="green-9"
                    text-color="white"
                    icon="description"
                    size="52px"
                    style="border-radius: 12px"
                  />
                  <div>
                    <div class="text-h5 text-weight-bolder text-green-10">
                      Fichas en Planeación
                    </div>
                    <div class="text-subtitle2 text-grey-7">
                      Selecciona una ficha para validar y confirmar la
                      programación.
                    </div>
                  </div>
                </div>

                <q-card flat bordered class="q-px-md q-py-sm bg-white">
                  <div class="row items-center q-gutter-x-lg">
                    <div class="row items-center q-gutter-x-xs">
                      <q-icon name="description" color="green-9" size="20px" />
                      <span class="text-weight-bolder">{{
                        filteredPlannings.length
                      }}</span>
                      <span class="text-grey-7">fichas</span>
                    </div>
                    <div class="row items-center q-gutter-x-xs">
                      <q-icon name="fiber_manual_record" color="orange-8" size="12px" />
                      <span class="text-weight-bold">{{ pendientesCount }}</span>
                      <span class="text-grey-7">pendientes</span>
                    </div>
                    <div class="row items-center q-gutter-x-xs">
                      <q-icon name="fiber_manual_record" color="green-9" size="12px" />
                      <span class="text-weight-bold">{{ completasCount }}</span>
                      <span class="text-grey-7">completas</span>
                    </div>
                  </div>
                </q-card>
              </div>

              <!-- Filters bar -->
              <q-card flat bordered class="q-pa-md q-mb-md bg-white">
                <div class="row items-center q-col-gutter-md">
                  <div class="col-12 col-md-4">
                    <q-input
                      dense
                      outlined
                      square
                      v-model="searchFiche"
                      placeholder="Buscar por ficha o programa..."
                    >
                      <template v-slot:prepend>
                        <q-icon name="search" />
                      </template>
                    </q-input>
                  </div>

                  <div class="col-12 col-md-5">
                    <div class="text-caption text-grey-7 q-mb-xs">Estado</div>
                    <div class="row q-gutter-x-sm">
                      <q-btn
                        no-caps
                        unelevated
                        rounded
                        :outline="estadoFilter !== 'todas'"
                        :color="estadoFilter === 'todas' ? 'green-9' : 'grey-5'"
                        :text-color="estadoFilter === 'todas' ? 'white' : 'grey-8'"
                        label="Todas"
                        @click="estadoFilter = 'todas'"
                      />
                      <q-btn
                        no-caps
                        unelevated
                        rounded
                        :outline="estadoFilter !== 'pendiente'"
                        :color="estadoFilter === 'pendiente' ? 'orange-8' : 'grey-5'"
                        :text-color="estadoFilter === 'pendiente' ? 'white' : 'grey-8'"
                        icon="fiber_manual_record"
                        label="Pendientes"
                        @click="estadoFilter = 'pendiente'"
                      />
                      <q-btn
                        no-caps
                        unelevated
                        rounded
                        :outline="estadoFilter !== 'completa'"
                        :color="estadoFilter === 'completa' ? 'green-9' : 'grey-5'"
                        :text-color="estadoFilter === 'completa' ? 'white' : 'grey-8'"
                        icon="fiber_manual_record"
                        label="Completas"
                        @click="estadoFilter = 'completa'"
                      />
                    </div>
                  </div>

                  <div class="col-12 col-md-3">
                    <div class="text-caption text-grey-7 q-mb-xs">Programa</div>
                    <q-select
                      dense
                      outlined
                      square
                      v-model="programaFilter"
                      :options="programaOptions"
                      emit-value
                      map-options
                    />
                  </div>
                </div>
              </q-card>

              <!-- Loading -->
              <div
                v-if="loadingPlannings"
                class="flex flex-center column q-py-xl"
              >
                <q-spinner-dots color="green-9" size="40px" />
                <div class="text-grey-6 q-mt-sm">Cargando fichas...</div>
              </div>

              <!-- Empty search -->
              <div
                v-else-if="filteredPlannings.length === 0"
                class="flex flex-center column q-py-xl text-grey-6"
              >
                <q-icon
                  name="sentiment_dissatisfied"
                  color="grey-5"
                  size="40px"
                />
                <div class="q-mt-sm">No se encontraron fichas</div>
              </div>

              <!-- Cards grid -->
              <div v-else class="row q-col-gutter-md">
                <div
                  v-for="plan in filteredPlannings"
                  :key="plan._id"
                  class="col-12 col-sm-6 col-md-4"
                >
                  <q-card flat bordered class="ficha-card">
                    <q-card-section
                      class="row items-start justify-between no-wrap q-pb-none"
                    >
                      <div class="row items-center q-gutter-x-sm">
                        <q-avatar
                          square
                          color="green-9"
                          text-color="white"
                          icon="apartment"
                          size="44px"
                          style="border-radius: 10px"
                        />
                        <div>
                          <div class="text-subtitle1 text-weight-bolder">
                            FICHA {{ plan.pedagogicalPlanning.fiche }}
                          </div>
                        </div>
                      </div>
                      <q-badge
                        rounded
                        :color="getPlanningFicheStatusColor(plan)"
                        text-color="white"
                        class="text-weight-bold text-uppercase q-px-sm q-py-xs"
                        style="font-size: 10px"
                      >
                        {{ getPlanningFicheStatusLabel(plan) }}
                      </q-badge>
                    </q-card-section>

                    <q-card-section class="q-pt-sm q-pb-none">
                      <div
                        class="text-body2 text-weight-medium text-grey-9 ellipsis-2-lines"
                        style="min-height: 40px"
                      >
                        {{ plan.pedagogicalPlanning.metadata.programName }}
                      </div>
                      <div class="text-caption text-grey-6 q-mt-xs">
                        <strong>Código:</strong>
                        {{ plan.pedagogicalPlanning.metadata.programCode }}
                        &nbsp;|&nbsp; <strong>Versión:</strong>
                        {{ plan.pedagogicalPlanning.metadata.version || "1" }}
                      </div>
                    </q-card-section>

                    <q-card-section class="q-pt-md">
                      <div class="text-caption text-grey-7 q-mb-xs">
                        {{ getPlanConfirmedCount(plan) }} /
                        {{ getAllActivitiesFromPlan(plan).length }} actividades
                        confirmadas
                      </div>
                      <q-linear-progress
                        :value="getPlanProgressValue(plan)"
                        :color="getPlanningFicheStatusColor(plan)"
                        track-color="grey-3"
                        class="rounded-borders"
                        style="height: 6px"
                      />
                    </q-card-section>

                    <q-card-section class="q-pt-md">
                      <q-btn
                        no-caps
                        unelevated
                        class="full-width bg-green-9 text-white text-weight-bold"
                        icon="arrow_forward"
                        label="Ver programación"
                        @click="selectPlanning(plan)"
                      />
                    </q-card-section>
                  </q-card>
                </div>
              </div>
            </div>

            <!-- ═══════════════ SELECTED FICHE WORKSPACE ═══════════════ -->
            <div v-else class="column q-gutter-y-md col">
              <!-- LOADING STATE FOR PLAN DETAILS -->
              <q-card
                v-if="loadingSelectedPlanning"
                flat
                bordered
                class="col flex flex-center text-center bg-white"
                style="border-radius: 12px; height: 100%"
              >
                <q-card-section class="q-pa-xl">
                  <q-spinner-cube color="green-9" size="60px" />
                  <div class="text-h6 text-green-10 text-weight-bolder q-mt-md">
                    Cargando planeación pedagógica...
                  </div>
                  <div class="text-caption text-grey-6 q-mt-sm">
                    Obteniendo todas las competencias, actividades e
                    instructores asignados a esta ficha...
                  </div>
                </q-card-section>
              </q-card>

              <!-- ACTUAL CONTENT WHEN LOADED -->
              <template v-else>
                <!-- Fiche Metadata Card -->
                <q-card square class="shadow-5 bg-white">
                  <q-card-section
                    class="row items-center justify-between q-py-md bg-green-10 border-bottom"
                  >
                    <div>
                      <div
                        class="text-subtitle2 text-white text-weight-bolder text-uppercase"
                      >
                        PROGRAMA ACADÉMICO
                      </div>
                      <div class="text-h5 text-weight-bolder text-white">
                        {{
                          selectedPlanning.pedagogicalPlanning.metadata
                            .programName
                        }}
                      </div>
                      <div class="text-caption text-white q-mt-xs">
                        <strong>Código:</strong>
                        {{
                          selectedPlanning.pedagogicalPlanning.metadata
                            .programCode
                        }}
                        | <strong>Versión:</strong>
                        {{
                          selectedPlanning.pedagogicalPlanning.metadata
                            .version || "1"
                        }}
                        | <strong>Ficha:</strong>
                        {{ selectedPlanning.pedagogicalPlanning.fiche }}
                      </div>
                    </div>

                    <!-- Programar Ficha Button (Locked initially) -->
                    <div class="row items-center q-gutter-x-md">
                      <div class="text-right">
                        <div class="text-caption text-white">
                          Estado de Programación
                        </div>
                        <q-chip
                          :color="isAllConfirmed ? 'green-9' : 'orange-9'"
                          text-color="white"
                          class="text-weight-bold text-uppercase"
                        >
                          {{
                            isAllConfirmed
                              ? "COMPLETA"
                              : "PENDIENTE CONFIRMACIÓN"
                          }}
                        </q-chip>
                      </div>

                      <q-btn
                        class="q-px-lg text-weight-bolder shadow-2 text-uppercase"
                        :class="
                          isAllConfirmed
                            ? 'style-btn hover-grow'
                            : 'bg-grey-5 text-white'
                        "
                        label="PROGRAMAR FICHA"
                        size="md"
                        :disabled="!isAllConfirmed"
                        @click="triggerFicheScheduling"
                      >
                        <q-tooltip class="bg-grey-9 text-weight-bold">
                          {{
                            isAllConfirmed
                              ? "Habilitado: Haz clic para publicar y programar definitivamente esta ficha."
                              : "Bloqueado: Se habilitará cuando todos los instructores estén CONFIRMADOS."
                          }}
                        </q-tooltip>
                      </q-btn>
                    </div>
                  </q-card-section>

                  <q-separator />

                  <!-- Progress Section -->
                  <q-card-section class="q-py-md">
                    <div class="row items-center justify-between q-mb-sm">
                      <div
                        class="text-subtitle2 text-grey-8 text-weight-bold flex items-center"
                      >
                        <q-icon
                          name="check_circle_outline"
                          color="green-9"
                          class="q-mr-sm"
                          size="20px"
                        />
                        Progreso de Confirmación:
                        <strong class="text-green-9 q-ml-xs"
                          >{{ confirmedCount }} /
                          {{ totalActivitiesCount }} actividades
                          confirmadas</strong
                        >
                      </div>
                      <q-badge
                        color="green-9"
                        class="text-weight-bold"
                        style="font-size: 13px"
                      >
                        {{ completionPercentage }}%
                      </q-badge>
                    </div>
                    <q-linear-progress
                      :value="confirmedCount / totalActivitiesCount"
                      color="green-9"
                      track-color="grey-3"
                      class="rounded-borders"
                      style="height: 10px"
                    />
                  </q-card-section>
                </q-card>

                <!-- Notifications Banner Simulator (Pulsing card) -->
                <transition-group name="slide">
                  <q-card
                    v-if="simulatedNotification"
                    flat
                    bordered
                    class="bg-blue-1 border-blue text-blue-10 q-pa-md flex items-center justify-between"
                    style="border-radius: 12px; border: 1px solid #90caf9"
                    :key="'notif'"
                  >
                    <div class="row items-center col q-gutter-x-md">
                      <q-avatar
                        color="blue-9"
                        text-color="white"
                        icon="send"
                        size="36px"
                        class="animate-pulse"
                      />
                      <div>
                        <div class="text-weight-bold text-subtitle2">
                          Notificación Enviada de Forma Exitosa 🚀
                        </div>
                        <div class="text-caption">
                          Se ha notificado vía portal institucional al
                          instructor
                          <strong>{{ simulatedNotification.instructor }}</strong
                          >. Se le habilitó el acceso para diligenciar su
                          planeación pedagógica de la ficha
                          <strong>{{
                            selectedPlanning.pedagogicalPlanning.fiche
                          }}</strong
                          >.
                        </div>
                      </div>
                    </div>
                    <q-btn
                      flat
                      round
                      icon="close"
                      size="sm"
                      color="blue-10"
                      @click="simulatedNotification = null"
                    />
                  </q-card>
                </transition-group>

                <!-- Activities Table/List -->
                <q-card
                  flat
                  bordered
                  class="col column bg-white"
                  style="border-radius: 12px; min-height: 350px"
                >
                  <q-card-section
                    class="bg-grey-1 text-grey-9 q-py-sm text-subtitle2 text-weight-bolder flex justify-between items-center border-bottom"
                  >
                    <div>DETALLES DE COMPETENCIAS Y RESULTADOS SUGERIDOS</div>
                    <div class="text-caption text-grey-7">
                      Diligencia la verificación de instructores
                    </div>
                  </q-card-section>

                  <q-card-section class="col q-pa-none scroll">
                    <table
                      class="q-table my-sticky-header-table scheduler-table"
                    >
                      <thead>
                        <tr>
                          <th style="width: 80px">FASE</th>
                          <th style="width: 180px">COMPETENCIA</th>
                          <th>RESULTADO (RAP) Y ACTIVIDAD</th>
                          <th style="width: 100px; text-align: center">
                            HORAS
                          </th>
                          <th style="width: 150px">DÍAS ASIGNADOS</th>
                          <th style="width: 180px">INSTRUCTOR ASIGNADO</th>
                          <th style="width: 140px; text-align: center">
                            ESTADO
                          </th>
                          <th style="width: 160px; text-align: center">
                            ACCIONES
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <template
                          v-for="(phase, phIdx) in selectedPlanning
                            .pedagogicalPlanning.content"
                          :key="phIdx"
                        >
                          <template
                            v-for="(comp, coIdx) in phase.competencies"
                            :key="coIdx"
                          >
                            <template
                              v-for="(rap, rapIdx) in comp.learningOutcomes"
                              :key="rapIdx"
                            >
                              <tr
                                v-for="(
                                  act, acIdx
                                ) in rap.pedagogicalActivities"
                                :key="acIdx"
                              >
                                <!-- FASE -->
                                <td
                                  class="text-weight-bold text-uppercase text-caption text-grey-7"
                                >
                                  {{
                                    {
                                      ANALYSIS: "Análisis",
                                      PLANNING: "Planeación",
                                      EXECUTION: "Ejecución",
                                      EVALUATION: "Evaluación",
                                      INDUCCION: "Inducción",
                                      ETAPA_PRODUCTIVA: "Etapa Productiva",
                                    }[phase.phase] || phase.phase
                                  }}
                                </td>

                                <!-- COMPETENCIA -->
                                <td class="text-caption">
                                  <div
                                    class="text-weight-bold text-green-10"
                                    style="line-height: 1.2"
                                  >
                                    {{ comp.code }}
                                  </div>
                                  <div
                                    class="text-grey-7 ellipsis-2-lines"
                                    style="font-size: 11px; line-height: 1.1"
                                  >
                                    {{ comp.name }}
                                  </div>
                                </td>

                                <!-- RAP & ACTIVITY -->
                                <td>
                                  <div
                                    class="text-weight-bolder text-grey-9 text-caption q-mb-xs"
                                    style="line-height: 1.2"
                                  >
                                    RAP: {{ rap.description }}
                                  </div>
                                  <div
                                    class="text-grey-7 bg-grey-1 q-pa-xs rounded-borders text-caption"
                                    style="
                                      font-size: 12px;
                                      line-height: 1.2;
                                      border: 1px solid #f0f0f0;
                                    "
                                  >
                                    <strong>Actividad:</strong>
                                    {{
                                      act.description ||
                                      act.observations ||
                                      "Sin descripción"
                                    }}
                                  </div>
                                </td>

                                <!-- HORAS -->
                                <td class="text-center">
                                  <q-badge
                                    outline
                                    color="green-9"
                                    class="text-weight-bold text-caption"
                                  >
                                    {{ getDisplayHours(act) }}h directas
                                  </q-badge>
                                </td>

                                <!-- DÍAS ASIGNADOS -->
                                <td>
                                  <div
                                    v-if="
                                      act.scheduleDetails &&
                                      act.scheduleDetails.assignedDays &&
                                      act.scheduleDetails.assignedDays.length >
                                        0
                                    "
                                    class="cursor-pointer"
                                  >
                                    <div
                                      class="text-weight-bold text-caption text-grey-8"
                                    >
                                      {{
                                        act.scheduleDetails.assignedDays.length
                                      }}
                                      sesiones
                                    </div>
                                    <div
                                      class="text-grey-6 text-caption ellipsis-2-lines"
                                      style="font-size: 10px; line-height: 1"
                                    >
                                      {{
                                        formatDaysList(
                                          act.scheduleDetails.assignedDays,
                                        )
                                      }}
                                    </div>
                                    <q-tooltip
                                      class="text-grey-10 shadow-4 q-pa-sm"
                                      style="
                                        background-color: #fffde7;
                                        border: 1px solid #bdbdbd;
                                        font-size: 12px;
                                        max-width: 220px;
                                        max-height: 250px;
                                        overflow-y: auto;
                                      "
                                    >
                                      <div
                                        class="text-weight-bold q-mb-sm text-uppercase"
                                        style="
                                          border-bottom: 1px solid #e0e0e0;
                                          padding-bottom: 4px;
                                        "
                                      >
                                        Días Programados
                                      </div>
                                      <div
                                        class="text-caption"
                                        style="line-height: 1.6"
                                      >
                                        <div
                                          v-for="(day, idx) in act
                                            .scheduleDetails.assignedDays"
                                          :key="idx"
                                        >
                                          • {{ day }}
                                        </div>
                                      </div>
                                    </q-tooltip>
                                  </div>
                                  <div
                                    v-else
                                    class="text-grey-5 text-caption italic"
                                  >
                                    Sin programar
                                  </div>
                                </td>

                                <!-- INSTRUCTOR SUGERIDO -->
                                <td>
                                  <div
                                    v-if="
                                      (act.suggestedInstructor &&
                                        act.suggestedInstructor.name) ||
                                      (act.instructors && act.instructors.name)
                                    "
                                  >
                                    <div
                                      class="text-weight-bold text-grey-9 text-caption"
                                    >
                                      {{
                                        act.suggestedInstructor?.name ||
                                        act.instructors?.name
                                      }}
                                    </div>
                                    <div
                                      class="text-caption text-grey-6 text-uppercase"
                                      style="font-size: 10px"
                                    >
                                      {{
                                        act.suggestedInstructor?.type ||
                                        act.instructors?.type ||
                                        "Sugerido"
                                      }}
                                    </div>
                                  </div>
                                  <div
                                    v-else
                                    class="text-red-8 text-weight-bold text-caption"
                                  >
                                    ❌ SIN ASIGNAR
                                  </div>
                                </td>

                                <!-- ESTADO -->
                                <td class="text-center">
                                  <q-chip
                                    :color="
                                      getStatusColor(getActivityStatus(act))
                                    "
                                    text-color="white"
                                    dense
                                    square
                                    class="text-weight-bold text-caption text-uppercase"
                                    style="font-size: 11px; padding: 4px 8px"
                                  >
                                    <q-icon
                                      :name="
                                        getStatusIcon(getActivityStatus(act))
                                      "
                                      class="q-mr-xs"
                                    />
                                    {{ getStatusLabel(getActivityStatus(act)) }}
                                  </q-chip>
                                </td>

                                <!-- ACCIONES -->
                                <td class="text-center">
                                  <div
                                    class="row justify-center items-center no-wrap q-gutter-xs"
                                  >
                                    <!-- Confirmar Instructor -->
                                    <q-btn
                                      flat
                                      round
                                      dense
                                      color="green-9"
                                      icon="check"
                                      size="sm"
                                      :disable="
                                        (act.suggestedInstructor?.assignmentStatus ||
                                          act.instructors?.assignmentStatus) === 'confirmed' ||
                                        !(act.suggestedInstructor?.name || act.instructors?.name)
                                      "
                                      @click="
                                        confirmInstructor(phase, comp, rap, act)
                                      "
                                    >
                                      <q-tooltip
                                        class="bg-green-9 text-weight-bold"
                                      >
                                        {{
                                          (act.suggestedInstructor?.assignmentStatus ||
                                            act.instructors?.assignmentStatus) === 'confirmed'
                                            ? "Ya está confirmado"
                                            : "Confirmar Instructor"
                                        }}
                                      </q-tooltip>
                                    </q-btn>

                                    <!-- Programar en Calendario -->
                                    <q-btn
                                      flat
                                      round
                                      dense
                                      color="green-9"
                                      icon="calendar_month"
                                      size="sm"
                                      :disable="
                                        act.scheduleDetails?.isPublished ||
                                        !act.scheduleDetails?.assignedDays?.length ||
                                        (act.suggestedInstructor?.assignmentStatus ||
                                          act.instructors?.assignmentStatus) !== 'confirmed'
                                      "
                                      @click="
                                        scheduleOutcomeToCalendar(
                                          phase,
                                          comp,
                                          rap,
                                          act,
                                          phIdx,
                                          coIdx,
                                          rapIdx,
                                          acIdx,
                                        )
                                      "
                                    >
                                      <q-tooltip class="bg-green-9 text-weight-bold">
                                        {{
                                          act.scheduleDetails?.isPublished
                                            ? "Ya programado en el Calendario de Horarios"
                                            : act.scheduleDetails?.assignedDays?.length
                                              ? (act.suggestedInstructor?.assignmentStatus ||
                                                  act.instructors?.assignmentStatus) === 'confirmed'
                                                ? "Registrar en el Calendario de Horarios"
                                                : "Se habilita con instructor CONFIRMADO"
                                              : "Sin fechas asignadas por el instructor"
                                        }}
                                      </q-tooltip>
                                    </q-btn>

                                    <!-- Opciones secundarias -->
                                    <q-btn
                                      flat
                                      round
                                      dense
                                      color="green-9"
                                      icon="more_vert"
                                      size="sm"
                                    >
                                      <q-tooltip class="bg-green-9"
                                        >Opciones</q-tooltip
                                      >
                                      <q-menu
                                        anchor="center right"
                                        self="center left"
                                        auto-close
                                        square
                                        no-focus
                                        no-refocus
                                        class="opciones-menu"
                                      >
                                        <div
                                          class="row items-center no-wrap q-pa-xs q-gutter-x-xs"
                                        >
                                          <!-- Editar Días Asignados -->
                                          <div class="relative-position">
                                            <q-btn
                                              flat
                                              round
                                              dense
                                              color="green-9"
                                              icon="edit_calendar"
                                              size="sm"
                                              :disable="act.scheduleDetails?.isPublished"
                                              @click="openEditDaysModal(phase, comp, rap, act)"
                                            />
                                            <q-tooltip class="bg-green-9 text-weight-bold">
                                              {{
                                                act.scheduleDetails?.isPublished
                                                  ? "Ya programado (no editable)"
                                                  : "Editar Días Asignados"
                                              }}
                                            </q-tooltip>
                                          </div>

                                          <!-- Reasignar/Cambiar Instructor -->
                                          <div class="relative-position">
                                            <q-btn
                                              flat
                                              round
                                              dense
                                              color="green-9"
                                              icon="person_add"
                                              size="sm"
                                              @click="openReassignModal(phase, comp, rap, act)"
                                            />
                                            <q-tooltip class="bg-green-9 text-weight-bold">
                                              Reasignar/Cambiar Instructor
                                            </q-tooltip>
                                          </div>

                                          <!-- Reject button -->
                                          <div class="relative-position">
                                            <q-btn
                                              flat
                                              round
                                              dense
                                              color="green-9"
                                              icon="close"
                                              size="sm"
                                              :disable="
                                                (act.suggestedInstructor
                                                  ?.assignmentStatus ||
                                                  act.instructors
                                                    ?.assignmentStatus) ===
                                                  'rejected' ||
                                                !(
                                                  act.suggestedInstructor
                                                    ?.name ||
                                                  act.instructors?.name
                                                )
                                              "
                                              @click="
                                                rejectInstructor(
                                                  phase,
                                                  comp,
                                                  rap,
                                                  act,
                                                )
                                              "
                                            />
                                            <q-tooltip
                                              class="bg-green-9 text-weight-bold"
                                            >
                                              {{
                                                (act.suggestedInstructor
                                                  ?.assignmentStatus ||
                                                  act.instructors
                                                    ?.assignmentStatus) ===
                                                "rejected"
                                                  ? "Ya está rechazado"
                                                  : "Rechazar Instructor"
                                              }}
                                            </q-tooltip>
                                          </div>
                                        </div>
                                      </q-menu>
                                    </q-btn>
                                  </div>
                                </td>
                              </tr>
                            </template>
                          </template>
                        </template>
                      </tbody>
                    </table>
                  </q-card-section>
                </q-card>
              </template>
            </div>
          </div>
        </div>
      </q-page>
    </q-page-container>

    <!-- REASSIGN INSTRUCTOR DIALOG -->
    <q-dialog v-model="showReassignModal" persistent>
      <q-card flat bordered class="scheduler-modal">
        <q-card-section class="bg-green-10 text-white q-py-md row items-center">
          <q-avatar
            color="white"
            text-color="green-10"
            icon="person_add"
            size="40px"
            class="q-mr-md"
          />
          <div>
            <div class="text-h6 text-weight-bolder">REASIGNAR INSTRUCTOR</div>
            <div class="text-caption text-green-2">
              Elija un instructor calificado para este resultado y verifique
              disponibilidad.
            </div>
          </div>
        </q-card-section>

        <q-card-section class="q-pa-md scheduler-modal-body">
          <div class="text-subtitle2 text-grey-8 q-mb-sm">
            Actividad a programar:
          </div>
          <div class="q-pa-md bg-grey-2 rounded-borders text-caption q-mb-md">
            <strong>RAP:</strong> {{ reassignContext?.rap?.description }} <br />
            <strong>Actividad:</strong> {{ reassignContext?.act?.description }}
          </div>

          <!-- Select Instructor -->
          <q-select
            filled
            v-model="reassignInstructor"
            use-input
            :options="filteredInstructors"
            option-label="name"
            @filter="filterFn"
            label="Seleccione un Instructor..."
            class="q-mb-md"
            emit-value
            map-options
            @update:model-value="checkInstructorConflicts"
          >
            <template v-slot:no-option>
              <q-item>
                <q-item-section class="text-grey"
                  >No se encontraron instructores activos</q-item-section
                >
              </q-item>
            </template>
          </q-select>

          <!-- Conflict Checker State -->
          <div v-if="checkingConflicts" class="text-center q-pa-md">
            <q-spinner-dots color="green-10" size="30px" />
            <div class="text-caption text-grey-7 q-mt-xs">
              Verificando cruces de horario en la base de datos...
            </div>
          </div>

          <div
            v-else-if="conflictResult"
            class="q-pa-md rounded-borders border-all"
            :class="
              conflictResult.hasConflict
                ? 'bg-red-1 text-red-9 border-red'
                : 'bg-green-1 text-green-10 border-green'
            "
          >
            <div class="flex items-center text-weight-bold">
              <q-icon
                :name="conflictResult.hasConflict ? 'warning' : 'check_circle'"
                class="q-mr-xs"
                size="20px"
              />
              {{
                conflictResult.hasConflict
                  ? "¡Cruce de horario detectado!"
                  : "¡Instructor disponible sin cruces!"
              }}
            </div>

            <div v-if="conflictResult.hasConflict" class="q-mt-sm text-caption">
              El instructor ya tiene clases asignadas en las siguientes fechas
              de esta u otras fichas:
              <ul class="q-my-xs q-pl-md">
                <li v-for="(conf, idx) in conflictResult.conflicts" :key="idx">
                  <strong>Ficha {{ conf.fiche }}:</strong> {{ conf.activity }} —
                  <br />
                  <span class="text-red-7"
                    >Días de cruce: {{ conf.conflictingDays.join(", ") }}</span
                  >
                </li>
              </ul>
              <div
                class="text-weight-bold text-red-10 q-mt-xs"
                style="font-size: 11px"
              >
                ⚠️ Nota: Puede proceder con la reasignación si desea forzar el
                cruce bajo su supervisión.
              </div>
            </div>
            <div v-else class="text-caption q-mt-xs">
              No se detectaron cruces de horario para el instructor seleccionado
              en las fechas indicadas.
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md bg-grey-1 border-top">
          <q-btn flat label="Cancelar" color="grey-8" v-close-popup />
          <q-btn
            class="bg-green-10 text-white text-weight-bolder"
            label="Confirmar Asignación"
            :disabled="!reassignInstructor"
            @click="applyReassignment"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ── Modal: Editar Días Asignados ── -->
    <q-dialog v-model="showEditDaysModal" persistent>
      <q-card flat bordered class="scheduler-modal scheduler-modal-wide">
        <q-card-section class="bg-green-10 text-white q-py-md row items-center">
          <q-avatar
            color="white"
            text-color="green-10"
            icon="edit_calendar"
            size="40px"
            class="q-mr-md"
          />
          <div>
            <div class="text-h6 text-weight-bolder">EDITAR DÍAS ASIGNADOS</div>
            <div class="text-caption text-green-2">
              Ajuste las fechas de las sesiones por motivos logísticos (ej. cambio
              de instructor).
            </div>
          </div>
        </q-card-section>

        <q-card-section class="q-pa-md scheduler-modal-body">
          <div class="q-pa-md bg-grey-2 rounded-borders text-caption q-mb-md">
            <strong>RAP:</strong> {{ editDaysContext?.rap?.description }} <br />
            <strong>Actividad:</strong>
            {{
              editDaysContext?.act?.description ||
              editDaysContext?.act?.observations ||
              "Sin descripción"
            }}
            <br />
            <strong>Instructor:</strong>
            {{
              editDaysContext?.act?.suggestedInstructor?.name ||
              editDaysContext?.act?.instructors?.name ||
              "Sin asignar"
            }}
          </div>

          <div class="edit-days-calendar-wrapper">
            <q-date
              v-model="editDaysSelected"
              multiple
              today-btn
              color="green-10"
              class="edit-days-calendar"
              :min="editDaysMinDate"
              :max="editDaysMaxDate"
            />
          </div>

          <div class="q-mt-md row items-center justify-between">
            <q-badge
              color="white"
              class="text-weight-bold text-black"
              style="font-size: 12px; padding: 4px 10px"
            >
              {{ editDaysSelected.length }} día(s) seleccionado(s)
            </q-badge>
            <q-btn
              flat
              dense
              color="gray"
              label="Limpiar"
              icon="delete_sweep"
              @click="editDaysSelected = []"
            />
          </div>

          <div
            v-if="editDaysSelected.length > 0"
            class="edit-days-selected-list q-mt-sm"
          >
            <span
              v-for="day in [...editDaysSelected].sort()"
              :key="day"
              class="edit-days-selected-item bg-green-10 text-white"
            >
              {{ day }}
            </span>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md bg-grey-1 border-top">
          <q-btn flat label="Cancelar" color="grey-8" v-close-popup />
          <q-btn
            class="bg-green-10 text-white text-weight-bolder"
            label="Guardar Días"
            icon="save"
            @click="saveEditedDays"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ── Modal: Programar Resultado en el Calendario Oficial ── -->
    <q-dialog v-model="showScheduleOutcomeModal" persistent>
      <q-card
        flat
        bordered
        style="width: 640px; max-width: 94vw; border-radius: 10px"
      >
        <!-- Header -->
        <q-card-section
          class="bg-green-10 text-white row items-center q-py-md border-bottom"
        >
          <div>
            <div class="text-subtitle2 text-weight-bolder text-uppercase">
              Calendario Oficial de Horarios
            </div>
            <div class="text-h5 text-weight-bolder">
              PROGRAMAR RESULTADO EN CALENDARIO
            </div>
            <div class="text-caption text-green-2 q-mt-xs">
              <strong>Ficha:</strong>
              {{ selectedPlanning?.pedagogicalPlanning?.fiche }} |
              <strong>Programa:</strong>
              {{ selectedPlanning?.pedagogicalPlanning?.metadata?.programName }}
            </div>
          </div>
        </q-card-section>

        <q-card-section class="q-pa-md">
          <!-- Info -->
          <div
            class="bg-cyan-1 q-pa-md q-mb-md"
            style="border: 1px solid #c8e6c9"
          >
            <div class="row items-start no-wrap q-gutter-x-sm">
              <q-icon
                name="info"
                color="green-9"
                size="20px"
                class="q-mt-xs col-auto"
              />
              <div
                class="text-caption text-green-10 col"
                style="line-height: 1.5"
              >
                Se registrará este Resultado de Aprendizaje en el Calendario
                oficial de Horarios de la ficha. Tenga en cuenta que esta acción
                es definitiva.
              </div>
            </div>
          </div>

          <!-- Detalles de la actividad -->
          <div class="bg-grey-1 q-pa-md border-all" style="line-height: 1.9">
            <div class="row text-caption">
              <div class="col-3 text-grey-6 text-weight-bolder text-uppercase">
                Fase
              </div>
              <div class="col-9 text-grey-9">
                {{ getPhaseLabel(scheduleOutcomeContext?.phase?.phase) }}
              </div>
            </div>
            <div class="row text-caption">
              <div class="col-3 text-grey-6 text-weight-bolder text-uppercase">
                Competencia
              </div>
              <div class="col-9 text-grey-9">
                {{ scheduleOutcomeContext?.comp?.code }} —
                {{ scheduleOutcomeContext?.comp?.name }}
              </div>
            </div>
            <div class="row text-caption">
              <div class="col-3 text-grey-6 text-weight-bolder text-uppercase">
                RAP
              </div>
              <div class="col-9 text-grey-9 text-weight-medium">
                {{ scheduleOutcomeContext?.rap?.description }}
              </div>
            </div>
            <div class="row text-caption">
              <div class="col-3 text-grey-6 text-weight-bolder text-uppercase">
                Actividad
              </div>
              <div class="col-9 text-grey-9">
                {{
                  scheduleOutcomeContext?.act?.description ||
                  scheduleOutcomeContext?.act?.observations ||
                  "Sin descripción"
                }}
              </div>
            </div>
            <div class="row text-caption">
              <div class="col-3 text-grey-6 text-weight-bolder text-uppercase">
                Instructor
              </div>
              <div class="col-9 text-grey-9 text-weight-medium">
                {{
                  scheduleOutcomeContext?.act?.suggestedInstructor?.name ||
                  scheduleOutcomeContext?.act?.instructors?.name ||
                  "Sin asignar"
                }}
              </div>
            </div>
            <div class="row text-caption">
              <div class="col-3 text-grey-6 text-weight-bolder text-uppercase">
                Sesiones
              </div>
              <div class="col-9 text-grey-9">
                <q-badge
                  square
                  color="green-9"
                  text-color="white"
                  class="text-weight-bolder q-mr-sm"
                  style="font-size: 11px; padding: 3px 8px"
                >
                  {{
                    scheduleOutcomeContext?.act?.scheduleDetails?.assignedDays
                      ?.length || 0
                  }}
                  sesión(es)
                </q-badge>
                <span class="text-caption text-grey-7">{{
                  formatDaysList(
                    scheduleOutcomeContext?.act?.scheduleDetails
                      ?.assignedDays || [],
                  )
                }}</span>
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md bg-grey-1 border-top">
          <q-btn
            flat
            label="Cancelar"
            color="grey-7"
            v-close-popup
            class="text-weight-medium"
            :disable="scheduleOutcomeLoading"
          />
          <q-btn
            class="bg-green-9 text-white text-weight-bolder q-px-lg"
            :label="scheduleOutcomeLoading ? 'Programando...' : 'Sí, Programar'"
            icon="calendar_month"
            unelevated
            :disable="scheduleOutcomeLoading"
            @click="confirmScheduleOutcome"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ── Modal: Distribución de Horas por Trimestre ── -->
    <q-dialog v-model="showTrimestreModal" persistent>
      <q-card
        square
        flat
        bordered
        style="width: 680px; max-width: 94vw; border-radius: 0"
      >
        <!-- Header -->
        <q-card-section
          class="bg-green-10 text-white row items-center q-py-md border-bottom"
        >
          <q-avatar
            square
            color="white"
            text-color="green-10"
            icon="calendar_month"
            size="44px"
            class="q-mr-md"
          />
          <div>
            <div class="text-subtitle2 text-weight-bolder text-uppercase">
              Programación Final de la Ficha
            </div>
            <div class="text-h5 text-weight-bolder">
              DISTRIBUCIÓN DE HORAS POR TRIMESTRE
            </div>
            <div class="text-caption text-green-2 q-mt-xs">
              <strong>Ficha:</strong>
              {{ selectedPlanning?.pedagogicalPlanning?.fiche }} |
              <strong>Programa:</strong>
              {{ selectedPlanning?.pedagogicalPlanning?.metadata?.programName }}
            </div>
          </div>
        </q-card-section>

        <q-card-section class="q-pa-md">
          <!-- Info -->
          <div
            class="bg-green-1 q-pa-md q-mb-md row items-start q-gutter-x-sm"
            style="border: 1px solid #c8e6c9"
          >
            <q-icon name="info" color="green-9" size="20px" />
            <div class="text-caption text-green-10" style="line-height: 1.5">
              Distribución de horas directas programadas en el calendario por
              cada trimestre de la formación. Verifique que la distribución sea
              la correcta antes de confirmar y publicar la ficha.
            </div>
          </div>

          <!-- Tabla de trimestres -->
          <table class="scheduler-table trimestre-table">
            <thead>
              <tr>
                <th style="width: 130px">TRIMESTRE</th>
                <th>PERÍODO</th>
                <th style="width: 220px">HORAS PROGRAMADAS</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in horasPorTrimestre" :key="t.trimestre">
                <td>
                  <q-badge
                    square
                    color="green-9"
                    text-color="white"
                    class="text-weight-bolder"
                    style="font-size: 12px; padding: 4px 10px"
                  >
                    TRIMESTRE {{ t.trimestre }}
                  </q-badge>
                </td>
                <td class="text-caption text-grey-8">
                  <span class="text-weight-medium">{{ t.inicio }}</span>
                  <span class="q-mx-sm text-grey-5">→</span>
                  <span class="text-weight-medium">{{ t.fin }}</span>
                </td>
                <td>
                  <div class="row items-center q-gutter-x-sm">
                    <q-linear-progress
                      :value="
                        maxTrimestreHoras > 0 ? t.horas / maxTrimestreHoras : 0
                      "
                      color="green-9"
                      track-color="green-2"
                      class="col"
                      style="height: 8px"
                    />
                    <q-badge
                      square
                      color="green-8"
                      text-color="white"
                      class="text-weight-bolder"
                      style="
                        font-size: 12px;
                        padding: 4px 10px;
                        min-width: 52px;
                      "
                    >
                      {{ t.horas }}h
                    </q-badge>
                  </div>
                </td>
              </tr>
              <!-- Fila total -->
              <tr class="total-row">
                <td class="text-weight-bolder text-green-10 text-uppercase">
                  Total
                </td>
                <td></td>
                <td>
                  <div class="row items-center justify-end q-gutter-x-sm">
                    <q-icon name="check_circle" color="green-9" size="20px" />
                    <q-badge
                      square
                      color="green-10"
                      text-color="white"
                      class="text-weight-bolder"
                      style="font-size: 14px; padding: 6px 14px"
                    >
                      {{ totalHorasPlaneadas }}h
                    </q-badge>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Advertencia si hay distribución muy desigual -->
          <q-banner
            v-if="
              horasPorTrimestre.length > 1 &&
              Math.max(...horasPorTrimestre.map((t) => t.horas)) >
                Math.min(...horasPorTrimestre.map((t) => t.horas)) * 2
            "
            class="bg-orange-1 text-orange-9 q-mt-md"
            dense
            square
            style="border: 1px solid #ffe082"
          >
            <template v-slot:avatar>
              <q-icon name="warning" color="orange-8" />
            </template>
            Hay una diferencia significativa entre trimestres. Verifique que la
            distribución sea intencional.
          </q-banner>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md bg-grey-1 border-top">
          <q-btn
            flat
            label="Cancelar"
            color="grey-7"
            v-close-popup
            class="text-weight-medium"
          />
          <q-btn
            class="bg-green-9 text-white text-weight-bolder q-px-lg"
            label="Confirmar y Guardar Programación"
            icon="check_circle"
            unelevated
            @click="confirmarProgramacionFinal"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useQuasar } from "quasar";
import { useRoute, useRouter } from "vue-router";
import { PlanningService } from "../services/planning.service";
import { InstructorService } from "../services/instructor.service";
import { NotificationService } from "../services/notification.service";
import {
  getHoursPerDay,
  calcularHorasPorTrimestre,
} from "../utils/planeacion/dateUtils";
import { usePlanningStore } from "../store/planning.store";
import { storeUser } from "../store/users.js";
import { storeMenu } from "../store/menu.store.js";
import BtnBack from "../layouts/btnBackLayout.vue";

const $q = useQuasar();
const route = useRoute();
const router = useRouter();
const store = usePlanningStore();
const userStore = storeUser();
const menuStore = storeMenu();

// ── Estado ──
const plannings = ref([]);
const instructorsList = ref([]);
const searchFiche = ref("");
const estadoFilter = ref("todas"); // "todas" | "pendiente" | "completa"
const programaFilter = ref(null); // null = todos los programas
const loadingPlannings = ref(false);
const selectedPlanning = ref(null);
const loadingSelectedPlanning = ref(false);

// Simulación de alertas de envío al instructor
const simulatedNotification = ref(null);

// ── Notificaciones ──
const notifications = ref([]);
const unreadNotificationsCount = computed(
  () => notifications.value.filter((n) => !n.read).length,
);

const fetchNotifications = async () => {
  try {
    const data = await NotificationService.getNotifications();
    notifications.value = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error al cargar notificaciones:", error);
  }
};

// ── Reasignación ──
const showReassignModal = ref(false);
const reassignInstructor = ref(null);
const reassignContext = ref(null); // { phase, comp, rap, act }
const checkingConflicts = ref(false);
const conflictResult = ref(null);
const filteredInstructors = ref([]);

// ── Edición de Días Asignados ──
const showEditDaysModal = ref(false);
const editDaysContext = ref(null); // { phase, comp, rap, act }
const editDaysSelected = ref([]);

const editDaysMinDate = computed(() => {
  const d =
    selectedPlanning.value?.pedagogicalPlanning?.metadata?.lectivaStartDate;
  return d ? d.slice(0, 10) : undefined;
});

const editDaysMaxDate = computed(() => {
  const d =
    selectedPlanning.value?.pedagogicalPlanning?.metadata?.lectivaEndDate;
  return d ? d.slice(0, 10) : undefined;
});

function filterFn(val, update) {
  if (val === "") {
    update(() => {
      filteredInstructors.value = instructorsList.value;
    });
    return;
  }
  update(() => {
    const needle = val.toLowerCase();
    filteredInstructors.value = instructorsList.value.filter(
      (v) => v.name && v.name.toLowerCase().includes(needle),
    );
  });
}

// ── Métodos de Carga Inicial ──
const fetchPlannings = async () => {
  loadingPlannings.value = true;

  try {
    const data = await PlanningService.getAllPlannings();
    plannings.value = data;
  } catch (error) {
    console.error("Error plannings:", error);
    $q.notify({ message: "Error al obtener fichas", color: "red-8" });
  } finally {
    loadingPlannings.value = false;
  }
};

const fetchInstructors = async () => {
  try {
    const data = await InstructorService.getInstructors();
    instructorsList.value = data;
    filteredInstructors.value = data;
  } catch (error) {
    console.error("Error list:", error);
    $q.notify({
      message: "Error al cargar la lista de instructores",
      color: "red-8",
      icon: "warning",
    });
  }
};

// ── Trimestre Modal ──
const showTrimestreModal = ref(false);
const horasPorTrimestre = ref([]);
const totalHorasPlaneadas = computed(() =>
  horasPorTrimestre.value.reduce((sum, t) => sum + t.horas, 0),
);

const maxTrimestreHoras = computed(() =>
  horasPorTrimestre.value.length > 0
    ? Math.max(...horasPorTrimestre.value.map((t) => t.horas))
    : 0,
);

// ── Cerrar Sesión ──
const handleLogout = () => {
  $q.dialog({
    title: "Cerrar Sesión",
    message: "¿Está seguro que desea cerrar la sesión?",
    cancel: { label: "Cancelar", flat: true, color: "grey-7" },
    ok: { label: "Cerrar Sesión", color: "green-9" },
    persistent: true,
  }).onOk(() => {
    userStore.logoutUser();
    sessionStorage.removeItem("storeUser");
    sessionStorage.clear();
    localStorage.removeItem("token");
    router.push({ name: "login" });
  });
};

onMounted(async () => {
  await fetchPlannings();
  fetchInstructors();
  fetchNotifications();

  // Auto-select fiche if provided in URL (e.g. from Notifications view)
  if (route.query.fiche) {
    const planToSelect = plannings.value.find(
      (p) => p.pedagogicalPlanning?.fiche === route.query.fiche,
    );
    if (planToSelect) {
      selectPlanning(planToSelect);
    }
  }
});

// ── Búsqueda y Filtros ──
const programaOptions = computed(() => {
  const names = new Set(
    plannings.value.map((p) => p.pedagogicalPlanning?.metadata?.programName),
  );
  const opciones = [...names]
    .filter(Boolean)
    .sort()
    .map((name) => ({ label: name, value: name }));
  return [{ label: "Todos los programas", value: null }, ...opciones];
});

const filteredPlannings = computed(() => {
  return plannings.value.filter((p) => {
    const matchesSearch =
      !searchFiche.value ||
      p.pedagogicalPlanning.fiche
        .toLowerCase()
        .includes(searchFiche.value.toLowerCase()) ||
      p.pedagogicalPlanning.metadata.programName
        .toLowerCase()
        .includes(searchFiche.value.toLowerCase());

    const matchesEstado =
      estadoFilter.value === "todas" ||
      (estadoFilter.value === "pendiente" &&
        getPlanningFicheStatusLabel(p) === "PENDIENTE CONFIRMACIÓN") ||
      (estadoFilter.value === "completa" &&
        getPlanningFicheStatusLabel(p) === "COMPLETA");

    const matchesPrograma =
      !programaFilter.value ||
      p.pedagogicalPlanning.metadata.programName === programaFilter.value;

    return matchesSearch && matchesEstado && matchesPrograma;
  });
});

const pendientesCount = computed(
  () =>
    plannings.value.filter(
      (p) => getPlanningFicheStatusLabel(p) === "PENDIENTE CONFIRMACIÓN",
    ).length,
);

const completasCount = computed(
  () =>
    plannings.value.filter(
      (p) => getPlanningFicheStatusLabel(p) === "COMPLETA",
    ).length,
);

const selectPlanning = async (plan) => {
  selectedPlanning.value = plan; // Show instant metadata preview
  simulatedNotification.value = null;
  if (!plan) return;

  loadingSelectedPlanning.value = true;
  try {
    const fiche = plan.pedagogicalPlanning?.fiche || plan.fiche;
    const fullPlan = await PlanningService.getPlanningByFiche(fiche);
    if (fullPlan) {
      selectedPlanning.value = fullPlan;
    }
  } catch (error) {
    console.error("Error fetching full planning:", error);
    $q.notify({
      message: "Error al obtener la planeación completa",
      color: "red-8",
    });
  } finally {
    loadingSelectedPlanning.value = false;
  }
};

// ── Horas Calculadas ──
const getDisplayHours = (act) => {
  if (act.scheduleDetails?.assignedDays?.length > 0) {
    const shift =
      act.scheduleDetails.shift ||
      selectedPlanning.value?.pedagogicalPlanning?.fiche?.shift ||
      "diurna";

    if (
      shift === "personalizado" &&
      act.scheduleDetails.tstart &&
      act.scheduleDetails.tend
    ) {
      const [h1, m1] = act.scheduleDetails.tstart.split(":").map(Number);
      const [h2, m2] = act.scheduleDetails.tend.split(":").map(Number);
      const diffHours = (h2 * 60 + m2 - (h1 * 60 + m1)) / 60;
      return act.scheduleDetails.assignedDays.length * Math.max(0, diffHours);
    }

    return act.scheduleDetails.assignedDays.length * getHoursPerDay(shift);
  }
  return act.hours?.direct || 0;
};

// ── Estados de Ficha (solo dos: pendiente confirmación y completa) ──
const getPlanningFicheStatusLabel = (plan) => {
  const acts = getAllActivitiesFromPlan(plan);
  const total = acts.length;
  const confirmed = acts.filter(
    (a) =>
      (a.suggestedInstructor || a.instructors)?.assignmentStatus ===
      "confirmed",
  ).length;

  if (total > 0 && confirmed === total) return "COMPLETA";
  return "PENDIENTE CONFIRMACIÓN";
};

const getPlanningFicheStatusColor = (plan) => {
  return getPlanningFicheStatusLabel(plan) === "COMPLETA"
    ? "green-9"
    : "orange-8";
};

// ── Cálculos de Ficha Activa ──
const getAllActivitiesFromPlan = (plan) => {
  const acts = [];
  if (!plan || !plan.pedagogicalPlanning || !plan.pedagogicalPlanning.content)
    return acts;
  plan.pedagogicalPlanning.content.forEach((phase) => {
    if (phase.competencies) {
      phase.competencies.forEach((comp) => {
        if (comp.learningOutcomes) {
          comp.learningOutcomes.forEach((rap) => {
            if (rap.pedagogicalActivities) {
              rap.pedagogicalActivities.forEach((act) => {
                acts.push(act);
              });
            }
          });
        }
      });
    }
  });
  return acts;
};

// Progreso de confirmación de una ficha (para las tarjetas de la cuadrícula)
const getPlanConfirmedCount = (plan) => {
  return getAllActivitiesFromPlan(plan).filter(
    (a) =>
      (a.suggestedInstructor || a.instructors)?.assignmentStatus ===
      "confirmed",
  ).length;
};

const getPlanProgressValue = (plan) => {
  const total = getAllActivitiesFromPlan(plan).length;
  if (!total) return 0;
  return getPlanConfirmedCount(plan) / total;
};

const totalActivitiesCount = computed(() => {
  return getAllActivitiesFromPlan(selectedPlanning.value).length;
});

const confirmedCount = computed(() => {
  return getAllActivitiesFromPlan(selectedPlanning.value).filter(
    (a) =>
      (a.suggestedInstructor || a.instructors)?.assignmentStatus ===
      "confirmed",
  ).length;
});

const isAllConfirmed = computed(() => {
  const total = totalActivitiesCount.value;
  return total > 0 && confirmedCount.value === total;
});

const completionPercentage = computed(() => {
  const total = totalActivitiesCount.value;
  if (!total) return 0;
  return Math.round((confirmedCount.value / total) * 100);
});

// ── Formateadores ──
const formatDaysList = (days) => {
  if (!days || days.length === 0) return "";
  return days.join(", ");
};

const getActivityStatus = (act) => {
  if (act?.scheduleDetails?.isPublished) return "programmed";
  return (act?.suggestedInstructor || act?.instructors)?.assignmentStatus;
};

const getStatusColor = (status) => {
  if (status === "programmed") return "teal-9";
  if (status === "confirmed") return "green-9";
  if (status === "rejected") return "red-8";
  return "orange-8";
};

const getStatusIcon = (status) => {
  if (status === "programmed") return "event_available";
  if (status === "confirmed") return "check";
  if (status === "rejected") return "close";
  return "hourglass_empty";
};

const getStatusLabel = (status) => {
  if (status === "programmed") return "Programado";
  if (status === "confirmed") return "Confirmado";
  if (status === "rejected") return "Rechazado";
  return "Pendiente";
};

// ── ACCIONES CORE DEL PROGRAMADOR ──

const askInstructorActionConfirmation = (title, message, okLabel) =>
  new Promise((resolve) => {
    $q.dialog({
      title,
      message,
      cancel: { label: "Cancelar", flat: true, color: "grey-7" },
      ok: { label: okLabel, color: "green-9" },
      persistent: true,
    })
      .onOk(() => resolve(true))
      .onCancel(() => resolve(false));
  });

// 1. Confirmar Instructor
const confirmInstructor = async (phase, comp, rap, act) => {
  const sugg = act.suggestedInstructor || act.instructors;
  if (!sugg || !sugg.name) {
    $q.notify({
      message: "No hay un instructor asignado para confirmar.",
      color: "orange-8",
      icon: "warning",
    });
    return;
  }
  if (act.scheduleDetails?.isPublished) {
    $q.notify({
      message: "Esta actividad ya está programada y no se puede modificar.",
      color: "orange-8",
      icon: "lock",
    });
    return;
  }
  if (sugg.assignmentStatus === "confirmed") {
    $q.notify({
      message: "El instructor ya está confirmado.",
      color: "green-9",
      icon: "info",
    });
    return;
  }

  const confirmed = await askInstructorActionConfirmation(
    "Confirmar instructor",
    `¿Desea confirmar a ${sugg.name} para esta actividad?`,
    "Confirmar",
  );
  if (!confirmed) return;

  // Modificar estado local
  const originalStatus = sugg.assignmentStatus;
  sugg.assignmentStatus = "confirmed";

  try {
    await saveActivePlanningChanges();
    await fetchNotifications();

    simulatedNotification.value = {
      instructor: sugg.name,
      fiche: selectedPlanning.value.pedagogicalPlanning.fiche,
    };

    $q.notify({
      message: `¡Asignación confirmada para ${sugg.name}!`,
      color: "green-9",
      icon: "check_circle",
      timeout: 3000,
    });
  } catch (error) {
    if (sugg) sugg.assignmentStatus = originalStatus; // Rollback
    $q.notify({
      message:
        error.response?.data?.message ||
        error.response?.data?.msg ||
        "Error al confirmar asignación",
      color: "red-8",
      icon: "error",
    });
  }
};

// 2. Rechazar Instructor
const rejectInstructor = async (phase, comp, rap, act) => {
  const sugg = act.suggestedInstructor || act.instructors;
  if (!sugg || !sugg.name) {
    $q.notify({
      message: "No hay un instructor asignado para rechazar.",
      color: "orange-8",
      icon: "warning",
    });
    return;
  }
  if (act.scheduleDetails?.isPublished) {
    $q.notify({
      message: "Esta actividad ya está programada y no se puede modificar.",
      color: "orange-8",
      icon: "lock",
    });
    return;
  }
  if (sugg.assignmentStatus === "rejected") {
    $q.notify({
      message: "El instructor ya está rechazado.",
      color: "orange-8",
      icon: "info",
    });
    return;
  }

  const rejected = await askInstructorActionConfirmation(
    "Rechazar instructor",
    `¿Desea rechazar a ${sugg.name}? Esta acción cambiará el estado de la asignación.`,
    "Rechazar",
  );
  if (!rejected) return;

  const originalStatus = sugg?.assignmentStatus;
  sugg.assignmentStatus = "rejected";

  try {
    await saveActivePlanningChanges();
    simulatedNotification.value = null;

    $q.notify({
      message: `Asignación rechazada para ${sugg?.name || "Instructor"}.`,
      color: "red-8",
      icon: "cancel",
    });
  } catch (error) {
    if (sugg) sugg.assignmentStatus = originalStatus; // Rollback
    $q.notify({
      message:
        error.response?.data?.message ||
        error.response?.data?.msg ||
        "Error al procesar rechazo",
      color: "red-8",
      icon: "error",
    });
  }
};

// 3. Reasignar Instructor Modals & conflict checks
const openReassignModal = (phase, comp, rap, act) => {
  reassignContext.value = { phase, comp, rap, act };
  reassignInstructor.value = null;
  conflictResult.value = null;
  showReassignModal.value = true;
};

const checkInstructorConflicts = async (instructor) => {
  if (!instructor || !reassignContext.value) {
    conflictResult.value = null;
    return;
  }

  const { act } = reassignContext.value;
  const dates = act.scheduleDetails?.assignedDays || [];
  const shift = act.scheduleDetails?.shift || "diurna";
  const currentFiche = selectedPlanning.value.pedagogicalPlanning.fiche;

  if (dates.length === 0) {
    // Si la actividad no tiene fechas, no puede haber conflictos
    conflictResult.value = { hasConflict: false, conflicts: [] };
    return;
  }

  checkingConflicts.value = true;
  try {
    const result = await InstructorService.checkAvailability(
      instructor._id || instructor.id,
      dates,
      shift,
      currentFiche,
    );
    conflictResult.value = result;
  } catch (error) {
    console.error("Error conflict checker:", error);
  } finally {
    checkingConflicts.value = false;
  }
};

const applyReassignment = async () => {
  if (!reassignContext.value || !reassignInstructor.value) return;

  const { act } = reassignContext.value;
  const instructor = reassignInstructor.value;

  // Cambiar el instructor en el objeto
  act.suggestedInstructor = {
    id: instructor._id || instructor.id,
    name: instructor.name,
    type: instructor.type || "REASIGNADO",
    assignmentStatus: "confirmed",
  };

  try {
    await saveActivePlanningChanges();
    showReassignModal.value = false;

    // Simular el banner
    simulatedNotification.value = {
      instructor: instructor.name,
      fiche: selectedPlanning.value.pedagogicalPlanning.fiche,
    };

    $q.notify({
      message: `¡Instructor reasignado con éxito a ${instructor.name}!`,
      color: "green-9",
      icon: "check_circle",
    });
  } catch (error) {
    $q.notify({ message: "Error al aplicar reasignación", color: "red-8" });
  }
};

// 4. Editar Días Asignados
const openEditDaysModal = (phase, comp, rap, act) => {
  editDaysContext.value = { phase, comp, rap, act };
  editDaysSelected.value = [...(act.scheduleDetails?.assignedDays || [])].map(
    (d) => d.replace(/-/g, "/"),
  );
  showEditDaysModal.value = true;
};

const saveEditedDays = async () => {
  if (!editDaysContext.value) return;

  const { act } = editDaysContext.value;
  const assignedDays = [...editDaysSelected.value]
    .map((d) => d.replace(/\//g, "-"))
    .sort();

  act.scheduleDetails = {
    ...(act.scheduleDetails || {}),
    assignedDays,
  };

  try {
    await saveActivePlanningChanges();
    showEditDaysModal.value = false;
    $q.notify({
      message:
        assignedDays.length > 0
          ? `Días actualizados: ${assignedDays.length} sesión(es) guardada(s) para "${act.description || act.observations || "la actividad"}".`
          : "Se quitaron todas las fechas asignadas.",
      color: "green-9",
      icon: "check_circle",
    });
  } catch (error) {
    $q.notify({
      message: "Error al guardar los días asignados",
      color: "red-8",
    });
  }
};

// ── Guardado unificado en la Base de Datos ──
const saveActivePlanningChanges = async () => {
  if (!selectedPlanning.value) return;

  // Usar el servicio para guardar toda la planeación
  await PlanningService.saveDraft({
    pedagogicalPlanning: selectedPlanning.value.pedagogicalPlanning,
  });

  // Recargar la lista por detrás para mantener sincronía con la cuadrícula
  const data = await PlanningService.getAllPlannings();
  plannings.value = data;

  // Obtener la planeación completa y actualizada para mantener el contenido del workspace
  const fiche =
    selectedPlanning.value.pedagogicalPlanning?.fiche ||
    selectedPlanning.value.fiche;
  const fullPlan = await PlanningService.getPlanningByFiche(fiche);
  if (fullPlan) {
    selectedPlanning.value = fullPlan;

    store.planning = fullPlan;
  }
};

// ── Programar Resultado en el Calendario Oficial ──
const showScheduleOutcomeModal = ref(false);
const scheduleOutcomeContext = ref(null);
const scheduleOutcomeLoading = ref(false);

const getPhaseLabel = (phase) => {
  return (
    {
      ANALYSIS: "Análisis",
      PLANNING: "Planeación",
      EXECUTION: "Ejecución",
      EVALUATION: "Evaluación",
      INDUCCION: "Inducción",
      ETAPA_PRODUCTIVA: "Etapa Productiva",
    }[phase] || phase
  );
};

const scheduleOutcomeToCalendar = (
  phase,
  comp,
  rap,
  act,
  phaseIndex,
  competenceIndex,
  rapIndex,
  activityIndex,
) => {
  scheduleOutcomeContext.value = {
    phase,
    comp,
    rap,
    act,
    phaseIndex,
    competenceIndex,
    rapIndex,
    activityIndex,
  };
  showScheduleOutcomeModal.value = true;
};

const confirmScheduleOutcome = async () => {
  const ctx = scheduleOutcomeContext.value;
  if (!ctx || scheduleOutcomeLoading.value) return;

  const { act, phaseIndex, competenceIndex, rapIndex, activityIndex } = ctx;
  scheduleOutcomeLoading.value = true;

  $q.loading.show({
    message: "Registrando horario en el calendario oficial de Horarios SENA...",
  });
  try {
    const response = await PlanningService.scheduleOutcome({
      planningId: selectedPlanning.value._id,
      phaseIndex,
      competenceIndex,
      rapIndex,
      activityIndex,
    });

    if (act.scheduleDetails) {
      act.scheduleDetails.isPublished = true;
    } else {
      act.scheduleDetails = { isPublished: true };
    }

    const fiche =
      selectedPlanning.value.pedagogicalPlanning?.fiche ||
      selectedPlanning.value.fiche;
    try {
      const fullPlan = await PlanningService.getPlanningByFiche(fiche);
      if (fullPlan) {
        selectedPlanning.value = fullPlan;
        store.planning = fullPlan;
      }
    } catch (reloadError) {
      console.error("Error al recargar planeación:", reloadError);
    }

    showScheduleOutcomeModal.value = false;

    $q.notify({
      message:
        response.message ||
        "¡Resultado programado con éxito en el calendario oficial!",
      color: "green-10",
      icon: "stars",
      timeout: 4000,
    });
  } catch (error) {
    console.error("Error scheduleOutcome:", error);
    $q.notify({
      message:
        error.response?.data?.message ||
        "Error al programar el resultado en el calendario",
      color: "red-8",
      icon: "warning",
      timeout: 4000,
    });
  } finally {
    scheduleOutcomeLoading.value = false;
    $q.loading.hide();
  }
};

// ── Finalización: Programar Ficha ──
const triggerFicheScheduling = () => {
  const planning = selectedPlanning.value?.pedagogicalPlanning;
  if (!planning) return;

  // Calcular horas por trimestre
  const trimestres = calcularHorasPorTrimestre(planning);

  if (trimestres.length === 0) {
    $q.notify({
      message:
        "No hay actividades con sesiones programadas. Asegúrese de que los instructores hayan programado sus clases en el calendario antes de fijar la ficha.",
      color: "orange-8",
      icon: "warning",
      timeout: 6000,
    });
    return;
  }

  horasPorTrimestre.value = trimestres;
  showTrimestreModal.value = true;
};

const confirmarProgramacionFinal = async () => {
  showTrimestreModal.value = false;
  $q.loading.show({ message: "Guardando programación final de la ficha..." });
  try {
    await PlanningService.saveDraft({
      pedagogicalPlanning: selectedPlanning.value.pedagogicalPlanning,
    });
    $q.notify({
      message: `¡Ficha ${selectedPlanning.value.pedagogicalPlanning.fiche} programada con éxito! La distribución de horas por trimestre ha sido guardada.`,
      color: "green-10",
      icon: "stars",
      timeout: 5000,
    });
  } catch (error) {
    console.error("Error al guardar programación final:", error);
    $q.notify({
      message: "Error al guardar la programación final. Inténtelo de nuevo.",
      color: "red-8",
      icon: "error",
    });
  } finally {
    $q.loading.hide();
  }
};
</script>

<style scoped>
.fill-height {
  height: 100%;
}

.border-bottom {
  border-bottom: 1px solid #e0e0e0;
}

.border-top {
  border-top: 1px solid #e0e0e0;
}

.border-all {
  border: 1px solid #e0e0e0;
}

.border-blue {
  border-color: #90caf9 !important;
}

.border-green {
  border-color: #a5d6a7 !important;
}

.border-red {
  border-color: #ef5350 !important;
}

/* Ficha cards (grid replacing the sidebar list) */
.ficha-card {
  border-radius: 12px;
  background: #ffffff;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}

.ficha-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  border-color: #66bb6a;
}

/* Scheduler Table Styling */
.scheduler-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.scheduler-table th {
  background-color: #f5f5f5;
  color: #333333;
  font-weight: bold;
  text-align: left;
  padding: 12px 10px;
  border-bottom: 2px solid #e0e0e0;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.5px;
}

.scheduler-table td {
  padding: 12px 10px;
  border-bottom: 1px solid #eeeeee;
  vertical-align: middle;
}

.scheduler-table tr:hover {
  background-color: #fafafa;
}

.trimestre-table td {
  padding: 14px 12px;
}

.trimestre-table .total-row {
  background-color: #f1f8e9 !important;
  border-top: 2px solid #c8e6c9;
}

.trimestre-table .total-row td {
  padding-top: 16px;
  padding-bottom: 16px;
}

.hover-grow {
  transition: transform 0.2s ease-in-out;
}

.hover-grow:hover {
  transform: scale(1.03);
}

.animate-pulse {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(21, 101, 192, 0.5);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 10px rgba(21, 101, 192, 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(21, 101, 192, 0);
  }
}

.ellipsis-2-lines {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.italic {
  font-style: italic;
}

.scheduler-modal {
  width: 500px;
  max-width: 90vw;
  max-height: calc(100vh - 32px);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.scheduler-modal-wide {
  width: 680px;
  max-width: 94vw;
}

.scheduler-modal-body {
  overflow-y: auto;
  min-height: 0;
}

:global(.opciones-menu) {
  border: 1px solid #e0e0e0 !important;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18) !important;
}

:global(.opciones-menu .q-btn) {
  border-radius: 0 !important;
  transition: background 0.15s ease;
}

:global(.opciones-menu .q-btn:hover:not(.disabled)) {
  background: #f1f8e9 !important;
}

:global(.opciones-menu .q-btn.disabled) {
  opacity: 0.45;
}

:global(.edit-days-calendar) {
  width: 440px !important;
  max-width: 100% !important;
  margin: 0 !important;
  box-sizing: border-box;
}

:global(.edit-days-calendar-wrapper) {
  display: flex;
  justify-content: center;
  width: 100%;
}

:global(.edit-days-calendar .q-date__header),
:global(.edit-days-calendar .q-date__content),
:global(.edit-days-calendar .q-date__view),
:global(.edit-days-calendar .q-date__calendar) {
  width: 100% !important;
}

:global(.edit-days-calendar .q-date__calendar) {
  padding: 4px 12px !important;
  justify-content: center !important;
}

:global(.edit-days-calendar .q-date__calendar-item .q-btn.q-btn--active) {
  background-color: #1b5e20 !important;
  color: #ffffff !important;
}

.edit-days-selected-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.edit-days-selected-item {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.4;
  font-weight: 600;
}
</style>
