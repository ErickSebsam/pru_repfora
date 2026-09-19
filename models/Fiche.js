/**
 * @typedef {Object} Fiche
 * @property {string} number - The fiche number.
 * @property {Schema.Types.ObjectId} program - The program ID associated with the fiche.
 * @property {Schema.Types.ObjectId} owner - The instructor ID associated with the fiche.
 * @property {Schema.Types.ObjectId} coordination - The coordination ID associated with the fiche.
 * @property {number} status - The status of the fiche.
 * @property {string} type - The type of the fiche: TITULADA or COMPLEMENTARIA.
 * @property {Schema.Types.ObjectId} complementaryRequest - The complementary request associated if applicable.
 * @property {Date} createdAt - The timestamp when the fiche was created.
 * @property {Date} updatedAt - The timestamp when the fiche was last updated.
 */
import { Schema, model } from "mongoose";

const FicheSquema = new Schema(
  {
    number: {
      type: String,
      required: true,
    },
    program: {
      type: Schema.Types.ObjectId,
      ref: "Program",
      required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "Instructor",
      required: true,
    },
    coordination: {
      type: Schema.Types.ObjectId,
      ref: "Coordination",
      required: true,
    },
    fstart: {
      type: Date,
      required: true,
    },
    fend: {
      type: Date,
      required: true,
    },
    status: {
      type: Number,
      default: 0,
    },
    type: {
      type: String,
      enum: ["TITULADA", "COMPLEMENTARIA"],
      default: "TITULADA",
    },
    complementaryRequest: {
      type: Schema.Types.ObjectId,
      ref: "ComplementaryRequest",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default model("Fiche", FicheSquema);
