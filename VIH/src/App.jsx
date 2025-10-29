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
  const [selectedSections, setSelectedSections] = useState({});
  const [expandedDates, setExpandedDates] = useState({});

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
            // Obtener InformacionPerfil
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

            // Obtener Seguimiento
            const seguimientoSnapshot = await getDocs(
              collection(db, 'Usuarios', userId, 'Seguimiento')
            );
            const seguimiento = [];
            seguimientoSnapshot.forEach((segDoc) => {
              seguimiento.push({
                id: segDoc.id,
                fecha: segDoc.id,
                ...segDoc.data()
              });
            });

            // Obtener TomasDiarias
            const tomasSnapshot = await getDocs(
              collection(db, 'Usuarios', userId, 'TomasDiarias')
            );
            const tomas = [];
            tomasSnapshot.forEach((tomaDoc) => {
              tomas.push({
                id: tomaDoc.id,
                fecha: tomaDoc.id,
                ...tomaDoc.data()
              });
            });

            listaUsuarios.push({
              userId: userId,
              nombre: perfiles.length > 0 ? perfiles[0].nombre || 'Sin nombre' : 'Sin nombre',
              perfiles: perfiles,
              seguimiento: seguimiento,
              tomas: tomas
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

  const toggleSection = (userId, section) => {
    const key = `${userId}-${section}`;
    setSelectedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleDate = (key) => {
    setExpandedDates(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

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
              <h3>👤 {usuario.nombre}</h3>
              <p style={{color: '#666', fontSize: '14px', margin: '5px 0 10px 0'}}>ID: {usuario.userId}</p>
              
              <div style={{display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap'}}>
                <button 
                  onClick={() => toggleSection(usuario.userId, 'perfil')}
                  style={{padding: '10px 15px', background: '#4682b4', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px'}}
                >
                  {selectedSections[`${usuario.userId}-perfil`] ? '🔽' : '▶️'} InformacionPerfil ({usuario.perfiles.length})
                </button>
                
                <button 
                  onClick={() => toggleSection(usuario.userId, 'seguimiento')}
                  style={{padding: '10px 15px', background: '#228b22', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px'}}
                >
                  {selectedSections[`${usuario.userId}-seguimiento`] ? '🔽' : '▶️'} Seguimiento ({usuario.seguimiento.length})
                </button>
                
                <button 
                  onClick={() => toggleSection(usuario.userId, 'tomas')}
                  style={{padding: '10px 15px', background: '#ff8c00', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px'}}
                >
                  {selectedSections[`${usuario.userId}-tomas`] ? '🔽' : '▶️'} TomasDiarias ({usuario.tomas.length})
                </button>
              </div>
              
              {/* InformacionPerfil */}
              {selectedSections[`${usuario.userId}-perfil`] && (
                <div style={{marginTop: '15px', padding: '15px', background: '#f0f8ff', border: '1px solid #4682b4'}}>
                  <h4>📋 InformacionPerfil</h4>
                  {usuario.perfiles.length === 0 && <p>No hay registros</p>}
                  {usuario.perfiles.map((perfil) => (
                    <div key={perfil.id} style={{marginBottom: '10px', padding: '10px', background: 'white'}}>
                      <strong>Documento: {perfil.id}</strong>
                      <pre style={{marginTop: '10px', overflow: 'auto', fontSize: '12px'}}>
                        {JSON.stringify(perfil, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}

              {/* Seguimiento */}
              {selectedSections[`${usuario.userId}-seguimiento`] && (
                <div style={{marginTop: '15px', padding: '15px', background: '#f0fff0', border: '1px solid #228b22'}}>
                  <h4>📊 Seguimiento</h4>
                  {usuario.seguimiento.length === 0 && <p>No hay registros</p>}
                  {usuario.seguimiento.map((seg) => {
                    const key = `seg-${usuario.userId}-${seg.id}`;
                    return (
                      <div key={seg.id} style={{marginBottom: '10px', border: '1px solid #ccc', background: 'white'}}>
                        <button 
                          onClick={() => toggleDate(key)}
                          style={{width: '100%', padding: '10px', textAlign: 'left', background: '#e8f5e9', border: 'none', cursor: 'pointer'}}
                        >
                          📅 {seg.fecha} {expandedDates[key] ? '▼' : '▶'}
                        </button>
                        {expandedDates[key] && (
                          <div style={{padding: '10px'}}>
                            <pre style={{overflow: 'auto', fontSize: '12px'}}>
                              {JSON.stringify(seg, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TomasDiarias */}
              {selectedSections[`${usuario.userId}-tomas`] && (
                <div style={{marginTop: '15px', padding: '15px', background: '#fff8f0', border: '1px solid #ff8c00'}}>
                  <h4>💊 TomasDiarias</h4>
                  {usuario.tomas.length === 0 && <p>No hay registros</p>}
                  {usuario.tomas.map((toma) => {
                    const key = `toma-${usuario.userId}-${toma.id}`;
                    return (
                      <div key={toma.id} style={{marginBottom: '10px', border: '1px solid #ccc', background: 'white'}}>
                        <button 
                          onClick={() => toggleDate(key)}
                          style={{width: '100%', padding: '10px', textAlign: 'left', background: '#fff3e0', border: 'none', cursor: 'pointer'}}
                        >
                          📅 {toma.fecha} {expandedDates[key] ? '▼' : '▶'}
                        </button>
                        {expandedDates[key] && (
                          <div style={{padding: '10px'}}>
                            <pre style={{overflow: 'auto', fontSize: '12px'}}>
                              {JSON.stringify(toma, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
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