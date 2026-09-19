<template>
  <div>

    <!-- VER — siempre visible en todos los estados -->
    <q-btn round icon="visibility" size="sm" color="blue-10" class="q-mx-xs"
      :loading="loadingDetalle === row._id"
      @click="emit('ver', row)">
      <q-tooltip class="bg-blue-grey-1 text-green-9">Ver detalle completo</q-tooltip>
    </q-btn>

    <!-- ═══════════════════════════════════════════
         ADMIN: PENDIENTE
         ═══════════════════════════════════════════ -->
    <template v-if="modo === 'admin' && row._stateRaw === 'PENDIENTE'">

      <q-btn round icon="check_circle" size="sm" color="green-10" class="q-mx-xs"
        :loading="loadingAccion === row._id"
        @click="emit('aprobar', row._id)">
        <q-tooltip class="bg-blue-grey-1 text-green-9">Aprobar solicitud</q-tooltip>
      </q-btn>

      <q-btn round icon="cancel" size="sm" color="red-10" class="q-mx-xs"
        :loading="loadingAccion === row._id"
        @click="emit('rechazar', row._id)">
        <q-tooltip class="bg-blue-grey-1 text-green-9">Rechazar solicitud</q-tooltip>
      </q-btn>

      <q-btn v-if="esProgramador" round icon="block" size="sm" color="red-9" class="q-mx-xs"
        :loading="loadingAccion === row._id"
        @click="emit('cancelar', row._id)">
        <q-tooltip class="bg-blue-grey-1 text-green-9">Cancelar solicitud</q-tooltip>
      </q-btn>

    </template>

    <!-- ═══════════════════════════════════════════
         ADMIN: APROBADA
         ═══════════════════════════════════════════ -->
    <template v-if="modo === 'admin' && row._stateRaw === 'APROBADA'">

      <q-btn round icon="cancel" size="sm" color="red-10" class="q-mx-xs"
        :loading="loadingAccion === row._id"
        @click="emit('rechazar', row._id)">
        <q-tooltip class="bg-blue-grey-1 text-green-9">Rechazar solicitud</q-tooltip>
      </q-btn>

      <q-btn v-if="esProgramador" round icon="block" size="sm" color="red-9" class="q-mx-xs"
        :loading="loadingAccion === row._id"
        @click="emit('cancelar', row._id)">
        <q-tooltip class="bg-blue-grey-1 text-green-9">Cancelar solicitud</q-tooltip>
      </q-btn>

      <q-btn v-if="esProgramador" round icon="fact_check" size="sm" color="purple-8" class="q-mx-xs"
        :loading="loadingAccion === row._id"
        @click="emit('asignar-ficha', row)">
        <q-tooltip class="bg-blue-grey-1 text-green-9">Asignar número de ficha y fechas</q-tooltip>
      </q-btn>

    </template>

    <!-- ═══════════════════════════════════════════
         ADMIN: FICHA_ASIGNADA
         ═══════════════════════════════════════════ -->
    <template v-if="modo === 'admin' && row._stateRaw === 'FICHA_ASIGNADA'">

      <q-btn v-if="esProgramador" round icon="app_registration" size="sm" color="cyan-8" class="q-mx-xs"
        :loading="loadingAccion === row._id"
        @click="emit('avanzar-inscripcion', row._id)">
        <q-tooltip class="bg-blue-grey-1 text-green-9">Avanzar a Inscripción</q-tooltip>
      </q-btn>

      <q-btn v-if="esProgramador" round icon="block" size="sm" color="red-9" class="q-mx-xs"
        :loading="loadingAccion === row._id"
        @click="emit('cancelar', row._id)">
        <q-tooltip class="bg-blue-grey-1 text-green-9">Cancelar solicitud</q-tooltip>
      </q-btn>

    </template>

    <!-- ═══════════════════════════════════════════
         ADMIN: INSCRIPCION
         ═══════════════════════════════════════════ -->
    <template v-if="modo === 'admin' && row._stateRaw === 'INSCRIPCION'">

      <q-btn v-if="esProgramador" round icon="how_to_reg" size="sm" color="blue-7" class="q-mx-xs"
        :loading="loadingAccion === row._id"
        @click="emit('avanzar-matriculada', row._id)">
        <q-tooltip class="bg-blue-grey-1 text-green-9">Avanzar a Matriculada</q-tooltip>
      </q-btn>

      <q-btn v-if="esProgramador" round icon="block" size="sm" color="red-9" class="q-mx-xs"
        :loading="loadingAccion === row._id"
        @click="emit('cancelar', row._id)">
        <q-tooltip class="bg-blue-grey-1 text-green-9">Cancelar solicitud</q-tooltip>
      </q-btn>

    </template>

    <!-- ═══════════════════════════════════════════
         ADMIN: MATRICULADA
         ═══════════════════════════════════════════ -->
    <template v-if="modo === 'admin' && row._stateRaw === 'MATRICULADA'">

      <q-btn v-if="esProgramador" round icon="date_range" size="sm" color="teal-9" class="q-mx-xs"
        :loading="loadingAccion === row._id"
        @click="emit('programar', row)">
        <q-tooltip class="bg-blue-grey-1 text-green-9">Programar sesiones del curso</q-tooltip>
      </q-btn>

      <q-btn v-if="esProgramador" round icon="block" size="sm" color="red-9" class="q-mx-xs"
        :loading="loadingAccion === row._id"
        @click="emit('cancelar', row._id)">
        <q-tooltip class="bg-blue-grey-1 text-green-9">Cancelar solicitud</q-tooltip>
      </q-btn>

    </template>

    <!-- ═══════════════════════════════════════════
         ADMIN: PROGRAMADA
         ═══════════════════════════════════════════ -->
    <template v-if="modo === 'admin' && row._stateRaw === 'PROGRAMADA'">

      <q-btn v-if="esProgramador" round icon="play_circle" size="sm" color="deep-purple-8" class="q-mx-xs"
        :loading="loadingAccion === row._id"
        @click="emit('avanzar-ejecucion', row._id)">
        <q-tooltip class="bg-blue-grey-1 text-green-9">Avanzar a Ejecución</q-tooltip>
      </q-btn>

      <q-btn round icon="update" size="sm" color="orange-9" class="q-mx-xs"
        :loading="loadingAccion === row._id"
        @click="emit('reprogramar', row)">
        <q-tooltip class="bg-blue-grey-1 text-green-9">Reprogramar sesiones</q-tooltip>
      </q-btn>

      <q-btn v-if="esProgramador" round icon="block" size="sm" color="red-9" class="q-mx-xs"
        :loading="loadingAccion === row._id"
        @click="emit('cancelar', row._id)">
        <q-tooltip class="bg-blue-grey-1 text-green-9">Cancelar solicitud</q-tooltip>
      </q-btn>

    </template>

    <!-- ═══════════════════════════════════════════
         ADMIN: EJECUCION
         ═══════════════════════════════════════════ -->
    <template v-if="modo === 'admin' && row._stateRaw === 'EJECUCION'">

      <q-btn round icon="update" size="sm" color="orange-9" class="q-mx-xs"
        :loading="loadingAccion === row._id"
        @click="emit('reprogramar', row)">
        <q-tooltip class="bg-blue-grey-1 text-green-9">Reprogramar sesiones</q-tooltip>
      </q-btn>

      <q-btn round icon="grading" size="sm" color="teal-8" class="q-mx-xs"
        :loading="loadingAccion === row._id"
        @click="emit('evaluar', row._id)">
        <q-tooltip class="bg-blue-grey-1 text-green-9">Evaluar resultados de aprendizaje</q-tooltip>
      </q-btn>

      <q-btn round icon="more_time" size="sm" color="amber-9" class="q-mx-xs"
        :loading="loadingAccion === row._id"
        @click="emit('ampliacion-coordinador', row._id)">
        <q-tooltip class="bg-blue-grey-1 text-green-9">Resolver solicitudes de ampliación</q-tooltip>
      </q-btn>

      <q-btn round icon="lock" size="sm" color="blue-grey-8" class="q-mx-xs"
        :loading="loadingAccion === row._id"
        @click="emit('cerrar-ficha', row._id)">
        <q-tooltip class="bg-blue-grey-1 text-green-9">Cerrar ficha complementaria</q-tooltip>
      </q-btn>

      <q-btn round icon="event_note" size="sm" color="indigo-7" class="q-mx-xs"
        :loading="loadingAccion === row._id"
        @click="emit('eventos', row._id)">
        <q-tooltip class="bg-blue-grey-1 text-green-9">Agregar eventos mensuales</q-tooltip>
      </q-btn>

    </template>

    <!-- ADMIN: RECHAZADA — solo ver (botón global) -->

    <!-- ═══════════════════════════════════════════
         INSTRUCTOR: EJECUCION
         ═══════════════════════════════════════════ -->
    <template v-if="modo === 'instructor' && row._stateRaw === 'EJECUCION'">

      <q-btn round icon="event_note" size="sm" color="indigo-7" class="q-mx-xs"
        :loading="loadingAccion === row._id"
        @click="emit('eventos', row._id)">
        <q-tooltip class="bg-blue-grey-1 text-green-9">Agregar eventos mensuales</q-tooltip>
      </q-btn>

      <q-btn round icon="more_time" size="sm" color="amber-9" class="q-mx-xs"
        :loading="loadingAccion === row._id"
        @click="emit('ampliacion-instructor', row._id)">
        <q-tooltip class="bg-blue-grey-1 text-green-9">Solicitar ampliación de tiempo</q-tooltip>
      </q-btn>

    </template>

    <!-- ═══════════════════════════════════════════
         INSTRUCTOR: RECHAZADA
         ═══════════════════════════════════════════ -->
    <template v-if="modo === 'instructor' && row._stateRaw === 'RECHAZADA'">

      <q-btn round icon="edit_note" size="sm" color="orange-9" class="q-mx-xs"
        :loading="loadingDetalle === row._id"
        @click="emit('editar', row)">
        <q-tooltip class="bg-blue-grey-1 text-green-9">Editar y corregir la solicitud</q-tooltip>
      </q-btn>

      <q-btn round icon="forward_to_inbox" size="sm" color="green-9" class="q-mx-xs"
        :loading="loadingAccion === row._id"
        @click="emit('reenviar', row._id)">
        <q-tooltip class="bg-blue-grey-1 text-green-9">Reenviar para nueva revisión</q-tooltip>
      </q-btn>

    </template>

  </div>
</template>

<script setup>
// ── 1. IMPORTS
import { computed } from 'vue'
import { storeUser } from '../../../../store/users.js'

// ── 2. COMPOSABLES Y STORES
const { getRole } = storeUser()

// ── 3. PROPS Y EMITS
const props = defineProps({
  row:           { type: Object, required: true },
  modo:          { type: String, required: true },
  tabActivo:     { type: String, default: null },
  loadingDetalle:{ type: String, default: null },
  loadingAccion: { type: String, default: null },
})

const emit = defineEmits([
  'ver', 'aprobar', 'rechazar', 'asignar-ficha',
  'avanzar-inscripcion', 'programar', 'avanzar-matriculada', 'avanzar-programada', 'reprogramar',
  'avanzar-ejecucion', 'cancelar', 'evaluar', 'eventos', 'ampliacion-coordinador',
  'ampliacion-instructor', 'cerrar-ficha', 'editar', 'reenviar',
])

// ── 5. COMPUTED
// determina si el usuario tiene rol admin o programador
const esProgramador = computed(() => ['ADMIN', 'PROGRAMADOR'].includes(getRole()))
</script>
