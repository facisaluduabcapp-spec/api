// server.js - Todo en un solo archivo, sin microservicios
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getAdminServices } from './firebase-admin.js';

const app = express();

app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://api-ten-delta-47.vercel.app',
    ],
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

// ── Crear admin ─────────────────────────────────────────────
app.post('/api/create-admin', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email y password son obligatorios' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    try {
        const { auth } = getAdminServices();
        const userRecord = await auth.createUser({ email, password });
        
        console.log('✅ Usuario creado:', userRecord.uid);
        return res.status(200).json({ 
            success: true, 
            uid: userRecord.uid, 
            email: userRecord.email 
        });
    } catch (error) {
        console.error('❌ create-admin error:', error.code, error.message);
        
        if (error.code === 'auth/email-already-exists') {
            return res.status(409).json({ error: 'El correo ya existe' });
        }
        return res.status(500).json({ error: error.message });
    }
});

// ── Eliminar admin ──────────────────────────────────────────
app.post('/api/delete-admin', async (req, res) => {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: 'El uid es obligatorio' });

    try {
        const { auth, db } = getAdminServices();
        
        await auth.deleteUser(uid);
        await db.collection('admins').doc(uid).delete();
        
        return res.status(200).json({ message: `Admin ${uid} eliminado correctamente` });
    } catch (error) {
        console.error('❌ delete-admin error:', error.code, error.message);
        
        if (error.code === 'auth/user-not-found') {
            // Igual limpiamos Firestore aunque no existiera en Auth
            try {
                const { db } = getAdminServices();
                await db.collection('admins').doc(uid).delete();
                return res.status(200).json({ message: 'Eliminado de Firestore (no existía en Auth)' });
            } catch (e) {
                return res.status(500).json({ error: e.message });
            }
        }
        return res.status(500).json({ error: error.message });
    }
});

// ── Eliminar usuario ────────────────────────────────────────
app.post('/api/delete-user', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'El userId es obligatorio' });

    try {
        const { auth, db } = getAdminServices();
        const userRef = db.collection('Usuarios').doc(userId);
        
        // Eliminar subcolecciones conocidas
        const subcollections = ['InformacionPerfil', 'Seguimiento', 'TomasDiarias'];
        for (const name of subcollections) {
            const snap = await userRef.collection(name).limit(100).get();
            if (!snap.empty) {
                const batch = db.batch();
                snap.docs.forEach(d => batch.delete(d.ref));
                await batch.commit();
            }
        }
        
        await userRef.delete();
        await auth.deleteUser(userId);
        
        return res.status(200).json({ 
            message: `Usuario ${userId} eliminado completamente`,
            status: 'success'
        });
    } catch (error) {
        console.error('❌ delete-user error:', error.code, error.message);
        
        if (error.code === 'auth/user-not-found') {
            return res.status(404).json({ error: 'El usuario no existe en Firebase Auth' });
        }
        return res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ API corriendo en http://localhost:${PORT}`));