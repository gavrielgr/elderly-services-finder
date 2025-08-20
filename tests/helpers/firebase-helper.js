import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { readFileSync } from 'fs'
import { resolve } from 'path'

let testEnv = null

export async function setupTestFirebase() {
  if (testEnv) return testEnv

  testEnv = await initializeTestEnvironment({
    projectId: 'test-elderly-services',
    firestore: {
      rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8'),
      host: 'localhost',
      port: 8080
    },
    auth: {
      host: 'localhost',
      port: 9099
    }
  })

  return testEnv
}

export async function teardownTestFirebase() {
  if (testEnv) {
    await testEnv.cleanup()
    testEnv = null
  }
}

export function getTestDb(uid = null) {
  if (!testEnv) throw new Error('Firebase test environment not initialized')
  
  return uid 
    ? testEnv.authenticatedContext(uid).firestore()
    : testEnv.unauthenticatedContext().firestore()
}

export async function seedTestData(db) {
  // Seed test categories
  await db.collection('categories').add({
    name: 'בריאות',
    description: 'שירותי בריאות',
    order: 1
  })

  // Seed test services
  await db.collection('services').add({
    name: 'מרכז רפואי הדסה',
    description: 'בית חולים כללי',
    category: 'health',
    city: 'ירושלים',
    phones: [{ number: '02-6777111', description: 'מוקד' }],
    createdAt: new Date()
  })

  // Seed interest areas
  await db.collection('interest-areas').add({
    name: 'רפואה כללית',
    description: 'טיפול רפואי כללי'
  })
}