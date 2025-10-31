import React, { useState, useEffect } from 'react';
import { 
    db,
    auth,
    collection, 
    getDocs, 
    doc, 
    getDoc, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from './firebase/firebase'; // <--- Ajusta la ruta si es necesario

// --- OTRAS IMPORTACIONES (SIN CAMBIOS) ---
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faLock, faEnvelope, faKey, faSignInAlt, faSpinner, faChartPie, 
    faSignOutAlt, faSearch, faUser, faChevronDown, faChevronRight, 
    faIdCard, faChartLine, faPills, faCalendarAlt, faBan,
    faFileArchive 
} from '@fortawesome/free-solid-svg-icons';
// Librerías para ZIP
import RenderDataList from './components/RenderDataList';
import LoginPage from './components/LoginPage';
import AdminPanel from './components/AdminPanel';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// ===================================================================
// --- COMPONENTE RAÍZ: App ---
// ===================================================================
function App() {
    // ... (Este componente no tiene cambios)
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);
            if (user) {
                try {
                    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
                    setIsAdmin(adminDoc.exists() && adminDoc.data()?.role === 'admin');
                } catch (error) {
                    console.error("Error al verificar admin:", error);
                    setIsAdmin(false);
                }
            } else {
                setIsAdmin(false);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);
    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontSize: '1.25rem' }}>
                <div>
                    <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '10px' }} />
                    Cargando...
                </div>
            </div>
        );
    }
    if (!user) {
        return <LoginPage />;
    }
    if (!isAdmin) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div style={{ padding: '2rem', background: '#f8d7da', color: '#842029', borderRadius: '8px', maxWidth: '500px', margin: '0 auto' }}>
                    <h2>
                        <FontAwesomeIcon icon={faBan} style={{ marginRight: '8px' }} />
                        Acceso Denegado
                    </h2>
                    <p>Tu cuenta no tiene permisos de administrador.</p>
                    <button onClick={() => signOut(auth)} style={{ padding: '0.5rem 1rem', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        <FontAwesomeIcon icon={faSignOutAlt} style={{ marginRight: '8px' }} />
                        Cerrar Sesion
                    </button>
                </div>
            </div>
        );
    }
    return <AdminPanel currentUser={user} />;
}

export default App;

