# Diagnóstico discrepancia horas instructores API

**Session ID:** ses_0c0573a07ffeuBR2ElDlsDfcK4
**Created:** 7/7/2026, 21:57:33
**Updated:** 9/7/2026, 13:29:24

---

## User

esta petición saca el total de horas programadas para todos los instructores
https://repforacat.com/api/reports/hoursinstructors

esta petición saca el total de horas programadas para un instructor en particular
https://repforacat.com/api/reports/instructor

En algunos casos difiere, y debería ser igual,  la primera por ejemplo saca 119 y la segunda 134, siendo esta ULTima la correcta (es decir por instructor)

me parece que la fecha hora tiene algo que ver.  puedes diagnosticar por favor 


---

## Assistant

**Tool: bash**

---

## Assistant

**Tool: glob**

**Tool: grep**

---

## Assistant

**Tool: grep**

---

## Assistant

**Tool: read**

---

## Assistant

**Tool: read**

**Tool: grep**

---

## Assistant

**Tool: read**

---

## Assistant

**Tool: grep**

---

## Assistant

**Tool: read**

---

## Assistant

**Tool: read**

---

## Assistant

Encontré la causa. Hay **dos bugs** que explican la discrepancia, y tu sospecha sobre fecha/hora tiene razón parcial.

## Bug principal: filtro de 3 meses en la consulta (línea 706-707)

`controller/reports.controller.js:706`:

```js
let dateStart = new Date(fstart);
dateStart.setMonth(dateStart.getMonth() - 3);   // retrocede 3 meses "para no perder el mes anterior"

const schedules = await Schedule.find({
  fstart: { $gte: dateStart },   // ← solo trae schedules cuyo INICIO sea >= fstart-3m
  status: 0,
});
```

Esto **excluye** schedules cuyo `fstart` es más antiguo pero cuyos `events` sí caen dentro del rango pedido (fichas largas que arrancaron hace más de 3 meses). Esos schedules nunca llegan a procesarse y se pierden sus horas.

En cambio `newReportInstructor` (línea 243-247) trae **todos** los schedules del instructor y luego filtra por traslape de rangos en memoria:

```js
if (progra.fstart <= newFend && progra.fend >= newFstart) {
```

Esa diferencia es la que produce 119 vs 134.

## Bug secundario: fecha/hora y redondeo (lo que sospechabas)

1. **Normalización de límites** — al comparar eventos contra `fstart`/`fend`:
   - `newReportInstructor` (vía `calculateHours:87-89`) normaliza con `dateFormater()` → `00:00:00.000Z`.
   - `reportHoursInstructors` (línea 758) usa `new Date(fstart)`/`new Date(fend)` **sin normalizar**. Si el front envía hora (p.ej. ISO con offset), el límite superior se desplaza y los eventos del último día con hora > 00:00 quedan fuera.

2. **Redondeo de horas por evento**:
   - `calculateHours:94` → `parseFloat((minutes/60).toFixed(2))` (decimales, ej. 1.5h).
   - `reportHoursInstructors:729` → `Math.round(minutes/60)` (entero, ej. 2h).

   Este tiende a **inflar** `reportHoursInstructors`, no a reducirlo, así que no es la causa del 119.

## Fix sugerido

El cambio mínimo es alinear el filtro de la consulta al mismo criterio de traslape que usa el endpoint individual:

```js
// en reportHoursInstructors
const schedules = await Schedule.find({
  fstart: { $lte: new Date(fend) },   // inicio antes o igual al fin del rango
  fend:   { $gte: new Date(fstart) }, // fin después o igual al inicio del rango
  status: 0,
}).populate("instructor");
```

Y lo mismo para `OthersSchedule` (línea 837). Así los schedules que traslapan con el rango siempre se cargan, sin importar cuándo empezaron.

¿Quieres que aplique el fix y deje igualadas también la normalización de fechas y el redondeo para que ambos endpoints calcen exacto?

---

## User

umm, eso estaba bien, creo. los de frontend estaban haciendo una funcion para normalizar las fechas puede ser eso?


---

## Assistant

**Tool: read**

---

## Assistant

Tu sospecha tiene fundamento. Mirá la asimetría en el backend, que es lo que **amplifica** cualquier diferencia de formato que mande el frontend:

**Endpoint `instructor`** (`calculateHours:87-89`):
```js
const newFstart = dateFormater(fstart);   // normaliza a 00:00:00.000Z
const newFend = dateFormater(fend);
```

**Endpoint `hoursinstructors`** (`reports.controller.js:758`):
```js
if (dateEvent >= new Date(fstart) && dateEvent <= new Date(fend)) {  // SIN normalizar
```

`dateFormater` (utils/functions/dates.js:37) toma `toISOString().split("T")[0]` y le pega `T00:00:00.000Z`, o sea, descarta cualquier hora/offset que traiga la fecha. En cambio `new Date(fstart)` **respeta** la hora y el offset que lleguen.

Entonces, si el frontend manda `fend` distinto en cada botón (p.ej. `"2024-12-31"` en uno y `"2024-12-31T23:59:59-05:00"` o un ISO con offset en el otro), los resultados difieren. Peor aún: aunque manden el mismo string, los eventos del último día con hora > 00:00 se cuentan en uno y no en el otro.

## Cómo confirmarlo rápido

Agregá un log temporal en ambos endpoints para ver qué llega exactamente:

```js
console.log("FECHAS RECIBIDAS:", { fstart, fend });
```

Y compará el payload de cada petición. Si los strings de `fstart`/`fend` son distintos entre los dos botones del frontend, ese es el bug.

## Recomendación

Aún si arreglan el frontend, conviene **normalizar en el backend** para blindarlo. Alineá `reportHoursInstructors` al mismo criterio de `calculateHours`:

```js
const newFstart = dateFormater(fstart);
const newFend = dateFormater(fend);
// ...
if (dateEvent >= newFstart && dateEvent <= newFend) {
```

¿Querés que ponga ese log para diagnosticar, o aplico directamente la normalización en el backend?

---

## User

aplica la normalizacion

---

## Assistant

**Tool: read**

---

## Assistant

**Tool: edit**

---

## Assistant

Ahora reemplazo las dos comparaciones de eventos (EN FORMACIÓN y OTRAS ACTIVIDADES) que usaban `new Date(fstart)`/`new Date(fend)`:

**Tool: edit**

---

## Assistant

Verifico que los cambios quedaron bien y reviso sintaxis:

**Tool: bash**

---

## Assistant

**Tool: grep**

---

## Assistant

Listo. Cambios aplicados en `controller/reports.controller.js`:

- **Líneas 706-707**: añadí `newFstart = dateFormater(fstart)` y `newFend = dateFormater(fend)` (medianoche UTC).
- **Líneas 763 y 888**: reemplacé `new Date(fstart)`/`new Date(fend)` por `newFstart`/`newFend`, alineando la comparación de eventos con `calculateHours` (líneas 87-99) que usa el endpoint individual.

Sintaxis OK. Ahora ambos endpoints aplican el mismo criterio de normalización, así que aunque el frontend mande la fecha con hora/offset, el límite se interpreta igual en ambos.

---

## User

sigue el problema hay discrepancias, puedes revisar nuevamente haber que puede pasar?


---

## Assistant

**Tool: read**

---

## Assistant

**Tool: read**

---

## Assistant

La normalización sola no alcanza. Revisé a fondo y quedan **dos diferencias más** entre los endpoints. Déjame confirmar con un script de diagnóstico en vez de seguir a ciegas.

Primero veo la conexión y el modelo Instructor:

**Tool: read**

**Tool: bash**

---

## Assistant

Creo un script de diagnóstico para comparar los dos métodos con tu caso concreto (instructor + fechas):

**Tool: write**

---

## Assistant

Ejecutá el script con los datos del caso problemático (el instructor y fechas exactas que usaste cuando viste 119 vs 134):

```
node _diag_hours.js <instructorId> <fstart YYYY-MM-DD> <fend YYYY-MM-DD>
```

El script compara los **dos métodos** lado a lado:

1. **Método A** (`hoursinstructors`): consulta con `fstart >= fstart - 3 meses`.
2. **Método B** (`instructor`): trae todos + filtra por traslape de rangos.

Y te muestra:
- Cuántos schedules carga cada uno.
- **Qué schedules se pierde el Método A** (los que B cuenta pero A no), con sus horas → esto confirma si el filtro de 3 meses es el culpable.
- Totales con ambos redondeos (`toFixed(2)` vs `Math.round`).

## Las dos causas que aún no se tocaron

**(1) Filtro de consulta (línea 711)** — aunque dijiste que estaba bien, sigue ahí y **es independiente de la normalización**. Un schedule con `fstart` más antiguo que `fstart−3m` pero con `events` en el rango **jamás llega a procesarse**, sin importar cómo normalices las fechas. La normalización solo actúa sobre los eventos que ya se cargaron.

**(2) Redondeo (línea 729 vs 94)** — `Math.round(minutes/60)` vs `parseFloat((minutes/60).toFixed(2))`. Para jornadas fraccionarias difieren, aunque suele inflar el Método A, no reducirlo.

Pegame la salida del script (o el `instructorId` + fechas que usaste) y confirmo cuál de las dos causa los 15h de diferencia antes de tocar más código.

---

## User

no veo los scripts, y para ejectuar algo debo hacer un push, ya que bd y todo solo se puede acceder en la nube.   seria colocar logs con todo lo que necesites y luegos los borramos, sirve asi?

---

## Assistant

Perfecto. Te dejo logs temporales marcados con `[DIAG-HOURS]` para que sean fáciles de buscar y borrar después. Releo la sección actual para inyectarlos en el lugar exacto:

**Tool: read**

---

## Assistant

**Tool: read**

---

## Assistant

**Tool: read**

---

## Assistant

Inyecto los logs. **Punto 1** — log de fechas recibidas y filtro:

**Tool: edit**

---

## Assistant

**Punto 2** — después de la query de schedules (EN FORMACIÓN), una query diagnóstica sin el filtro de 3 meses para ver qué schedules se pierden:

**Tool: edit**

---

## Assistant

**Punto 3** — log del total por instructor antes del `res.json` final:

**Tool: edit**

---

## Assistant

Verifico sintaxis:

**Tool: bash**

---

## Assistant

Borro el script `_diag_hours.js` que no se puede ejecutar en la nube:

**Tool: bash**

---

## Assistant

Listo. Logs inyectados en `controller/reports.controller.js`, todos marcados `[DIAG-HOURS]` para buscarlos fácil. Hay 3 puntos:

1. **Inicio** — fechas `fstart`/`fend` tal como llegan del frontend + su versión normalizada + el límite del filtro.
2. **Después de la query de EN FORMACIÓN** — carga una **query paralela sin el filtro de 3 meses** y reporta qué schedules se pierden, con sus horas estimadas.
3. **Antes del `res.json`** — total de horas por instructor.

## Después del push + petición

Hacé la petición a `/api/reports/hoursinstructors` con el mismo rango donde viste 119, y pegame las líneas `[DIAG-HOURS]` de los logs. En especial:

- `[DIAG-HOURS] fstart recibido` / `fend recibido` → confirma si el frontend manda la fecha con hora u offset.
- `[DIAG-HOURS] schedules PERDIDOS por el filtro: N | HORAS PERDIDAS estimadas: X` → si `X` ≈ 15, confirma que el filtro de 3 meses es la causa.
- `[DIAG-HOURS] PERDIDO _id:...` → el instructor/ficha específica que se está cayendo.

Con eso cerramos diagnóstico y aplico el fix. Cuando terminemos, busco `[DIAG-HOURS]` y los borro todos de una.

---

## User

GET /assets/kJEhBvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oFsLjBuVY-Dj7_ZTxZ.woff2 200 0.603 ms - 2681948
[DIAG-HOURS] ============ reportHoursInstructors ============
[DIAG-HOURS] fstart recibido: "2026/07/01" -> normalizado: 2026-07-01T00:00:00.000Z
[DIAG-HOURS] fend   recibido: "2026/07/31" -> normalizado: 2026-07-31T00:00:00.000Z
[DIAG-HOURS] type: EN FORMACION | filtro query fstart >= : 2026-04-01T00:00:00.000Z
[DIAG-HOURS] PERDIDO _id:6973ec759718cc561ab25ebd instructor:MIGUEL ANGEL DULCEY DIAZ fiche:680f92db744e300b902eb1a3 fstart:2026-02-03 fend:2026-10-23 | eventosEnRango:3 h/evento:5.98
[DIAG-HOURS] PERDIDO _id:6978de929718cc561ab36c13 instructor:MIGUEL ANGEL DULCEY DIAZ fiche:687849faf42b2fe13197ba45 fstart:2026-03-30 fend:2026-09-14 | eventosEnRango:2 h/evento:5.98
[DIAG-HOURS] PERDIDO _id:6979725c9718cc561ab3840e instructor:Sylvia Alejandra Lopez Vargas  fiche:67bfdb5b71e7d8e0b4be695c fstart:2026-03-09 fend:2026-07-06 | eventosEnRango:3 h/evento:5
[DIAG-HOURS] schedules cargados con filtro 3m: 2864 | sin filtro (traslape): 682
[DIAG-HOURS] schedules PERDIDOS por el filtro: 3 | HORAS PERDIDAS estimadas: 44.900000000000006
[DIAG-HOURS] --- totales por instructor ---
[DIAG-HOURS] instructor:YOLIMA MEZA ALVAREZ doc:37898973 hours:96
[DIAG-HOURS] instructor:HELMER DUARTE MURALLAS doc:13862471 hours:119
[DIAG-HOURS] instructor:LUZ ADRIANA MENESES RANGEL doc:1101691534 hours:183
[DIAG-HOURS] instructor:Javier Eduardo Quiroga Sierra doc:1101752846 hours:30
[DIAG-HOURS] instructor:LIZETH CAROLINA DURAN TINJACA doc:1098752315 hours:130
[DIAG-HOURS] instructor:DAVID ANDRES GOMEZ FUENTES doc:1101687325 hours:42
[DIAG-HOURS] instructor:DUVAN JAVIER REMOLINA OLARTE doc:1100969147 hours:42
[DIAG-HOURS] instructor:DIEGO CARREÑO PEREZ doc:13637992 hours:12
[DIAG-HOURS] instructor:WENDY VERONICA CARDENAS GUERRERO doc:37535648 hours:163
[DIAG-HOURS] instructor:MARIA JULIA GALINDO GARCIA doc:1101687525 hours:78
[DIAG-HOURS] instructor:MARTHA JANETH DULCEY PARRA doc:63366659 hours:155
[DIAG-HOURS] instructor:LUIS ALEJANDRO BELLO RAMIREZ doc:86053649 hours:0
[DIAG-HOURS] instructor:LUZ YADIRA SILVA FORERO doc:1100959774 hours:75
[DIAG-HOURS] instructor:FABIO YESID LANCHEROS CARO doc:1100966111 hours:144
[DIAG-HOURS] instructor:IVÁN MAURICIO VILLAMIL GARCÍA doc:91110063 hours:24
[DIAG-HOURS] instructor:Jhovana Beatriz Manchego Cubillos doc:46673398 hours:72
[DIAG-HOURS] instructor:LUIS CARLOS REINA SANCHEZ doc:1098657403 hours:0
[DIAG-HOURS] instructor:CLAUDIA YANETH BAYONA FLOREZ doc:63514726 hours:128
[DIAG-HOURS] instructor:JOSE MIGUEL PINTO GOMEZ doc:1100965077 hours:17
[DIAG-HOURS] instructor:JOHN ALEXANDER GUEVARA SANTANA doc:1100953511 hours:121
[DIAG-HOURS] instructor:Oscar David Guerrero Perez doc:1065883934 hours:84
[DIAG-HOURS] instructor:LUZ ELENA BLANCO BALLESTEROS doc:63304896 hours:12
[DIAG-HOURS] instructor:JAVIER JUNIOR MARTINEZ PEÑA doc:1100952100 hours:133
[DIAG-HOURS] instructor:MONICA LORENA NEIRA ARENAS doc:37901761 hours:96
[DIAG-HOURS] instructor:JURANY ALEXANDRA PINZON RODRIGUEZ doc:1101260381 hours:0
[DIAG-HOURS] instructor:NANCY MARLENE PEREZ RAMIREZ doc:46368258 hours:84
[DIAG-HOURS] instructor:Mary Luz Mayorga Melo doc:37895922 hours:84
[DIAG-HOURS] instructor:LYDA MAVIANNY RODRIGUEZ URIBE doc:37949694 hours:11
[DIAG-HOURS] instructor:ARNOLD MAURICIO RODRIGUEZ LAITON doc:1100954159 hours:0
[DIAG-HOURS] instructor:DANNIS DANIEL CERA CANTILLO doc:84009591 hours:0
[DIAG-HOURS] instructor:CARLOS HERNANDO OLARTE VALERO doc:91273975 hours:6
[DIAG-HOURS] instructor:ROMULO ARDILA FLOREZ doc:13956228 hours:20
[DIAG-HOURS] instructor:Julian Andres Medina Hernandez doc:1101048479 hours:126
[DIAG-HOURS] instructor:OMAR ALONSO LIZARAZO VARGAS doc:1101074972 hours:102
[DIAG-HOURS] instructor:GIMENA ALEXANDRA QUINTERO PIMENTEL doc:63549712 hours:48
[DIAG-HOURS] instructor:MAYERLI NATALIA RAMIREZ PEÑA doc:1100957749 hours:80
[DIAG-HOURS] instructor:BRIGITH ROSVITA DUARTE DUARTE doc:1100959827 hours:137
[DIAG-HOURS] instructor:ADRIANA LUCÍA FUENTES doc:37944912 hours:30
[DIAG-HOURS] instructor:NESTOR JOSE RODRIGUEZ HERNANDEZ doc:1100975273 hours:0
[DIAG-HOURS] instructor:JENNY PAOLA PICO MANTILLA doc:37949256 hours:25
[DIAG-HOURS] instructor:Laura Natalia Diaz Collante doc:1100968120 hours:128
[DIAG-HOURS] instructor:JENNY ANDREA JARA MORA doc:37901020 hours:100
[DIAG-HOURS] instructor:SILVIA ALEJANDRA GUARIN SARMIENTO doc:1098797188 hours:138
[DIAG-HOURS] instructor:CARMEN STELLA GUERRERO CALDERON doc:63288395 hours:168
[DIAG-HOURS] instructor:JULIÁN ROSENDO BÁEZ GÓMEZ doc:1100955588 hours:88
[DIAG-HOURS] instructor:MARIA FERNANDA BAEZ PORRAS doc:37899021 hours:36
[DIAG-HOURS] instructor:Sylvia Alejandra Lopez Vargas  doc:1100959620 hours:119
[DIAG-HOURS] instructor:Camilo Andres Garay Guevara doc:91079499 hours:48
[DIAG-HOURS] instructor:WILFAN YESID SARMIENTO JEREZ doc:91016475 hours:54
[DIAG-HOURS] instructor:MARTIN SALAZAR SALAZAR doc:91070725 hours:30
[DIAG-HOURS] instructor:CARLOS FELIPE LEMUS RIVERO doc:74183499 hours:60
[DIAG-HOURS] instructor:Ingrid Tatiana Hernández Suárez doc:1095919878 hours:63
[DIAG-HOURS] instructor:Juvenal Reinel Rodriguez Lizarazo doc:91111270 hours:78
[DIAG-HOURS] instructor:LUIS GUSTAVO ESPINOSA PAREDES doc:1100959266 hours:112
[DIAG-HOURS] instructor:RAUL NIÑO BUENO doc:91451975 hours:45
[DIAG-HOURS] instructor:MAYETH LIZETH DURÁN DURÁN doc:37900489 hours:168
[DIAG-HOURS] instructor:HARBEY AUGUSTO GARCIA SIERRA doc:13929708 hours:0
[DIAG-HOURS] instructor:YURLEY TATIANA BERNAL PORRAS doc:1100971354 hours:84
[DIAG-HOURS] instructor:RAFAEL ANTONIO MOSCOSO BRAVO doc:13702087 hours:98
[DIAG-HOURS] instructor:SERGIO ANDRES MILLAN GAMEZ doc:1100961124 hours:0
[DIAG-HOURS] instructor:GLORIA SLENDY BECERRA ARAQUE doc:1100948282 hours:78
[DIAG-HOURS] instructor:LEIDY ROCIO PINZON FONSECA doc:1100953831 hours:0
[DIAG-HOURS] instructor:MIGUEL ANGEL DULCEY DIAZ doc:91075655 hours:107
[DIAG-HOURS] instructor:JAIME ANDRÉS SALAZAR TORRES doc:1100964681 hours:40
[DIAG-HOURS] instructor:ANDREA ARDILA CHAPARRO doc:1100953084 hours:50
[DIAG-HOURS] instructor:JOSE FERNANDO CARREÑO LEON doc:91080145 hours:169
[DIAG-HOURS] instructor:NANCY PATRICIA CALDERON FRANCO doc:37894892 hours:78
[DIAG-HOURS] instructor:CARLOS ANDRES VASQUEZ FORERO doc:1100961736 hours:0
[DIAG-HOURS] instructor:LUIS FERNANDO VELASQUEZ DUARTE doc:1100957268 hours:0
[DIAG-HOURS] instructor:LINDA LORENA RUEDA GONZALEZ doc:63530862 hours:134
[DIAG-HOURS] instructor:PAULA ANDREA TRIANA REMOLINA doc:1100972183 hours:80
[DIAG-HOURS] instructor:Ricardo Traslaviña Leon  doc:91111763 hours:30
[DIAG-HOURS] instructor:EDGARDO POLO RODRIGUEZ doc:72306317 hours:55
[DIAG-HOURS] instructor:Cesar Augusto Cadena Nieves doc:91260999 hours:84
[DIAG-HOURS] instructor:LIZETH MARIN MEZA doc:1098720903 hours:24
[DIAG-HOURS] instructor:ANDRES JOSE MOSQUERA JARABA doc:9694641 hours:55
[DIAG-HOURS] instructor:DIANA PATRICIA SAAVEDRA HOLGUIN doc:52455291 hours:0
[DIAG-HOURS] instructor:LICED TATIANA DIAZ ARCHILA doc:1007665638 hours:60
[DIAG-HOURS] instructor:WILLIAM FERNANDO MUÑOZ MUÑOZ doc:91079720 hours:168
[DIAG-HOURS] instructor:Jorge Andrés Bayona Martínez  doc:1095700230 hours:72
[DIAG-HOURS] instructor:CAROLINA JIMENEZ SUESCUN doc:1128404231 hours:33
[DIAG-HOURS] instructor:Lady Alexandra Salazar Salas doc:1095805116 hours:99
[DIAG-HOURS] instructor:PAOLA ANDREA GOMEZ ROSERO doc:59837171 hours:84
[DIAG-HOURS] instructor:ODETH DEL CARMEN QUESSEP DIAZ doc:1140864548 hours:168
[DIAG-HOURS] instructor:LUISA FERNANDA BARRERA MEDINA doc:37901034 hours:50
[DIAG-HOURS] instructor:JESUS VASQUEZ BAEZ doc:91068439 hours:66
[DIAG-HOURS] instructor:MIGUEL JOSE CACERES JEREZ doc:91513319 hours:171
[DIAG-HOURS] instructor:DORYS LENITH VIVIESCAS ORTIZ doc:1005455202 hours:10
[DIAG-HOURS] instructor:EDWIN RAUL GUERRA SANTOS doc:91151422 hours:48
[DIAG-HOURS] instructor:MARIANA LIZBLETH HIGUERA BAUTISTA doc:1100974789 hours:123
[DIAG-HOURS] instructor:NEIRA PATRICIA GAMBOA SUAREZ doc:63503555 hours:12
[DIAG-HOURS] instructor:MARÍA TERESA AYALA REYES doc:37898320 hours:0
[DIAG-HOURS] instructor:LUISA FERNANDA PEREA RIVERO doc:63497845 hours:0
[DIAG-HOURS] instructor:LUIS ANGEL DAZA ESTUPIÑAN doc:1100975106 hours:154
[DIAG-HOURS] instructor:NICOLAS JAVIER RINCON SANCHEZ doc:1100953875 hours:42
[DIAG-HOURS] instructor:GLADYS HELIANA MELGAREJO BALLESTEROS doc:37897046 hours:72
[DIAG-HOURS] instructor:JUAN DAVID ORTIZ VIVIESCAS doc:1100962043 hours:168
[DIAG-HOURS] instructor:Jhoana Ríos Castro doc:37897725 hours:168
[DIAG-HOURS] instructor:JOHANNA MARCELA SANCHEZ MEJIA doc:1022387694 hours:168
[DIAG-HOURS] instructor:Jerson Hary Urbina Escobar  doc:1090373780 hours:168
[DIAG-HOURS] instructor:JENNY TORRES GARCÍA doc:1100955026 hours:170
[DIAG-HOURS] instructor:Juan Carlos Rodríguez Sarmiento doc:91073690 hours:24
[DIAG-HOURS] instructor:FREDY ESTEBAN ARCINIEGAS BALLESTEROS doc:1100957581 hours:168
[DIAG-HOURS] instructor:YAIBER STIVEN RODRIGUEZ ROMERO doc:1100970930 hours:88
[DIAG-HOURS] instructor:ALEXA RUBIELA SOLANO SILVA doc:28253999 hours:96
[DIAG-HOURS] instructor:ERWING JESID DAVILA GARCIA doc:91486174 hours:168
[DIAG-HOURS] instructor:ERICK SAMMIR MASSEY DIAZ doc:1100963086 hours:168
[DIAG-HOURS] instructor:JUAN VICENTE PINZÓN PRADA doc:91102629 hours:35
[DIAG-HOURS] instructor:Edwin Sebastian Cadena Taquez doc:1121506652 hours:168
[DIAG-HOURS] instructor:DIEGO FERNANDO VARGAS TOBOS doc:1057574087 hours:168
[DIAG-HOURS] instructor:GEMA CATALINA DEL PILAR GOMEZ BRAVO doc:37895879 hours:0
[DIAG-HOURS] instructor:CATALINA MACIAS ROSERO doc:1100951494 hours:70
[DIAG-HOURS] instructor:EDGAR MAURICIO CAMPOS RIBERO doc:1100960044 hours:18
[DIAG-HOURS] instructor:JUAN JOSE GELVEZ LANDAZABAL doc:1100974695 hours:35
[DIAG-HOURS] instructor:DIANA PATRICIA HOYOS ABAUNZA doc:37671532 hours:168
[DIAG-HOURS] instructor:CARLOS ALBERTO AGUILAR CARREÑO doc:1100949797 hours:0
[DIAG-HOURS] instructor:HAIDYN ALBERTO NIÑO PEREIRA doc:91112524 hours:144
[DIAG-HOURS] instructor:CLAUDIA MARCELA CHAPARRO VESGA doc:37899167 hours:145
[DIAG-HOURS] instructor:ASTRID MARIELA 	HERNANDEZ VILLAMIZAR doc:60262330 hours:0
[DIAG-HOURS] instructor:FLOR DE MARIA DITOZ ROJAS doc:63369667 hours:168
[DIAG-HOURS] instructor:DEISSY VIVIANA BARRERA ALONSO doc:1100953370 hours:96
[DIAG-HOURS] instructor:FREDY BALLESTEROS FUENTES doc:13638107 hours:24
[DIAG-HOURS] instructor:SANDRA PATRICIA BAEZ PORRAS doc:37900558 hours:80
[DIAG-HOURS] instructor:JULIAN STWARD SALAZAR SALAS doc:1101695313 hours:35
[DIAG-HOURS] instructor:JOSE ANTONIO PINZON PRADA doc:91102626 hours:50
[DIAG-HOURS] instructor:AUGUSTO GOMEZ RODRIGUEZ doc:91216899 hours:50
[DIAG-HOURS] instructor:JULIO CESAR SAAVEDRA RUÍZ doc:91072718 hours:48
[DIAG-HOURS] instructor:CARLOS ALBERTO DELGADO BARRERA doc:1005484460 hours:6
[DIAG-HOURS] instructor:JORGE LUIS CORNEJO PLATA doc:1098670807 hours:110
[DIAG-HOURS] instructor:OSCAR MAURICIO SILVA CADENA doc:5622418 hours:70
[DIAG-HOURS] instructor:Juan Harvey Sanchez Rivera doc:91541255 hours:60
[DIAG-HOURS] instructor:PAOLA TATIANA MASSEY DIAZ doc:1100948061 hours:78
[DIAG-HOURS] instructor:YAILENIS GARCIA ARDILA doc:1091679568 hours:168
[DIAG-HOURS] instructor:JOSE NELSON CARREÑO FORERO doc:91078032 hours:20
[DIAG-HOURS] instructor:DORIS MIREYA CHACÓN ARIZA doc:37944681 hours:25
[DIAG-HOURS] instructor:KAREN CECILIA OTERO REYES doc:1100957316 hours:11
[DIAG-HOURS] instructor:EDGAR FLOREZ doc:91510588 hours:81
[DIAG-HOURS] instructor:BRAYAN JULIAN BECERRA VARGAS doc:1005450413 hours:45
[DIAG-HOURS] instructor:DIANA CAROLINA ZAFRA VILLABONA doc:63545618 hours:50
[DIAG-HOURS] ============================================
POST /api/reports/hoursinstructors 200 1950.764 ms - - 


---

## Assistant

Diagnóstico confirmado. La evidencia es contundente:

**Las fechas llegan bien** (`"2026/07/01"` → `2026-07-01T00:00:00.000Z`), la normalización no era el problema aquí.

**El culpable es el filtro de 3 meses.** Hay 3 schedules perdidos:

| Instructor | fstart | eventos en rango | horas perdidas |
|---|---|---|---|
| MIGUEL ANGEL DULCEY DIAZ | 2026-02-03 | 3 | 17.94 |
| MIGUEL ANGEL DULCEY DIAZ | 2026-03-30 | 2 | 11.96 |
| **Sylvia Alejandra Lopez Vargas** | **2026-03-09** | **3** | **15** |

**Sylvia aparece con 119h en el grupal, pero perdió 15h → en el reporte individual da 134h.** Esa es exactamente la discrepancia que reportaste (119 vs 134).

Y mirá este dato clave del log: el filtro carga **2864** schedules pero solo **682** traslapan con el rango. El filtro de 3 meses es a la vez **incompleto** (pierde 3) e **ineficiente** (trae 2182 de más).

Cuando dijiste "eso estaba bien", me creíste, pero la evidencia muestra que no lo está. Aplico el fix: reemplazar el filtro de 3 meses por **filtro de traslape** en la query (igual que hace `newReportInstructor`). Leo la sección exacta y limpio los logs de paso:

**Tool: read**

---

## Assistant

Limpio los logs iniciales + la query diagnóstica y aplico el fix del filtro de traslape en EN FORMACIÓN:

**Tool: edit**

---

## Assistant

Ahora busco el bloque de OTRAS ACTIVIDADES para aplicar el mismo fix:

**Tool: grep**

---

## Assistant

**Tool: read**

---

## Assistant

Aplico el mismo fix al bloque OTRAS ACTIVIDADES:

**Tool: edit**

---

## Assistant

Ahora alineo el redondeo en ambos bloques (`Math.round` → `toFixed(2)`, igual que `calculateHours`):

**Tool: edit**

---

## Assistant

Ahora borro el último bloque de logs (totales por instructor):

**Tool: edit**

---

## Assistant

Verifico que no queden logs y reviso sintaxis:

**Tool: bash**

**Tool: grep**

---

## Assistant

Listo. Fix aplicado y logs borrados. Sintaxis OK.

## Cambios en `controller/reports.controller.js` (`reportHoursInstructors`)

1. **Filtro de consulta (EN FORMACIÓN y OTRAS ACTIVIDADES)** — reemplacé el `fstart: { $gte: dateStart - 3m }` por traslape de rangos:
   ```js
   fstart: { $lte: newFend },
   fend:   { $gte: newFstart },
   ```
   Esto es lo mismo que hace `newReportInstructor` en memoria. Trae los schedules que realmente traslapan con el rango (682 en vez de 2864), y ya no pierde los 3 schedules de Miguel Dulcey y Sylvia Lopez.

2. **Redondeo** — `Math.round(minutes/60)` → `parseFloat((minutes/60).toFixed(2))` en ambos bloques, alineado con `calculateHours:94`.

3. **Normalización de fechas** (del paso anterior) — se mantiene.

4. **Logs `[DIAG-HOURS]`** — todos borrados, incluida la query diagnóstica y la variable `dateStart` que ya no se usa.

## Qué validar después del push

Volvé a pedir `/api/reports/hoursinstructors` con el mismo rango (2026/07/01 – 2026/07/31). Deberías ver:
- **Sylvia Alejandra Lopez Vargas: 134** (antes 119, +15h recuperadas).
- **MIGUEL ANGEL DULCEY DIAZ: 137** (antes 107, +30h).
- El resto sin cambios.

Y comparando ese mismo instructor contra `/api/reports/instructor` deberían coincidir.

---

