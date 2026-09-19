/**
 * @typedef {Object} ComplementaryEmailTemplate
 * @property {string} key - Identificador único del template (p.ej. "solicitudAprobada")
 * @property {string} subject - Asunto del correo (editable)
 * @property {string} htmlContent - Cuerpo HTML con sintaxis Handlebars (editable)
 * @property {string} defaultSubject - Asunto original (no editable, para restaurar)
 * @property {string} defaultHtmlContent - HTML original (no editable, para restaurar)
 * @property {string} description - Descripción amigable del template
 * @property {string} audience - "INSTRUCTOR" | "COORDINADOR_PROGRAMADOR"
 * @property {string[]} variables - Lista de variables Handlebars disponibles
 * @property {number} status - 0 = activo
 */
import { Schema, model } from "mongoose";

const ComplementaryEmailTemplateSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
    },
    htmlContent: {
      type: String,
      required: true,
    },
    // Valores originales para poder restaurar
    defaultSubject: {
      type: String,
      required: true,
    },
    defaultHtmlContent: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    // Audiencia del template
    audience: {
      type: String,
      required: true,
      enum: ["INSTRUCTOR", "COORDINADOR_PROGRAMADOR"],
    },
    // Variables Handlebars disponibles (documentación)
    variables: {
      type: [String],
      default: [],
    },
    // Soporte para plantillas segmentadas (protección de tablas/etiquetas técnicas)
    isSegmented: {
      type: Boolean,
      default: true,
    },
    segments: {
      introMessage: { type: String, default: "" },
      tableSection: { type: String, default: "" },
      closingMessage: { type: String, default: "" },
    },
    defaultSegments: {
      introMessage: { type: String, default: "" },
      tableSection: { type: String, default: "" },
      closingMessage: { type: String, default: "" },
    },
    status: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default model("ComplementaryEmailTemplate", ComplementaryEmailTemplateSchema);
