// backend/models/Movement.js
import mongoose from 'mongoose'

const MovementSchema = new mongoose.Schema({
  id:          { type: String, required: true, unique: true },   // MOV<timestamp>
  date:        { type: String, required: true },                  // YYYY-MM-DD
  materialId:  { type: String, required: true, uppercase: true, trim: true },
  locationId:  { type: String, required: true, trim: true },
  type:        { type: String, enum: ['IN', 'OUT'], required: true },
  quantity:    { type: Number, required: true, min: 0 },
  unit:        { type: String, default: 'PCS' },
  reference:   { type: String, default: '' },
  user:        { type: String, default: 'Warehouse Manager' },
  notes:       { type: String, default: '' },
  createdAt:   { type: Date, default: Date.now },
})

// Indexes for fast SUMIFS-equivalent queries
MovementSchema.index({ materialId: 1, locationId: 1, type: 1 })
MovementSchema.index({ date: 1 })
MovementSchema.index({ locationId: 1 })

export default mongoose.model('Movement', MovementSchema)
