import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://tu-frontend.vercel.app', // cámbialo por tu dominio real
];

let auth;

function initializeFirebase() {
    if (!getApps().length) {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY;

        if (!projectId || !clientEmail || !privateKey) {
            throw new Error('Faltan variables de entorno Firebase');
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

// 🔥 CORS FIX REAL
function setCorsHeaders(req, res) {
    const origin = req.headers.origin;

    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        // fallback importante para evitar bloqueos silenciosos
        res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
}

export default async function handler(req, res) {
    setCorsHeaders(req, res);

    // 🔥 PRE-FLIGHT REQUEST (ESTO ES CLAVE)
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        initializeFirebase();

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Email y password son obligatorios'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                error: 'La contraseña debe tener al menos 6 caracteres'
            });
        }

        console.log('🚀 Creando admin:', email);

        const userRecord = await auth.createUser({
            email,
            password,
            emailVerified: false,
            disabled: false,
        });

        console.log('✅ Usuario creado:', userRecord.uid);

        return res.status(200).json({
            success: true,
            uid: userRecord.uid,
            email: userRecord.email,
        });

    } catch (error) {
        console.error('❌ Error:', error);

        if (error.code === 'auth/email-already-exists') {
            return res.status(409).json({
                error: 'El correo ya existe'
            });
        }

        return res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message,
        });
    }
}