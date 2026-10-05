// backend/models/Material.js
import mongoose from 'mongoose'

const MaterialSchema = new mongoose.Schema({
  id:           { type: String, required: true, unique: true, uppercase: true, trim: true },
  name:         { type: String, required: true, trim: true },
  description:  { type: String, default: '' },
  category:     { type: String, default: '' },
  unit:         { type: String, default: 'PCS' },
  reorderLevel: { type: Number, default: 10, min: 0 },
  createdAt:    { type: Date, default: Date.now },
  updatedAt:    { type: Date, default: Date.now },
})

MaterialSchema.pre('save', function (next) { this.updatedAt = new Date(); next() })

export default mongoose.model('Material', MaterialSchema)
