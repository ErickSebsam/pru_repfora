<template>
  <div v-if="!sesionesColumnaIzq.length && !sesionesColumnaDer.length" class="q-mb-md">
    <q-banner dense rounded class="bg-grey-2 text-grey-7">
      <template v-slot:avatar><q-icon name="event_busy" /></template>
      Sin sesiones programadas
    </q-banner>
  </div>
  <div v-else class="row q-col-gutter-md q-mb-sm">
    <div class="col-12 col-sm-6">
      <table class="sess-view-table">
        <thead><tr><th>N°</th><th>Fecha</th><th>H. Inicio</th><th>H. Fin</th><th>Horas</th><th>Resultado</th></tr></thead>
        <tbody>
          <tr v-for="(s, i) in sesionesColumnaIzq" :key="i" :class="i % 2 === 0 ? 'row-even' : 'row-odd'">
            <td>{{ i + 1 }}</td>
            <td>{{ s.fecha || '—' }}</td>
            <td>{{ s.horaInicio || '—' }}</td>
            <td>{{ s.horaFin || '—' }}</td>
            <td>{{ s.totalHoras || 0 }}</td>
            <td class="text-left resultado-cell">
              <q-tooltip v-if="s.competencia">{{ s.competencia }}</q-tooltip>
              {{ truncar(s.resultado) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="sesionesColumnaDer.length" class="col-12 col-sm-6">
      <table class="sess-view-table">
        <thead><tr><th>N°</th><th>Fecha</th><th>H. Inicio</th><th>H. Fin</th><th>Horas</th><th>Resultado</th></tr></thead>
        <tbody>
          <tr v-for="(s, i) in sesionesColumnaDer" :key="i" :class="i % 2 === 0 ? 'row-even' : 'row-odd'">
            <td>{{ sesionesColumnaIzq.length + i + 1 }}</td>
            <td>{{ s.fecha || '—' }}</td>
            <td>{{ s.horaInicio || '—' }}</td>
            <td>{{ s.horaFin || '—' }}</td>
            <td>{{ s.totalHoras || 0 }}</td>
            <td class="text-left resultado-cell">
              <q-tooltip v-if="s.competencia">{{ s.competencia }}</q-tooltip>
              {{ truncar(s.resultado) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
// ── 3. PROPS Y EMITS
defineProps({
  sesionesColumnaIzq: { type: Array, default: () => [] },
  sesionesColumnaDer: { type: Array, default: () => [] },
})

// ── 8. HELPERS
// trunca un texto a un maximo de caracteres con puntos suspensivos
function truncar(text, max = 50) {
  if (!text) return '—'
  return text.length > max ? text.slice(0, max) + '…' : text
}
</script>

<style scoped>
.sess-view-table          { width: 100%; border-collapse: collapse; font-size: 13px; }
.sess-view-table thead tr { background-color: #2e7d32; color: #fff; }
.sess-view-table th       { padding: 7px 8px; text-align: center; font-weight: 700; font-size: 12px; letter-spacing: 0.3px; }
.sess-view-table td       { padding: 6px 8px; text-align: center; border: 1px solid #c8e6c9; }
.sess-view-table .row-even td { background-color: #f9fbe7; }
.sess-view-table .row-odd  td { background-color: #fff; }
.resultado-cell { font-size: 11px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
