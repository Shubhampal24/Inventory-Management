// backend/models/Location.js
import mongoose from 'mongoose'

const LocationSchema = new mongoose.Schema({
  locationId:  { type: String, required: true, unique: true, trim: true }, // R01-B01-GL1-A
  rack:        { type: String, required: true, uppercase: true, trim: true },
  bay:         { type: Number, required: true, min: 1 },
  level:       { type: String, required: true, trim: true },
  slot:        { type: String, required: true, uppercase: true, trim: true },
  materialId:  { type: String, default: '' },     // assigned material (empty if none)
  batch:       { type: String, default: '' },
  notes:       { type: String, default: '' },
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now },
})

LocationSchema.pre('save', function (next) { this.updatedAt = new Date(); next() })

// Index for fast rack-based queries
LocationSchema.index({ rack: 1, bay: 1 })
LocationSchema.index({ materialId: 1 })

export default mongoose.model('Location', LocationSchema)
