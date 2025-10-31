// /api/delete-user.js - SOLUCIÓN COMPLETA (CORS y ES Modules)

// 1. Importaciones de Firebase Admin (ES Modules)
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// 2. Configuración de CORS
// ⚠️ IMPORTANTE: Añade aquí tu URL de desarrollo (localhost:5173) y tu URL de Vercel.
const ALLOWED_ORIGINS = [
    'https://api-ten-delta-47.vercel.app', // Tu dominio de producción
    'http://localhost:5173',               // ¡Tu dominio de desarrollo!
];

// Función Helper para establecer cabeceras CORS
function setCorsHeaders(req, res) {
    const origin = req.headers.origin;
    
    // Si el origen está permitido, se establece la cabecera
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    // Métodos y cabeceras que permites
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}


// 3. Inicialización del Admin SDK (Solo si no ha sido inicializado)
if (!getApps().length) {
    // Estas variables de entorno deben estar configuradas en el Dashboard de Vercel.
    initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            // Importante: Reemplaza '\\n' por saltos de línea reales si es necesario
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), 
        }),
    });
}

// 4. Obtener referencias a los servicios
const auth = getAuth();
const db = getFirestore();


// 5. Función Handler Principal
export default async function handler(req, res) {
    
    // A. Añadir cabeceras CORS a la respuesta (debe ir antes de cualquier retorno)
    setCorsHeaders(req, res);
    
    // B. Manejar la solicitud Preflight (OPTIONS)
    if (req.method === 'OPTIONS') {
        // Responde a la solicitud de verificación previa de CORS
        return res.status(204).end(); 
    }
    
    // Solo permitir peticiones POST para las acciones de eliminación
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido. Use POST.' });
    }

    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'El userId es obligatorio.' });
    }

    try {
        // 6. Eliminar de Firebase Authentication
        await auth.deleteUser(userId);
        console.log(`Usuario de Auth ${userId} eliminado.`);

        // 7. Eliminar documento principal del usuario en Firestore
        await db.collection('Usuarios').doc(userId).delete();
        console.log(`Documento de Firestore ${userId} eliminado.`);
        
        return res.status(200).json({ message: `Usuario ${userId} y sus datos eliminados correctamente.` });

    } catch (error) {
        console.error("Error al eliminar en Vercel Function:", error);
        
        // Manejo de error específico de Firebase
        if (error.code && error.code === 'auth/user-not-found') {
            return res.status(404).json({ error: 'Usuario de autenticación no encontrado.' });
        }
        
        // Devolver un JSON válido en caso de cualquier error 500
        return res.status(500).json({ 
            error: "Error interno del servidor al procesar la solicitud.", 
            details: error.message || 'Error desconocido.' 
        });
    }
}