import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";

// --- IMPORTACIONES ---
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faLock, faEnvelope, faKey, faSignInAlt, faSpinner, faChartPie, 
    faSignOutAlt, faSearch, faUser, faChevronDown, faChevronRight, 
    faIdCard, faChartLine, faPills, faCalendarAlt, faBan,
    faFileArchive // <-- Icono para ZIP
} from '@fortawesome/free-solid-svg-icons';
// Librerías para ZIP
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ===================================================================
// --- COMPONENTE AUXILIAR: RenderDataList ---
// ===================================================================
const RenderDataList = ({ data, isNested = false }) => {
    // ... (Este componente no tiene cambios)
    const keys = Object.keys(data).filter(key => key !== 'id' && key !== 'fecha');
    const simpleKeys = [];
    const complexKeys = [];
    keys.forEach(key => {
        const value = data[key];
        if (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length > 0) {
            complexKeys.push(key);
        } else {
            simpleKeys.push(key);
        }
    });
    const orderedKeys = [...simpleKeys, ...complexKeys];
    if (orderedKeys.length === 0) {
        return <p style={{ color: '#6c757d', fontSize: '0.875rem', margin: 0 }}>No hay detalles adicionales</p>;
    }
    const renderItem = (key) => {
        let value = data[key];
        let displayValue;
        let isComplex = false;
        if (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length > 0) {
            isComplex = true;
            displayValue = (
                <div style={{ marginTop: '0.25rem', marginBottom: '0.25rem' }}>
                    <RenderDataList data={value} isNested={true} />
                </div>
            );
        } else if (Array.isArray(value)) {
             isComplex = true;
             displayValue = (
                 <div style={{ marginTop: '0.25rem', marginBottom: '0.25rem', marginLeft: '0.5rem' }}>
                     {value.map((item, index) => (
                         <div key={index} style={{ padding: '0.25rem', background: '#6c757d', color: 'white', borderRadius: '1rem', display: 'inline-block', margin: '0.125rem', fontSize: '0.75rem' }}>
                             {index + 1}: {typeof item === 'object' && item !== null ? '[Objeto]' : String(item)}
                         </div>
                     ))}
                 </div>
             );
        } else {
             if (typeof value === 'boolean') {
                 value = value ? 'Sí (true)' : 'No (false)';
             } else if (value === null || value === undefined) {
                 value = 'N/A';
             }
             value = String(value); 
             displayValue = (
                 <span style={{ background: '#6c757d', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem', marginLeft: 'auto', wordBreak: 'break-word' }}>
                     {value}
                 </span>
             );
        }
        const separator = isComplex && !isNested ? <hr style={{ margin: '0.25rem 0', borderTop: '1px solid rgba(0,0,0,0.1)' }} /> : null;
        return (
            <div key={key}>
                {separator}
                <div style={{ display: 'flex', alignItems: 'start', padding: '0.25rem 0.5rem', flexDirection: isComplex ? 'column' : 'row', justifyContent: isComplex ? 'flex-start' : 'space-between' }}>
                    <span style={{ fontWeight: 600, marginRight: '0.5rem', whiteSpace: 'nowrap' }}>{key}:</span>
                    {displayValue}
                </div>
            </div>
        );
    };
    return (
        <div style={{ fontSize: '0.875rem', borderLeft: isNested ? '2px solid #dee2e6' : 'none', marginLeft: isNested ? '0.5rem' : 0, paddingLeft: isNested ? '0.5rem' : 0 }}>
            {orderedKeys.map(renderItem)}
        </div>
    );
};

// ===================================================================
// --- COMPONENTE: LoginPage ---
// ===================================================================
function LoginPage() {
    // ... (Este componente no tiene cambios)
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

// ===================================================================
// --- FUNCIONES AUXILIARES PARA CSV (MODIFICADAS) ---
// ===================================================================

/**
 * Escapa un valor para que sea seguro en un CSV.
 */
const escapeCsvValue = (value) => {
    let stringValue = String(value ?? ''); // Convertir null/undefined a string vacío
    
    // Escapar comillas dobles duplicándolas
    if (stringValue.includes('"')) {
        stringValue = stringValue.replace(/"/g, '""');
    }
    
    // Poner comillas si el valor contiene comas, saltos de línea o comillas
    if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
        stringValue = `"${stringValue}"`;
    }
    
    return stringValue;
};

/**
 * Añade el BOM de UTF-8 al inicio del string CSV para que Excel lo lea correctamente.
 */
const addBOM = (csvString) => {
    return '\uFEFF' + csvString;
};

// Función para aplanar un objeto (maneja un nivel de anidación)
const flattenObject = (obj, prefix = '') => {
    return Object.keys(obj).reduce((acc, k) => {
        const pre = prefix.length ? prefix + '.' : '';
        if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
            Object.assign(acc, flattenObject(obj[k], pre + k));
        } else {
             const value = obj[k];
            acc[pre + k] = typeof value === 'boolean' ? (value ? 'true' : 'false') : (value ?? '');
        }
        return acc;
    }, {});
};

// --- PREPARACIÓN DE CSV (MODIFICADO para formato VERTICAL) ---

// Prepara datos de InformacionPerfil para CSV (Devuelve un string CSV vertical)
const prepareProfileCsv = (perfiles) => {
    if (!perfiles || perfiles.length === 0) return null;
    
    // Asumimos que solo hay un perfil, tomamos el primero
    const { id, ...rest } = perfiles[0];
    const flatData = flattenObject(rest);

    let csvContent = '"Cabecera","Valor"\n'; // Cabeceras
    
    Object.keys(flatData).sort().forEach(key => {
        csvContent += `${escapeCsvValue(key)},${escapeCsvValue(flatData[key])}\n`;
    });

    return addBOM(csvContent); // Añadimos BOM para Excel
};

// Prepara datos de Seguimiento para CSV (Devuelve array de {filename, csvString})
const prepareSeguimientoCsv = (seguimiento) => {
    if (!seguimiento || seguimiento.length === 0) return [];
    
    return seguimiento.map(seg => {
        const { id, fecha, ...rest } = seg;
        const flatRest = flattenObject(rest);

        let csvContent = '"Cabecera","Valor"\n'; // Cabeceras
        Object.keys(flatRest).sort().forEach(key => {
            csvContent += `${escapeCsvValue(key)},${escapeCsvValue(flatRest[key])}\n`;
        });
        
        return {
            filename: `Seguimiento/${fecha}.csv`, // Ruta dentro del ZIP
            csvString: addBOM(csvContent) // Añadimos BOM
        };
    });
};

// Prepara datos de TomasDiarias para CSV (Devuelve array de {filename, csvString})
// --- ¡MODIFICADO A FORMATO VERTICAL! ---
const prepareTomasCsv = (tomas) => {
    if (!tomas || tomas.length === 0) return [];
    const filesData = [];

    tomas.forEach(dia => {
        const fecha = dia.fecha;
        let csvContent = '"Cabecera","Valor"\n'; // Cabeceras
        let hasData = false;

        if (dia.tomas && typeof dia.tomas === 'object') {
            Object.keys(dia.tomas).forEach(horaProgramada => {
                const medicamentosEnHora = dia.tomas[horaProgramada];
                if (medicamentosEnHora && typeof medicamentosEnHora === 'object') {
                    Object.keys(medicamentosEnHora).forEach(nombreMedicamento => {
                        const registroToma = medicamentosEnHora[nombreMedicamento];
                        
                        // Creamos un prefijo para agrupar las filas
                        const prefix = `${horaProgramada} - ${nombreMedicamento}`;
                        
                        // Añadimos cada dato como una fila vertical
                        csvContent += `${escapeCsvValue(`${prefix} (Nombre)`)},${escapeCsvValue(nombreMedicamento)}\n`;
                        csvContent += `${escapeCsvValue(`${prefix} (Hora Prog.)`)},${escapeCsvValue(horaProgramada)}\n`;
                        csvContent += `${escapeCsvValue(`${prefix} (Tomado)`)},${escapeCsvValue(String(registroToma.tomado ?? ''))}\n`;
                        csvContent += `${escapeCsvValue(`${prefix} (Hora Real)`)},${escapeCsvValue(registroToma.horaReal || '')}\n`;
                        csvContent += `${escapeCsvValue("---")},${escapeCsvValue("---")}\n`; // Separador visual
                        
                        hasData = true;
                    });
                }
            });
        }

        if (hasData) {
             filesData.push({
                filename: `TomasDiarias/${fecha}.csv`, // Ruta dentro del ZIP
                csvString: addBOM(csvContent) // Añadimos BOM
            });
        }
    });

    return filesData; // Array de objetos { filename, csvString }
};


// ===================================================================
// --- COMPONENTE: AdminPanel ---
// ===================================================================
function AdminPanel({ currentUser }) {
    // ... (Estados sin cambios)
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedUsers, setExpandedUsers] = useState({});
    const [expandedSections, setExpandedSections] = useState({});
    const [expandedDates, setExpandedDates] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [downloadingZip, setDownloadingZip] = useState(null);

    useEffect(() => {
        // ... (fetchUsuarios sin cambios)
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
                    'rzf3EVR7h4Se4S1I91mNyEdQXUC3',
                ];
                const listaUsuarios = [];
                for (const userId of uids) {
                    try {
                        const [perfilSnap, segSnap, tomasSnap] = await Promise.all([
                            getDocs(collection(db, 'Usuarios', userId, 'InformacionPerfil')),
                            getDocs(collection(db, 'Usuarios', userId, 'Seguimiento')),
                            getDocs(collection(db, 'Usuarios', userId, 'TomasDiarias'))
                        ]);
                        const perfiles = perfilSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        const seguimiento = segSnap.docs.map(doc => ({ id: doc.id, fecha: doc.id, ...doc.data() })).sort((a, b) => b.fecha.localeCompare(a.fecha));
                        const tomas = tomasSnap.docs.map(doc => ({ id: doc.id, fecha: doc.id, ...doc.data() })).sort((a, b) => b.fecha.localeCompare(a.fecha));
                        listaUsuarios.push({
                            userId: userId,
                            nombre: perfiles.length > 0 ? perfiles[0].nombre || 'Sin nombre' : `Usuario ${userId.substring(0, 5)}...`,
                            perfiles: perfiles,
                            seguimiento: seguimiento,
                            tomas: tomas
                        });
                    } catch (err) {
                        console.log(`Error con usuario ${userId}:`, err.message);
                         listaUsuarios.push({ userId: userId, nombre: `Error al cargar ${userId.substring(0,5)}...`, perfiles: [], seguimiento: [], tomas: [] });
                    }
                }
                setUsuarios(listaUsuarios);
            } catch (error) {
                console.error("Error general al cargar usuarios:", error);
                setError("Error al cargar usuarios: " + error.message);
            } finally {
                setLoading(false);
            }
        };
        fetchUsuarios();
    }, []);

    // ... (filteredUsuarios y toggles sin cambios)
    const filteredUsuarios = usuarios.filter(usuario =>
        usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        usuario.userId.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const toggleUser = (userId) => setExpandedUsers(prev => ({ ...prev, [userId]: !prev[userId] }));
    const toggleSection = (key) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    const toggleDate = (key) => setExpandedDates(prev => ({ ...prev, [key]: !prev[key] }));

    // --- FUNCIÓN PRINCIPAL DE DESCARGA ZIP (MODIFICADA) ---
    const handleDownloadAllCsv = async (usuario) => {
        setDownloadingZip(usuario.userId);
        const zip = new JSZip();
        // Limpiamos el nombre para usarlo en el archivo y la carpeta raíz
        const nombreUsuario = usuario.nombre.replace(/[^a-zA-Z0-9]/g, '_') || `Usuario_${usuario.userId.substring(0,5)}`;

        // Creamos la carpeta raíz dentro del ZIP
        const rootFolder = zip.folder(nombreUsuario);

        // 1. Carpeta InformacionPerfil
        const profileCsvString = prepareProfileCsv(usuario.perfiles);
        if (profileCsvString) {
            // Añadimos el CSV dentro de una subcarpeta
            rootFolder.file(`InformacionPerfil/Perfil.csv`, profileCsvString);
        }

        // 2. Carpeta Seguimiento
        const seguimientoFiles = prepareSeguimientoCsv(usuario.seguimiento);
        if (seguimientoFiles.length > 0) {
            const segFolder = rootFolder.folder(`Seguimiento`);
            seguimientoFiles.forEach(fileInfo => {
                const filename = fileInfo.filename.split('/')[1]; // ej. "2025-10-28.csv"
                segFolder.file(filename, fileInfo.csvString); 
            });
        }

        // 3. Carpeta TomasDiarias
        const tomasFiles = prepareTomasCsv(usuario.tomas);
         if (tomasFiles.length > 0) {
            const tomasFolder = rootFolder.folder(`TomasDiarias`);
            tomasFiles.forEach(fileInfo => {
                const filename = fileInfo.filename.split('/')[1]; // ej. "2025-10-28.csv"
                tomasFolder.file(filename, fileInfo.csvString);
            });
        }
        
        // 4. Generar y descargar el ZIP
        try {
            const content = await zip.generateAsync({ type: "blob" });
            // El archivo ZIP ahora solo tiene el nombre de usuario
            saveAs(content, `${nombreUsuario}.zip`);
        } catch (error) {
            console.error("Error al generar el ZIP:", error);
            alert("Error al generar el archivo ZIP.");
        } finally {
            setDownloadingZip(null);
        }
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            {/* --- Cabecera y Barra de Búsqueda (Sin cambios) --- */}
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '2px solid #dee2e6', paddingBottom: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', margin: 0 }}>
                        <FontAwesomeIcon icon={faChartPie} style={{ marginRight: '10px' }} />
                        Panel de Administración
                    </h1>
                    <p style={{ color: '#6c757d', margin: '0.5rem 0 0 0' }}>Usuario: {currentUser.email}</p>
                </div>
                <button onClick={() => signOut(auth)} style={{ padding: '0.5rem 1rem', background: 'white', border: '1px solid #dee2e6', borderRadius: '4px', cursor: 'pointer' }}>
                    <FontAwesomeIcon icon={faSignOutAlt} style={{ marginRight: '8px' }} />
                    Cerrar Sesión
                </button>
            </div>
            <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f8f9fa', borderRadius: '8px' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '1rem' }}>
                    <FontAwesomeIcon icon={faSearch} style={{ marginRight: '8px' }} />
                    Buscar Usuario
                </label>
                <input
                    type="text"
                    placeholder="Busca por nombre o UID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', border: '2px solid #dee2e6', borderRadius: '4px', outline: 'none' }}
                />
            </div>
            
            {/* --- Estados de Carga/Error (Sin cambios) --- */}
            {error && <div style={{ padding: '1rem', marginBottom: '1rem', background: '#f8d7da', color: '#842029', borderRadius: '4px' }}>{error}</div>}
            {loading && (
                <div style={{ textAlign: 'center', padding: '3rem', fontSize: '1.25rem' }}>
                    <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '10px' }} />
                    Cargando usuarios...
                </div>
            )}
            {!loading && filteredUsuarios.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', background: '#e7f3ff', borderRadius: '8px' }}>
                    {searchTerm ? `No se encontraron usuarios con "${searchTerm}"` : 'No hay usuarios para mostrar'}
                </div>
            )}

            {/* --- Lista de Usuarios --- */}
            {!loading && filteredUsuarios.length > 0 && (
                <div>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Usuarios Registrados ({filteredUsuarios.length})</h2>
                    {filteredUsuarios.map((usuario) => (
                        <div key={usuario.userId} style={{ marginBottom: '1rem', border: '1px solid #dee2e6', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                            
                            {/* --- Cabecera del Usuario (con botón ZIP) --- */}
                            <div style={{ width: '100%', padding: '1rem', background: '#f8f9fa', border: 'none', textAlign: 'left', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <button
                                     onClick={() => toggleUser(usuario.userId)}
                                     style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexGrow: 1, textAlign: 'left' }}
                                >
                                    <div>
                                        <span style={{ fontWeight: 600, marginRight: '0.5rem' }}>
                                            <FontAwesomeIcon icon={faUser} style={{ marginRight: '8px' }} />
                                            {usuario.nombre}
                                        </span>
                                        <span style={{ color: '#6c757d', fontSize: '0.875rem' }}>ID: {usuario.userId}</span>
                                    </div>
                                </button>
                                
                                {/* --- BOTÓN PARA DESCARGAR TODO (ZIP) --- */}
                                <button
                                    onClick={() => handleDownloadAllCsv(usuario)}
                                    disabled={downloadingZip === usuario.userId}
                                    style={{ 
                                        padding: '0.5rem 1rem', 
                                        background: downloadingZip === usuario.userId ? '#adb5bd' : '#0d6efd', 
                                        color: 'white', 
                                        border: 'none', 
                                        borderRadius: '4px', 
                                        cursor: downloadingZip === usuario.userId ? 'not-allowed' : 'pointer',
                                        marginLeft: '1rem',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    {downloadingZip === usuario.userId ? (
                                        <>
                                            <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '8px' }} /> 
                                            Descargando...
                                        </>
                                    ) : (
                                        <>
                                            <FontAwesomeIcon icon={faFileArchive} style={{ marginRight: '8px' }} /> 
                                            Descargar ZIP
                                        </>
                                    )}
                                </button>
                                
                                <button
                                    onClick={() => toggleUser(usuario.userId)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 1rem' }}
                                >
                                    <FontAwesomeIcon icon={expandedUsers[usuario.userId] ? faChevronDown : faChevronRight} />
                                </button>
                            </div>

                            {/* --- Contenido Expandido (Secciones) --- */}
                            {expandedUsers[usuario.userId] && (
                                <div style={{ padding: '0' }}>
                                      {/* InformacionPerfil */}
                                    <div style={{ borderBottom: '1px solid #dee2e6' }}>
                                        <button
                                            onClick={() => toggleSection(`${usuario.userId}-perfil`)}
                                            style={{ width: '100%', padding: '0.75rem 1rem', background: '#e7f3ff', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                        >
                                            <span>
                                                <FontAwesomeIcon icon={faIdCard} fixedWidth style={{ marginRight: '8px' }} />
                                                InformacionPerfil ({usuario.perfiles.length})
                                            </span>
                                            <FontAwesomeIcon icon={expandedSections[`${usuario.userId}-perfil`] ? faChevronDown : faChevronRight} />
                                        </button>
                                        {expandedSections[`${usuario.userId}-perfil`] && (
                                            <div style={{ padding: '1rem', background: 'white' }}>
                                                  {usuario.perfiles.length === 0 && <p style={{ color: '#6c757d', fontSize: '0.875rem' }}>No hay registros</p>}
                                                {usuario.perfiles.map((perfil) => (
                                                    <div key={perfil.id} style={{ marginBottom: '1rem', padding: '0.75rem', border: '1px solid #cfe2ff', borderRadius: '4px', background: '#f8f9fa' }}>
                                                        <h6 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0d6efd', marginBottom: '0.5rem' }}>Documento: {perfil.id}</h6>
                                                        <RenderDataList data={perfil} />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {/* Seguimiento */}
                                    <div style={{ borderBottom: '1px solid #dee2e6' }}>
                                            <button
                                                onClick={() => toggleSection(`${usuario.userId}-seguimiento`)}
                                                style={{ width: '100%', padding: '0.75rem 1rem', background: '#d1e7dd', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                            >
                                                <span>
                                                    <FontAwesomeIcon icon={faChartLine} fixedWidth style={{ marginRight: '8px' }} />
                                                    Seguimiento ({usuario.seguimiento.length})
                                                </span>
                                                <FontAwesomeIcon icon={expandedSections[`${usuario.userId}-seguimiento`] ? faChevronDown : faChevronRight} />
                                            </button>
                                            {expandedSections[`${usuario.userId}-seguimiento`] && (
                                                <div style={{ padding: '1rem', background: 'white' }}>
                                                      {usuario.seguimiento.length === 0 && <p style={{ color: '#6c757d', fontSize: '0.875rem' }}>No hay registros</p>}
                                                    {usuario.seguimiento.map((seg) => {
                                                        const key = `seg-${usuario.userId}-${seg.id}`;
                                                        return (
                                                            <div key={seg.id} style={{ marginBottom: '0.5rem', border: '1px solid #dee2e6', borderRadius: '4px' }}>
                                                                <button
                                                                    onClick={() => toggleDate(key)}
                                                                    style={{ width: '100%', padding: '0.5rem', background: '#f8f9fa', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between' }}
                                                                >
                                                                     <span>
                                                                        <FontAwesomeIcon icon={faCalendarAlt} fixedWidth style={{ marginRight: '8px' }} />
                                                                        {seg.fecha}
                                                                    </span>
                                                                    <span>
                                                                        <FontAwesomeIcon icon={expandedDates[key] ? faChevronDown : faChevronRight} />
                                                                    </span>
                                                                </button>
                                                                {expandedDates[key] && (
                                                                    <div style={{ padding: '0.75rem', background: 'white' }}>
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
                                                style={{ width: '100%', padding: '0.75rem 1rem', background: '#fff3cd', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '0 0 8px 8px' }}
                                            >
                                                <span>
                                                    <FontAwesomeIcon icon={faPills} fixedWidth style={{ marginRight: '8px' }} />
                                                    TomasDiarias ({usuario.tomas.length})
                                                </span>
                                                <FontAwesomeIcon icon={expandedSections[`${usuario.userId}-tomas`] ? faChevronDown : faChevronRight} />
                                            </button>
                                            {expandedSections[`${usuario.userId}-tomas`] && (
                                                <div style={{ padding: '1rem', background: 'white' }}>
                                                     {usuario.tomas.length === 0 && <p style={{ color: '#6c757d', fontSize: '0.875rem' }}>No hay registros</p>}
                                                    {usuario.tomas.map((toma) => {
                                                        const key = `toma-${usuario.userId}-${toma.id}`;
                                                        return (
                                                            <div key={toma.id} style={{ marginBottom: '0.5rem', border: '1px solid #dee2e6', borderRadius: '4px' }}>
                                                                <button
                                                                    onClick={() => toggleDate(key)}
                                                                    style={{ width: '100%', padding: '0.5rem', background: '#f8f9fa', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between' }}
                                                                >
                                                                    <span>
                                                                        <FontAwesomeIcon icon={faCalendarAlt} fixedWidth style={{ marginRight: '8px' }} />
                                                                        {toma.fecha}
                                                                    </span>
                                                                    <span>
                                                                        <FontAwesomeIcon icon={expandedDates[key] ? faChevronDown : faChevronRight} />
                                                                    </span>
                                                                </button>
                                                                {expandedDates[key] && (
                                                                    <div style={{ padding: '0.75rem', background: 'white' }}>
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
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        );
    }
    return <AdminPanel currentUser={user} />;
}

export default App;

