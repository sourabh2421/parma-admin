import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { collection, doc, getDocs, getFirestore, serverTimestamp, writeBatch } from 'firebase/firestore'

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

const LEGACY_IDS_TO_REMOVE = ['S33', 's33', 'Stud. Id', 'S03', 'S07', 'S211']

async function cleanup() {
  console.log('Authenticating with Firebase...')
  const adminEmail = process.env.ADMIN_EMAIL || 'office@parma.com'
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) {
    console.error('ERROR: ADMIN_PASSWORD environment variable is required.')
    console.error('Example: ADMIN_PASSWORD="yourpassword" node scripts/cleanupLegacyStudents.js')
    process.exit(1)
  }
  await signInWithEmailAndPassword(auth, adminEmail, adminPassword)
  console.log(`Authenticated as ${adminEmail}`)

  const snap = await getDocs(collection(db, 'students'))
  const batch = writeBatch(db)
  let count = 0

  for (const docSnap of snap.docs) {
    const data = docSnap.data()
    const docId = docSnap.id
    const sId = String(data.studentId || docId).trim()

    if (LEGACY_IDS_TO_REMOVE.includes(docId) || LEGACY_IDS_TO_REMOVE.includes(sId) || sId === 'Stud. Id' || data.name === 'STUDENTS NAME') {
      batch.update(docSnap.ref, {
        deleted: true,
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      count++
      console.log(`Marking legacy student for deletion: ${docId} (${data.name})`)
    }
  }

  if (count > 0) {
    await batch.commit()
    console.log(`Successfully removed ${count} legacy student records from Firestore.`)
  } else {
    console.log('No legacy records found to remove.')
  }
}

cleanup().catch(console.error)
