import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";

// Importaciones de Font Awesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faLock, faEnvelope, faKey, faSignInAlt, faSpinner, faChartPie, 
  faSignOutAlt, faSearch, faUser, faChevronDown, faChevronRight, 
  faIdCard, faChartLine, faPills, faCalendarAlt, faBan 
} from '@fortawesome/free-solid-svg-icons';

const firebaseConfig = {
  apiKey: "AIzaSyDHMfAMvNcE5plC79ztJ1q6RtuwrB3D1qU",
  authDomain: "facisalud-afced.firebaseapp.com",
  projectId: "facisalud-afced",
  storageBucket: "facisalud-afced.firebasestorage.app",
  messagingSenderId: "367350759159",
  appId: "1:367350759159:web:5812800b3fd1e9da639df2",
  measurementId: "G-FY5YTMQJ3L"
};

// ... (El componente RenderDataList no necesita cambios, así que lo omito por brevedad) ...
const RenderDataList = ({ data, isNested = false }) => {
  const keys = Object.keys(data).filter(key => key !== 'id' && key !== 'fecha');
  const simpleKeys = [];
  const complexKeys = [];

  keys.forEach(key => {
    const value = data[key];
    if (typeof value === 'object' && value !== null) {
      complexKeys.push(key);
    } else {
      simpleKeys.push(key);
    }
  });

  const orderedKeys = [...simpleKeys, ...complexKeys];

  if (orderedKeys.length === 0) {
    return <p style={{color: '#6c757d', fontSize: '0.875rem', margin: 0}}>No hay detalles adicionales</p>;
  }
  
  const renderItem = (key) => {
    let value = data[key];
    let displayValue;
    let isComplex = false;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      isComplex = true;
      displayValue = (
        <div style={{marginTop: '0.25rem', marginBottom: '0.25rem'}}>
          <RenderDataList data={value} isNested={true} />
        </div>
      );
    } else if (Array.isArray(value)) {
      isComplex = true;
      displayValue = (
        <div style={{marginTop: '0.25rem', marginBottom: '0.25rem', marginLeft: '0.5rem'}}>
          {value.map((item, index) => (
            <div key={index} style={{padding: '0.25rem', background: '#6c757d', color: 'white', borderRadius: '1rem', display: 'inline-block', margin: '0.125rem', fontSize: '0.75rem'}}>
              {index + 1}: {typeof item === 'object' && item !== null ? '[Objeto]' : item.toString()}
            </div>
          ))}
        </div>
      );
    } else {
      if (typeof value === 'boolean') {
        value = value ? 'Sí (true)' : 'No (false)';
      }
      displayValue = (
        <span style={{background: '#6c757d', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem', marginLeft: 'auto'}}>
          {value.toString()}
        </span>
      );
    }
    
    const separator = isComplex && !isNested ? <hr style={{margin: '0.25rem 0', borderTop: '1px solid rgba(0,0,0,0.1)'}} /> : null;

    return (
      <div key={key}>
        {separator}
        <div style={{display: 'flex', alignItems: 'start', padding: '0.25rem 0.5rem', flexDirection: isComplex ? 'column' : 'row', justifyContent: isComplex ? 'flex-start' : 'space-between'}}>
          <span style={{fontWeight: 600, marginRight: '0.5rem'}}>{key}:</span>
          {displayValue}
        </div>
      </div>
    );
  };

  return (
    <div style={{fontSize: '0.875rem', borderLeft: isNested ? '2px solid #dee2e6' : 'none', marginLeft: isNested ? '0.5rem' : 0, paddingLeft: isNested ? '0.5rem' : 0}}>
      {orderedKeys.map(renderItem)}
    </div>
  );
};


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

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
      setError('Credenciales inválidas. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px'}}>
      <div style={{maxWidth: '400px', width: '100%', padding: '2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', borderRadius: '8px', background: 'white'}}>
        <h2 style={{textAlign: 'center', marginBottom: '1.5rem'}}>
          <FontAwesomeIcon icon={faLock} style={{ marginRight: '8px' }} /> 
          Login Admin
        </h2>
        <div>
          <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>
            <FontAwesomeIcon icon={faEnvelope} style={{ marginRight: '8px' }} />
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #ced4da', borderRadius: '4px'}}
          />
        </div>
        <div>
          <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>
            <FontAwesomeIcon icon={faKey} style={{ marginRight: '8px' }} />
            Contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            style={{width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #ced4da', borderRadius: '4px'}}
          />
        </div>
        {error && <div style={{padding: '0.75rem', marginBottom: '1rem', background: '#f8d7da', color: '#842029', borderRadius: '4px', fontSize: '0.875rem'}}>{error}</div>}
        <button
          onClick={handleLogin}
          disabled={loading || !email || !password}
          style={{width: '100%', padding: '0.75rem', background: loading ? '#6c757d' : '#0d6efd', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 500}}
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

function AdminPanel({ currentUser }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedUsers, setExpandedUsers] = useState({});
  const [expandedSections, setExpandedSections] = useState({});
  const [expandedDates, setExpandedDates] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchUsuarios = async () => {
      setLoading(true);
      setError('');
      try {
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
            const infoPerfilSnapshot = await getDocs(collection(db, 'Usuarios', userId, 'InformacionPerfil'));
            const perfiles = infoPerfilSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));

            const seguimientoSnapshot = await getDocs(collection(db, 'Usuarios', userId, 'Seguimiento'));
            const seguimiento = seguimientoSnapshot.docs.map(doc => ({id: doc.id, fecha: doc.id, ...doc.data()})).sort((a, b) => b.fecha.localeCompare(a.fecha));

            const tomasSnapshot = await getDocs(collection(db, 'Usuarios', userId, 'TomasDiarias'));
            const tomas = tomasSnapshot.docs.map(doc => ({id: doc.id, fecha: doc.id, ...doc.data()})).sort((a, b) => b.fecha.localeCompare(a.fecha));

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

  const filteredUsuarios = usuarios.filter(usuario => 
    usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    usuario.userId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleUser = (userId) => {
    setExpandedUsers(prev => ({...prev, [userId]: !prev[userId]}));
  };

  const toggleSection = (key) => {
    setExpandedSections(prev => ({...prev, [key]: !prev[key]}));
  };

  const toggleDate = (key) => {
    setExpandedDates(prev => ({...prev, [key]: !prev[key]}));
  };

  return (
    <div style={{maxWidth: '1200px', margin: '0 auto', padding: '2rem'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '2px solid #dee2e6', paddingBottom: '1rem'}}>
        <div>
          <h1 style={{fontSize: '1.75rem', margin: 0}}>
            <FontAwesomeIcon icon={faChartPie} style={{ marginRight: '10px' }} />
            Panel de Administración
          </h1>
          <p style={{color: '#6c757d', margin: '0.5rem 0 0 0'}}>Usuario: {currentUser.email}</p>
        </div>
        <button onClick={() => signOut(auth)} style={{padding: '0.5rem 1rem', background: 'white', border: '1px solid #6c757d', borderRadius: '4px', cursor: 'pointer'}}>
          <FontAwesomeIcon icon={faSignOutAlt} style={{ marginRight: '8px' }} />
          Cerrar Sesión
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div style={{marginBottom: '2rem', padding: '1.5rem', background: '#f8f9fa', borderRadius: '8px'}}>
        <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '1rem'}}>
          <FontAwesomeIcon icon={faSearch} style={{ marginRight: '8px' }} />
          Buscar Usuario
        </label>
        <input
          type="text"
          placeholder="Busca por nombre o UID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{width: '100%', padding: '0.75rem', fontSize: '1rem', border: '2px solid #dee2e6', borderRadius: '4px', outline: 'none'}}
        />
        {searchTerm && (
          <div style={{marginTop: '0.5rem', fontSize: '0.875rem', color: '#6c757d'}}>
            Mostrando {filteredUsuarios.length} de {usuarios.length} usuarios
          </div>
        )}
      </div>

      {error && <div style={{padding: '1rem', marginBottom: '1rem', background: '#f8d7da', color: '#842029', borderRadius: '4px'}}>{error}</div>}
      
      {loading && (
        <div style={{textAlign: 'center', padding: '3rem'}}>
          <div style={{fontSize: '1.25rem'}}>
            <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '10px' }} />
            Cargando usuarios...
          </div>
        </div>
      )}

      {!loading && filteredUsuarios.length === 0 && (
        <div style={{textAlign: 'center', padding: '3rem', background: '#e7f3ff', borderRadius: '8px'}}>
          {searchTerm ? `No se encontraron usuarios con "${searchTerm}"` : 'No hay usuarios'}
        </div>
      )}

      {!loading && filteredUsuarios.length > 0 && (
        <div>
          <h2 style={{fontSize: '1.25rem', marginBottom: '1rem'}}>Usuarios Registrados ({filteredUsuarios.length})</h2>

          {filteredUsuarios.map((usuario) => (
            <div key={usuario.userId} style={{marginBottom: '1rem', border: '1px solid #dee2e6', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'}}>
              <button
                onClick={() => toggleUser(usuario.userId)}
                style={{width: '100%', padding: '1rem', background: '#f8f9fa', border: 'none', textAlign: 'left', cursor: 'pointer', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}
              >
                <div>
                  <span style={{fontWeight: 600, marginRight: '0.5rem'}}>
                    <FontAwesomeIcon icon={faUser} style={{ marginRight: '8px' }} />
                    {usuario.nombre}
                  </span>
                  <span style={{color: '#6c757d', fontSize: '0.875rem'}}>ID: {usuario.userId}</span>
                </div>
                <span>
                  <FontAwesomeIcon icon={expandedUsers[usuario.userId] ? faChevronDown : faChevronRight} />
                </span>
              </button>

              {expandedUsers[usuario.userId] && (
                <div style={{padding: '0'}}>
                  
                  {/* InformacionPerfil */}
                  <div style={{borderBottom: '1px solid #dee2e6'}}>
                    <button
                      onClick={() => toggleSection(`${usuario.userId}-perfil`)}
                      style={{width: '100%', padding: '0.75rem 1rem', background: '#e7f3ff', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between'}}
                    >
                      <span>
                        <FontAwesomeIcon icon={faIdCard} fw style={{ marginRight: '8px' }} />
                        InformacionPerfil ({usuario.perfiles.length})
                      </span>
                      <span>
                        <FontAwesomeIcon icon={expandedSections[`${usuario.userId}-perfil`] ? faChevronDown : faChevronRight} />
                      </span>
                    </button>
                    {expandedSections[`${usuario.userId}-perfil`] && (
                      <div style={{padding: '1rem', background: 'white'}}>
                        {usuario.perfiles.length === 0 && <p style={{color: '#6c757d', fontSize: '0.875rem'}}>No hay registros</p>}
                        {usuario.perfiles.map((perfil) => (
                          <div key={perfil.id} style={{marginBottom: '1rem', padding: '0.75rem', border: '1px solid #cfe2ff', borderRadius: '4px', background: '#f8f9fa'}}>
                            <h6 style={{fontSize: '0.875rem', fontWeight: 600, color: '#0d6efd', marginBottom: '0.5rem'}}>Documento: {perfil.id}</h6>
                            <RenderDataList data={perfil} />
                          </div>
                        ))}
                     </div>
                    )}
                  </div>

                  {/* Seguimiento */}
                  <div style={{borderBottom: '1px solid #dee2e6'}}>
                    <button
                      onClick={() => toggleSection(`${usuario.userId}-seguimiento`)}
                      style={{width: '100%', padding: '0.75rem 1rem', background: '#d1e7dd', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between'}}
                    >
                      <span>
                        <FontAwesomeIcon icon={faChartLine} fw style={{ marginRight: '8px' }} />
                        Seguimiento ({usuario.seguimiento.length})
                      </span>
                      <span>
                        <FontAwesomeIcon icon={expandedSections[`${usuario.userId}-seguimiento`] ? faChevronDown : faChevronRight} />
                      </span>
                    </button>
                    {expandedSections[`${usuario.userId}-seguimiento`] && (
                      <div style={{padding: '1rem', background: 'white'}}>
                        {usuario.seguimiento.length === 0 && <p style={{color: '#6c757d', fontSize: '0.875rem'}}>No hay registros</p>}
                        {usuario.seguimiento.map((seg) => {
                          const key = `seg-${usuario.userId}-${seg.id}`;
                          return (
                            <div key={seg.id} style={{marginBottom: '0.5rem', border: '1px solid #dee2e6', borderRadius: '4px'}}>
                              <button
                                onClick={() => toggleDate(key)}
                                style={{width: '100%', padding: '0.5rem', background: '#f8f9fa', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between'}}
                              >
                                <span>
                                  <FontAwesomeIcon icon={faCalendarAlt} fw style={{ marginRight: '8px' }} />
                                  {seg.fecha}
                                </span>
                                <span>
                                  <FontAwesomeIcon icon={expandedDates[key] ? faChevronDown : faChevronRight} />
                                </span>
                             </button>
                              {expandedDates[key] && (
                                <div style={{padding: '0.75rem', background: 'white'}}>
                                  <RenderDataList data={seg} />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* TomasDiarias */}
                  <div>
                    <button
                      onClick={() => toggleSection(`${usuario.userId}-tomas`)}
                      style={{width: '100%', padding: '0.75rem 1rem', background: '#fff3cd', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between'}}
                    >
                      <span>
                        <FontAwesomeIcon icon={faPills} fw style={{ marginRight: '8px' }} />
                        TomasDiarias ({usuario.tomas.length})
                      </span>
                      <span>
                        <FontAwesomeIcon icon={expandedSections[`${usuario.userId}-tomas`] ? faChevronDown : faChevronRight} />
                      </span>
                    </button>
                    {expandedSections[`${usuario.userId}-tomas`] && (
                      <div style={{padding: '1rem', background: 'white'}}>
                        {usuario.tomas.length === 0 && <p style={{color: '#6c757d', fontSize: '0.875rem'}}>No hay registros</p>}
                        {usuario.tomas.map((toma) => {
                          const key = `toma-${usuario.userId}-${toma.id}`;
                          return (
                            <div key={toma.id} style={{marginBottom: '0.5rem', border: '1px solid #dee2e6', borderRadius: '4px'}}>
                              <button
                                 onClick={() => toggleDate(key)}
                                style={{width: '100%', padding: '0.5rem', background: '#f8f9fa', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between'}}
                              >
                                <span>
                                  <FontAwesomeIcon icon={faCalendarAlt} fw style={{ marginRight: '8px' }} />
                                  {toma.fecha}
                               </span>
                                <span>
                                  <FontAwesomeIcon icon={expandedDates[key] ? faChevronDown : faChevronRight} />
                                </span>
                              </button>
                              {expandedDates[key] && (
                                <div style={{padding: '0.75rem', background: 'white'}}>
                                  <RenderDataList data={toma} />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontSize: '1.25rem'}}>
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
      <div style={{textAlign: 'center', padding: '3rem'}}>
        <div style={{padding: '2rem', background: '#f8d7da', color: '#842029', borderRadius: '8px', maxWidth: '500px', margin: '0 auto'}}>
          <h2>
            <FontAwesomeIcon icon={faBan} style={{ marginRight: '8px' }} /> 
            Acceso Denegado
          </h2>
          <p>Tu cuenta no tiene permisos de administrador.</p>
          <button onClick={() => signOut(auth)} style={{padding: '0.5rem 1rem', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>
            <FontAwesomeIcon icon={faSignOutAlt} style={{ marginRight: '8px' }} />
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  return <AdminPanel currentUser={user} />;
}

export default App;