import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";

// Importar componentes de React-Bootstrap
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import Spinner from 'react-bootstrap/Spinner';
import Card from 'react-bootstrap/Card';
import Accordion from 'react-bootstrap/Accordion';
import ListGroup from 'react-bootstrap/ListGroup';
import Form from 'react-bootstrap/Form';
import Badge from 'react-bootstrap/Badge';

// --- CONFIGURACIÓN Y SERVICIOS FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDHMfAMvNcE5plC79ztJ1q6RtuwrB3D1qU",
  authDomain: "facisalud-afced.firebaseapp.com",
  projectId: "facisalud-afced",
  storageBucket: "facisalud-afced.firebasestorage.app",
  messagingSenderId: "367350759159",
  appId: "1:367350759159:web:5812800b3fd1e9da639df2",
  measurementId: "G-FY5YTMQJ3L"
};
// --- FUNCIÓN DE AYUDA PARA RENDERIZAR DATOS MEJORADA (CON ORDEN) ---
const RenderDataList = ({ data, isNested = false }) => {
  // 1. Clasificar las claves
  const keys = Object.keys(data).filter(key => key !== 'id' && key !== 'fecha');
  const simpleKeys = [];
  const complexKeys = [];

  keys.forEach(key => {
    const value = data[key];
    // Un valor es complejo si es un objeto no nulo y no es un Array.
    // También consideramos los Arrays como complejos para ordenarlos.
    if (typeof value === 'object' && value !== null) {
      complexKeys.push(key);
    } else {
      simpleKeys.push(key);
    }
  });

  // El orden final será: simples + complejos
  const orderedKeys = [...simpleKeys, ...complexKeys];

  if (orderedKeys.length === 0) {
    return <p className="text-muted small m-0">No hay detalles adicionales en este registro.</p>;
  }
  
  // Función interna para renderizar un ítem
  const renderItem = (key) => {
    let value = data[key];
    let displayValue;
    let isComplex = false;
    let headerText = '';

    // 1. Manejo de objetos anidados (Maps de Firestore)
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      isComplex = true;
      displayValue = (
        <div className="mt-1 mb-1">
          <span className="fw-bold text-info">{headerText}</span>
          <RenderDataList data={value} isNested={true} />
        </div>
      );
    } 
    // 2. Manejo de Arrays
    else if (Array.isArray(value)) {
      isComplex = true;
      headerText = `→ Array (${value.length} elementos)`;
      displayValue = (
        <div className="mt-1 mb-1">
          <span className="fw-bold text-info">{headerText}</span>
          <ListGroup variant="flush" className="small ms-2 ps-2">
            {value.map((item, index) => (
                <ListGroup.Item key={index} className="py-0 px-2 border-0 bg-transparent">
                    <Badge bg="secondary" pill className="text-wrap text-start">
                        {index + 1}: {typeof item === 'object' && item !== null ? '[Objeto]' : item.toString()}
                    </Badge>
                </ListGroup.Item>
            ))}
          </ListGroup>
        </div>
      );
    } 
    // 3. Manejo de valores simples (Strings, Numbers, Booleans)
    else {
      if (typeof value === 'boolean') {
        value = value ? 'Sí (true)' : 'No (false)';
      }
      displayValue = (
        <Badge bg="secondary" pill className="text-wrap text-start ms-auto">
          {value.toString()}
        </Badge>
      );
    }
    
    // Si es un campo complejo y no estamos en una llamada anidada, agregamos una línea divisoria antes del Map/Array
    const separator = isComplex && !isNested ? <hr className="my-1 border-top border-secondary border-opacity-25" /> : null;

    return (
      <React.Fragment key={key}>
        {separator}
        <ListGroup.Item 
          // Usamos flexbox para alinear la clave y el valor
          className={`d-flex align-items-start py-1 px-2 ${isComplex ? 'flex-column' : 'justify-content-between'}`}
        >
          <span className="fw-semibold me-2">{key}:</span>
          {displayValue}
        </ListGroup.Item>
      </React.Fragment>
    );
  };

  // 2. Renderizar la lista
  return (
    <ListGroup variant="flush" className={`small ${isNested ? 'border-start ms-2 ps-2' : ''}`}>
      {orderedKeys.map(renderItem)}
    </ListGroup>
  );
};
// ------------------------------------------

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
// ------------------------------------------

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
      // Mensaje de error más genérico para seguridad
      setError('Credenciales inválidas. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
      <Card style={{ maxWidth: '400px', width: '100%' }} className="shadow-lg p-3">
        <Card.Body>
          <h2 className="text-center mb-4"> Login Admin</h2>
          <Form>
            <Form.Group className="mb-3" controlId="formBasicEmail">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                placeholder="Ingresa tu email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
            </Form.Group>

            <Form.Group className="mb-4" controlId="formBasicPassword">
              <Form.Label>Contraseña</Form.Label>
              <Form.Control
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                autoComplete="current-password"
              />
            </Form.Group>

            {error && <Alert variant="danger" className="py-2">{error}</Alert>}

            <Button
              variant="primary"
              onClick={handleLogin}
              disabled={loading || !email || !password}
              className="w-100"
            >
              {loading ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" /> : 'Entrar'}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}

// ------------------------------------------

function AdminPanel({ currentUser, db, auth }) {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedDates, setExpandedDates] = useState({});

    useEffect(() => {
        const fetchUsuarios = async () => {
            setLoading(true);
            setError('');
            try {
                // Lista hardcodeada de UIDs (Mantenida de tu código original)
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
                        // ... (Lógica de fetching se mantiene igual)
                        const infoPerfilSnapshot = await getDocs(
                            collection(db, 'Usuarios', userId, 'InformacionPerfil')
                        );
                        const perfiles = infoPerfilSnapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));

                        const seguimientoSnapshot = await getDocs(
                            collection(db, 'Usuarios', userId, 'Seguimiento')
                        );
                        const seguimiento = seguimientoSnapshot.docs
                            .map(doc => ({
                                id: doc.id,
                                fecha: doc.id,
                                ...doc.data()
                            }))
                            .sort((a, b) => b.fecha.localeCompare(a.fecha));

                        const tomasSnapshot = await getDocs(
                            collection(db, 'Usuarios', userId, 'TomasDiarias')
                        );
                        const tomas = tomasSnapshot.docs
                            .map(doc => ({
                                id: doc.id,
                                fecha: doc.id,
                                ...doc.data()
                            }))
                            .sort((a, b) => b.fecha.localeCompare(a.fecha));

                        listaUsuarios.push({
                            userId: userId,
                            nombre: perfiles.length > 0 ? perfiles[0].nombre || 'Sin nombre' : 'Sin nombre',
                            perfiles: perfiles,
                            seguimiento: seguimiento,
                            tomas: tomas
                        });
                    } catch (err) {
                        console.log(`Error al obtener datos para usuario ${userId}:`, err.message);
                    }
                }

                setUsuarios(listaUsuarios);
            } catch (error) {
                console.error("Error al cargar usuarios:", error);
                setError("Error al cargar usuarios: " + error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUsuarios();
    }, [db]);

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
        <Container className="my-5">
            {/* Encabezado y Botón de Cerrar Sesión (Se mantiene igual) */}
            <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
                <div>
                    <h1 className="h3">Panel de Administración </h1>
                    <p className="text-muted mb-0">Usuario: {currentUser.email}</p>
                </div>
                <Button variant="outline-secondary" onClick={handleLogout}>
                    Cerrar Sesión
                </Button>
            </div>

            {/* Indicadores de Estado (Se mantiene igual) */}
            {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
            {loading && (
                <div className="text-center my-5">
                    <Spinner animation="border" role="status" variant="secondary">
                        <span className="visually-hidden">Cargando usuarios...</span>
                    </Spinner>
                    <p className="mt-2 text-muted">Cargando usuarios...</p>
                </div>
            )}

            {!loading && usuarios.length === 0 && (
                <Alert variant="info" className="text-center my-5">
                    No se encontraron usuarios
                </Alert>
            )}

            {/* Lista de Usuarios */}
            {!loading && usuarios.length > 0 && (
                <div>
                    <h2 className="h4 mb-3">Usuarios Registrados ({usuarios.length})</h2>

                    <Accordion alwaysOpen>
                        {usuarios.map((usuario) => (
                            <Card key={usuario.userId} className="mb-3 shadow-sm border-light">
                                <Accordion.Item eventKey={usuario.userId}>
                                    <Accordion.Header className="py-2">
                                        <span className="fw-bold me-2"><i class="fa-solid fa-user"></i> {usuario.nombre}</span>
                                        <small className="text-muted">ID: {usuario.userId}</small>
                                    </Accordion.Header>
                                    <Accordion.Body className="p-0">
                                        <ListGroup variant="flush">

                                            {/* Sección InformacionPerfil */}
                                            <Accordion className="border-bottom">
                                                <Accordion.Item eventKey="perfil">
                                                    <Accordion.Header className="bg-light text-primary py-2 small">
                                                         InformacionPerfil ({usuario.perfiles.length})
                                                    </Accordion.Header>
                                                    <Accordion.Body className="p-3 bg-white">
                                                        {usuario.perfiles.length === 0 && <p className="text-muted small">No hay registros</p>}
                                                        {usuario.perfiles.map((perfil) => (
                                                            <Card key={perfil.id} className="mb-3 p-2 border-primary border-opacity-25 bg-light">
                                                                <h6 className="small fw-bold text-primary mb-2">Documento: {perfil.id}</h6>
                                                                <RenderDataList data={perfil} />
                                                            </Card>
                                                        ))}
                                                    </Accordion.Body>
                                                </Accordion.Item>
                                            </Accordion>

                                            {/* Sección Seguimiento */}
                                            <Accordion className="border-bottom">
                                                <Accordion.Item eventKey="seguimiento">
                                                    <Accordion.Header className="bg-light text-success py-2 small">
                                                        <i class="fa-solid fa-chart-simple"></i> Seguimiento ({usuario.seguimiento.length})
                                                    </Accordion.Header>
                                                    <Accordion.Body className="p-3 bg-white">
                                                        {usuario.seguimiento.length === 0 && <p className="text-muted small">No hay registros</p>}
                                                        {usuario.seguimiento.map((seg) => {
                                                            const key = `seg-${usuario.userId}-${seg.id}`;
                                                            return (
                                                                <div key={seg.id} className="mb-2 border rounded">
                                                                    <Button
                                                                        variant="light"
                                                                        className="w-100 text-start d-flex justify-content-between align-items-center py-2"
                                                                        onClick={() => toggleDate(key)}
                                                                    >
                                                                        <span className="small"> {seg.fecha}</span>
                                                                        <span className="small">{expandedDates[key] ? '▼' : '▶'}</span>
                                                                    </Button>
                                                                    {expandedDates[key] && (
                                                                        <div className="p-2 bg-light">
                                                                            <RenderDataList data={seg} />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </Accordion.Body>
                                                </Accordion.Item>
                                            </Accordion>

                                            {/* Sección TomasDiarias */}
                                            <Accordion>
                                                <Accordion.Item eventKey="tomas">
                                                    <Accordion.Header className="bg-light text-warning py-2 small">
                                                        <i class="fa-solid fa-pills"></i> TomasDiarias ({usuario.tomas.length})
                                                    </Accordion.Header>
                                                    <Accordion.Body className="p-3 bg-white">
                                                        {usuario.tomas.length === 0 && <p className="text-muted small">No hay registros</p>}
                                                        {usuario.tomas.map((toma) => {
                                                            const key = `toma-${usuario.userId}-${toma.id}`;
                                                            return (
                                                                <div key={toma.id} className="mb-2 border rounded">
                                                                    <Button
                                                                        variant="light"
                                                                        className="w-100 text-start d-flex justify-content-between align-items-center py-2"
                                                                        onClick={() => toggleDate(key)}
                                                                    >
                                                                        <span className="small"> {toma.fecha}</span>
                                                                        <span className="small">{expandedDates[key] ? '▼' : '▶'}</span>
                                                                    </Button>
                                                                    {expandedDates[key] && (
                                                                        <div className="p-2 bg-light">
                                                                            <RenderDataList data={toma} />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </Accordion.Body>
                                                </Accordion.Item>
                                            </Accordion>

                                        </ListGroup>
                                    </Accordion.Body>
                                </Accordion.Item>
                            </Card>
                        ))}
                    </Accordion>
                </div>
            )}
        </Container>
    );
}
// ------------------------------------------

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);
            if (user) {
                try {
                    // Verifica el rol de administrador en Firestore
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
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
                <Spinner animation="border" variant="primary" role="status" className="me-2" />
                <span className="text-muted">Cargando...</span>
            </div>
        );
    }

    if (!user) {
        return <LoginPage />;
    }

    if (!isAdmin) {
        return (
            <Container className="text-center my-5">
                <Alert variant="danger">
                    <h2>Acceso Denegado</h2>
                    <p>Tu cuenta no tiene permisos de administrador.</p>
                    <Button onClick={() => signOut(auth)} variant="secondary">Cerrar Sesión</Button>
                </Alert>
            </Container>
        );
    }

    // Se pasan db y auth al AdminPanel
    return <AdminPanel currentUser={user} db={db} auth={auth} />;
}

export default App;