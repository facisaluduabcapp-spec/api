// /api/created-admin.js

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const ALLOWED_ORIGINS = [
    'https://api-ten-delta-47.vercel.app', // ← cambia por tu dominio real
    'http://localhost:5173',
    'http://localhost:3000',
];

// Variable que se asignará cuando se inicialice la app
let auth;

/**
 * Función para inicializar Firebase SOLO cuando ya se hayan cargado las variables
 */
function initializeFirebase() {
    if (!getApps().length) {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY;

        if (!privateKey) {
            throw new Error("❌ Error: FIREBASE_PRIVATE_KEY no está definida en el entorno.");
        }

        initializeApp({
            credential: cert({
                projectId,
                clientEmail,
                privateKey: privateKey.replace(/\\n/g, '\n'),
            }),
        });
    }
    auth = getAuth();
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

    // Responder preflight
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido. Use POST.' });
    }

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'El correo y la contraseña son obligatorios.' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener mínimo 6 caracteres.' });
    }

    try {
        // 🔥 INICIALIZAMOS FIREBASE AQUÍ (Garantiza que process.env ya exista)
        initializeFirebase();

        console.log(`🚀 Creando usuario admin: ${email}`);

        const userRecord = await auth.createUser({
            email,
            password,
            emailVerified: false,
            disabled: false,
        });

        console.log(`✅ Usuario creado: ${userRecord.uid}`);

        return res.status(200).json({
            uid: userRecord.uid,
            email: userRecord.email,
            message: `Usuario ${email} creado correctamente`,
        });

    } catch (error) {
        console.error('❌ Error al crear usuario:', error);

        if (error.code === 'auth/email-already-exists') {
            return res.status(409).json({
                error: 'Este correo ya tiene una cuenta registrada.',
                code: 'auth/email-already-in-use',
            });
        }

        if (error.code === 'auth/invalid-email') {
            return res.status(400).json({
                error: 'El correo no es válido.',
                code: 'auth/invalid-email',
            });
        }

        if (error.code === 'auth/weak-password') {
            return res.status(400).json({
                error: 'La contraseña es demasiado débil.',
                code: 'auth/weak-password',
            });
        }

        return res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message,
        });
    }
}