import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../db/connection.js'
import Rack from '../models/Rack.js'
import Material from '../models/Material.js'
import Location from '../models/Location.js'
import Movement from '../models/Movement.js'

async function prune() {
  await connectDB()
  console.log('\n🧹 Cleaning up extra data...')

  // Delete all racks except R01
  await Rack.deleteMany({ id: { $ne: 'R01' } })
  console.log('✅ Deleted extra racks (kept R01)')

  // Delete all locations for deleted racks
  await Location.deleteMany({ rack: { $ne: 'R01' } })
  console.log('✅ Deleted locations for extra racks')

  // Unassign all materials in R01 (reset to empty)
  await Location.updateMany({ rack: 'R01' }, { $set: { materialId: '', batch: '', notes: '' } })
  console.log('✅ Reset R01 locations to empty')

  // Delete all materials except MAT001
  await Material.deleteMany({ id: { $ne: 'MAT001' } })
  console.log('✅ Deleted extra materials (kept MAT001)')

  // Delete all stock movements
  await Movement.deleteMany({})
  console.log('✅ Deleted all stock movements (start fresh)')

  console.log('\n✨ Database is now clean and ready for testing!\n')
  await mongoose.disconnect()
  process.exit(0)
}

prune().catch(err => {
  console.error('Prune failed:', err)
  process.exit(1)
})
