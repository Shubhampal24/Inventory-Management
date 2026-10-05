// backend/models/Rack.js
import mongoose from 'mongoose'

const RackSchema = new mongoose.Schema({
  id:          { type: String, required: true, unique: true, uppercase: true, trim: true },
  type:        { type: String, default: 'Pallet Rack' },
  description: { type: String, default: '' },
  bayCount:    { type: Number, default: 1, min: 1 },
  levels:      { type: [String], default: ['GL1'] },  // ['GL1','GL2',...]
  slots:       { type: [String], default: ['A', 'B'] }, // ['A','B',...]
  side:        { type: String, default: 'Single-sided' },
  status:      { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  notes:       { type: String, default: '' },
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now },
})

RackSchema.pre('save', function (next) { this.updatedAt = new Date(); next() })

export default mongoose.model('Rack', RackSchema)
