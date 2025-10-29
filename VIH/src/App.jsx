import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDHMfAMvNcE5plC79ztJ1q6RtuwrB3D1qU",
  authDomain: "facisalud-afced.firebaseapp.com",
  projectId: "facisalud-afced",
  storageBucket: "facisalud-afced.firebasestorage.app",
  messagingSenderId: "367350759159",
  appId: "1:367350759159:web:5812800b3fd1e9da639df2",
  measurementId: "G-FY5YTMQJ3L"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

function App() {
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
    return <div style={{padding: '50px', textAlign: 'center'}}>Cargando...</div>;
  }

  if (!user) {
    return <LoginPage />;
  }

  if (!isAdmin) {
    return (
      <div style={{padding: '50px', textAlign: 'center'}}>
        <h2>Acceso Denegado</h2>
        <p>No tienes permisos de administrador</p>
        <button onClick={() => signOut(auth)}>Cerrar Sesión</button>
      </div>
    );
  }

  return <AdminPanel currentUser={user} />;
}

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError('Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{maxWidth: '400px', margin: '100px auto', padding: '20px'}}>
      <h2>Login Admin</h2>
      <div>
        <label>Email:</label>
        <input 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          style={{width: '100%', padding: '8px', marginBottom: '10px'}}
        />
      </div>
      <div>
        <label>Contraseña:</label>
        <input 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
          style={{width: '100%', padding: '8px', marginBottom: '10px'}}
        />
      </div>
      {error && <p style={{color: 'red'}}>{error}</p>}
      <button onClick={handleLogin} disabled={loading} style={{width: '100%', padding: '10px'}}>
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
    </div>
  );
}

function AdminPanel({ currentUser }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    const fetchUsuarios = async () => {
      setLoading(true);
      setError('');
      try {
        // Lista hardcodeada de UIDs
        const uids = [
          '04t0y9pqJVSgQDYt0sWpVbzNkI53',
          '9zvTobxxL7efCT0aLZkIFVfTj4j1',
          'GouQvOYYrNReb6Xhg66FZYoZPSq1',
          'Pq2va3v98dYW10yYAbF6pA7Kon13',
          'WijvWqo9cUX6SQAdX9bqzngYaWp2',
          'rzf3EVR7h4Se4S1I91mNyEdQXUC3'
        ];

        const listaUsuarios = [];

        for (const userId of uids) {
          try {
            const infoPerfilSnapshot = await getDocs(
              collection(db, 'Usuarios', userId, 'InformacionPerfil')
            );
            
            const perfiles = [];
            infoPerfilSnapshot.forEach((perfilDoc) => {
              perfiles.push({
                id: perfilDoc.id,
                ...perfilDoc.data()
              });
            });

            listaUsuarios.push({
              userId: userId,
              perfiles: perfiles
            });
          } catch (err) {
            console.log(`Error con usuario ${userId}:`, err.message);
          }
        }

        setUsuarios(listaUsuarios);
      } catch (error) {
        console.error("Error:", error);
        setError("Error al cargar usuarios: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsuarios();
  }, []);

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <div style={{padding: '20px', maxWidth: '1200px', margin: 'auto'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '20px'}}>
        <div>
          <h1>Panel Admin</h1>
          <p>Usuario: {currentUser.email}</p>
        </div>
        <button onClick={handleLogout}>Cerrar Sesión</button>
      </div>

      {error && <p style={{color: 'red'}}>{error}</p>}
      {loading && <p>Cargando usuarios...</p>}

      {!loading && usuarios.length === 0 && (
        <p>No se encontraron usuarios</p>
      )}

      {!loading && usuarios.length > 0 && (
        <div>
          <h2>Usuarios ({usuarios.length})</h2>
          {usuarios.map((usuario) => (
            <div key={usuario.userId} style={{border: '1px solid #ccc', padding: '15px', marginBottom: '15px'}}>
              <h3>Usuario ID: {usuario.userId}</h3>
              <button onClick={() => setSelectedUser(selectedUser === usuario.userId ? null : usuario.userId)}>
                {selectedUser === usuario.userId ? 'Ocultar' : 'Ver'} InformacionPerfil
              </button>
              
              {selectedUser === usuario.userId && (
                <div style={{marginTop: '15px', background: '#f5f5f5', padding: '15px'}}>
                  <h4>InformacionPerfil ({usuario.perfiles.length} documentos)</h4>
                  {usuario.perfiles.map((perfil) => (
                    <div key={perfil.id} style={{marginBottom: '15px', padding: '10px', background: 'white'}}>
                      <strong>Documento: {perfil.id}</strong>
                      <pre style={{marginTop: '10px', overflow: 'auto'}}>
                        {JSON.stringify(perfil, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;