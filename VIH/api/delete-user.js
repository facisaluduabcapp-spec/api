// ✅ CÓDIGO CORREGIDO: Usando IMPORT (ES Modules)
// -----------------------------------------------------

// 1. Importaciones de Firebase Admin
// Ahora importamos las funciones específicas, no el objeto 'admin' global
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';


// 2. Inicialización del Admin SDK (debe hacerse una sola vez)
// Usamos getApps().length para verificar la inicialización, es equivalente a admin.apps.length === 0
if (!getApps().length) {
    // ⚠️ ATENCIÓN: Estas variables de entorno (process.env.X) 
    // deben estar configuradas en el Dashboard de Vercel por seguridad.
    initializeApp({ // Usamos la función initializeApp importada
        credential: cert({ // Usamos la función cert importada
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Importante para saltos de línea
        }),
    });
}

// 3. Obtener referencias a los servicios
// ¡Importante! Debemos obtener la instancia de cada servicio después de la inicialización
const auth = getAuth();
const db = getFirestore();

// 4. Función Handler Principal
export default async function handler(req, res) {
    // Solo permitir peticiones POST para las acciones de eliminación
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido. Use POST.' });
    }

    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'El userId es obligatorio.' });
    }

    try {
        // 5. Eliminar de Firebase Authentication
        // Usamos la variable 'auth' importada y declarada arriba
        await auth.deleteUser(userId);
        console.log(`Usuario de Auth ${userId} eliminado.`);

        // 6. Eliminar documento principal del usuario en Firestore
        // Usamos la variable 'db' importada y declarada arriba
        await db.collection('Usuarios').doc(userId).delete();
        console.log(`Documento de Firestore ${userId} eliminado.`);
        
        return res.status(200).json({ message: `Usuario ${userId} y sus datos eliminados correctamente.` });

    } catch (error) {
        console.error("Error al eliminar en Vercel Function:", error);
        
        // Manejo de error específico de Firebase
        if (error.code && error.code === 'auth/user-not-found') {
            return res.status(404).json({ error: 'Usuario de autenticación no encontrado.' });
        }
        
        // 💡 Mejorado el mensaje de error 500 para el frontend
        return res.status(500).json({ 
            error: "Error interno del servidor al procesar la solicitud.", 
            details: error.message || 'Error desconocido.' 
        });
    }
}