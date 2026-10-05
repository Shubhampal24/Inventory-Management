// backend/scripts/seed.js
// Run: node scripts/seed.js
// Creates the default user WM@123 with PIN 1234

import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../db/connection.js'
import User from '../models/User.js'
import Rack from '../models/Rack.js'
import Material from '../models/Material.js'
import Location from '../models/Location.js'
import Movement from '../models/Movement.js'

function computeLocationId(rack, bay, level, slot) {
  if (!rack || !bay || !level || !slot) return ''
  return `${rack}-B${String(bay).padStart(2, '0')}-${level}-${slot}`
}

async function seed() {
  await connectDB()

  console.log('\n🌱 Starting seed...\n')

  // ── 1. Create default user ──
  const existingUser = await User.findOne({ userId: 'WM@123' })
  if (existingUser) {
    console.log('✅ User WM@123 already exists — skipping')
  } else {
    const user = new User({
      userId: 'WM@123',
      pin: '1234',
      name: 'Warehouse Manager',
      role: 'admin',
    })
    await user.save()
    console.log('✅ Created user: WM@123 (PIN: 1234)')
  }

  // ── 2. Seed sample racks (only if DB is empty) ──
  const rackCount = await Rack.countDocuments()
  if (rackCount === 0) {
    const sampleRacks = [
      { id: 'R01', type: 'Pallet Rack', description: 'Rack 01 - Main Area', bayCount: 4, levels: ['GL1','GL2','SL3','SL4'], slots: ['A','B'], side: 'Double-sided', status: 'Active' },
      { id: 'R02', type: 'Pallet Rack', description: 'Rack 02 - Main Area', bayCount: 4, levels: ['GL1','GL2','SL3','SL4'], slots: ['A','B'], side: 'Single-sided', status: 'Active' },
      { id: 'R03', type: 'Shelving Rack', description: 'Rack 03 - Small Parts', bayCount: 3, levels: ['GL1','GL2','SL3'], slots: ['A','B','C'], side: 'Single-sided', status: 'Active' },
    ]

    for (const rackData of sampleRacks) {
      const rack = new Rack(rackData)
      await rack.save()

      // Generate locations
      for (let bay = 1; bay <= rackData.bayCount; bay++) {
        for (const level of rackData.levels) {
          for (const slot of rackData.slots) {
            const locationId = computeLocationId(rackData.id, bay, level, slot)
            const existing = await Location.findOne({ locationId })
            if (!existing) {
              await Location.create({ rack: rackData.id, bay, level, slot, locationId, materialId: '', batch: '', notes: '' })
            }
          }
        }
      }
    }
    console.log(`✅ Seeded ${sampleRacks.length} sample racks with locations`)
  } else {
    console.log(`✅ Racks already exist (${rackCount}) — skipping`)
  }

  // ── 3. Seed sample materials (only if DB is empty) ──
  const matCount = await Material.countDocuments()
  if (matCount === 0) {
    const sampleMaterials = [
      { id: 'MAT001', name: 'BUBBLE WRAP', description: 'Bubble wrap 50m roll', category: 'Packaging', unit: 'ROLL', reorderLevel: 5 },
      { id: 'MAT002', name: 'PALLET STRAPS', description: 'Nylon strapping 19mm', category: 'Packaging', unit: 'ROLL', reorderLevel: 10 },
      { id: 'MAT003', name: 'SAFETY GLOVES', description: 'Cut-resistant Level 3', category: 'Safety', unit: 'PAIR', reorderLevel: 20 },
      { id: 'MAT004', name: 'STRETCH FILM', description: 'Hand stretch film 400m', category: 'Packaging', unit: 'ROLL', reorderLevel: 8 },
      { id: 'MAT005', name: 'BARCODE LABELS', description: 'Thermal labels 100x50', category: 'Labels', unit: 'BOX', reorderLevel: 3 },
    ]
    await Material.insertMany(sampleMaterials)
    console.log(`✅ Seeded ${sampleMaterials.length} sample materials`)
  } else {
    console.log(`✅ Materials already exist (${matCount}) — skipping`)
  }

  console.log('\n✅ Seed complete!\n')
  console.log('Login credentials:')
  console.log('  User ID: WM@123')
  console.log('  PIN:     1234\n')

  await mongoose.disconnect()
  process.exit(0)
}

seed().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
