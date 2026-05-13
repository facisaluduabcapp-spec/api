// VIH/create-superadmin.js
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

dotenv.config({ path: './api/.env' }); // ← apunta al .env del backend

if (!getApps().length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey.includes('\\n')
                ? privateKey.replace(/\\n/g, '\n')
                : privateKey,
        }),
    });
}

const auth = getAuth();
const db = getFirestore();

const EMAIL = 'superadmin@gmail.com'; // ← cambia esto
const PASSWORD = 'root2026';    // ← cambia esto

try {
    const userRecord = await auth.createUser({ email: EMAIL, password: PASSWORD });

    await db.collection('admins').doc(userRecord.uid).set({
        email: EMAIL,
        role: 'superadmin',
        createdAt: new Date().toISOString(),
        createdBy: 'script',
    });

    console.log('✅ Superadmin creado:', userRecord.uid);
} catch (error) {
    if (error.code === 'auth/email-already-exists') {
        console.log('⚠️ El email ya existe en Auth');
    } else {
        console.error('❌ Error:', error.message);
    }
}

process.exit(0);