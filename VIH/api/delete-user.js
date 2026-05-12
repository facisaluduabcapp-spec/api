// /api/delete-user.js
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const ALLOWED_ORIGINS = [
    'https://api-ten-delta-47.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
];

// Variables que se asignarán al inicializar
let auth, db;

/**
 * Inicializa Firebase de forma segura verificando que las variables existan
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

/**
 * Función para eliminar subcolección completa (Batch)
 */
async function deleteCollection(collectionRef, batchSize = 100) {
    const query = collectionRef.limit(batchSize);
    return new Promise((resolve, reject) => {
        deleteQueryBatch(query, resolve, reject);
    });
}

async function deleteQueryBatch(query, resolve, reject) {
    try {
        const snapshot = await query.get();
        if (snapshot.size === 0) {
            resolve();
            return;
        }

        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();

        if (snapshot.size === batchSize) {
            process.nextTick(() => {
                deleteQueryBatch(query, resolve, reject);
            });
        } else {
            resolve();
        }
    } catch (error) {
        reject(error);
    }
}

/**
 * Eliminar todas las subcolecciones conocidas de un usuario
 */
async function deleteUserSubcollections(userId) {
    const userRef = db.collection('Usuarios').doc(userId);
    const subcollections = ['InformacionPerfil', 'Seguimiento', 'TomasDiarias'];
    
    console.log(`🗑️ Eliminando subcolecciones de ${userId}...`);
    
    for (const subcollectionName of subcollections) {
        try {
            const subcollectionRef = userRef.collection(subcollectionName);
            await deleteCollection(subcollectionRef);
            console.log(`  ✅ ${subcollectionName} procesada.`);
        } catch (error) {
            console.error(`  ⚠️ Error en subcolección ${subcollectionName}:`, error.message);
        }
    }
}

/**
 * Handler Principal (Exportado)
 */
export default async function handler(req, res) {
    setCorsHeaders(req, res);
    
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido. Use POST.' });
    }

    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ error: 'El userId es obligatorio.' });
    }

    try {
        // Aseguramos que Firebase esté inicializado ANTES de usar auth o db
        initializeFirebase();

        console.log(`🚀 Iniciando eliminación total del usuario: ${userId}`);
        
        // 1️⃣ Eliminar subcolecciones
        await deleteUserSubcollections(userId);
        
        // 2️⃣ Eliminar documento principal
        await db.collection('Usuarios').doc(userId).delete();
        console.log(`✅ Firestore: Documento principal eliminado.`);
        
        // 3️⃣ Eliminar de Authentication
        await auth.deleteUser(userId);
        console.log(`✅ Auth: Usuario eliminado correctamente.`);
        
        return res.status(200).json({ 
            message: `Usuario ${userId} eliminado completamente`,
            status: "success"
        });

    } catch (error) {
        console.error("❌ Error en el proceso de eliminación:", error);
        
        if (error.code === 'auth/user-not-found') {
            return res.status(404).json({ error: 'El usuario no existe en Firebase Auth.' });
        }
        
        return res.status(500).json({ 
            error: "Error interno al procesar la solicitud", 
            details: error.message 
        });
    }
}