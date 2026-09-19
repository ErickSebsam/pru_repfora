import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  description: { type: String },
  hours: {
    direct: { type: Number, default: 0 },
    independent: { type: Number, default: 0 }
  },
  learningEvidences: [String],
  didacticStrategies: [String],
  environment: {
    type: { type: String },
    materials: [String]
  },
  // cambion efectuado por luis llanos
  materials: [String],
  trainingMaterials: [String],
  learningEnvironment: { type: String },
  observations: { type: String },
  // implementacion de luis llanos (definicion de esquema para persistencia de comentarios en actividades)
  comments: [
    {
      _id: false,
      id: { type: String },
      text: { type: String },
      author: { type: String },
      authorEmail: { type: String },
      role: { type: String },
      createdAt: { type: String }
    }
  ],
  // fin de implementacion luis llanos
  reviewed: { type: Boolean, default: false },
  isScheduledInCalendar: { type: Boolean, default: false },
  suggestedInstructor: {
    id: { type: String },
    name: { type: String },
    type: { type: String },
    assignmentStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'rejected'],
      default: 'pending'
    },
    isActive: { type: Boolean, default: true }
  },
  instructorHistory: [
    {
      _id: false,
      id: { type: String },
      name: { type: String },
      type: { type: String },
      assignmentStatus: { type: String },
      isActive: { type: Boolean, default: false }
    }
  ],
  scheduleDetails: {
    assignedDays: [String],
    shift: {
      type: String
    },
    tstart: { type: String },
    tend: { type: String },
    startDate: { type: String },
    selectedDays: [Number],
    vacation: { type: mongoose.Schema.Types.Mixed },
    hoursPerDay: { type: Number },
    calendarNotes: { type: String },
    isPublished: { type: Boolean, default: false }
  }
}, { _id: false });

const rapSchema = new mongoose.Schema({
  description: { type: String, required: true },
  evaluationCriteria: [String],
  projectActivity: { type: String },
  pedagogicalActivities: [activitySchema]
}, { _id: false });

const competenceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true },
  totalCompetenceHours: { type: Number, required: true },
  knowledge: {
    conceptsAndPrinciples: [String],
    processes: [String]
  },
  evaluationCriteria: [String],
  academicRequirements: { type: String, default: "" },
  learningOutcomes: [rapSchema]
}, { _id: false });

const phaseSchema = new mongoose.Schema({
  phase: {
    type: String,
    enum: ['INDUCCION', 'ANALYSIS', 'PLANNING', 'EXECUTION', 'EVALUATION', 'ETAPA_PRODUCTIVA'],
    required: true
  },
  projectActivity: { type: String },
  competencies: [competenceSchema]
}, { _id: false });

const planningSchema = new mongoose.Schema({
  pedagogicalPlanning: {
    metadata: {
      programName: { type: String, required: true },
      programCode: { type: String, required: true },
      version: { type: String },
      center: { type: String },
      totalHours: { type: Number },
      lectivaHours: { type: Number },
      productivaHours: { type: Number },
      lectivaStartDate: { type: Date },
      lectivaEndDate: { type: Date },
      teamPdfProcessed: { type: Boolean, default: false },
      projectCode: { type: String },
      // cambion efectuado por luis llanos
      environment: { type: String },
      materials: [String]
    },
    fiche: { type: String, required: true },
    leaderEmail: { type: String },
    startDate: { type: Date },
    status: {
      type: String,
      enum: ['draft', 'approved', 'archived'],
      default: 'draft'
    },
    content: [phaseSchema],
    timestamps: {
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    }
  }
});

// Middleware para actualizar updatedAt
planningSchema.pre('save', async function () {
  this.pedagogicalPlanning.timestamps.updatedAt = new Date();
});


// Índice único para búsquedas rápidas por número de ficha
planningSchema.index({ 'pedagogicalPlanning.fiche': 1 }, { unique: true });

const Planning = mongoose.model('Planning', planningSchema, 'pedagogicalPlanning');

export default Planning;
