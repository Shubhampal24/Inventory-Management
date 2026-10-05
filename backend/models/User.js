// backend/models/User.js
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const UserSchema = new mongoose.Schema({
  userId:      { type: String, required: true, unique: true, trim: true },  // WM@123
  pin:         { type: String, required: true },                              // hashed 1234
  name:        { type: String, default: 'Warehouse Manager' },
  role:        { type: String, enum: ['admin', 'operator', 'viewer'], default: 'admin' },
  createdAt:   { type: Date, default: Date.now },
  lastLogin:   { type: Date },
})

// Hash pin before save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('pin')) return next()
  this.pin = await bcrypt.hash(this.pin, 10)
  next()
})

// Verify pin
UserSchema.methods.verifyPin = function (candidatePin) {
  return bcrypt.compare(candidatePin, this.pin)
}

export default mongoose.model('User', UserSchema)
