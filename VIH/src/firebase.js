// src/firebaseConfig.js

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// --- TU CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDHMfAMvNcE5plC79ztJ1q6RtuwrB3D1qU",
  authDomain: "facisalud-afced.firebaseapp.com",
  projectId: "facisalud-afced",
  storageBucket: "facisalud-afced.firebasestorage.app",
  messagingSenderId: "367350759159",
  appId: "1:367350759159:web:5812800b3fd1e9da639df2",
  measurementId: "G-FY5YTMQJ3L"
};

// Inicialización
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Exportar para que otros archivos los puedan usar
export { db, auth };