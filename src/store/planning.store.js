import { defineStore } from 'pinia';
import { PlanningService } from '../services/planning.service';
import { storeUser } from './users.js';

const normalizeName = (name) => {
  return (name || '')
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
};

const isSameInstructor = (name1, name2) => {
  if (!name1 || !name2) return false;
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  if (n1 === n2) return true;

  const words1 = n1.split(/\s+/).filter(w => w.length > 2);
  const words2 = n2.split(/\s+/).filter(w => w.length > 2);

  if (words1.length === 0 || words2.length === 0) return false;

  const match1 = words1.every(w => words2.includes(w));
  const match2 = words2.every(w => words1.includes(w));

  const firstTwo1 = words1.slice(0, 2).join(' ');
  const firstTwo2 = words2.slice(0, 2).join(' ');
  const firstTwoMatch = firstTwo1 && firstTwo2 && firstTwo1 === firstTwo2;

  return match1 || match2 || firstTwoMatch;
};

const decodeTokenSafely = (token) => {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
    return JSON.parse(atob(padded));
  } catch (e) {
    return null;
  }
};

export const usePlanningStore = defineStore('planning', {
  state: () => ({
    planning: null,
    loading: false,
    selectedPhase: 'INDUCCION',
    searchQuery: '',
    phases: [
      { id: 'INDUCCION', label: 'INDUCCIÓN', icon: 'school' },
      { id: 'ANALYSIS', label: 'ANÁLISIS', icon: 'analytics' },
      { id: 'PLANNING', label: 'PLANEACIÓN', icon: 'event_note' },
      { id: 'EXECUTION', label: 'EJECUCIÓN', icon: 'play_circle' },
      { id: 'EVALUATION', label: 'EVALUACIÓN', icon: 'fact_check' },
      { id: 'ETAPA_PRODUCTIVA', label: 'ETAPA PRODUCTIVA', icon: 'work' },
    ],
  }),

  getters: {
    phaseCounts: (state) => {
      const q = state.searchQuery.toLowerCase();
      return state.phases.map((p) => {
        const phaseData = state.planning?.pedagogicalPlanning?.content?.find(
          (item) => item.phase === p.id
        );

        let count = 0;
        if (phaseData && phaseData.competencies) {
          phaseData.competencies.forEach(comp => {
            // Si hay búsqueda, verificar si la competencia coincide
            const matchComp = !q || comp.code.includes(q) || comp.name.toLowerCase().includes(q);

            if (matchComp && comp.learningOutcomes) {
              count += comp.learningOutcomes.length;
            }
          });
        }
        return { ...p, count };
      });
    },

    currentPhaseData: (state) => {
      if (!state.planning) return null;
      return state.planning.pedagogicalPlanning.content.find(
        (p) => p.phase === state.selectedPhase
      );
    },

    filteredCompetencies: (state) => {
      const data = state.planning?.pedagogicalPlanning?.content?.find(
        (p) => p.phase === state.selectedPhase
      );
      if (!data) return [];

      let comps = data.competencies || [];

      const userStore = storeUser();
      const token = userStore.token;
      let role = userStore.getRole();
      let instructorName = userStore.instructorData?.name || userStore.newConsult?.name;
      let currentUserEmail = (userStore.email || '').trim().toLowerCase();

      if (token) {
        const decoded = decodeTokenSafely(token);
        if (decoded) {
          role = decoded.rol || role;
          instructorName = instructorName || decoded.name;
          if (decoded.email) {
            currentUserEmail = decoded.email.trim().toLowerCase();
          }
        }
      }

      const roleUpper = (role || '').toUpperCase();
      const isProgrammerOrAdmin = ['PROGRAMADOR', 'COORDINADOR', 'ADMIN'].includes(roleUpper);

      // Contar total de actividades confirmadas en toda la planeación
      let totalConfirmedInPlan = 0;
      if (state.planning?.pedagogicalPlanning?.content) {
        state.planning.pedagogicalPlanning.content.forEach(phase => {
          if (phase.competencies) {
            phase.competencies.forEach(comp => {
              if (comp.learningOutcomes) {
                comp.learningOutcomes.forEach(rap => {
                  if (rap.pedagogicalActivities) {
                    rap.pedagogicalActivities.forEach(act => {
                      const sugg = act.suggestedInstructor || act.instructors;
                      if (sugg && sugg.assignmentStatus === 'confirmed') {
                        totalConfirmedInPlan++;
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }

      // Si soy el líder de la planeación, siempre debo poder ver todo el contenido extraído para poder seguir asignando.
      const leaderEmail = (state.planning?.pedagogicalPlanning?.leaderEmail || '').trim().toLowerCase();
      const isLeaderOfThisPlan = leaderEmail && currentUserEmail && leaderEmail === currentUserEmail;
      const showAllForLeader = isLeaderOfThisPlan;

      // Si no es programador, coordinador, administrador o líder,
      // filtramos para mostrar solo sus actividades confirmadas.
      if (!isProgrammerOrAdmin && !showAllForLeader) {
        if (instructorName) {
          comps = comps.map(c => {
            // Clonamos la competencia para no mutar el store original
            const compCopy = JSON.parse(JSON.stringify(c));

            // Filtramos los resultados de aprendizaje (learningOutcomes)
            compCopy.learningOutcomes = (compCopy.learningOutcomes || []).filter(rap => {
              // Filtramos las actividades pedagógicas asignadas y confirmadas
              rap.pedagogicalActivities = (rap.pedagogicalActivities || []).filter(act => {
                const sugg = act.suggestedInstructor || act.instructors;
                const isAssigned = sugg && sugg.name && isSameInstructor(sugg.name, instructorName);
                const isConfirmed = sugg && sugg.assignmentStatus === 'confirmed';
                return isAssigned && isConfirmed;
              });

              return rap.pedagogicalActivities.length > 0;
            });

            return compCopy;
          }).filter(c => c.learningOutcomes.length > 0);
        }
      }

      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        comps = comps.filter(c =>
          c.code.includes(state.searchQuery) ||
          c.name.toLowerCase().includes(q)
        );
      }
      return comps;
    },

    getCompetenceProgress: (state) => (competence) => {
      const totalExpected = competence.totalCompetenceHours || 0;
      let totalAssigned = 0;
      if (state.planning?.pedagogicalPlanning?.content) {
        state.planning.pedagogicalPlanning.content.forEach((phase) => {
          (phase.competencies || []).forEach((comp) => {
            if (comp.code === competence.code) {
              (comp.learningOutcomes || []).forEach((rap) => {
                (rap.pedagogicalActivities || []).forEach((act) => {
                  totalAssigned += (Number(act.hours?.direct) || 0) + (Number(act.hours?.independent) || 0);
                });
              });
            }
          });
        });
      } else {
        (competence.learningOutcomes || []).forEach((rap) => {
          (rap.pedagogicalActivities || []).forEach((act) => {
            totalAssigned += (Number(act.hours?.direct) || 0) + (Number(act.hours?.independent) || 0);
          });
        });
      }
      const missing = totalExpected - totalAssigned;
      return {
        total: totalExpected,
        assigned: totalAssigned,
        missing: missing < 0 ? 0 : missing,
        percent: totalExpected > 0 ? Math.min(totalAssigned / totalExpected, 1) : 0,
      };
    },

    // actualizacion horas luis llanos 15-09-2026
    getSuggestedHours: (state) => (comp, rap = null, act = null, customShift = null) => {
      if (!comp || !comp.totalCompetenceHours) {
        return { direct: 0, rapTotal: 0, compLectiva: 0, multiple: 6, isNight: false };
      }
      const metadata = state.planning?.pedagogicalPlanning?.metadata || {};
      const total = Number(metadata.totalHours) || (Number(metadata.lectivaHours || 0) + Number(metadata.productivaHours || 0)) || 0;
      const lectiva = Number(metadata.lectivaHours) || 0;
      const ratio = total > 0 ? (lectiva / total) : 1;
      const compLectiva = (Number(comp.totalCompetenceHours) || 0) * ratio;

      const numRaps = (comp.learningOutcomes && comp.learningOutcomes.length > 0) ? comp.learningOutcomes.length : 1;

      const shiftVal = String(customShift || act?.scheduleDetails?.shift || metadata.shift || metadata.jornada || '').toLowerCase().trim();
      const isNight = shiftVal.includes('noche') || shiftVal.includes('night') || shiftVal.includes('nocturn');
      const multiple = isNight ? 5 : 6;

      const rawHoursPerRap = compLectiva / numRaps;
      const roundedRapHours = Math.max(multiple, Math.floor(rawHoursPerRap / multiple) * multiple);

      const numActs = (rap && Array.isArray(rap.pedagogicalActivities) && rap.pedagogicalActivities.length > 0)
        ? rap.pedagogicalActivities.length
        : 1;

      const suggestedDirect = numActs === 1
        ? roundedRapHours
        : (Math.max(multiple, Math.floor((roundedRapHours / numActs) / multiple) * multiple) || Math.round(roundedRapHours / numActs));

      return {
        direct: suggestedDirect,
        rapTotal: roundedRapHours,
        compLectiva: Math.round(compLectiva),
        multiple,
        isNight,
        ratio
      };
    },

    isLeader: (state) => {
      const userStore = storeUser();
      const token = userStore.token;
      let role = userStore.getRole();
      let currentUserEmail = (userStore.email || '').trim().toLowerCase();

      if (token) {
        const decoded = decodeTokenSafely(token);
        if (decoded) {
          role = decoded.rol || role;
          if (decoded.email) {
            currentUserEmail = decoded.email.trim().toLowerCase();
          }
        }
      }

      const roleUpper = (role || '').toUpperCase();
      // Programadores, coordinadores y admins siempre son líderes
      if (['PROGRAMADOR', 'COORDINADOR', 'ADMIN'].includes(roleUpper)) return true;

      // Un instructor es líder si su correo coincide con el leaderEmail de la planeación actual
      const leaderEmail = (state.planning?.pedagogicalPlanning?.leaderEmail || '').trim().toLowerCase();
      return !!(leaderEmail && currentUserEmail && leaderEmail === currentUserEmail);
    },

    metadata: (state) => state.planning?.pedagogicalPlanning?.metadata || {},
  },

  actions: {
    async loadPlanning(fiche) {
      this.loading = true;
      try {
        const response = await PlanningService.getPlanningByFiche(fiche);
        if (!response) throw new Error('PLANNING_NOT_FOUND');

        // Asignar directamente el documento
        this.planning = response;


        if (this.planning.pedagogicalPlanning?.content?.some(p => p.phase === 'INDUCCION')) {
          this.selectedPhase = 'INDUCCION';
        } else {
          this.selectedPhase = 'ANALYSIS';
        }
      } catch (error) {
        console.error('Error cargando planeación:', error.message);
        this.planning = null;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    addActivityToRAP(competenceCode, rapDescription, newActivity) {
      if (!this.planning) return;

      const content = this.planning.pedagogicalPlanning.content;
      for (const phase of content) {
        const comp = phase.competencies.find(c => c.code === competenceCode);
        if (comp) {
          const rap = comp.learningOutcomes.find(r => r.description === rapDescription);
          if (rap) {
            if (!rap.pedagogicalActivities) {
              rap.pedagogicalActivities = [];
            }
            rap.pedagogicalActivities.push(newActivity);
            return;
          }
        }
      }
    },

    updateActivityDescription(competenceCode, rapDescription, myInstructorName, newDescription) {
      if (!this.planning) return;
      const content = this.planning.pedagogicalPlanning.content;

      const normalize = (text) => (text || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
      const normMyName = normalize(myInstructorName);

      for (const phase of content) {
        const comp = phase.competencies.find(c => c.code === competenceCode);
        if (comp) {
          const rap = comp.learningOutcomes.find(r => r.description === rapDescription);
          if (rap && rap.pedagogicalActivities) {
            const act = rap.pedagogicalActivities.find(a => {
              const sugg = a.suggestedInstructor || a.instructors;
              return sugg && sugg.name && normalize(sugg.name) === normMyName;
            });
            if (act) {
              act.description = newDescription || '';
              return;
            }
          }
        }
      }
    },

    updateRAPFieldInStore(competenceCode, rapDescription, fieldName, newValue) {
      if (!this.planning) return;
      const content = this.planning.pedagogicalPlanning.content;
      for (const phase of content) {
        const comp = phase.competencies.find(c => c.code === competenceCode);
        if (comp) {
          const rap = comp.learningOutcomes.find(r => r.description === rapDescription);
          if (rap) {
            rap[fieldName] = JSON.parse(JSON.stringify(newValue));
            return;
          }
        }
      }
    },

    updateCompetenceFieldInStore(competenceCode, fieldName, newValue) {
      if (!this.planning) return;
      const content = this.planning.pedagogicalPlanning.content;
      for (const phase of content) {
        const comp = phase.competencies.find(c => c.code === competenceCode);
        if (comp) {
          comp[fieldName] = JSON.parse(JSON.stringify(newValue));
          return;
        }
      }
    },

    updateActivityInStore(competenceCode, rapDescription, originalDescription, updatedActivity) {
      if (!this.planning) return;
      const content = this.planning.pedagogicalPlanning.content;

      const userStore = storeUser();
      const token = userStore.token;
      let myInstructorName = userStore.instructorData?.name || userStore.newConsult?.name || '';
      let role = userStore.rol || '';
      let currentUserEmail = userStore.email || '';

      if (token) {
        const decoded = decodeTokenSafely(token);
        if (decoded) {
          role = decoded.rol || role;
          if (!myInstructorName) {
            myInstructorName = decoded.name || '';
          }
          if (decoded.email) {
            currentUserEmail = decoded.email.trim().toLowerCase();
          }
        }
      }

      const roleUpper = (role || '').toUpperCase();
      const isProgrammerOrAdmin = ['PROGRAMADOR', 'COORDINADOR', 'ADMIN'].includes(roleUpper);
      const leaderEmail = (this.planning?.pedagogicalPlanning?.leaderEmail || '').trim().toLowerCase();
      const isLeader = leaderEmail && currentUserEmail && leaderEmail === currentUserEmail;
      const canUpdateAll = isProgrammerOrAdmin || isLeader;

      for (const phase of content) {
        const comp = phase.competencies.find(c => c.code === competenceCode);
        if (comp) {
          const rap = comp.learningOutcomes.find(r => r.description === rapDescription);
          if (rap && rap.pedagogicalActivities) {
            const act = rap.pedagogicalActivities.find(a => {
              const sugg = a.suggestedInstructor || a.instructors;
              const matchesDesc = a.description === originalDescription;
              if (!matchesDesc) return false;

              // Si es un instructor común, solo permitimos que actualice sus propios resultados.
              // Si es Coordinador/Admin/Líder, puede programar los de cualquiera.
              if (!canUpdateAll && sugg && sugg.name && myInstructorName) {
                return isSameInstructor(sugg.name, myInstructorName);
              }
              return true;
            });
            if (act) {
              act.description = updatedActivity.description;
              act.didacticStrategies = JSON.parse(JSON.stringify(updatedActivity.didacticStrategies || []));
              act.learningEvidences = JSON.parse(JSON.stringify(updatedActivity.learningEvidences || []));
              if (updatedActivity.environment) {
                act.environment = JSON.parse(JSON.stringify(updatedActivity.environment));
              }
              // 🔥 Copiar las horas para que deje de estar "Sin programar" y cambie de estado
              if (updatedActivity.hours) {
                act.hours = JSON.parse(JSON.stringify(updatedActivity.hours));
              }
              if (updatedActivity.scheduleDetails) {
                act.scheduleDetails = JSON.parse(JSON.stringify(updatedActivity.scheduleDetails));
              }
              if (updatedActivity.isScheduledInCalendar !== undefined) {
                act.isScheduledInCalendar = updatedActivity.isScheduledInCalendar;
              }
              return;
            }
          }
        }
      }
    },

    deleteActivityFromStore(competenceCode, rapDescription, activityIdx) {
      if (!this.planning) return;
      const content = this.planning.pedagogicalPlanning.content;
      for (const phase of content) {
        const comp = phase.competencies.find(c => c.code === competenceCode);
        if (comp) {
          const rap = comp.learningOutcomes.find(r => r.description === rapDescription);
          if (rap && rap.pedagogicalActivities) {
            rap.pedagogicalActivities.splice(activityIdx, 1);
            return;
          }
        }
      }
    },

    setPhase(phaseId) {
      this.selectedPhase = phaseId;
    },

    async saveDraft() {
      if (!this.planning) return;
      console.log('FRONTEND SAVING PLAYLOAD:', JSON.stringify(this.planning.pedagogicalPlanning.content[0].competencies[0].learningOutcomes[0].pedagogicalActivities));
      try {
        await PlanningService.saveDraft({ pedagogicalPlanning: this.planning.pedagogicalPlanning });
      } catch (error) {
        console.error('Error al guardar:', error.message);
        throw error; // Relanzar para que el componente pueda notificar al usuario
      }
    },

    async savePlanningTemplate(savedBy) {
      if (!this.planning) throw new Error('No hay una planeación activa');
      const p = this.planning.pedagogicalPlanning;
      return await PlanningService.savePlanningTemplate({
        programCode: p.metadata.programCode,
        programName: p.metadata.programName,
        content: p.content,
        savedBy
      });
    },

    async fetchPlanningTemplate(programCode) {
      try { return await PlanningService.getPlanningTemplate(programCode); }
      catch (error) { return null; }
    },

    async applyPlanningTemplate(template) {
      if (!this.planning || !template) return 0;
      const fiche = this.planning.pedagogicalPlanning?.fiche;
      const programCode = template.programCode || this.planning.pedagogicalPlanning?.metadata?.programCode;
      if (!fiche || !programCode) return 0;
      try {
        const result = await PlanningService.applyPlanningTemplate(fiche, programCode);
        // Recargar desde el backend para que la vista refleje el contenido importado
        if (result?.data?.pedagogicalPlanning) {
          this.planning = result.data;
        }
        return 1;
      } catch (error) {
        console.error('[STORE] Error al aplicar plantilla:', error.message);
        return 0;
      }
    },

    clearPlan() {
      this.planning = null;
      this.selectedPhase = 'INDUCCION';
      this.searchQuery = '';
    },

    setGlobalEnvironment(environmentName) {
      if (!this.planning || !this.planning.pedagogicalPlanning?.content) return;
      let changed = false;
      this.planning.pedagogicalPlanning.content.forEach(phase => {
        if (phase.competencies) {
          phase.competencies.forEach(comp => {
            if (comp.learningOutcomes) {
              comp.learningOutcomes.forEach(rap => {
                if (rap.pedagogicalActivities) {
                  rap.pedagogicalActivities.forEach(act => {
                    if (!act.environment) act.environment = { type: '', materials: [] };
                    act.environment.type = environmentName;
                    changed = true;
                  });
                }
              });
            }
          });
        }
      });
      if (changed) {
        this.saveDraft();
      }
    },
  },
});
