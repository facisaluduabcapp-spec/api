// firebase-admin.js
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export function getAdminServices() {
    if (!getApps().length) {
        const privateKey = process.env.FIREBASE_PRIVATE_KEY;

        if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
            throw new Error('❌ Faltan variables de entorno de Firebase. Revisa tu .env');
        }

        initializeApp({
            credential: cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey.includes('\\n')
                    ? privateKey.replace(/\\n/g, '\n')
                    : privateKey,
            }),
        });

        console.log('🔥 Firebase Admin inicializado correctamente');
    }

    return {
        auth: getAuth(),
        db: getFirestore(),
    };
}