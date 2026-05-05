const mongoose = require('mongoose');

const PredictionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    diseaseName: { type: String, required: true },
    confidence: { type: Number, required: true },
    advice: { type: String },
    severity: { type: String },
    urgency: { type: String },
    imagePath: { type: String },
    notes: { type: String },
    consultedDoctor: { type: Boolean, default: false },
    consultationDate: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Prediction', PredictionSchema);
