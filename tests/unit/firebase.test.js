import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setupTestFirebase, teardownTestFirebase, getTestDb } from '../helpers/firebase-helper.js'

// Note: These tests require the Firebase emulator to be running
// If running without emulators, these tests will be skipped
const runWithEmulator = process.env.FIREBASE_EMULATOR === 'true'

describe('Firebase test setup', () => {
  let db

  beforeEach(async () => {
    if (!runWithEmulator) {
      console.log('Skipping Firebase tests - emulator not available')
      return
    }
    
    const testEnv = await setupTestFirebase()
    db = getTestDb()
  })

  afterEach(async () => {
    if (!runWithEmulator) return
    
    await teardownTestFirebase()
  })

  // This test is conditionally run only when emulator is available
  ;(runWithEmulator ? it : it.skip)('should write data to Firebase emulator', async () => {
    // Add a test document
    const testDocRef = db.collection('test').doc('test-doc')
    await testDocRef.set({
      name: 'Test Document',
      hebrewText: 'מסמך בדיקה',
      createdAt: new Date()
    })
    
    // Read it back
    const docSnap = await testDocRef.get()
    const data = docSnap.data()
    
    // Verify data
    expect(data).toBeDefined()
    expect(data.name).toBe('Test Document')
    expect(data.hebrewText).toBe('מסמך בדיקה')
  })
})