// backend/db/connection.js
import mongoose from 'mongoose'

let isConnected = false

export async function connectDB() {
  if (isConnected) return

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set in environment variables')
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    })
    isConnected = true
    console.log('✅ MongoDB connected successfully')
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message)
    process.exit(1)
  }
}
