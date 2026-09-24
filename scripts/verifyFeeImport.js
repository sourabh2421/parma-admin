import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { collection, getDocs, getFirestore } from 'firebase/firestore'

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

async function verify() {
  await signInWithEmailAndPassword(auth, 'parma.academy.2004@gmail.com', 'parma123')
  console.log('Authenticated.')

  const feesSnap = await getDocs(collection(db, 'fees'))
  const allFees = feesSnap.docs.map((d) => ({ docId: d.id, ...d.data() }))

  const activeFees = allFees.filter((f) => !f.deleted)
  console.log(`Total Fee Documents in DB: ${allFees.length}`)
  console.log(`Total Active Fee Documents in DB: ${activeFees.length}`)

  const byMonth = {}
  activeFees.forEach((f) => {
    byMonth[f.month] = (byMonth[f.month] || 0) + 1
  })
  console.log('\nFee counts by Month:', byMonth)

  console.log('\nSample Fee Records:')
  activeFees.slice(0, 10).forEach((f) => {
    console.log(
      `DocId: ${f.docId} -> Student: "${f.studentName}" (Class: ${f.class}, ID: ${f.studentId}) | Month: ${f.month} | Amount: INR ${f.amount} | ReceiptNo: ${f.chequeNo || 'N/A'}`
    )
  })

  // Specific spot check: Kabir Yadav
  const kabirFees = activeFees.filter((f) => f.studentName.toLowerCase().includes('kabir yadav'))
  console.log('\nSpot Check - Kabir Yadav Fees:')
  kabirFees.forEach((f) =>
    console.log(`  - ${f.month} 2026: INR ${f.amount}, Receipt: ${f.chequeNo}, Status: ${f.status}`)
  )

  // Specific spot check: Vinayak Yadav
  const vinayakFees = activeFees.filter((f) => f.studentName.toLowerCase().includes('vinayak yadav'))
  console.log('\nSpot Check - Vinayak Yadav Fees:')
  vinayakFees.forEach((f) =>
    console.log(`  - ${f.month} 2026: INR ${f.amount}, Receipt: ${f.chequeNo}, Status: ${f.status}`)
  )

  console.log('\n✅ Verification Finished Cleanly!')
}

verify()
  .then(() => process.exit(0))
  .catch(console.error)
