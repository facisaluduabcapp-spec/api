import React, { useState, useEffect } from 'react';
import './App.css'; // Opcional

// --- ¡NUEVA IMPORTACIÓN! ---
// Importamos 'db' y 'auth' desde nuestro archivo de configuración
// (Asegúrate de tener un archivo 'firebase.js' o 'firebase.jsx' que exporte esto)
import { db, auth } from './firebase'; 

// --- Importaciones de FUNCIONES de Firebase ---
// (Estas se quedan igual)
import { 
  collection, 
  getDocs, 
  query, 
  collectionGroup, 
  orderBy 
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  onAuthStateChanged,
  signOut
} from "firebase/auth";

// ===================================================================
// --- Componente Principal (Maneja el Login) ---
// ===================================================================
function App() {
  const [user, setUser] = useState(null); 
  const [loadingAuth, setLoadingAuth] = useState(true); 

  useEffect(() => {
    // 'auth' viene de nuestra importación
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user); 
      setLoadingAuth(false);
    });
    return () => unsubscribe(); 
  }, []);

  if (loadingAuth) {
    return <h1 style={{textAlign: 'center', fontFamily: 'Arial'}}>Cargando...</h1>
  }

  return (
    <div>
      {user ? <AdminDashboard currentUser={user} /> : <LoginPage />}
    </div>
  );
}

// ===================================================================
// --- Página de Login ---
// ===================================================================
function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      // 'auth' viene de nuestra importación
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError("Error al iniciar sesión. Revisa tus credenciales.");
      console.error(err);
    }
  };

  return (
    // ... (El JSX de LoginPage no cambia)
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', fontFamily: 'Arial' }}>
      <h2>Login de Administrador</h2>
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '10px' }}>
          <label>Email:</label><br/>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            style={{ width: '95%', padding: '8px' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Contraseña:</label><br/>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            style={{ width: '95%', padding: '8px' }}
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" style={{ padding: '10px 20px', width: '100%', fontSize: '16px' }}>Entrar</button>
      </form>
    </div>
  );
}


// ===================================================================
// --- Panel de Administrador (Tu solicitud principal) ---
// ===================================================================
function AdminDashboard({ currentUser }) {
  const [usersA, setUsersA] = useState([]);
  const [usersB, setUsersB] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null); 
  const [userResponses, setUserResponses] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingResponses, setLoadingResponses] = useState(false);

  // --- 1. Cargar las listas de usuarios (solo una vez) ---
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      const allUsers = [];
      try {
        // 'db' viene de nuestra importación
        // Esto está CORRECTO según tu imagen
        const profileQuery = query(collectionGroup(db, 'InformacionPerfil'));
        const querySnapshot = await getDocs(profileQuery);

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const userId = doc.ref.parent.parent.id; 
          allUsers.push({
            id: userId,
            nombre: data.nombre || 'Usuario Sin Nombre',
            tipoUsuario: data.tipoUsuario || 'Sin Grupo'
          });
        });

        setUsersA(allUsers.filter(user => user.tipoUsuario === 'A'));
        setUsersB(allUsers.filter(user => user.tipoUsuario === 'B'));

      } catch (error) {
        console.error("Error al cargar usuarios: ", error);
        alert("Error al cargar la lista de usuarios. Revisa tus Reglas de Firestore.");
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []); 

  // --- 2. Función para cargar datos cuando se selecciona un usuario ---
  const handleSelectUser = async (e) => {
    const userId = e.target.value;

    if (!userId) {
      setSelectedUser(null);
      setUserResponses([]);
      return;
    }

    const user = [...usersA, ...usersB].find(u => u.id === userId);
    setSelectedUser(user);
    setLoadingResponses(true);
    
    try {
      // 'db' viene de nuestra importación
      // 
      //  AQUÍ ESTÁ LA CORRECCIÓN 
      //
      const responsesQuery = query(
        collection(db, 'Usuarios', userId, 'TomasDiarias'), // ✅ CORREGIDO
        orderBy('fechaCreacion', 'desc') 
      );

      const responseSnapshot = await getDocs(responsesQuery);
      const responses = responseSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setUserResponses(responses);
    } catch (error) {
      console.error("Error al cargar respuestas: ", error);
      alert("Error al cargar las respuestas del usuario.");
    } finally {
      setLoadingResponses(false);
    }
  };
  
  const handleLogout = () => {
    // 'auth' viene de nuestra importación
    signOut(auth);
  };

  // --- 3. Renderizar el componente (la UI) ---
  return (
    // ... (El JSX de AdminDashboard no cambia)
    <div style={{ padding: '20px', fontFamily: 'Arial', maxWidth: '1000px', margin: 'auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ textAlign: 'center' }}>Panel de Administrador</h1>
        <button onClick={handleLogout} style={{ height: '40px', background: '#aa2222', color: 'white', border: 'none', padding: '0 20px', borderRadius: '5px', cursor: 'pointer' }}>Cerrar Sesión</button>
      </div>
      <p>Logueado como: {currentUser.email}</p>

      {loadingUsers && <p style={{ textAlign: 'center' }}>Cargando listas de usuarios...</p>}

      <div style={{ display: 'flex', justifyContent: 'space-around', gap: '20px', flexWrap: 'wrap', filter: loadingUsers ? 'blur(2px)' : 'none' }}>
        {/* Columna Grupo A */}
        <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', minWidth: '300px' }}>
          <h2>Grupo A</h2>
          <select onChange={handleSelectUser} style={{ width: '100%', padding: '8px', fontSize: '16px' }} disabled={loadingUsers}>
            <option value="">-- Selecciona un usuario --</option>
            {usersA.map(user => (
              <option key={user.id} value={user.id}>
                {user.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Columna Grupo B */}
        <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', minWidth: '300px' }}>
          <h2>Grupo B</h2>
          <select onChange={handleSelectUser} style={{ width: '100%', padding: '8px', fontSize: '16px' }} disabled={loadingUsers}>
            <option value="">-- Selecciona un usuario --</option>
            {usersB.map(user => (
              <option key={user.id} value={user.id}>
                {user.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <hr style={{ margin: '30px 0' }} />

      {/* --- Área de Resultados --- */}
      <div>
        {selectedUser && <h2 style={{ textAlign: 'center' }}>Historial de: {selectedUser.nombre}</h2>}
        
        {loadingResponses && <p style={{ textAlign: 'center' }}>Cargando respuestas...</p>}

        {!loadingResponses && userResponses.length === 0 && selectedUser && (
          <p style={{ textAlign: 'center' }}>Este usuario aún no tiene respuestas registradas.</p>
        )}

        {!loadingResponses && userResponses.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {userResponses.map(response => (
              <ResponseCard key={response.id} response={response} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ===================================================================
// --- Componente Auxiliar para mostrar cada respuesta ---
// ===================================================================
function ResponseCard({ response }) {
  const formattedDate = response.fechaCreacion 
    ? new Date(response.fechaCreacion.toDate()).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })
    : 'Fecha desconocida';

  const filteredEntries = Object.entries(response).filter(([key, value]) => 
    key !== 'id' && key !== 'fechaCreacion' && key !== 'fechaServidor' && key !== 'userId' && key !== 'createdAt'
  );

  return (
    <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', background: '#f9f9f9', overflowWrap: 'break-word' }}>
      <strong style={{ color: '#005a9c' }}>Fecha de Registro: {formattedDate}</strong>
      
      {filteredEntries.map(([key, value]) => (
        <div key={key} style={{ marginTop: '10px' }}>
          <strong style={{ textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}:</strong>
          <pre style={{ background: '#eee', padding: '5px', borderRadius: '4px', whiteSpace: 'pre-wrap', margin: '5px 0 0 0' }}>
            {JSON.stringify(value, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}

export default App;