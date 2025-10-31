// src/components/LoginPage.jsx
import React, { useState } from 'react';

// 1. Importaciones de Firebase (del módulo que creamos en el primer paso)
import { auth, signInWithEmailAndPassword } from '../firebase/firebase'; 
// Ajusta la ruta si 'firebase.js' no está en '../firebase/'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'; 

// 2. Importa los ÍCONOS específicos (faLock, faEnvelope, etc.) del paquete SVG
import { 
    faLock, 
    faEnvelope, 
    faKey, 
    faSignInAlt, 
    faSpinner 
} from '@fortawesome/free-solid-svg-icons';
// OJO: Si decides modularizar los íconos ANTES,
// podrías reemplazar la importación de FontAwesome por una importación de './Icons'.

// ===================================================================
// --- COMPONENTE: LoginPage ---
// ===================================================================
function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const handleLogin = async () => {
        setError('');
        setLoading(true);
        try {
            // Usa las funciones importadas de nuestro módulo 'firebase.js'
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            setError('Credenciales inválidas. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
            <div style={{ maxWidth: '400px', width: '100%', padding: '2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', borderRadius: '8px', background: 'white' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <FontAwesomeIcon icon={faLock} style={{ marginRight: '8px' }} />
                    Login Admin
                </h2>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                        <FontAwesomeIcon icon={faEnvelope} style={{ marginRight: '8px' }} />
                        Email
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #ced4da', borderRadius: '4px' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                        <FontAwesomeIcon icon={faKey} style={{ marginRight: '8px' }} />
                        Contraseña
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                        style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #ced4da', borderRadius: '4px' }}
                    />
                </div>
                {error && <div style={{ padding: '0.75rem', marginBottom: '1rem', background: '#f8d7da', color: '#842029', borderRadius: '4px', fontSize: '0.875rem' }}>{error}</div>}
                <button
                    onClick={handleLogin}
                    disabled={loading || !email || !password}
                    style={{ width: '100%', padding: '0.75rem', background: loading ? '#6c757d' : '#0d6efd', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 500 }}
                >
                    {loading ? (
                        <>
                            <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '8px' }} />
                            Entrando...
                        </>
                    ) : (
                        <>
                            <FontAwesomeIcon icon={faSignInAlt} style={{ marginRight: '8px' }} />
                            Entrar
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

export default LoginPage; // <--- ¡Exportamos el componente!