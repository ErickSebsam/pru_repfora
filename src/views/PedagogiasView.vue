<template>
  <q-layout view="hHh Lpr lFf">
    <q-header elevated class="bg-green-9 text-white">
      <q-toolbar class="q-px-lg" style="height: 64px;">
        <q-btn flat round dense icon="menu" @click="drawerOpen = !drawerOpen" class="q-mr-sm" />
        <q-toolbar-title class="text-weight-bolder text-h6 tracking-wide">
          REPFORA — MÓDULO PEDAGOGÍAS
        </q-toolbar-title>
        <q-btn flat round dense icon="notifications" class="q-mr-sm" to="/notifications">
          <q-badge v-if="unreadNotificationsCount > 0" floating color="orange" rounded>{{ unreadNotificationsCount
          }}</q-badge>
        </q-btn>
        <q-btn flat round dense icon="logout" @click="handleLogout">
          <q-tooltip class="bg-red-8">Cerrar Sesión</q-tooltip>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="drawerOpen" show-if-above bordered class="bg-white" :width="350">
      <q-card flat class="full-height column" style="border-radius: 0; background: white;">
        <q-card-section class="bg-green-10 text-white q-py-md text-subtitle2 text-weight-bolder text-uppercase">
          Fichas en Planeación
        </q-card-section>
        <q-card-section class="q-py-sm">
          <q-input dense outlined square v-model="searchFiche" placeholder="Buscar ficha..." class="bg-white">
            <template #append><q-icon name="search" /></template>
          </q-input>
        </q-card-section>
        <q-separator />
        <q-scroll-area class="col q-pa-none" style="height: calc(100vh - 160px);">
          <q-list v-if="loadingPlannings" class="q-pa-md text-center">
            <q-spinner-dots color="green-9" size="40px" />
            <div class="text-grey-6 q-mt-sm">Cargando fichas...</div>
          </q-list>
          <q-list v-else-if="filteredPlannings.length === 0" class="q-pa-md text-center">
            <q-icon name="sentiment_dissatisfied" color="grey-5" size="40px" />
            <div class="text-grey-6 q-mt-sm">No se encontraron fichas</div>
          </q-list>
          <q-list v-else separator class="q-py-xs q-pr-sm">
            <q-item v-for="plan in filteredPlannings" :key="plan._id || plan.pedagogicalPlanning?.fiche" clickable
              v-ripple :active="selectedPlanning?.pedagogicalPlanning?.fiche === plan.pedagogicalPlanning?.fiche"
              active-class="bg-green-9 text-white text-weight-bold" @click="selectPlanning(plan); drawerOpen = false"
              class="q-py-md">
              <q-item-section avatar>
                <q-avatar
                  :color="selectedPlanning?.pedagogicalPlanning?.fiche === plan.pedagogicalPlanning?.fiche ? 'white' : 'green-9'"
                  :text-color="selectedPlanning?.pedagogicalPlanning?.fiche === plan.pedagogicalPlanning?.fiche ? 'green-9' : 'white'"
                  icon="badge" size="40px" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-subtitle2 text-weight-bold">Ficha: {{ plan.pedagogicalPlanning?.fiche
                }}</q-item-label>
                <q-item-label caption lines="1"
                  :class="selectedPlanning?.pedagogicalPlanning?.fiche === plan.pedagogicalPlanning?.fiche ? 'text-green-1' : 'text-grey-7'">
                  {{ plan.pedagogicalPlanning?.metadata?.programName || 'Sin programa' }}
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge :color="getPlanningFicheStatusColor(plan)" text-color="white"
                  class="text-weight-bold text-uppercase">
                  {{ getPlanningFicheStatusLabel(plan) }}
                </q-badge>
              </q-item-section>
            </q-item>
          </q-list>
        </q-scroll-area>
      </q-card>
    </q-drawer>

    <q-page-container class="bg-grey-2">
      <q-page class="q-pa-md">
        <BtnBack route="/planning-dashboard" />

        <q-card v-if="!selectedPlanning" flat bordered class="empty-state bg-white">
          <q-card-section class="q-pa-xl text-center">
            <q-icon name="menu_book" color="green-7" size="80px" />
            <div class="text-h5 text-weight-bolder text-green-10 q-mt-md">Módulo de Pedagogías</div>
            <div class="text-subtitle1 text-grey-6 q-mt-sm max-text">
              Selecciona una ficha de la barra lateral para consultar y completar la información de la planeación
              pedagógica.
            </div>
          </q-card-section>
        </q-card>

        <div v-else class="column q-gutter-y-md">
          <q-card square class="shadow-5 bg-white">
            <q-card-section class="row items-center justify-between q-py-md bg-green-10">
              <div>
                <div class="text-subtitle2 text-white text-weight-bolder text-uppercase">PROGRAMA ACADÉMICO</div>
                <div class="text-h5 text-weight-bolder text-white">{{
                  selectedPlanning.pedagogicalPlanning?.metadata?.programName }}</div>
                <div class="text-caption text-white q-mt-xs">
                  <strong>Código:</strong> {{ selectedPlanning.pedagogicalPlanning?.metadata?.programCode || '—' }} |
                  <strong>Versión:</strong> {{ selectedPlanning.pedagogicalPlanning?.metadata?.version || '1' }} |
                  <strong>Ficha:</strong> {{ selectedPlanning.pedagogicalPlanning?.fiche }}
                </div>
              </div>
            </q-card-section>
          </q-card>

          <q-card v-if="loadingSelectedPlanning" flat bordered class="loading-card bg-white">
            <q-spinner-cube color="green-9" size="60px" />
            <div class="text-h6 text-green-10 text-weight-bolder q-mt-md">Cargando planeación pedagógica...</div>
          </q-card>

          <q-card v-else flat bordered class="bg-white pedagogia-card">
            <q-card-section
              class="bg-grey-1 text-grey-9 q-py-sm text-subtitle2 text-weight-bolder flex justify-between items-center">
              <div>DETALLES DE PEDAGOGÍA Y PLANEACIÓN</div>
              <div class="text-caption text-grey-7">Desplaza horizontalmente para consultar todas las columnas</div>
            </q-card-section>

            <q-card-section class="q-pa-none">
              <div class="table-wrapper">
                <div class="table-scroll">
                  <table class="pedagogia-table">
                    <thead>
                      <tr>
                        <th class="base-col">FASE</th>
                        <th class="base-col competencia-col">COMPETENCIA</th>
                        <th class="base-col activity-col">RESULTADO (RAP)</th>
                        <th class="base-col hours-col">HORAS DIRECTAS</th>
                        <th class="base-col days-col">DÍAS ASIGNADOS</th>
                        <th v-for="col in extraColumns" :key="col.key" class="extra-header">{{ col.label }}</th>
                        <th class="confirm-header">CONFIRMAR REVISION</th>
                      </tr>
                    </thead>
                    <tbody>
                      <template v-for="(phase, phIdx) in selectedPlanning.pedagogicalPlanning?.content || []"
                        :key="phIdx">
                        <template v-for="(comp, coIdx) in phase.competencies || []" :key="coIdx">
                          <template v-for="(rap, rapIdx) in comp.learningOutcomes || []" :key="rapIdx">
                            <tr v-for="(act, acIdx) in rap.pedagogicalActivities || []" :key="acIdx">
                              <!--asignacion de fase-->
                              <td class="base-cell phase-cell">{{ phaseLabel(phase.phase) }}</td>
                              <!--asignacion de competencia-->
                              <td class="base-cell">
                                <div class="text-weight-bold text-green-10">{{ comp.code || '—' }}</div>
                                <div class="muted small">{{ comp.name || 'Sin nombre' }}</div>
                              </td>
                              <!--asignacion de resultado y actividad-->
                              <td class="base-cell">
                                <div class="text-weight-bold small">RAP: {{ rap.description || '—' }}</div>

                              </td>
                              <!--asignacion de horas directas-->
                              <!-- generado por luis llanos (muestra horas directas asignadas en BD o calculadas segun formula) -->
                              <td class="base-cell text-center">
                                <q-badge outline color="green-9" class="text-weight-bold">{{ directHours(act, comp, rap)
                                }}h</q-badge>
                              </td>
                              <!-- fin de implementacion luis llanos -->
                              <!--asignacion de dias programados-->
                              <td class="base-cell">
                                <div v-if="act.scheduleDetails?.assignedDays?.length">
                                  <div class="text-weight-bold small">{{ act.scheduleDetails.assignedDays.length }}
                                    sesiones</div>
                                  <div class="muted tiny">{{ act.scheduleDetails.assignedDays.join(', ') }}</div>
                                </div>
                                <span v-else class="muted small">Sin programar</span>
                              </td>

                              <td v-for="col in extraColumns" :key="col.key" class="extra-cell">
                                <!--asignacion de actividad de proyecto formativo-->
                                <template v-if="col.key === 'projectActivity'">
                                  {{ phase.projectActivity || phase.activity || '—' }}
                                </template>

                                <!--asignacion de saberes de conceptos y principios-->
                                <template v-else-if="col.key === 'concepts'">
                                  <div class="text-preview">
                                    {{ joinValue(
                                      comp.knowledge?.conceptsAndPrinciples ||
                                      comp.knowledge?.conceptos_y_principios ||
                                      comp.conceptsAndPrinciples
                                    ) }}
                                  </div>

                                  <q-btn flat dense no-caps color="green-9" label="Leer más" class="read-more-btn"
                                    @click="openReadMore(
                                      joinValue(
                                        comp.knowledge?.conceptsAndPrinciples ||
                                        comp.knowledge?.conceptos_y_principios ||
                                        comp.conceptsAndPrinciples
                                      ),
                                      'Saberes de conceptos y principios'
                                    )" />

                                </template>
                                <!--asignacion de saberes de proceso-->
                                <template v-else-if="col.key === 'processes'">

                                  <div class="text-preview">
                                    {{ joinValue(
                                      comp.knowledge?.processes ||
                                      comp.knowledge?.procesos ||
                                      comp.processes
                                    ) }}
                                  </div>

                                  <q-btn flat dense no-caps color="green-9" label="Leer más" class="read-more-btn"
                                    @click="openReadMore(
                                      joinValue(
                                        comp.knowledge?.processes ||
                                        comp.knowledge?.procesos ||
                                        comp.processes
                                      ),
                                      'Saberes de proceso'
                                    )" />

                                </template>

                                <!--asignacion de criterios de evaluacion-->
                                <template v-else-if="col.key === 'criteria'">
                                  <div class="text-preview">
                                    {{ joinValue(
                                      rap.evaluationCriteria?.length
                                        ? rap.evaluationCriteria
                                        : (comp.evaluationCriteria?.length ? comp.evaluationCriteria :
                                          comp.criterios_de_evaluacion)
                                    ) }}
                                  </div>

                                  <q-btn flat dense no-caps color="green-9" label="Leer más" class="read-more-btn"
                                    @click="openReadMore(
                                      joinValue(
                                        rap.evaluationCriteria?.length
                                          ? rap.evaluationCriteria
                                          : (comp.evaluationCriteria?.length ? comp.evaluationCriteria :
                                            comp.criterios_de_evaluacion)
                                      ),
                                      'Criterios de evaluación'
                                    )" />
                                </template>

                                <!--asignacion de actividad de aprendizaje-->
                                <template v-else-if="col.key === 'learningActivity'">
                                  {{ act.description || '—' }}
                                </template>

                                <!--asignacion de horas de trabajo independiente-->
                                <template v-else-if="col.key === 'independentHours'">
                                  <q-badge color="green-8" outline>{{ act.hours?.independent ?? 0 }}h</q-badge>
                                </template>

                                <!--asignacion de descripcion de la evidencia de aprendizaje-->
                                <template v-else-if="col.key === 'evidence'">
                                  {{ act.evidenceDescription || act.learningEvidence || act.evidence || '—' }}
                                </template>

                                <!--asignacion de estrategias didacticas activas-->
                                <template v-else-if="col.key === 'strategies'">
                                  {{ joinValue(act.didacticStrategies || act.strategies || act.estrategiasDidacticas) ||
                                    '—' }}
                                </template>

                                <!--asignacion de ambiente de aprendizaje-->
                                <template v-else-if="col.key === 'environment'">
                                  {{
                                    act.environment?.type ||
                                    act.environment?.name ||
                                    (typeof act.environment === 'string' ? act.environment : null) ||
                                    '—'
                                  }}
                                </template>

                                <!--asignacion de materiales de formacion-->
                                <template v-else-if="col.key === 'materials'">
                                  <div class="text-preview">
                                    {{ joinValue(act.environment?.materials) }}
                                  </div>

                                  <q-btn flat dense no-caps color="green-9" label="Leer más" class="read-more-btn"
                                    @click="openReadMore(
                                      joinValue(act.environment?.materials),
                                      'Materiales de formación'
                                    )" />
                                </template>

                                <!--asignacion de instructor responsable-->
                                <template v-else-if="col.key === 'responsible'">
                                  {{ act.responsibleInstructor?.name || act.responsibleInstructor ||
                                    act.suggestedInstructor?.name || act.instructors?.name || '—' }}
                                </template>

                                <!--asignacion de observaciones-->
                                <template v-else-if="col.key === 'observations'">
                                  {{ act.observations || '—' }}
                                </template>
                              </td>
                              <td class="confirm-cell">
                                <div class="column items-center q-gutter-xs">
                                  <q-btn v-if="!isActivityConfirmed(act)" outline color="green-9" icon="check"
                                    label="Confirmar" no-caps dense class="confirm-action-btn full-width"
                                    @click="confirmActivity(act)" />

                                  <q-badge v-else color="green-9" class="confirmed-badge full-width justify-center">
                                    <q-icon name="check_circle" size="15px" class="q-mr-xs" />
                                    Revisado
                                  </q-badge>

                                  <q-btn :outline="!(act.comments && act.comments.length > 0)"
                                    :unelevated="!!(act.comments && act.comments.length > 0)" dense no-caps
                                    :color="act.comments?.length ? 'green-8' : 'blue-grey-7'" icon="chat"
                                    :label="act.comments?.length ? `Comentarios (${act.comments.length})` : 'Comentarios'"
                                    class="comments-action-btn full-width"
                                    @click="openCommentsDialog(act, comp, rap, phase)">
                                    <q-tooltip class="bg-grey-9">Ver y agregar comentarios de esta actividad</q-tooltip>
                                  </q-btn>
                                </div>
                              </td>
                            </tr>
                          </template>
                        </template>
                      </template>
                    </tbody>
                  </table>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </q-page>
    </q-page-container>

    <q-dialog v-model="showEditor" persistent>
      <q-card class="editor-card">
        <q-card-section class="bg-green-9 text-white">
          <div class="text-h6 text-weight-bolder">EDITAR INFORMACIÓN PEDAGÓGICA</div>
          <div class="text-caption">Completa los campos adicionales de la planeación.</div>
        </q-card-section>
        <q-card-section class="q-pa-md editor-scroll">
          <div class="text-subtitle2 text-green-10 text-weight-bolder q-mb-md">Datos de la actividad</div>
          <q-input v-model="editor.description" type="textarea" outlined autogrow
            label="Actividad de aprendizaje a desarrollar" class="q-mb-md" />
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6"><q-input v-model.number="editor.directHours" type="number" outlined
                label="Horas trabajo directo" /></div>
            <div class="col-12 col-md-6"><q-input v-model.number="editor.independentHours" type="number" outlined
                label="Horas trabajo independiente" /></div>
          </div>
          <q-input v-model="editor.concepts" type="textarea" outlined autogrow label="Saberes de conceptos y principios"
            class="q-mt-md" />
          <q-input v-model="editor.processes" type="textarea" outlined autogrow label="Saberes de proceso"
            class="q-mt-md" />
          <q-input v-model="editor.criteria" type="textarea" outlined autogrow label="Criterios de evaluación"
            class="q-mt-md" />
          <q-input v-model="editor.evidence" type="textarea" outlined autogrow
            label="Descripción de la evidencia de aprendizaje" class="q-mt-md" />
          <q-input v-model="editor.strategies" type="textarea" outlined autogrow label="Estrategias didácticas activas"
            class="q-mt-md" />
          <q-input v-model="editor.environment" outlined label="Ambiente de aprendizaje" class="q-mt-md" />
          <q-input v-model="editor.materials" type="textarea" outlined autogrow label="Materiales de formación"
            class="q-mt-md" />
          <q-input v-model="editor.responsible" outlined label="Instructor responsable" class="q-mt-md" />
          <q-input v-model="editor.observations" type="textarea" outlined autogrow label="Observaciones"
            class="q-mt-md" />
        </q-card-section>
        <q-card-actions align="right" class="bg-grey-1 q-pa-md">
          <q-btn flat label="Cancelar" color="grey-7" v-close-popup />
          <q-btn color="green-9" label="Guardar" icon="save" class="text-weight-bolder" @click="applyEditor" />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <q-dialog v-model="showReadMore">

      <q-card class="read-more-dialog">

        <!-- TÍTULO -->
        <q-card-section class="bg-green-9 text-white">
          <div class="text-h6 text-weight-bold">
            {{ readMoreTitle }}
          </div>
        </q-card-section>

        <!-- INFORMACIÓN -->
        <q-card-section class="read-more-content">

          <ul class="read-more-list">

            <li v-for="(item, index) in readMoreItems" :key="index">
              {{ item }}
            </li>

          </ul>

        </q-card-section>

        <!-- BOTÓN CERRAR -->
        <q-card-actions align="right">
          <q-btn flat label="CERRAR" color="green-9" @click="showReadMore = false" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- DIÁLOGO DE COMENTARIOS POR FILA -->
    <q-dialog v-model="showCommentsDialog" persistent>
      <q-card class="comments-dialog-card bg-white">
        <!-- TÍTULO / HEADER -->
        <q-card-section class="bg-green-9 text-white row items-center justify-between q-py-md">
          <div class="row items-center q-gutter-sm">
            <q-icon name="forum" size="26px" />
            <div>
              <div class="text-h6 text-weight-bolder leading-tight">COMENTARIOS DE REVISIÓN</div>
              <div class="text-caption text-green-1">Observaciones y retroalimentación de la fila seleccionada</div>
            </div>
          </div>
          <q-btn flat round dense icon="close" color="white" v-close-popup :disable="savingComment" />
        </q-card-section>

        <!-- INFORMACIÓN DE CONTEXTO DE LA FILA -->
        <q-card-section class="q-pa-sm bg-grey-2 border-bottom">
          <div class="comments-context-box q-pa-sm text-caption">
            <div class="row q-col-gutter-xs">
              <div class="col-12 col-md-4">
                <span class="text-weight-bold text-green-10">Fase:</span>
                <span class="text-grey-9 q-ml-xs">{{ phaseLabel(currentCommentsContext.phase) }}</span>
              </div>
              <div class="col-12 col-md-8">
                <span class="text-weight-bold text-green-10">Competencia:</span>
                <span class="text-grey-9 q-ml-xs">{{ currentCommentsContext.compCode }} - {{
                  currentCommentsContext.compName
                }}</span>
              </div>
              <div class="col-12">
                <span class="text-weight-bold text-green-10">RAP:</span>
                <span class="text-grey-9 q-ml-xs">{{ currentCommentsContext.rapDesc }}</span>
              </div>
              <div class="col-12">
                <span class="text-weight-bold text-green-10">Actividad:</span>
                <span class="text-grey-9 q-ml-xs text-weight-medium">{{ currentCommentsContext.actDesc }}</span>
              </div>
            </div>
          </div>
        </q-card-section>

        <!-- LISTA DE COMENTARIOS -->
        <q-card-section class="q-pa-md comments-list-scroll">
          <div v-if="!currentCommentsActivity?.comments?.length" class="empty-comments-container text-center q-py-lg">
            <q-icon name="chat_bubble_outline" size="52px" color="grey-5" />
            <div class="text-subtitle1 text-grey-7 text-weight-bold q-mt-sm">No hay comentarios aún</div>
            <div class="text-caption text-grey-6">Sé el primero en agregar una observación o retroalimentación sobre
              esta
              actividad.</div>
          </div>

          <div v-else class="column q-gutter-y-sm">
            <div v-for="(c, cIdx) in currentCommentsActivity.comments" :key="c.id || cIdx"
              class="comment-card q-pa-sm bg-grey-1">
              <div class="row items-center justify-between q-mb-xs">
                <div class="row items-center q-gutter-xs">
                  <q-avatar size="24px" color="green-9" text-color="white" icon="person" font-size="14px" />
                  <span class="text-weight-bold text-green-10 text-body2">{{ c.author || 'Usuario' }}</span>
                  <q-badge v-if="c.role" outline color="green-8" class="text-bold" style="font-size: 10px;">
                    {{ c.role }}
                  </q-badge>
                </div>
                <div class="row items-center q-gutter-xs">
                  <span class="text-caption text-grey-6">{{ formatCommentDate(c.createdAt) }}</span>
                  <q-btn flat round dense icon="delete_outline" size="sm" color="red-7" :disable="savingComment"
                    @click="deleteCommentFromActivity(cIdx)">
                    <q-tooltip class="bg-grey-9">Eliminar comentario</q-tooltip>
                  </q-btn>
                </div>
              </div>

              <div class="comment-text q-pl-sm text-grey-9">
                {{ c.text }}
              </div>
            </div>
          </div>
        </q-card-section>

        <q-separator />

        <!-- FORMULARIO PARA AGREGAR NUEVO COMENTARIO -->
        <q-card-section class="q-pa-md bg-white">
          <div class="text-subtitle2 text-weight-bold text-green-10 q-mb-xs">
            Agregar nuevo comentario:
          </div>
          <q-input v-model="newCommentText" type="textarea" outlined dense autogrow
            placeholder="Escribe tu observación o comentario sobre esta actividad..." :disable="savingComment" rows="2"
            maxlength="1000" counter>
            <template #after>
              <q-btn unelevated color="green-9" icon="send" label="Guardar" class="full-height text-weight-bold"
                :loading="savingComment" :disable="!newCommentText.trim() || savingComment"
                @click="addCommentToActivity" />
            </template>
          </q-input>
        </q-card-section>

        <!-- FOOTER / ACCIONES -->
        <q-card-actions align="right" class="bg-grey-2 q-px-md q-py-sm">
          <q-btn flat label="Cerrar" color="grey-8" class="text-weight-bold" v-close-popup :disable="savingComment" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import { PlanningService } from '../services/planning.service';
import { NotificationService } from '../services/notification.service';
import { storeUser } from '../store/users.js';
import jwt_decode from 'jwt-decode';
import BtnBack from "../layouts/btnBackLayout.vue";

const $q = useQuasar();
const router = useRouter();
const userStore = storeUser();
const drawerOpen = ref($q.screen.width > 768);
const plannings = ref([]);
const searchFiche = ref('');
const loadingPlannings = ref(false);
const loadingSelectedPlanning = ref(false);
const selectedPlanning = ref(null);
const notifications = ref([]);
const showEditor = ref(false);
const editorTarget = ref(null);

const showCommentsDialog = ref(false);
const currentCommentsActivity = ref(null);
const currentCommentsContext = ref({
  phase: '',
  compCode: '',
  compName: '',
  rapDesc: '',
  actDesc: ''
});
const newCommentText = ref('');
const savingComment = ref(false);

const getCurrentUserInfo = () => {
  const token = userStore.token;
  let name = userStore.instructorData?.name || userStore.newConsult?.name || '';
  let role = typeof userStore.getRole === 'function' ? userStore.getRole() : (userStore.rol || 'USUARIO');
  let email = userStore.email || '';

  if (token) {
    try {
      const decoded = jwt_decode(token);
      if (decoded) {
        name = name || decoded.name || decoded.nombre || '';
        role = decoded.rol || role;
        email = email || decoded.email || '';
      }
    } catch (e) {
      console.warn('Error decodificando token en comentarios:', e);
    }
  }

  if (!name) {
    name = email ? email.split('@')[0] : 'Usuario';
  }

  return {
    name,
    role: String(role || 'USUARIO').toUpperCase(),
    email
  };
};

const formatCommentDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateStr;
  }
};

// Modificación hecha por Llanos: Gestión y persistencia de comentarios de retroalimentación por actividad
const openCommentsDialog = (act, comp, rap, phase) => {
  if (!act.comments) {
    act.comments = [];
  }
  currentCommentsActivity.value = act;
  currentCommentsContext.value = {
    phase: phase?.phase || '',
    compCode: comp?.code || '',
    compName: comp?.name || '',
    rapDesc: rap?.description || '',
    actDesc: act?.description || 'Sin descripción'
  };
  newCommentText.value = '';
  showCommentsDialog.value = true;
};

// implementacion de luis llanos (envia comentario de actividad al backend y dispara notificaciones por correo a autor e instructor)
const addCommentToActivity = async () => {
  const text = newCommentText.value.trim();
  if (!text || !currentCommentsActivity.value) return;

  if (!Array.isArray(currentCommentsActivity.value.comments)) {
    currentCommentsActivity.value.comments = [];
  }

  const userInfo = getCurrentUserInfo();
  const comment = {
    id: 'comm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    text,
    author: userInfo.name,
    authorEmail: userInfo.email,
    role: userInfo.role,
    createdAt: new Date().toISOString()
  };

  currentCommentsActivity.value.comments.push(comment);
  savingComment.value = true;

  try {
    const fiche = selectedPlanning.value?.pedagogicalPlanning?.fiche;
    if (!fiche) {
      throw new Error('No hay planeación seleccionada');
    }

    const responsibleInstName = currentCommentsActivity.value.responsibleInstructor?.name
      || (typeof currentCommentsActivity.value.responsibleInstructor === 'string' ? currentCommentsActivity.value.responsibleInstructor : '')
      || currentCommentsActivity.value.suggestedInstructor?.name
      || currentCommentsActivity.value.instructors?.name
      || '';

    const payload = {
      phase: currentCommentsContext.value.phase,
      compCode: currentCommentsContext.value.compCode,
      compName: currentCommentsContext.value.compName,
      rapDesc: currentCommentsContext.value.rapDesc,
      actDesc: currentCommentsContext.value.actDesc,
      responsibleInstructor: responsibleInstName,
      comment
    };

    const res = await PlanningService.addActivityComment(fiche, payload);

    newCommentText.value = '';
    const emails = res?.notifiedEmails || [];
    const notifMsg = emails.length > 0
      ? `Comentario guardado y notificado por correo (${emails.join(', ')})`
      : 'Comentario guardado correctamente en la planeación.';

    $q.notify({
      message: notifMsg,
      color: 'green-9',
      icon: 'mark_email_read',
      position: 'top',
      timeout: 4000
    });
  } catch (error) {
    console.error('Error al guardar comentario:', error);
    const index = currentCommentsActivity.value.comments.indexOf(comment);
    if (index !== -1) {
      currentCommentsActivity.value.comments.splice(index, 1);
    }
    $q.notify({
      message: 'Error al guardar el comentario en la base de datos.',
      color: 'red-8',
      icon: 'error',
      position: 'top'
    });
  } finally {
    savingComment.value = false;
  }
};
// fin de implementacion luis llanos

const deleteCommentFromActivity = (commentIndex) => {
  if (!currentCommentsActivity.value?.comments) return;

  $q.dialog({
    title: 'Eliminar Comentario',
    message: '¿Estás seguro de que deseas eliminar este comentario?',
    cancel: { label: 'Cancelar', flat: true, color: 'grey-7' },
    ok: { label: 'Eliminar', color: 'red-8' },
    persistent: true
  }).onOk(async () => {
    const removedComment = currentCommentsActivity.value.comments.splice(commentIndex, 1)[0];
    savingComment.value = true;
    try {
      await PlanningService.saveDraft({
        pedagogicalPlanning: selectedPlanning.value.pedagogicalPlanning
      });
      $q.notify({
        message: 'Comentario eliminado de la base de datos.',
        color: 'grey-9',
        icon: 'delete',
        position: 'top'
      });
    } catch (error) {
      console.error('Error al eliminar comentario:', error);
      if (removedComment) {
        currentCommentsActivity.value.comments.splice(commentIndex, 0, removedComment);
      }
      $q.notify({
        message: 'Error al eliminar el comentario de la base de datos.',
        color: 'red-8',
        icon: 'error',
        position: 'top'
      });
    } finally {
      savingComment.value = false;
    }
  });
};

const showReadMore = ref(false);
const readMoreTitle = ref('');
const readMoreItems = ref([]);

const openReadMore = (text, title) => {
  readMoreTitle.value = title;

  if (!text) {
    readMoreItems.value = ['Sin información'];
    showReadMore.value = true;
    return;
  }

  // Convertimos el contenido en una lista
  const items = String(text)
    .split('•')
    .map(item => item.trim())
    .filter(item => item.length > 0);

  readMoreItems.value = items.length ? items : [String(text)];

  showReadMore.value = true;
};

const extraColumns = [
  { key: 'projectActivity', label: 'ACTIVIDAD DE PROYECTO FORMATIVO' },
  { key: 'concepts', label: 'SABERES DE CONCEPTOS Y PRINCIPIOS' },
  { key: 'processes', label: 'SABERES DE PROCESO' },
  { key: 'criteria', label: 'CRITERIOS DE EVALUACIÓN' },
  { key: 'learningActivity', label: 'ACTIVIDAD DE APRENDIZAJE' },
  { key: 'independentHours', label: 'HORAS TRABAJO INDEPENDIENTE' },
  { key: 'evidence', label: 'DESCRIPCIÓN DE LA EVIDENCIA DE APRENDIZAJE' },
  { key: 'strategies', label: 'ESTRATEGIAS DIDÁCTICAS ACTIVAS' },
  { key: 'environment', label: 'AMBIENTE DE APRENDIZAJE' },
  { key: 'materials', label: 'MATERIALES DE FORMACIÓN' },
  { key: 'responsible', label: 'INSTRUCTOR RESPONSABLE' },
  { key: 'observations', label: 'OBSERVACIONES' }
];

const isActivityConfirmed = (act) => {
  return act.reviewed === true;
};

const confirmActivity = async (act) => {
  act.reviewed = true;

  try {
    if (selectedPlanning.value?.pedagogicalPlanning) {
      await PlanningService.saveDraft({
        pedagogicalPlanning: selectedPlanning.value.pedagogicalPlanning
      });
    }
    $q.notify({
      message: 'Actividad confirmada como revisada.',
      color: 'green-9',
      icon: 'check_circle'
    });
  } catch (error) {
    console.error('Error al persistir confirmación:', error);
    $q.notify({
      message: 'Actividad confirmada localmente, pero ocurrió un error al guardar.',
      color: 'orange-8',
      icon: 'warning'
    });
  }
};

const editor = reactive({
  description: '', directHours: 0, independentHours: 0, concepts: '', processes: '', criteria: '',
  evidence: '', strategies: '', environment: '', materials: '', responsible: '', observations: ''
});

const unreadNotificationsCount = computed(() => notifications.value.filter(n => !n.read).length);
const filteredPlannings = computed(() => {
  const needle = searchFiche.value.trim().toLowerCase();
  if (!needle) return plannings.value;
  return plannings.value.filter(p => {
    const fiche = String(p.pedagogicalPlanning?.fiche || '').toLowerCase();
    const name = String(p.pedagogicalPlanning?.metadata?.programName || '').toLowerCase();
    return fiche.includes(needle) || name.includes(needle);
  });
});

const fetchPlannings = async () => {
  loadingPlannings.value = true;
  try {
    plannings.value = await PlanningService.getAllPlannings();
  } catch (error) {
    console.error(error);
    $q.notify({ message: 'Error al obtener fichas', color: 'red-8' });
  } finally {
    loadingPlannings.value = false;
  }
};

const fetchNotifications = async () => {
  try {
    const data = await NotificationService.getNotifications();
    notifications.value = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error al cargar notificaciones:', error);
  }
};

const selectPlanning = async (plan) => {
  selectedPlanning.value = plan;
  if (!plan) return;
  loadingSelectedPlanning.value = true;
  try {
    const fiche = plan.pedagogicalPlanning?.fiche || plan.fiche;
    const fullPlan = await PlanningService.getPlanningByFiche(fiche);
    if (fullPlan) selectedPlanning.value = fullPlan;
  } catch (error) {
    console.error(error);
    $q.notify({ message: 'Error al obtener la planeación completa', color: 'red-8' });
  } finally {
    loadingSelectedPlanning.value = false;
  }
};

// generado por luis llanos (calcula las horas directas del resultado segun formula de porcentaje de horas lectivas y horas de competencia)
const directHours = (act, comp, rap) => {
  const currentDirect = Number(act?.hours?.direct ?? act?.scheduleDetails?.directHours ?? 0);
  if (currentDirect > 0) return currentDirect;

  // Si no se han persistido aún en la actividad, calcula en vivo según la fórmula
  if (comp && comp.totalCompetenceHours) {
    const metadata = selectedPlanning.value?.pedagogicalPlanning?.metadata || {};
    const total = Number(metadata.totalHours) || (Number(metadata.lectivaHours || 0) + Number(metadata.productivaHours || 0)) || 0;
    const lectiva = Number(metadata.lectivaHours) || 0;
    const ratio = total > 0 ? (lectiva / total) : 1;
    const compLectiva = (Number(comp.totalCompetenceHours) || 0) * ratio;
    const numRaps = comp.learningOutcomes?.length || 1;

    /*
    // comentado para correcion de multiplos
    const rawHoursPerRap = compLectiva / numRaps;
    const numActs = rap?.pedagogicalActivities?.length || 1;
    return Math.round((rawHoursPerRap / numActs) * 10) / 10;
    */

    // correcion de multiplos
    // Aproximar de forma descendente al multiplo de 6 (mañana/tarde) o multiplo de 5 (noche)
    const shiftVal = String(act?.scheduleDetails?.shift || metadata.shift || metadata.jornada || '').toLowerCase().trim();
    const isNight = shiftVal.includes('noche') || shiftVal.includes('night') || shiftVal.includes('nocturn');
    const multiple = isNight ? 5 : 6;
    const rawHoursPerRap = compLectiva / numRaps;
    const roundedRapHours = Math.max(multiple, Math.floor(rawHoursPerRap / multiple) * multiple);
    const numActs = rap?.pedagogicalActivities?.length || 1;
    return numActs === 1
      ? roundedRapHours
      : (Math.max(multiple, Math.floor((roundedRapHours / numActs) / multiple) * multiple) || Math.round(roundedRapHours / numActs));
  }
  return 0;
};

const joinValue = (value) => Array.isArray(value) ? value.join(' • ') : (value || '—');
const phaseLabel = (phase) => ({
  ANALYSIS: 'Análisis', PLANNING: 'Planeación', EXECUTION: 'Ejecución', EVALUATION: 'Evaluación',
  INDUCCION: 'Inducción', ETAPA_PRODUCTIVA: 'Etapa Productiva'
}[phase] || phase || '—');

const allActivities = (plan) => {
  const result = [];
  for (const phase of plan?.pedagogicalPlanning?.content || []) {
    for (const comp of phase.competencies || []) {
      for (const rap of comp.learningOutcomes || []) {
        for (const act of rap.pedagogicalActivities || []) result.push(act);
      }
    }
  }
  return result;
};
const getPlanningFicheStatusLabel = (plan) => {
  const acts = allActivities(plan);
  if (!acts.length) return 'SIN DATOS';
  const confirmed = acts.filter(a => (a.suggestedInstructor || a.instructors)?.assignmentStatus === 'confirmed').length;
  return confirmed === acts.length ? 'COMPLETO' : confirmed ? 'PROCESANDO' : 'PENDIENTE';
};
const getPlanningFicheStatusColor = (plan) => ({ COMPLETO: 'green-9', PROCESANDO: 'orange-8', PENDIENTE: 'blue-grey-6' }[getPlanningFicheStatusLabel(plan)] || 'grey-7');

const openEditor = (phase, comp, rap, act) => {
  editorTarget.value = { phase, comp, rap, act };
  Object.assign(editor, {
    description: act.description || '',
    directHours: directHours(act, comp, rap),
    independentHours: act.hours?.independent ?? 0,
    concepts: joinValue(comp.knowledge?.conceptsAndPrinciples || comp.knowledge?.conceptos_y_principios || comp.conceptsAndPrinciples).replace(/—$/, ''),
    processes: joinValue(comp.knowledge?.processes || comp.knowledge?.procesos || comp.processes).replace(/—$/, ''),
    criteria: joinValue(rap.evaluationCriteria || comp.evaluationCriteria || comp.criterios_de_evaluacion).replace(/—$/, ''),
    evidence: act.evidenceDescription || act.learningEvidence || act.evidence || '',
    strategies: joinValue(act.didacticStrategies || act.strategies || act.estrategiasDidacticas).replace(/—$/, ''),
    environment: act.environment?.type || act.environment?.name || (typeof act.environment === 'string' ? act.environment : '') || '',
    materials: joinValue(act.environment?.materials).replace(/—$/, ''),
    responsible: act.responsibleInstructor?.name || act.responsibleInstructor || act.suggestedInstructor?.name || act.instructors?.name || '',
    observations: act.observations || ''
  });
  showEditor.value = true;
};

const toArray = (text) => String(text || '').split(/\n|•/).map(v => v.trim()).filter(Boolean);
const applyEditor = () => {
  const target = editorTarget.value;
  if (!target) return;
  const { phase, comp, rap, act } = target;
  act.description = editor.description;
  act.hours = { ...(act.hours || {}), direct: Number(editor.directHours) || 0, independent: Number(editor.independentHours) || 0 };
  comp.knowledge = { ...(comp.knowledge || {}), conceptsAndPrinciples: toArray(editor.concepts), processes: toArray(editor.processes) };
  rap.evaluationCriteria = toArray(editor.criteria);
  act.evidenceDescription = editor.evidence;
  act.didacticStrategies = toArray(editor.strategies);
  if (!act.environment || typeof act.environment !== 'object') {
    act.environment = { type: '', materials: [] };
  }
  act.environment.type = editor.environment;
  act.environment.materials = toArray(editor.materials);
  delete act.materials;
  delete act.trainingMaterials;
  delete act.learningEnvironment;
  act.responsibleInstructor = editor.responsible;
  act.observations = editor.observations;
  showEditor.value = false;
  $q.notify({ message: 'Información pedagógica actualizada. Guarda los cambios para persistirla.', color: 'green-9', icon: 'check_circle' });
};

const savePlanning = async () => {
  if (!selectedPlanning.value) return;
  $q.loading.show({ message: 'Guardando información pedagógica...' });
  try {
    await PlanningService.saveDraft({ pedagogicalPlanning: selectedPlanning.value.pedagogicalPlanning });
    $q.notify({ message: '¡Planeación pedagógica guardada correctamente!', color: 'green-10', icon: 'save' });
    await fetchPlannings();
  } catch (error) {
    console.error(error);
    $q.notify({ message: 'No fue posible guardar la planeación pedagógica.', color: 'red-8', icon: 'error' });
  } finally {
    $q.loading.hide();
  }
};

const handleLogout = () => {
  $q.dialog({ title: 'Cerrar Sesión', message: '¿Está seguro que desea cerrar la sesión?', cancel: { label: 'Cancelar', flat: true, color: 'grey-7' }, ok: { label: 'Cerrar Sesión', color: 'green-9' }, persistent: true })
    .onOk(() => {
      userStore.logoutUser();
      sessionStorage.clear();
      localStorage.removeItem('token');
      router.push({ name: 'login' });
    });
};

onMounted(async () => {
  await fetchPlannings();
  fetchNotifications();
});
</script>

<style scoped>
.empty-state,
.loading-card {

  display: flex;
  align-items: center;
  justify-content: center;
}

.table-wrapper {
  width: 100%;
  min-width: 100%;
}

.table-scroll {
  width: 100%;
  overflow-x: auto;
  overflow-y: visible;
  height: auto;
  max-height: none;
}

.pedagogia-table {
  width: max-content;
  min-width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 12px;
}

/* ENCABEZADOS Y CELDAS */
.pedagogia-table th,
.pedagogia-table td {
  border-right: 1px solid #e0e0e0;
  border-bottom: 1px solid #e5e5e5;
  vertical-align: top;
  box-sizing: border-box;
}

.pedagogia-table th {
  position: sticky;
  top: 0;
  z-index: 3;
  padding: 10px 8px;
  text-align: left;
  font-size: 10px;
  letter-spacing: .35px;
  text-transform: uppercase;
  white-space: normal;
  height: 55px;
}

/* ALTURA DE LAS FILAS */
.pedagogia-table td {
  padding: 8px;
  height: 110px;
  max-height: 110px;
}

/* COLUMNAS NORMALES */
.base-col {
  background: #f5f5f5;
  color: #333;
}

.base-cell {
  background: #fff;
}

/* FASE */
.phase-cell {
  width: 120px;
  min-width: 120px;
  max-width: 120px;
  font-weight: 700;
  text-transform: uppercase;
  color: #616161;
}

/* COMPETENCIA */
.competencia-col {
  width: 260px;
  min-width: 260px;
  max-width: 260px;
}

/* RAP Y ACTIVIDAD */
.activity-col {
  width: 360px;
  min-width: 360px;
  max-width: 360px;
}

/* HORAS */
.hours-col {
  width: 120px;
  min-width: 120px;
  max-width: 120px;
  text-align: center;
}

/* DÍAS */
.days-col {
  width: 200px;
  min-width: 200px;
  max-width: 200px;
}

/* COLUMNAS VERDES */
.extra-header {
  background: #f5f5f5;
  color: #333;
  width: 260px;
  min-width: 260px;
  max-width: 260px;
}

.extra-cell {
  background: #fff;
  width: 260px;
  min-width: 260px;
  max-width: 260px;
  color: #333;
}

/* ACCIONES */
.actions-col {
  width: 90px;
  min-width: 90px;
  max-width: 90px;
  text-align: center;
}


.text-preview {
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;

  line-height: 1.4;
  word-break: break-word;
}

.read-more-btn {
  padding: 0;
  margin-top: 5px;
  min-height: 22px;
  font-size: 11px;
  font-weight: bold;
}

.read-more-dialog {
  width: 700px;
  max-width: 90vw;
}

.read-more-content {
  white-space: pre-wrap;
  line-height: 1.6;
  max-height: 60vh;
  overflow-y: auto;
}

.confirm-header {
  background: #f5f5f5;
  color: #333;
  width: 160px;
  min-width: 160px;
  max-width: 160px;
  text-align: center;
}

.confirm-cell {
  background: #fff;
  width: 160px;
  min-width: 160px;
  max-width: 160px;
  text-align: center;
  vertical-align: middle !important;
  padding: 6px 4px !important;
}

.confirmed-badge {
  padding: 6px 8px;
  font-weight: 700;
  font-size: 11px;
}

.confirm-action-btn {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 6px;
}

.comments-action-btn {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 4px;
}

.comments-dialog-card {
  width: 700px;
  max-width: 95vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;
}

.comments-context-box {
  background-color: #f1f8e9;
  border-left: 4px solid #2e7d32;
  border-radius: 4px;
  line-height: 1.4;
}

.comments-list-scroll {
  max-height: 320px;
  overflow-y: auto;
}

.comment-card {
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  background: #ffffff;
  transition: all 0.2s ease;
}

.comment-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.comment-text {
  font-size: 13px;
  line-height: 1.5;
  color: #333;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
