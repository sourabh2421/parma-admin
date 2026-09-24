import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { collection, doc, getDocs, getFirestore, serverTimestamp, writeBatch } from 'firebase/firestore'
import fs from 'fs'

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSyBsGrum1CyYxND-LxnPw2v1mo5ay-X4o64',
  authDomain: 'parma-academy-2002.firebaseapp.com',
  projectId: 'parma-academy-2002',
  storageBucket: 'parma-academy-2002.firebasestorage.app',
  messagingSenderId: '425474936626',
  appId: '1:425474936626:web:33529068a2688f38e5512b',
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

const master = JSON.parse(fs.readFileSync('src/data/parmaStudentMaster.json', 'utf8'))
const lookup = JSON.parse(fs.readFileSync('src/data/studentFatherLookup.json', 'utf8'))

const masterById = new Map()
const masterByName = new Map()
for (const m of master) {
  if (m.id) masterById.set(String(m.id).trim(), m)
  if (m.name) masterByName.set(String(m.name).trim().toLowerCase(), m)
}

function isClassLike(val) {
  if (!val) return false
  const s = String(val).trim().toUpperCase()
  return /^(NURSERY|NUR|NUR\.|LKG|UKG|I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|CLASS\s*[\d\w]+|\d{1,2}(ST|ND|RD|TH)?)$/i.test(s)
}

function resolveFather(id, name, currentParent) {
  if (currentParent && !isClassLike(currentParent)) {
    return currentParent
  }

  const rawId = String(id || '').trim()
  const cleanName = String(name || '').trim().toLowerCase()

  // 1. Master by ID
  if (rawId && masterById.has(rawId)) {
    const fn = masterById.get(rawId).fatherName
    if (fn && !isClassLike(fn)) return fn
  }
  // 2. Master by Name
  if (cleanName && masterByName.has(cleanName)) {
    const fn = masterByName.get(cleanName).fatherName
    if (fn && !isClassLike(fn)) return fn
  }

  // 3. Lookup by ID
  if (rawId && lookup.byId && lookup.byId[rawId]) {
    const fn = lookup.byId[rawId]
    if (fn && !isClassLike(fn)) return fn
  }
  // 4. Lookup by Name
  if (cleanName && lookup.byName && lookup.byName[cleanName]) {
    const fn = lookup.byName[cleanName]
    if (fn && !isClassLike(fn)) return fn
  }

  return ''
}

async function syncFatherNames() {
  console.log('Authenticating with Firebase...')
  await signInWithEmailAndPassword(auth, 'parma.academy.2004@gmail.com', 'parma123')
  console.log('Authenticated.')

  const snap = await getDocs(collection(db, 'students'))
  console.log(`Found ${snap.size} students in Firestore.`)

  let updatedCount = 0
  let skippedCount = 0
  const BATCH_LIMIT = 400
  let batch = writeBatch(db)
  let inBatch = 0

  for (const docSnap of snap.docs) {
    const data = docSnap.data()
    const id = data.studentId || docSnap.id
    const name = data.name
    const currentParent = data.parentName || data.fatherName

    const resolved = resolveFather(id, name, currentParent)
    if (resolved && resolved !== currentParent) {
      batch.update(docSnap.ref, {
        parentName: resolved,
        fatherName: resolved,
        updatedAt: serverTimestamp(),
      })
      inBatch++
      updatedCount++

      if (inBatch >= BATCH_LIMIT) {
        await batch.commit()
        batch = writeBatch(db)
        inBatch = 0
        console.log(`Committed batch of ${BATCH_LIMIT} updates...`)
      }
    } else {
      skippedCount++
    }
  }

  if (inBatch > 0) {
    await batch.commit()
  }

  console.log(`Successfully updated ${updatedCount} students in Firestore with exact Father's Names! (Skipped/Already valid: ${skippedCount})`)
}

syncFatherNames().catch(console.error)
