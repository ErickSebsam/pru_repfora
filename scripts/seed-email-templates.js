/**
 * Seed de templates de correo de complementarias.
 * Puebla la colección ComplementaryEmailTemplate con los templates actuales.
 * Solo inserta los que no existen aún (upsert por key).
 * Se puede ejecutar múltiples veces sin efectos negativos.
 */
import ComplementaryEmailTemplate from "../models/ComplementaryEmailTemplate.js";

const EMAIL_TEMPLATES_SEED = [
  {
    key: "solicitudAprobada",
    description: "Notificación al instructor cuando su solicitud es aprobada",
    audience: "INSTRUCTOR",
    variables: [
      "instructorName", "numeroSolicitud", "courseName",
      "courseCode", "courseVersion", "approvalDate"
    ],
    defaultSubject: "Solicitud Aprobada - {{courseName}}",
    defaultHtmlContent: `<html>
  <head>
    <style>
      body, p, div { font-family: Arial, sans-serif; color: #333; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
    </style>
  </head>
  <body>
    <p>Cordial saludo, <strong>{{instructorName}}</strong></p>
    <p>Nos complace informarle que su solicitud de formacion complementaria ha sido <strong>aprobada</strong>.</p>

    <p><strong>Detalles de la solicitud:</strong></p>
    <p>
      Numero de solicitud: {{numeroSolicitud}}<br>
      Curso: {{courseName}}<br>
      Codigo: {{courseCode}}<br>
      Version: {{courseVersion}}<br>
      Fecha de aprobacion: {{approvalDate}}
    </p>

    <p>Su solicitud pasara al proceso de asignacion de ficha. Se le notificara cuando se le asigne un numero de ficha.</p>

    <p style="font-size: 12px; color: #666;">Este mensaje fue enviado automaticamente por el sistema REPORA - SENA. No responda a este correo.</p>
  </body>
</html>`,
  },
  {
    key: "solicitudRechazada",
    description: "Notificación al instructor cuando su solicitud es rechazada",
    audience: "INSTRUCTOR",
    variables: [
      "instructorName", "numeroSolicitud", "courseName",
      "courseCode", "courseVersion", "rejectionDate", "observations"
    ],
    defaultSubject: "Solicitud Rechazada - {{courseName}}",
    defaultHtmlContent: `<html>
  <head>
    <style>
      body, p, div { font-family: Arial, sans-serif; color: #333; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
    </style>
  </head>
  <body>
    <p>Cordial saludo, <strong>{{instructorName}}</strong></p>
    <p>Le informamos que su solicitud de formacion complementaria ha sido <strong>rechazada</strong>.</p>

    <p><strong>Detalles de la solicitud:</strong></p>
    <p>
      Numero de solicitud: {{numeroSolicitud}}<br>
      Curso: {{courseName}}<br>
      Codigo: {{courseCode}}<br>
      Version: {{courseVersion}}<br>
      Fecha de rechazo: {{rejectionDate}}
    </p>

    <p><strong>Observaciones del revisor:</strong></p>
    <p>{{observations}}</p>

    <p>Puede editar su solicitud con las correcciones indicadas y reenviarla para una nueva revision.</p>

    <p style="font-size: 12px; color: #666;">Este mensaje fue enviado automaticamente por el sistema REPORA - SENA. No responda a este correo.</p>
  </body>
</html>`,
  },
  {
    key: "fichaAsignada",
    description: "Notificación al instructor cuando se le asigna una ficha de caracterización",
    audience: "INSTRUCTOR",
    variables: [
      "instructorName", "numeroSolicitud", "fichaCaracterizacion",
      "courseName", "courseCode", "courseVersion", "fechaInicio", "fechaFin"
    ],
    defaultSubject: "Ficha Asignada - {{numeroSolicitud}} - {{courseName}}",
    defaultHtmlContent: `<html>
  <head>
    <style>
      body, p, div { font-family: Arial, sans-serif; color: #333; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
    </style>
  </head>
  <body>
    <p>Cordial saludo, <strong>{{instructorName}}</strong></p>
    <p>Se le ha asignado la ficha de caracterizacion para su programa de formacion complementaria.</p>

    <p><strong>Detalles de la solicitud:</strong></p>
    <p>
      Numero de solicitud: {{numeroSolicitud}}<br>
      Ficha de caracterizacion: {{fichaCaracterizacion}}<br>
      Curso: {{courseName}}<br>
      Codigo: {{courseCode}}<br>
      Version: {{courseVersion}}<br>
      Fecha de inicio: {{fechaInicio}}<br>
      Fecha de fin: {{fechaFin}}
    </p>

    <p>Su solicitud continuara con el proceso de programacion horaria.</p>

    <p style="font-size: 12px; color: #666;">Este mensaje fue enviado automaticamente por el sistema REPORA - SENA. No responda a este correo.</p>
  </body>
</html>`,
  },
  {
    key: "fichaCancelada",
    description: "Notificación al instructor cuando su ficha complementaria es cancelada",
    audience: "INSTRUCTOR",
    variables: [
      "instructorName", "numeroSolicitud", "fichaNumber", "courseName",
      "courseCode", "courseVersion", "previousState", "cancellationDate", "observations"
    ],
    defaultSubject: "Ficha Cancelada - {{fichaNumber}} - {{courseName}}",
    defaultHtmlContent: `<html>
  <head>
    <style>
      body, p, div { font-family: Arial, sans-serif; color: #333; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
    </style>
  </head>
  <body>
    <p>Cordial saludo, <strong>{{instructorName}}</strong></p>
    <p>Le informamos que la ficha complementaria asociada a su solicitud ha sido <strong>cancelada</strong>.</p>

    <p><strong>Detalles de la solicitud:</strong></p>
    <p>
      Numero de solicitud: {{numeroSolicitud}}<br>
      Curso: {{courseName}}<br>
      Codigo: {{courseCode}}<br>
      Version: {{courseVersion}}
      {{#if fichaNumber}}<br>Ficha: {{fichaNumber}}{{/if}}<br>
      Estado anterior: {{previousState}}<br>
      Fecha de cancelacion: {{cancellationDate}}
    </p>

    {{#if observations}}
    <p><strong>Motivo de la cancelacion:</strong></p>
    <p>{{observations}}</p>
    {{/if}}

    <p>Si tiene inquietudes sobre esta cancelacion, comuniquese con el coordinador de complementarias.</p>

    <p style="font-size: 12px; color: #666;">Este mensaje fue enviado automaticamente por el sistema REPORA - SENA. No responda a este correo.</p>
  </body>
</html>`,
  },
  {
    key: "complementariaProgramada",
    description: "Notificación al instructor cuando su complementaria es programada con horario",
    audience: "INSTRUCTOR",
    variables: [
      "instructorName", "numeroSolicitud", "courseName", "courseCode",
      "courseVersion", "fechaInicio", "fechaFin", "horaInicio", "horaFin",
      "dias", "totalHoras", "ambienteNombre"
    ],
    defaultSubject: "Complementaria Programada - {{numeroSolicitud}} - {{courseName}}",
    defaultHtmlContent: `<html>
  <head>
    <style>
      body, p, div { font-family: Arial, sans-serif; color: #333; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
    </style>
  </head>
  <body>
    <p>Cordial saludo, <strong>{{instructorName}}</strong></p>
    <p>Le informamos que su formacion complementaria ha sido <strong>programada</strong> exitosamente.</p>

    <p><strong>Detalles de la programacion:</strong></p>
    <p>
      Numero de solicitud: {{numeroSolicitud}}<br>
      Curso: {{courseName}}<br>
      Codigo: {{courseCode}}<br>
      Version: {{courseVersion}}
    </p>

    <p><strong>Horario asignado:</strong></p>
    <p>
      Fecha de inicio: {{fechaInicio}}<br>
      Fecha de fin: {{fechaFin}}<br>
      Horario: {{horaInicio}} - {{horaFin}}<br>
      Dias: {{dias}}<br>
      Total horas: {{totalHoras}} horas
      {{#if ambienteNombre}}<br>Ambiente: {{ambienteNombre}}{{/if}}
    </p>

    <p>Su complementaria se encuentra lista para iniciar segun las fechas y horarios indicados.</p>

    <p style="font-size: 12px; color: #666;">Este mensaje fue enviado automaticamente por el sistema REPORA - SENA. No responda a este correo.</p>
  </body>
</html>`,
  },
  {
    key: "fichaEnEjecucion",
    description: "Notificación al instructor cuando su ficha complementaria pasa a estado EJECUCION",
    audience: "INSTRUCTOR",
    variables: [
      "instructorName", "fichaNumber", "numeroSolicitud", "courseName",
      "courseCode", "courseVersion", "fechaInicio", "fechaFin", "executionDate"
    ],
    defaultSubject: "Ficha en Ejecución - {{fichaNumber}} - {{courseName}}",
    defaultHtmlContent: `<html>
  <head>
    <style>
      body, p, div { font-family: Arial, sans-serif; color: #333; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
    </style>
  </head>
  <body>
    <p>Cordial saludo, <strong>{{instructorName}}</strong></p>
    <p>Le informamos que su formacion complementaria ha pasado a estado <strong>EJECUCION</strong>. A partir de este momento puede empezar a subir los eventos mensuales correspondientes.</p>

    <p><strong>Importante:</strong> Debe registrar los eventos de cada mes a traves del modulo de complementarias para llevar el registro de horas ejecutadas.</p>

    <p><strong>Datos de la ficha:</strong></p>
    <p>
      {{#if fichaNumber}}Numero de ficha: {{fichaNumber}}<br>{{/if}}
      Numero de solicitud: {{numeroSolicitud}}<br>
      Curso: {{courseName}}<br>
      Codigo: {{courseCode}}<br>
      Version: {{courseVersion}}
    </p>

    <p><strong>Fechas:</strong></p>
    <p>
      Fecha de inicio: {{fechaInicio}}<br>
      Fecha de fin: {{fechaFin}}<br>
      Fecha de inicio de ejecucion: {{executionDate}}
    </p>

    <p>Si tiene alguna inquietud, comuniquese con el coordinador de programas especiales.</p>

    <p style="font-size: 12px; color: #666;">Este mensaje fue enviado automaticamente por el sistema REPORA - SENA. No responda a este correo.</p>
  </body>
</html>`,
  },
  {
    key: "ampliacionResuelta",
    description: "Notificación al instructor cuando su solicitud de ampliación de ficha es resuelta (aprobada o rechazada)",
    audience: "INSTRUCTOR",
    variables: [
      "aprobada", "fichaNumber", "numeroSolicitud", "courseName",
      "courseCode", "courseVersion", "resolutionDate", "observations"
    ],
    defaultSubject: "Ampliacion {{#if aprobada}}Aprobada{{else}}Rechazada{{/if}} - {{fichaNumber}} - {{courseName}}",
    defaultHtmlContent: `<html>
  <head>
    <style>
      body, p, div { font-family: Arial, sans-serif; color: #333; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
    </style>
  </head>
  <body>
    {{#if aprobada}}
    <p>Cordial saludo,</p>
    <p>Le informamos que su solicitud de <strong>ampliacion de fecha</strong> ha sido <strong>aprobada</strong>.</p>

    <p><strong>Detalles de la ficha:</strong></p>
    <p>
      {{#if fichaNumber}}Numero de ficha: {{fichaNumber}}<br>{{/if}}
      {{#if numeroSolicitud}}Numero de solicitud: {{numeroSolicitud}}<br>{{/if}}
      Curso: {{courseName}}<br>
      Codigo: {{courseCode}}<br>
      Version: {{courseVersion}}<br>
      Fecha de aprobacion: {{resolutionDate}}
    </p>

    <p>Por favor ingrese al sistema para reprogramar los horarios de la ficha con la nueva fecha de finalizacion.</p>
    {{else}}
    <p>Cordial saludo,</p>
    <p>Le informamos que su solicitud de <strong>ampliacion de fecha</strong> ha sido <strong>rechazada</strong>.</p>

    <p><strong>Detalles de la ficha:</strong></p>
    <p>
      {{#if fichaNumber}}Numero de ficha: {{fichaNumber}}<br>{{/if}}
      {{#if numeroSolicitud}}Numero de solicitud: {{numeroSolicitud}}<br>{{/if}}
      Curso: {{courseName}}<br>
      Codigo: {{courseCode}}<br>
      Version: {{courseVersion}}<br>
      Fecha de resolucion: {{resolutionDate}}
    </p>

    <p><strong>Motivo del rechazo:</strong></p>
    <p>{{observations}}</p>

    <p>Si considera que la situacion lo amerita, puede realizar una nueva solicitud de ampliacion a traves del sistema.</p>
    {{/if}}

    <p style="font-size: 12px; color: #666;">Este mensaje fue enviado automaticamente por el sistema REPORA - SENA. No responda a este correo.</p>
  </body>
</html>`,
  },
  {
    key: "nuevaSolicitud",
    description: "Notificación al coordinador/programadores cuando un instructor registra una nueva solicitud",
    audience: "COORDINADOR_PROGRAMADOR",
    variables: [
      "coordinatorName", "instructorName", "courseName", "courseCode",
      "courseVersion", "requestDate", "municipio", "numAprendices"
    ],
    defaultSubject: "Nueva Solicitud de Complementaria - {{courseName}}",
    defaultHtmlContent: `<html>
  <head>
    <style>
      body, p, div { font-family: Arial, sans-serif; color: #333; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
    </style>
  </head>
  <body>
    <p>Cordial saludo, <strong>{{coordinatorName}}</strong></p>
    <p>Se ha registrado una nueva solicitud de formacion complementaria por parte del instructor <strong>{{instructorName}}</strong>.</p>

    <p><strong>Detalles de la solicitud:</strong></p>
    <p>
      Curso: {{courseName}}<br>
      Codigo: {{courseCode}}<br>
      Version: {{courseVersion}}<br>
      Instructor: {{instructorName}}<br>
      Fecha de solicitud: {{requestDate}}
      {{#if municipio}}<br>Municipio: {{municipio}}{{/if}}
      {{#if numAprendices}}<br>No. Aprendices: {{numAprendices}}{{/if}}
    </p>

    <p>Por favor ingrese al sistema para revisar y aprobar o rechazar la solicitud.</p>

    <p style="font-size: 12px; color: #666;">Este mensaje fue enviado automaticamente por el sistema REPORA - SENA. No responda a este correo.</p>
  </body>
</html>`,
  },
  {
    key: "solicitudModificada",
    description: "Notificación al coordinador/programadores cuando un instructor reenvía una solicitud modificada",
    audience: "COORDINADOR_PROGRAMADOR",
    variables: [
      "instructorName", "numeroSolicitud", "resubmitDate", "courseName",
      "courseCode", "courseVersion", "prfDuracionMaxima", "tipoPrograma",
      "tipoPoblacion", "fechaInicio", "fechaFin", "fechaInscripcionInicio",
      "fechaInscripcionFin", "fechaMatriculaInicio", "fechaMatriculaFin",
      "municipio", "vereda", "direccion", "ambienteNombre", "ambienteDireccion",
      "nombreEmpresa", "nitEmpresa", "contactoEmpresa", "telefonoEmpresa",
      "numAprendices", "requisitosIngreso", "recursosNecesarios", "proyectoAsociado",
      "competencias", "resultados", "supervisorNombre"
    ],
    defaultSubject: "Solicitud Modificada y Reenviada - {{courseName}}",
    defaultHtmlContent: `<html>
  <head>
    <style>
      body, p, div { font-family: Arial, sans-serif; color: #333; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
    </style>
  </head>
  <body>
    <p>Cordial saludo,</p>
    <p>El instructor <strong>{{instructorName}}</strong> ha modificado y reenviado la solicitud de formacion complementaria que habia sido rechazada. A continuacion se muestran los datos completos actualizados de la solicitud.</p>

    <p><strong>Datos de la Solicitud</strong></p>
    <p>
      Numero de solicitud: {{numeroSolicitud}}<br>
      Instructor: {{instructorName}}<br>
      Fecha de reenvio: {{resubmitDate}}
    </p>

    <p><strong>Datos del Curso</strong></p>
    <p>
      Curso: {{courseName}}<br>
      Codigo: {{courseCode}}<br>
      Version: {{courseVersion}}<br>
      Duracion maxima (horas): {{prfDuracionMaxima}}<br>
      Tipo de programa: {{tipoPrograma}}<br>
      Tipo de poblacion: {{tipoPoblacion}}
    </p>

    <p><strong>Fechas del Programa</strong></p>
    <p>
      Fecha de inicio: {{fechaInicio}}<br>
      Fecha de finalizacion: {{fechaFin}}<br>
      Fecha de inscripcion inicio: {{fechaInscripcionInicio}}<br>
      Fecha de inscripcion fin: {{fechaInscripcionFin}}<br>
      Matricula inicio: {{fechaMatriculaInicio}}<br>
      Matricula fin: {{fechaMatriculaFin}}
    </p>

    <p><strong>Ubicacion</strong></p>
    <p>
      Municipio: {{municipio}}
      {{#if vereda}}<br>Vereda: {{vereda}}{{/if}}<br>
      Direccion: {{direccion}}
      {{#if ambienteNombre}}<br>Ambiente: {{ambienteNombre}}{{/if}}
      {{#if ambienteDireccion}}<br>Direccion ambiente: {{ambienteDireccion}}{{/if}}
    </p>

    {{#if nombreEmpresa}}
    <p><strong>Empresa Asociada</strong></p>
    <p>
      Nombre empresa: {{nombreEmpresa}}
      {{#if nitEmpresa}}<br>NIT empresa: {{nitEmpresa}}{{/if}}
      {{#if contactoEmpresa}}<br>Contacto empresa: {{contactoEmpresa}}{{/if}}
      {{#if telefonoEmpresa}}<br>Telefono empresa: {{telefonoEmpresa}}{{/if}}
    </p>
    {{/if}}

    <p><strong>Aprendices y Requisitos</strong></p>
    <p>
      No. Aprendices: {{numAprendices}}
      {{#if requisitosIngreso}}<br>Requisitos de ingreso: {{requisitosIngreso}}{{/if}}
      {{#if recursosNecesarios}}<br>Recursos necesarios: {{recursosNecesarios}}{{/if}}
      {{#if proyectoAsociado}}<br>Proyecto asociado: {{proyectoAsociado}}{{/if}}
    </p>

    {{#if competencias}}
    <p><strong>Competencias</strong></p>
    {{#each competencias}}
    <p>
      {{nombre}}
      {{#if codigo}} (Codigo: {{codigo}}){{/if}}
      {{#if horas}} — {{horas}} horas{{/if}}
      {{#if criterios}}<br>Criterios: {{#each criterios}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
    </p>
    {{/each}}
    {{/if}}

    {{#if resultados}}
    <p><strong>Resultados de Aprendizaje</strong></p>
    {{#each resultados}}
    <p>- {{this}}</p>
    {{/each}}
    {{/if}}

    {{#if supervisorNombre}}
    <p><strong>Supervisor</strong></p>
    <p>Nombre supervisor: {{supervisorNombre}}</p>
    {{/if}}

    <p>Por favor ingrese al sistema para revisar y aprobar o rechazar la solicitud modificada.</p>

    <p style="font-size: 12px; color: #666;">Este mensaje fue enviado automaticamente por el sistema REPORA - SENA. No responda a este correo.</p>
  </body>
</html>`,
  },
  {
    key: "ampliacionSolicitada",
    description: "Notificación al coordinador/programadores cuando un instructor solicita ampliación de ficha",
    audience: "COORDINADOR_PROGRAMADOR",
    variables: [
      "coordinatorName", "instructorName", "fichaNumber", "numeroSolicitud",
      "courseName", "courseCode", "courseVersion", "requestDate", "fechaFinActual"
    ],
    defaultSubject: "Solicitud de Ampliacion - {{fichaNumber}} - {{courseName}}",
    defaultHtmlContent: `<html>
  <head>
    <style>
      body, p, div { font-family: Arial, sans-serif; color: #333; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
    </style>
  </head>
  <body>
    <p>Cordial saludo, <strong>{{coordinatorName}}</strong></p>
    <p>El instructor <strong>{{instructorName}}</strong> ha solicitado una <strong>ampliacion de fecha</strong> para su ficha complementaria.</p>

    <p><strong>Detalles de la ficha:</strong></p>
    <p>
      {{#if fichaNumber}}Numero de ficha: {{fichaNumber}}<br>{{/if}}
      {{#if numeroSolicitud}}Numero de solicitud: {{numeroSolicitud}}<br>{{/if}}
      Curso: {{courseName}}<br>
      Codigo: {{courseCode}}<br>
      Version: {{courseVersion}}<br>
      Fecha de finalizacion actual: {{fechaFinActual}}<br>
      Fecha de solicitud de ampliacion: {{requestDate}}
    </p>

    <p>El instructor ha enviado sus observaciones con el motivo de la ampliacion. Por favor ingrese al sistema para revisar y aprobar o rechazar la solicitud.</p>

    <p style="font-size: 12px; color: #666;">Este mensaje fue enviado automaticamente por el sistema REPORA - SENA. No responda a este correo.</p>
  </body>
</html>`,
  },
  {
    key: "fichaMatriculada",
    description: "Notificación al coordinador/programador cuando una ficha es matriculada",
    audience: "COORDINADOR_PROGRAMADOR",
    variables: [
      "fichaNumber", "fechaCreacion", "courseName", "courseCode",
      "courseVersion", "duracion", "fechaInicio", "fechaFin", "cupo",
      "municipio", "ambiente", "horario", "codigoSolicitud",
      "fechaLimiteInscripcion", "instructorNombre", "instructorCorreo",
      "numeroActaTrazabilidad"
    ],
    defaultSubject: "Ficha Matriculada - {{fichaNumber}} - {{courseName}}",
    defaultHtmlContent: `<html>
  <head>
    <style>
      body, p, div { font-family: Arial, sans-serif; color: #333; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
      table { width: 100%; max-width: 600px; border-collapse: collapse; margin-top: 15px; }
      th, td { border: 1px solid #000000; padding: 10px; text-align: center; }
      .label-col { width: 50%; font-weight: bold; }
      .value-col { width: 50%; }
      .highlight { background-color: #ffff00; }
    </style>
  </head>
  <body>
    <p>Cordial saludo,</p>
    <p>Se ha completado el proceso de inscripción y se ha matriculado la siguiente ficha de formación complementaria:</p>

    <table>
      <tbody>
        <tr>
          <td class="label-col">Numero De La Ficha</td>
          <td class="value-col">{{fichaNumber}}</td>
        </tr>
        <tr>
          <td class="label-col">Fecha de creación</td>
          <td class="value-col">{{fechaCreacion}}</td>
        </tr>
        <tr>
          <td class="label-col">Nombre del programa de formación</td>
          <td class="value-col">{{courseName}}</td>
        </tr>
        <tr>
          <td class="label-col">Código programa en Sofía Plus</td>
          <td class="value-col">{{courseCode}}</td>
        </tr>
        <tr>
          <td class="label-col">Versión</td>
          <td class="value-col">{{courseVersion}}</td>
        </tr>
        <tr>
          <td class="label-col">Duración (horas)</td>
          <td class="value-col">{{duracion}}</td>
        </tr>
        <tr>
          <td class="label-col">Fecha inicio</td>
          <td class="value-col">{{fechaInicio}}</td>
        </tr>
        <tr>
          <td class="label-col">Fecha fin</td>
          <td class="value-col">{{fechaFin}}</td>
        </tr>
        <tr>
          <td class="label-col">Cupo</td>
          <td class="value-col">{{cupo}}</td>
        </tr>
        <tr>
          <td class="label-col">Municipio</td>
          <td class="value-col">{{municipio}}</td>
        </tr>
        <tr>
          <td class="label-col">Ambiente</td>
          <td class="value-col">{{ambiente}}</td>
        </tr>
        <tr>
          <td class="label-col">Horario</td>
          <td class="value-col">{{{horario}}}</td>
        </tr>
        <tr class="highlight">
          <td class="label-col">Código de empresa-solicitud</td>
          <td class="value-col">{{codigoSolicitud}}</td>
        </tr>
        <tr class="highlight">
          <td class="label-col">Fecha límite de inscripción</td>
          <td class="value-col">{{fechaLimiteInscripcion}}</td>
        </tr>
        <tr>
          <td class="label-col">instructor</td>
          <td class="value-col">{{instructorNombre}}</td>
        </tr>
        <tr>
          <td class="label-col">correo</td>
          <td class="value-col"><a href="mailto:{{instructorCorreo}}">{{instructorCorreo}}</a></td>
    <p>Por favor ingrese al sistema para revisar y aprobar o rechazar la solicitud modificada.</p>

    <p style="font-size: 12px; color: #666;">Este mensaje fue enviado automaticamente por el sistema REPORA - SENA. No responda a este correo.</p>
  </body>
</html>`,
  },
  {
    key: "ampliacionSolicitada",
    description: "Notificación al coordinador/programadores cuando un instructor solicita ampliación de ficha",
    audience: "COORDINADOR_PROGRAMADOR",
    variables: [
      "coordinatorName", "instructorName", "fichaNumber", "numeroSolicitud",
      "courseName", "courseCode", "courseVersion", "requestDate", "fechaFinActual"
    ],
    defaultSubject: "Solicitud de Ampliacion - {{fichaNumber}} - {{courseName}}",
    defaultHtmlContent: `<html>
  <head>
    <style>
      body, p, div { font-family: Arial, sans-serif; color: #333; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
    </style>
  </head>
  <body>
    <p>Cordial saludo, <strong>{{coordinatorName}}</strong></p>
    <p>El instructor <strong>{{instructorName}}</strong> ha solicitado una <strong>ampliacion de fecha</strong> para su ficha complementaria.</p>

    <p><strong>Detalles de la ficha:</strong></p>
    <p>
      {{#if fichaNumber}}Numero de ficha: {{fichaNumber}}<br>{{/if}}
      {{#if numeroSolicitud}}Numero de solicitud: {{numeroSolicitud}}<br>{{/if}}
      Curso: {{courseName}}<br>
      Codigo: {{courseCode}}<br>
      Version: {{courseVersion}}<br>
      Fecha de finalizacion actual: {{fechaFinActual}}<br>
      Fecha de solicitud de ampliacion: {{requestDate}}
    </p>

    <p>El instructor ha enviado sus observaciones con el motivo de la ampliacion. Por favor ingrese al sistema para revisar y aprobar o rechazar la solicitud.</p>

    <p style="font-size: 12px; color: #666;">Este mensaje fue enviado automaticamente por el sistema REPORA - SENA. No responda a este correo.</p>
  </body>
</html>`,
  },
  {
    key: "fichaMatriculada",
    description: "Notificación al coordinador/programador cuando una ficha es matriculada",
    audience: "COORDINADOR_PROGRAMADOR",
    variables: [
      "fichaNumber", "fechaCreacion", "courseName", "courseCode",
      "courseVersion", "duracion", "fechaInicio", "fechaFin", "cupo",
      "municipio", "ambiente", "horario", "codigoSolicitud",
      "fechaLimiteInscripcion", "instructorNombre", "instructorCorreo",
      "numeroActaTrazabilidad"
    ],
    defaultSubject: "Ficha Matriculada - {{fichaNumber}} - {{courseName}}",
    defaultHtmlContent: `<html>
  <head>
    <style>
      body, p, div { font-family: Arial, sans-serif; color: #333; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
      table { width: 100%; max-width: 600px; border-collapse: collapse; margin-top: 15px; }
      th, td { border: 1px solid #000000; padding: 10px; text-align: center; }
      .label-col { width: 50%; font-weight: bold; }
      .value-col { width: 50%; }
      .highlight { background-color: #ffff00; }
    </style>
  </head>
  <body>
    <p>Cordial saludo,</p>
    <p>Se ha completado el proceso de inscripción y se ha matriculado la siguiente ficha de formación complementaria:</p>

    <table>
      <tbody>
        <tr>
          <td class="label-col">Numero De La Ficha</td>
          <td class="value-col">{{fichaNumber}}</td>
        </tr>
        <tr>
          <td class="label-col">Fecha de creación</td>
          <td class="value-col">{{fechaCreacion}}</td>
        </tr>
        <tr>
          <td class="label-col">Nombre del programa de formación</td>
          <td class="value-col">{{courseName}}</td>
        </tr>
        <tr>
          <td class="label-col">Código programa en Sofía Plus</td>
          <td class="value-col">{{courseCode}}</td>
        </tr>
        <tr>
          <td class="label-col">Versión</td>
          <td class="value-col">{{courseVersion}}</td>
        </tr>
        <tr>
          <td class="label-col">Duración (horas)</td>
          <td class="value-col">{{duracion}}</td>
        </tr>
        <tr>
          <td class="label-col">Fecha inicio</td>
          <td class="value-col">{{fechaInicio}}</td>
        </tr>
        <tr>
          <td class="label-col">Fecha fin</td>
          <td class="value-col">{{fechaFin}}</td>
        </tr>
        <tr>
          <td class="label-col">Cupo</td>
          <td class="value-col">{{cupo}}</td>
        </tr>
        <tr>
          <td class="label-col">Municipio</td>
          <td class="value-col">{{municipio}}</td>
        </tr>
        <tr>
          <td class="label-col">Ambiente</td>
          <td class="value-col">{{ambiente}}</td>
        </tr>
        <tr>
          <td class="label-col">Horario</td>
          <td class="value-col">{{{horario}}}</td>
        </tr>
        <tr class="highlight">
          <td class="label-col">Código de empresa-solicitud</td>
          <td class="value-col">{{codigoSolicitud}}</td>
        </tr>
        <tr class="highlight">
          <td class="label-col">Fecha límite de inscripción</td>
          <td class="value-col">{{fechaLimiteInscripcion}}</td>
        </tr>
        <tr>
          <td class="label-col">instructor</td>
          <td class="value-col">{{instructorNombre}}</td>
        </tr>
        <tr>
          <td class="label-col">correo</td>
          <td class="value-col"><a href="mailto:{{instructorCorreo}}">{{instructorCorreo}}</a></td>
        </tr>
        <tr>
          <td class="label-col">Numero de Acta de Trazabilidad</td>
          <td class="value-col">{{numeroActaTrazabilidad}}</td>
        </tr>
      </tbody>
    </table>

    <br>
    <p style="font-size: 12px; color: #666;">Este mensaje fue enviado automáticamente por el sistema REPFORA - SENA. No responda a este correo.</p>
  </body>
</html>`,
  },
  {
    key: "juiciosPendientesCoordinador",
    description: "Notificación al coordinador con la tabla de juicios pendientes del DF-14",
    audience: "COORDINADOR_PROGRAMADOR",
    variables: ["coordinationName", "items"],
    defaultSubject: "Resumen Juicios Pendientes DF-14 - {{coordinationName}}",
    isSegmented: true,
    defaultSegments: {
      introMessage: `<p>Cordial saludo, <strong>Estimado(a) Coordinador(a)</strong></p>
<p>Se ha procesado el reporte <strong>DF-14</strong> (Matriculados Detallados) de SOFIA Plus para la coordinación <strong>{{coordinationName}}</strong>.</p>
<p>A continuación se consolidan las fichas complementarias en estado <em>terminada por fecha</em> que presentan aprendices con <strong>juicios de evaluación pendientes</strong>:</p>`,
      tableSection: `<div class="table-container">
  <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; font-size: 13px;">
    <thead>
      <tr style="background-color: #0056b3; color: white;">
        <th style="text-align: left; padding: 10px;">Instructor</th>
        <th style="text-align: left; padding: 10px;">Ficha</th>
        <th style="text-align: center; padding: 10px;">Aprendices pendientes por juicios (# aprendices)</th>
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td style="padding: 8px 10px; border: 1px solid #ddd;"><strong>{{this.instructorName}}</strong></td>
        <td style="padding: 8px 10px; border: 1px solid #ddd;">{{this.fichaNumber}}</td>
        <td style="padding: 8px 10px; border: 1px solid #ddd; text-align: center; color: #d9534f; font-weight: bold;">{{this.enFormacion}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>
</div>`,
      closingMessage: `<p>Le solicitamos realizar el seguimiento correspondiente con los instructores a cargo para garantizar el registro de los juicios a la mayor brevedad posible.</p>
<p style="font-size: 12px; color: #666; margin-top: 25px;">Este mensaje fue generado automáticamente por el sistema REPFORA - SENA. No responda a este correo.</p>`
    },
    defaultHtmlContent: `<html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; color: #333; font-size: 14px; line-height: 1.5; }
    </style>
  </head>
  <body>
    <p>Cordial saludo, <strong>Estimado(a) Coordinador(a)</strong></p>
    <p>Se ha procesado el reporte <strong>DF-14</strong> (Matriculados Detallados) de SOFIA Plus para la coordinación <strong>{{coordinationName}}</strong>.</p>
    <p>A continuación se consolidan las fichas complementarias en estado <em>terminada por fecha</em> que presentan aprendices con <strong>juicios de evaluación pendientes</strong>:</p>
    <div class="table-container">
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; font-size: 13px;">
        <thead>
          <tr style="background-color: #0056b3; color: white;">
            <th style="text-align: left; padding: 10px;">Instructor</th>
            <th style="text-align: left; padding: 10px;">Ficha</th>
            <th style="text-align: center; padding: 10px;">Aprendices pendientes por juicios (# aprendices)</th>
          </tr>
        </thead>
        <tbody>
          {{#each items}}
          <tr>
            <td style="padding: 8px 10px; border: 1px solid #ddd;"><strong>{{this.instructorName}}</strong></td>
            <td style="padding: 8px 10px; border: 1px solid #ddd;">{{this.fichaNumber}}</td>
            <td style="padding: 8px 10px; border: 1px solid #ddd; text-align: center; color: #d9534f; font-weight: bold;">{{this.enFormacion}}</td>
          </tr>
          {{/each}}
        </tbody>
      </table>
    </div>
    <p>Le solicitamos realizar el seguimiento correspondiente con los instructores a cargo para garantizar el registro de los juicios a la mayor brevedad posible.</p>
    <p style="font-size: 12px; color: #666; margin-top: 25px;">Este mensaje fue generado automáticamente por el sistema REPFORA - SENA. No responda a este correo.</p>
  </body>
</html>`
  }
];

/**
 * Ejecuta el seed de templates de correo de complementarias.
 * - Inserta los templates que no existan aún.
 * - Actualiza `defaultHtmlContent`, `defaultSubject` y `variables` en los ya existentes.
 * Requiere conexión a MongoDB ya establecida.
 */
export async function seedEmailTemplates() {
  try {
    let insertados = 0;
    let actualizados = 0;

    for (const tpl of EMAIL_TEMPLATES_SEED) {
      const existe = await ComplementaryEmailTemplate.findOne({ key: tpl.key });
      
      const updateData = {
        description: tpl.description,
        audience: tpl.audience,
        variables: tpl.variables,
        defaultSubject: tpl.defaultSubject,
        defaultHtmlContent: tpl.defaultHtmlContent,
        isSegmented: true,
        defaultSegments: tpl.defaultSegments || { introMessage: "", tableSection: "", closingMessage: "" }
      };

      if (!existe) {
        await ComplementaryEmailTemplate.create({
          key: tpl.key,
          ...updateData,
          subject: tpl.defaultSubject,
          htmlContent: tpl.defaultHtmlContent,
          segments: tpl.defaultSegments || { introMessage: "", tableSection: "", closingMessage: "" }
        });
        insertados++;
        console.log(`[SEED-EMAIL-TEMPLATES] Insertado: ${tpl.key}`);
      } else {
        const esDefaultSubject = existe.subject === existe.defaultSubject;
        const esDefaultHtml = existe.htmlContent === existe.defaultHtmlContent;

        if (esDefaultSubject) updateData.subject = tpl.defaultSubject;
        if (esDefaultHtml) updateData.htmlContent = tpl.defaultHtmlContent;
        if (!existe.isSegmented || !existe.segments || (!existe.segments.introMessage && !existe.segments.tableSection)) {
          updateData.segments = tpl.defaultSegments || { introMessage: "", tableSection: "", closingMessage: "" };
        }

        await ComplementaryEmailTemplate.updateOne({ key: tpl.key }, { $set: updateData });
        actualizados++;
        console.log(`[SEED-EMAIL-TEMPLATES] Actualizado: ${tpl.key}`);
      }
    }

    console.log(`[SEED-EMAIL-TEMPLATES] Completado. Insertados: ${insertados}, Actualizados: ${actualizados}`);
  } catch (err) {
    console.error("[SEED-EMAIL-TEMPLATES] Error durante el seed:", err.message);
  }
}

export { EMAIL_TEMPLATES_SEED };
