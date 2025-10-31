// src/firebase/firebase.js

import { initializeApp } from "firebase/app";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    doc, 
    getDoc, 
    deleteDoc // Incluyo deleteDoc por si lo usas más adelante
} from "firebase/firestore";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from "firebase/auth";

// --- CONFIGURACIÓN FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyDHMfAMvNcE5plC79ztJ1q6RtuwrB3D1qU",
    authDomain: "facisalud-afced.firebaseapp.com",
    projectId: "facisalud-afced",
    storageBucket: "facisalud-afced.firebasestorage.app",
    messagingSenderId: "367350759159",
    appId: "1:367350759159:web:5812800b3fd1e9da639df2",
    measurementId: "G-FY5YTMQJ3L"
};

// Inicializar la app
const app = initializeApp(firebaseConfig);

// Obtener los servicios
const db = getFirestore(app);
const auth = getAuth(app);

// Exportar los servicios y las funciones que usaremos
// Esto permite que otros archivos solo importen lo que necesitan
export {
    db,
    auth,
    collection,
    getDocs,
    doc,
    getDoc,
    deleteDoc,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
};