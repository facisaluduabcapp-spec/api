// api/create-admin.js
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://api-ten-delta-47.vercel.app',
];

let auth, db;

function initializeFirebase() {
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
    auth = getAuth();
    db = getFirestore();
}

function setCorsHeaders(req, res) {
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
    setCorsHeaders(req, res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    const { email, password, role, createdBy } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email y password son obligatorios' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    try {
        initializeFirebase();

        const userRecord = await auth.createUser({ email, password });

        // ← Esto es lo que faltaba
        await db.collection('admins').doc(userRecord.uid).set({
            email: email.trim(),
            role: role || 'asignador',
            createdAt: new Date().toISOString(),
            createdBy: createdBy || null,
        });

        return res.status(200).json({
            success: true,
            uid: userRecord.uid,
            email: userRecord.email,
        });

    } catch (error) {
        if (error.code === 'auth/email-already-exists') {
            return res.status(409).json({ error: 'El correo ya existe' });
        }
        return res.status(500).json({ error: error.message });
    }
}