// /api/delete-user.js - SOLUCIÓN DEFINITIVA

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const ALLOWED_ORIGINS = [
    'https://api-ten-delta-47.vercel.app',
    'http://localhost:5173',
];

function setCorsHeaders(req, res) {
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

if (!getApps().length) {
    initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
    });
}

const auth = getAuth();
const db = getFirestore();

// 🔥 Función para eliminar subcolección completa
async function deleteCollection(collectionRef, batchSize = 100) {
    const query = collectionRef.limit(batchSize);
    
    return new Promise((resolve, reject) => {
        deleteQueryBatch(query, resolve, reject);
    });
}

async function deleteQueryBatch(query, resolve, reject) {
    try {
        const snapshot = await query.get();
        
        // Si no hay documentos, terminamos
        if (snapshot.size === 0) {
            resolve();
            return;
        }

        // Eliminar documentos en batch
        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();

        // Recursión: si había documentos, puede haber más
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

// 🔥 Eliminar todas las subcolecciones conocidas de un usuario
async function deleteUserSubcollections(userId) {
    const userRef = db.collection('Usuarios').doc(userId);
    
    // Lista de subcolecciones que pueden existir
    const subcollections = ['InformacionPerfil', 'Seguimiento', 'TomasDiarias'];
    
    console.log(`🗑️ Eliminando subcolecciones de ${userId}...`);
    
    for (const subcollectionName of subcollections) {
        try {
            const subcollectionRef = userRef.collection(subcollectionName);
            await deleteCollection(subcollectionRef);
            console.log(`  ✅ ${subcollectionName} eliminada (o no existía)`);
        } catch (error) {
            console.error(`  ⚠️ Error al eliminar ${subcollectionName}:`, error.message);
            // Continúa con las demás aunque falle una
        }
    }
}

// 🔥 Handler Principal
export default async function handler(req, res) {
    setCorsHeaders(req, res);
    
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido. Use POST.' });
    }

    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'El userId es obligatorio.' });
    }

    try {
        console.log(`🚀 Iniciando eliminación del usuario: ${userId}`);
        
        // 1️⃣ Eliminar subcolecciones primero
        await deleteUserSubcollections(userId);
        
        // 2️⃣ Eliminar documento principal del usuario
        await db.collection('Usuarios').doc(userId).delete();
        console.log(`✅ Documento principal ${userId} eliminado`);
        
        // 3️⃣ Eliminar de Firebase Authentication
        await auth.deleteUser(userId);
        console.log(`✅ Usuario de Auth ${userId} eliminado`);
        
        return res.status(200).json({ 
            message: `Usuario ${userId} eliminado completamente`,
            details: {
                subcollections: 'Eliminadas',
                firestoreDoc: 'Eliminado',
                authUser: 'Eliminado'
            }
        });

    } catch (error) {
        console.error("❌ Error al eliminar usuario:", error);
        
        if (error.code === 'auth/user-not-found') {
            return res.status(404).json({ error: 'Usuario de autenticación no encontrado.' });
        }
        
        return res.status(500).json({ 
            error: "Error interno del servidor", 
            details: error.message 
        });
    }
}
