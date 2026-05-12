// /api/delete-admin.js
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const ALLOWED_ORIGINS = [
    'https://api-ten-delta-47.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
];

let auth, db;

function initializeFirebase() {
    if (!getApps().length) {
        initializeApp({
            credential: cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
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
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
    setCorsHeaders(req, res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });

    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: 'El uid es obligatorio.' });

    try {
        initializeFirebase();
        // Eliminar de Auth
        await auth.deleteUser(uid);
        // Eliminar documento de /admins
        await db.collection('admins').doc(uid).delete();

        return res.status(200).json({ message: `Admin ${uid} eliminado correctamente.` });
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            // Si no existe en Auth, igual limpiar Firestore
            try {
                initializeFirebase();
                await db.collection('admins').doc(uid).delete();
                return res.status(200).json({ message: 'Eliminado solo de Firestore (no existía en Auth).' });
            } catch (e) {
                return res.status(500).json({ error: e.message });
            }
        }
        return res.status(500).json({ error: error.message });
    }
}