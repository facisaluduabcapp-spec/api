// Necesitarás este paquete instalado: npm install firebase-admin
const admin = require('firebase-admin');

// 1. Inicialización del Admin SDK (debe hacerse una sola vez)
if (admin.apps.length === 0) {
    // ⚠️ ATENCIÓN: Estas variables de entorno (process.env.X) 
    // deben estar configuradas en el Dashboard de Vercel por seguridad.
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Importante para saltos de línea
        }),
    });
}

export default async function handler(req, res) {
    // Solo permitir peticiones POST para las acciones de eliminación
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido. Use POST.' });
    }

    // 💡 Paso CRÍTICO: Una verificación de seguridad adicional para que solo el Admin Panel pueda llamar
    // (Por ejemplo, una clave API secreta en el body o encabezados, no implementada aquí por simplicidad)

    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'El userId es obligatorio.' });
    }

    try {
        // 2. Eliminar de Firebase Authentication
        await admin.auth().deleteUser(userId);
        console.log(`Usuario de Auth ${userId} eliminado.`);

        // 3. Eliminar documento principal del usuario en Firestore
        // (Asumimos que las subcolecciones se eliminan en el cliente o con triggers/reglas)
        await admin.firestore().collection('Usuarios').doc(userId).delete();
        console.log(`Documento de Firestore ${userId} eliminado.`);
        
        return res.status(200).json({ message: `Usuario ${userId} y sus datos eliminados correctamente.` });

    } catch (error) {
        console.error("Error al eliminar en Vercel Function:", error);
        
        // Manejo de error específico de Firebase
        if (error.code && error.code === 'auth/user-not-found') {
             return res.status(404).json({ error: 'Usuario de autenticación no encontrado.' });
        }
        
        return res.status(500).json({ error: error.message || 'Error interno del servidor.' });
    }
}