// /api/delete-user.js
// ✅ Asegúrate de tener firebase-admin en package.json
// npm install firebase-admin

const admin = require('firebase-admin');

// Configuración de CORS
const ALLOWED_ORIGINS = [
    'https://api-ten-delta-47.vercel.app',
    'http://localhost:5173',
    'https://tu-dominio-vercel.vercel.app' // Añade tu dominio real aquí
];

function setCorsHeaders(req, res) {
    const origin = req.headers.origin;
    
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
}

// Inicializar Firebase Admin (solo una vez)
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        });
        console.log('✅ Firebase Admin inicializado correctamente');
    } catch (error) {
        console.error('❌ Error al inicializar Firebase Admin:', error);
    }
}

module.exports = async function handler(req, res) {
    // Establecer CORS primero
    setCorsHeaders(req, res);
    
    // Manejar preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Solo permitir POST
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: 'Método no permitido',
            message: 'Solo se permite POST' 
        });
    }

    try {
        const { userId } = req.body;

        // Validación
        if (!userId) {
            return res.status(400).json({ 
                error: 'Parámetro faltante',
                message: 'El userId es obligatorio' 
            });
        }

        console.log(`🗑️ Intentando eliminar usuario: ${userId}`);

        // Verificar que Firebase esté inicializado
        if (!admin.apps.length) {
            throw new Error('Firebase Admin no está inicializado');
        }

        const auth = admin.auth();
        const db = admin.firestore();

        // 1. Eliminar de Authentication
        let authDeleted = false;
        try {
            await auth.deleteUser(userId);
            console.log(`✅ Usuario eliminado de Authentication: ${userId}`);
            authDeleted = true;
        } catch (authError) {
            if (authError.code === 'auth/user-not-found') {
                console.log(`⚠️ Usuario no encontrado en Auth: ${userId}`);
                authDeleted = true; // No existe, así que técnicamente está "eliminado"
            } else {
                throw authError;
            }
        }

        // 2. Eliminar documento de Firestore en colección Usuarios
        let firestoreDeleted = false;
        try {
            const userDocRef = db.collection('Usuarios').doc(userId);
            
            // Verificar si el documento existe antes de eliminar
            const userDoc = await userDocRef.get();
            
            if (userDoc.exists) {
                await userDocRef.delete();
                console.log(`✅ Documento eliminado de Firestore/Usuarios: ${userId}`);
                firestoreDeleted = true;
            } else {
                console.log(`⚠️ Documento no encontrado en Firestore/Usuarios: ${userId}`);
                firestoreDeleted = true; // No existe, así que no hay nada que eliminar
            }
        } catch (firestoreError) {
            console.error('❌ Error al eliminar de Firestore:', firestoreError.message);
            // Si Auth fue eliminado pero Firestore falló, aún considerarlo parcialmente exitoso
            if (!authDeleted) {
                throw firestoreError;
            }
        }

        return res.status(200).json({ 
            success: true,
            message: `Usuario ${userId} eliminado correctamente`,
            userId: userId,
            details: {
                authDeleted,
                firestoreDeleted
            }
        });

    } catch (error) {
        console.error('❌ Error en delete-user:', error);
        
        // Asegurarse de SIEMPRE devolver JSON válido
        return res.status(500).json({ 
            error: 'Error interno del servidor',
            message: error.message || 'Error desconocido',
            code: error.code || 'unknown'
        });
    }
}