/*
import React, { useState, useEffect } from 'react';
import RenderDataList from './RenderDataList'; // <-- Componente que ya independizaste

// Importaciones de Firebase (Asegúrate de que la ruta a tu módulo firebase.js sea correcta)
import { auth, signOut, db, collection, getDocs } from '../firebase/firebase'; 

// Importaciones para Descarga ZIP
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Importaciones de Íconos (Asumiendo que has creado el módulo Icons.jsx)
import { 
    FontAwesomeIcon, faChartPie, faSignOutAlt, faSearch, faSpinner,
    faUser, faChevronDown, faChevronRight, faFileArchive, 
    faIdCard, faChartLine, faPills, faCalendarAlt
} from './Icons'; // O de donde los importes directamente



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

// --- FUNCIÓN DE FETCHING DE DATOS (Puedes mantenerla dentro del componente o fuera) ---
// La mantendremos fuera para que sea más limpia de AdminPanel.
const fetchAllUsersData = async (db, UIDS_A_CARGAR) => {
    // ... tu lógica de fetching de Firebase usando getDocs, collection, etc.
    // Usaremos la lógica que tenías dentro del useEffect original:
    const listaUsuarios = [];
    for (const userId of UIDS_A_CARGAR) {
        try {
            const [perfilSnap, segSnap, tomasSnap] = await Promise.all([
                getDocs(collection(db, 'Usuarios', userId, 'InformacionPerfil')),
                getDocs(collection(db, 'Usuarios', userId, 'Seguimiento')),
                getDocs(collection(db, 'Usuarios', userId, 'TomasDiarias'))
            ]);
            const perfiles = perfilSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const sortFn = (a, b) => b.fecha.localeCompare(a.fecha); 
            const seguimiento = segSnap.docs.map(doc => ({ id: doc.id, fecha: doc.id, ...doc.data() })).sort(sortFn);
            const tomas = tomasSnap.docs.map(doc => ({ id: doc.id, fecha: doc.id, ...doc.data() })).sort(sortFn);

            listaUsuarios.push({
                userId: userId,
                nombre: perfiles.length > 0 ? perfiles[0].nombre || 'Sin nombre' : `Usuario ${userId.substring(0, 5)}...`,
                perfiles: perfiles,
                seguimiento: seguimiento,
                tomas: tomas
            });
        } catch (err) {
            console.error(`Error con usuario ${userId}:`, err.message);
             listaUsuarios.push({ userId: userId, nombre: `Error al cargar ${userId.substring(0,5)}...`, perfiles: [], seguimiento: [], tomas: [] });
        }
    }
    return listaUsuarios;
};


// ===================================================================
// --- SUB-COMPONENTES PARA LIMPIAR EL JSX ---
// ===================================================================

// 1. Componente para un ítem de fecha dentro de una sección (ej. Seguimiento)
const DateDetail = ({ data, parentKey, expandedDates, toggleDate, icon }) => {
    const key = `${parentKey}-${data.id}`;
    return (
        <div key={data.id} style={{ marginBottom: '0.5rem', border: '1px solid #dee2e6', borderRadius: '4px' }}>
            <button
                onClick={() => toggleDate(key)}
                style={{ width: '100%', padding: '0.5rem', background: '#f8f9fa', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between' }}
            >
                <span>
                    <FontAwesomeIcon icon={icon} fixedWidth style={{ marginRight: '8px' }} />
                    {data.fecha}
                </span>
                <span>
                    <FontAwesomeIcon icon={expandedDates[key] ? faChevronDown : faChevronRight} />
                </span>
            </button>
            {expandedDates[key] && (
                <div style={{ padding: '0.75rem', background: 'white' }}>
                    <RenderDataList data={data} />
                </div>
            )}
        </div>
    );
};

// 2. Componente para las secciones (Perfil, Seguimiento, TomasDiarias)
const SectionToggle = ({ title, data, icon, sectionKey, expandedSections, toggleSection, expandedDates, toggleDate, isList = false, listIcon = faCalendarAlt }) => {
    const isExpanded = expandedSections[sectionKey];
    const bgColor = sectionKey.includes('perfil') ? '#e7f3ff' : sectionKey.includes('seguimiento') ? '#d1e7dd' : '#fff3cd';

    return (
        <div style={{ borderBottom: '1px solid #dee2e6' }}>
            <button
                onClick={() => toggleSection(sectionKey)}
                style={{ width: '100%', padding: '0.75rem 1rem', background: bgColor, border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
                <span>
                    <FontAwesomeIcon icon={icon} fixedWidth style={{ marginRight: '8px' }} />
                    {title} ({data.length})
                </span>
                <FontAwesomeIcon icon={isExpanded ? faChevronDown : faChevronRight} />
            </button>
            {isExpanded && (
                <div style={{ padding: '1rem', background: 'white' }}>
                    {data.length === 0 && <p style={{ color: '#6c757d', fontSize: '0.875rem' }}>No hay registros</p>}
                    {isList ? (
                        data.map((item) => (
                            <DateDetail 
                                key={item.id} 
                                data={item} 
                                parentKey={sectionKey} 
                                expandedDates={expandedDates} 
                                toggleDate={toggleDate}
                                icon={listIcon}
                            />
                        ))
                    ) : (
                        data.map((perfil) => (
                            <div key={perfil.id} style={{ marginBottom: '1rem', padding: '0.75rem', border: '1px solid #cfe2ff', borderRadius: '4px', background: '#f8f9fa' }}>
                                <h6 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0d6efd', marginBottom: '0.5rem' }}>Documento: {perfil.id}</h6>
                                <RenderDataList data={perfil} />
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

// 3. Componente para la cabecera de cada usuario (con toggle y botón ZIP)
const UserHeader = ({ usuario, isExpanded, toggleUser, handleDownloadAllCsv, downloadingZip, handleDeleteUser, isDeletingUser }) => (
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
        
        <div style={{ display: 'flex', alignItems: 'center', marginLeft: '1rem' }}>

            <button
                onClick={() => handleDownloadAllCsv(usuario)}
                disabled={downloadingZip === usuario.userId || isDeletingUser}
                style={{ 
                    padding: '0.5rem 1rem', 
                    background: downloadingZip === usuario.userId ? '#adb5bd' : '#0d6efd', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px', 
                    cursor: (downloadingZip === usuario.userId || isDeletingUser) ? 'not-allowed' : 'pointer',
                    marginRight: '0.5rem',
                    display: 'flex',
                    alignItems: 'center'
                }}
            >
                {downloadingZip === usuario.userId ? (
                    <>
                        <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '8px' }} /> 
                        ZIP...
                    </>
                ) : (
                    <>
                        <FontAwesomeIcon icon={faFileArchive} style={{ marginRight: '8px' }} /> 
                        ZIP
                    </>
                )}
            </button>

            <button
                onClick={() => handleDeleteUser(usuario)}
                disabled={isDeletingUser} // Deshabilitamos si cualquier usuario se está eliminando
                style={{
                    padding: '0.5rem 1rem',
                    background: isDeletingUser ? '#adb5bd' : '#dc3545', // Rojo para peligro
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isDeletingUser ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                }}
            >
                <FontAwesomeIcon icon={isDeletingUser ? faSpinner : faSignOutAlt} spin={isDeletingUser} style={{ marginRight: '8px' }} />
                {isDeletingUser ? 'Eliminando...' : 'Eliminar'}
            </button>
        </div>

        <button
            onClick={() => toggleUser(usuario.userId)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 1rem' }}
        >
            <FontAwesomeIcon icon={isExpanded ? faChevronDown : faChevronRight} />
        </button>
    </div>
);

// ===================================================================
// --- COMPONENTE PRINCIPAL: AdminPanel ---
// ===================================================================
export default function AdminPanel({ currentUser }) {
    // --- ESTADOS ---
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedUsers, setExpandedUsers] = useState({});
    const [expandedSections, setExpandedSections] = useState({});
    const [expandedDates, setExpandedDates] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [downloadingZip, setDownloadingZip] = useState(null);
    const [isDeletingUser, setIsDeletingUser] = useState(false);

    // --- EFECTO DE CARGA DE DATOS ---
   useEffect(() => {
        const fetchUsuarios = async () => {
            setLoading(true);
            setError('');

            try {
                // 🔹 1️⃣ Obtener automáticamente los UIDs desde Firestore
                // Busca documentos en la colección raíz 'Usuarios'. El ID de cada documento es el UID.
                const snapshot = await getDocs(collection(db, "Usuarios"));
                const uids = snapshot.docs.map(doc => doc.id);

                if (uids.length === 0) {
                    console.warn("⚠️ No se encontraron usuarios en la colección 'Usuarios'");
                    setUsuarios([]);
                    setLoading(false);
                    return;
                }

                // 🔹 2️⃣ Cargar información de cada usuario
                const listaUsuarios = [];

                for (const userId of uids) {
                    try {
                        const [perfilSnap, segSnap, tomasSnap] = await Promise.all([
                            getDocs(collection(db, 'Usuarios', userId, 'InformacionPerfil')),
                            getDocs(collection(db, 'Usuarios', userId, 'Seguimiento')),
                            getDocs(collection(db, 'Usuarios', userId, 'TomasDiarias'))
                        ]);

                        const perfiles = perfilSnap.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data(),
                        }));

                        const seguimiento = segSnap.docs
                            .map(doc => ({ id: doc.id, fecha: doc.id, ...doc.data() }))
                            .sort((a, b) => b.fecha.localeCompare(a.fecha));

                        const tomas = tomasSnap.docs
                            .map(doc => ({ id: doc.id, fecha: doc.id, ...doc.data() }))
                            .sort((a, b) => b.fecha.localeCompare(a.fecha));

                        listaUsuarios.push({
                            userId: userId,
                            // Usa el nombre del perfil si existe, si no, usa un ID parcial
                            nombre:
                                perfiles.length > 0 && perfiles[0].nombre
                                    ? perfiles[0].nombre
                                    : `Usuario ${userId.substring(0, 5)}...`,
                            perfiles,
                            seguimiento,
                            tomas,
                        });
                    } catch (err) {
                        console.error(`Error con usuario ${userId}:`, err.message);
                        listaUsuarios.push({
                            userId: userId,
                            nombre: `Error al cargar ${userId.substring(0, 5)}...`,
                            perfiles: [],
                            seguimiento: [],
                            tomas: [],
                        });
                    }
                }

                // 🔹 3️⃣ Guardar resultado final
                setUsuarios(listaUsuarios);
            } catch (error) {
                console.error("❌ Error general al cargar usuarios:", error);
                setError("Error al cargar usuarios: " + error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUsuarios();
    }, []); // ⚠️ Dependencias vacías: se ejecuta solo al montar el componente

    // --- HANDLERS (Toggles y Búsqueda) ---
    const filteredUsuarios = usuarios.filter(usuario =>
        usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        usuario.userId.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const toggleUser = (userId) => setExpandedUsers(prev => ({ ...prev, [userId]: !prev[userId] }));
    const toggleSection = (key) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    const toggleDate = (key) => setExpandedDates(prev => ({ ...prev, [key]: !prev[key] }));
    
   const handleDeleteUser = async (usuario) => {
        const confirmar = window.confirm(`¿Seguro que deseas eliminar al usuario "${usuario.nombre}" y todos sus datos?`);
        if (!confirmar) return;

        // 💡 ACTIVAR ESTADO
        setIsDeletingUser(true); 

        try {
            const VERCEL_PROD_URL = 'https://api-ten-delta-47.vercel.app'; 

const response = await fetch(`${VERCEL_PROD_URL}/api/delete-user`, { // <-- ¡CAMBIO AQUÍ!
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId: usuario.userId }), 
});

            const data = await response.json();

            if (!response.ok) {
                // ...
            }

            // ... (restos de logs y alerts) ...
            setUsuarios(prev => prev.filter(u => u.userId !== usuario.userId));
            alert(`Usuario "${usuario.nombre}" eliminado correctamente. El servidor reportó: ${data.message}`);

        } catch (error) {
            console.error("❌ Error al eliminar usuario:", error);
            alert(`Error al eliminar usuario: ${error.message || 'Desconocido'}`);
        } finally {
            // 💡 DESACTIVAR ESTADO EN finally
            setIsDeletingUser(false); 
        }
    };
    // --- FUNCIÓN PRINCIPAL DE DESCARGA ZIP (USANDO FUNCIONES AUXILIARES) ---
    const handleDownloadAllCsv = async (usuario) => {
        // Lógica de descarga que usaste, encapsulada en la función downloadUserZip
        setDownloadingZip(usuario.userId);
        const zip = new JSZip();
        const nombreUsuario = usuario.nombre.replace(/[^a-zA-Z0-9]/g, '_') || `Usuario_${usuario.userId.substring(0,5)}`;
        const rootFolder = zip.folder(nombreUsuario);

        const profileCsvString = prepareProfileCsv(usuario.perfiles);
        if (profileCsvString) {
            rootFolder.file(`InformacionPerfil/Perfil.csv`, profileCsvString);
        }

        const seguimientoFiles = prepareSeguimientoCsv(usuario.seguimiento);
        if (seguimientoFiles.length > 0) {
            const segFolder = rootFolder.folder(`Seguimiento`);
            seguimientoFiles.forEach(fileInfo => {
                const filename = fileInfo.filename.split('/')[1]; 
                segFolder.file(filename, fileInfo.csvString); 
            });
        }

        const tomasFiles = prepareTomasCsv(usuario.tomas);
        if (tomasFiles.length > 0) {
            const tomasFolder = rootFolder.folder(`TomasDiarias`);
            tomasFiles.forEach(fileInfo => {
                const filename = fileInfo.filename.split('/')[1]; 
                tomasFolder.file(filename, fileInfo.csvString);
            });
        }
        
        try {
            const content = await zip.generateAsync({ type: "blob" });
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

            {!loading && filteredUsuarios.length > 0 && (
                <div>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Usuarios Registrados ({filteredUsuarios.length})</h2>
                    {filteredUsuarios.map((usuario) => {
                        const isUserExpanded = expandedUsers[usuario.userId];
                        return (
                            <div key={usuario.userId} style={{ marginBottom: '1rem', border: '1px solid #dee2e6', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                
                               <UserHeader 
    usuario={usuario}
    isExpanded={isUserExpanded}
    toggleUser={toggleUser}
    handleDownloadAllCsv={handleDownloadAllCsv}
    downloadingZip={downloadingZip}
    // 💡 PROPS FALTANTES
    handleDeleteUser={handleDeleteUser} 
    isDeletingUser={isDeletingUser}
/>
                                {isUserExpanded && (
                                    <div style={{ padding: '0' }}>
                                        
                                        <SectionToggle
                                            title="InformacionPerfil"
                                            data={usuario.perfiles}
                                            icon={faIdCard}
                                            sectionKey={`${usuario.userId}-perfil`}
                                            expandedSections={expandedSections}
                                            toggleSection={toggleSection}
                                            isList={false}
                                        />
                                        
                                        <SectionToggle
                                            title="Seguimiento"
                                            data={usuario.seguimiento}
                                            icon={faChartLine}
                                            sectionKey={`${usuario.userId}-seguimiento`}
                                            expandedSections={expandedSections}
                                            toggleSection={toggleSection}
                                            expandedDates={expandedDates}
                                            toggleDate={toggleDate}
                                            isList={true}
                                        />
                                        
                                        <SectionToggle
                                            title="TomasDiarias"
                                            data={usuario.tomas}
                                            icon={faPills}
                                            sectionKey={`${usuario.userId}-tomas`}
                                            expandedSections={expandedSections}
                                            toggleSection={toggleSection}
                                            expandedDates={expandedDates}
                                            toggleDate={toggleDate}
                                            isList={true}
                                            listIcon={faCalendarAlt}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}*/

/*
import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { collection, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { faTrash } from '@fortawesome/free-solid-svg-icons';

// --- IMPORTACIONES ---
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faLock, faEnvelope, faKey, faSignInAlt, faSpinner, faChartPie, 
    faSignOutAlt, faSearch, faUser, faChevronDown, faChevronRight, 
    faIdCard, faChartLine, faPills, faCalendarAlt, faBan,
    faFileArchive
} from '@fortawesome/free-solid-svg-icons';
import { getFunctions, httpsCallable } from "firebase/functions";
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
        <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '100vh', 
            padding: '20px',
            background: 'linear-gradient(135deg, #667eea 0%, #204194 100%)'
        }}>
            <div style={{ 
                maxWidth: '400px', 
                width: '100%', 
                padding: '2.5rem', 
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)', 
                borderRadius: '16px', 
                background: 'white' 
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ 
                        width: '70px', 
                        height: '70px', 
                        background: 'linear-gradient(135deg, #667eea 0%, #204194 100%)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem',
                        boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
                    }}>
                        <FontAwesomeIcon icon={faLock} style={{ fontSize: '1.8rem', color: 'white' }} />
                    </div>
                    <h2 style={{ margin: 0, fontSize: '1.75rem', color: '#333' }}>
                        Administración
                    </h2>
                    <p style={{ color: '#6c757d', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                        Ingresa tus credenciales
                    </p>
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#495057', fontSize: '0.9rem' }}>
                        <FontAwesomeIcon icon={faEnvelope} style={{ marginRight: '8px', color: '#667eea' }} />
                        Email
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{ 
                            width: '100%', 
                            padding: '0.75rem', 
                            marginBottom: '1.25rem', 
                            border: '2px solid #e9ecef', 
                            borderRadius: '8px',
                            fontSize: '1rem',
                            transition: 'border 0.3s',
                            outline: 'none'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#667eea'}
                        onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#495057', fontSize: '0.9rem' }}>
                        <FontAwesomeIcon icon={faKey} style={{ marginRight: '8px', color: '#667eea' }} />
                        Contraseña
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                        style={{ 
                            width: '100%', 
                            padding: '0.75rem', 
                            marginBottom: '1.25rem', 
                            border: '2px solid #e9ecef', 
                            borderRadius: '8px',
                            fontSize: '1rem',
                            transition: 'border 0.3s',
                            outline: 'none'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#667eea'}
                        onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                    />
                </div>
                {error && (
                    <div style={{ 
                        padding: '0.75rem', 
                        marginBottom: '1rem', 
                        background: '#fee', 
                        color: '#c33', 
                        borderRadius: '8px', 
                        fontSize: '0.875rem',
                        border: '1px solid #fcc'
                    }}>
                        {error}
                    </div>
                )}
                <button
                    onClick={handleLogin}
                    disabled={loading || !email || !password}
                    style={{ 
                        width: '100%', 
                        padding: '0.875rem', 
                        background: loading ? '#adb5bd' : 'linear-gradient(135deg, #667eea 0%, #204194 100%)', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '8px', 
                        cursor: loading ? 'not-allowed' : 'pointer', 
                        fontWeight: 600,
                        fontSize: '1rem',
                        boxShadow: loading ? 'none' : '0 4px 15px rgba(102, 126, 234, 0.4)',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        if (!loading) {
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = loading ? 'none' : '0 4px 15px rgba(102, 126, 234, 0.4)';
                    }}
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
// --- FUNCIONES AUXILIARES PARA CSV ---
// ===================================================================

const escapeCsvValue = (value) => {
    let stringValue = String(value ?? '');
    if (stringValue.includes('"')) {
        stringValue = stringValue.replace(/"/g, '""');
    }
    if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
        stringValue = `"${stringValue}"`;
    }
    return stringValue;
};

const addBOM = (csvString) => {
    return '\uFEFF' + csvString;
};

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

const prepareProfileCsv = (perfiles) => {
    if (!perfiles || perfiles.length === 0) return null;
    const { id, ...rest } = perfiles[0];
    const flatData = flattenObject(rest);
    let csvContent = '"Cabecera","Valor"\n';
    Object.keys(flatData).sort().forEach(key => {
        csvContent += `${escapeCsvValue(key)},${escapeCsvValue(flatData[key])}\n`;
    });
    return addBOM(csvContent);
};

const prepareSeguimientoCsv = (seguimiento) => {
    if (!seguimiento || seguimiento.length === 0) return [];
    return seguimiento.map(seg => {
        const { id, fecha, ...rest } = seg;
        const flatRest = flattenObject(rest);
        let csvContent = '"Cabecera","Valor"\n';
        Object.keys(flatRest).sort().forEach(key => {
            csvContent += `${escapeCsvValue(key)},${escapeCsvValue(flatRest[key])}\n`;
        });
        return {
            filename: `Seguimiento/${fecha}.csv`,
            csvString: addBOM(csvContent)
        };
    });
};

const prepareTomasCsv = (tomas) => {
    if (!tomas || tomas.length === 0) return [];
    const filesData = [];
    tomas.forEach(dia => {
        const fecha = dia.fecha;
        let csvContent = '"Cabecera","Valor"\n';
        let hasData = false;
        if (dia.tomas && typeof dia.tomas === 'object') {
            Object.keys(dia.tomas).forEach(horaProgramada => {
                const medicamentosEnHora = dia.tomas[horaProgramada];
                if (medicamentosEnHora && typeof medicamentosEnHora === 'object') {
                    Object.keys(medicamentosEnHora).forEach(nombreMedicamento => {
                        const registroToma = medicamentosEnHora[nombreMedicamento];
                        const prefix = `${horaProgramada} - ${nombreMedicamento}`;
                        csvContent += `${escapeCsvValue(`${prefix} (Nombre)`)},${escapeCsvValue(nombreMedicamento)}\n`;
                        csvContent += `${escapeCsvValue(`${prefix} (Hora Prog.)`)},${escapeCsvValue(horaProgramada)}\n`;
                        csvContent += `${escapeCsvValue(`${prefix} (Tomado)`)},${escapeCsvValue(String(registroToma.tomado ?? ''))}\n`;
                        csvContent += `${escapeCsvValue(`${prefix} (Hora Real)`)},${escapeCsvValue(registroToma.horaReal || '')}\n`;
                        csvContent += `${escapeCsvValue("---")},${escapeCsvValue("---")}\n`;
                        hasData = true;
                    });
                }
            });
        }
        if (hasData) {
             filesData.push({
                filename: `TomasDiarias/${fecha}.csv`,
                csvString: addBOM(csvContent)
            });
        }
    });
    return filesData;
};

// ===================================================================
// --- COMPONENTE: AdminPanel ---
// ===================================================================
function AdminPanel({ currentUser }) {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedUsers, setExpandedUsers] = useState({});
    const [expandedSections, setExpandedSections] = useState({});
    const [expandedDates, setExpandedDates] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [downloadingZip, setDownloadingZip] = useState(null);
    const [uids, setUids] = useState([]);
    const [deletingUser, setDeletingUser] = useState(null);
   
    const functions = getFunctions();
    const deleteUserCompletely = httpsCallable(functions, "deleteUserCompletely");

    useEffect(() => {
        const cargarUsuarios = async () => {
            try {
                const snapshot = await getDocs(collection(db, "Usuarios"));
                const ids = snapshot.docs.map(doc => doc.id);
                console.log("✅ UIDs detectados automáticamente:", ids);
                setUids(ids);
            } catch (error) {
                console.error("❌ Error al obtener los usuarios:", error);
            }
        };
        cargarUsuarios();
    }, []);

    useEffect(() => {
        const fetchUsuarios = async () => {
            setLoading(true);
            setError('');
            try {
                const snapshot = await getDocs(collection(db, "Usuarios"));
                const uids = snapshot.docs.map(doc => doc.id);
                if (uids.length === 0) {
                    console.warn("⚠️ No se encontraron usuarios en la colección 'Usuarios'");
                    setUsuarios([]);
                    setLoading(false);
                    return;
                }
                const listaUsuarios = [];
                for (const userId of uids) {
                    try {
                        const [perfilSnap, segSnap, tomasSnap] = await Promise.all([
                            getDocs(collection(db, 'Usuarios', userId, 'InformacionPerfil')),
                            getDocs(collection(db, 'Usuarios', userId, 'Seguimiento')),
                            getDocs(collection(db, 'Usuarios', userId, 'TomasDiarias'))
                        ]);
                        const perfiles = perfilSnap.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data(),
                        }));
                        const seguimiento = segSnap.docs
                            .map(doc => ({ id: doc.id, fecha: doc.id, ...doc.data() }))
                            .sort((a, b) => b.fecha.localeCompare(a.fecha));
                        const tomas = tomasSnap.docs
                            .map(doc => ({ id: doc.id, fecha: doc.id, ...doc.data() }))
                            .sort((a, b) => b.fecha.localeCompare(a.fecha));
                        listaUsuarios.push({
                            userId: userId,
                            nombre:
                                perfiles.length > 0
                                    ? perfiles[0].nombre || 'Sin nombre'
                                    : `Usuario ${userId.substring(0, 5)}...`,
                            perfiles,
                            seguimiento,
                            tomas,
                        });
                    } catch (err) {
                        console.error(`Error con usuario ${userId}:`, err.message);
                        listaUsuarios.push({
                            userId: userId,
                            nombre: `Error al cargar ${userId.substring(0, 5)}...`,
                            perfiles: [],
                            seguimiento: [],
                            tomas: [],
                        });
                    }
                }
                setUsuarios(listaUsuarios);
            } catch (error) {
                console.error("❌ Error general al cargar usuarios:", error);
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
    
    const toggleUser = (userId) => setExpandedUsers(prev => ({ ...prev, [userId]: !prev[userId] }));
    const toggleSection = (key) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    const toggleDate = (key) => setExpandedDates(prev => ({ ...prev, [key]: !prev[key] }));

    const handleDeleteUser = async (usuario) => {
        const confirmDelete = window.confirm(
            `¿Estás seguro de que deseas eliminar al usuario "${usuario.nombre}" (${usuario.userId})?\n\n` +
            `Esta acción NO SE PUEDE DESHACER y eliminará el usuario de Firebase Authentication.\n\n` +
            `NOTA: Los datos en Firestore NO se eliminarán automáticamente.`
        );
        
        if (!confirmDelete) return;
        setDeletingUser(usuario.userId);

        try {
            const adminToken = await currentUser.getIdToken();
            const response = await fetch('/api/deleteUser', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    uid: usuario.userId,
                    adminToken: adminToken
                })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Error al eliminar usuario');
            }
            setUsuarios(prev => prev.filter(u => u.userId !== usuario.userId));
            alert(`✓ Usuario "${usuario.nombre}" eliminado exitosamente de Firebase Authentication.`);
        } catch (error) {
            console.error('Error al eliminar usuario:', error);
            alert(`Error al eliminar usuario: ${error.message}`);
        } finally {
            setDeletingUser(null);
        }
    };

    const handleDownloadAllCsv = async (usuario) => {
        setDownloadingZip(usuario.userId);
        const zip = new JSZip();
        const nombreUsuario = usuario.nombre.replace(/[^a-zA-Z0-9]/g, '_') || `Usuario_${usuario.userId.substring(0,5)}`;
        const rootFolder = zip.folder(nombreUsuario);
        
        const profileCsvString = prepareProfileCsv(usuario.perfiles);
        if (profileCsvString) {
            rootFolder.file(`InformacionPerfil/Perfil.csv`, profileCsvString);
        }
        
        const seguimientoFiles = prepareSeguimientoCsv(usuario.seguimiento);
        if (seguimientoFiles.length > 0) {
            const segFolder = rootFolder.folder(`Seguimiento`);
            seguimientoFiles.forEach(fileInfo => {
                const filename = fileInfo.filename.split('/')[1];
                segFolder.file(filename, fileInfo.csvString); 
            });
        }
        
        const tomasFiles = prepareTomasCsv(usuario.tomas);
        if (tomasFiles.length > 0) {
            const tomasFolder = rootFolder.folder(`TomasDiarias`);
            tomasFiles.forEach(fileInfo => {
                const filename = fileInfo.filename.split('/')[1];
                tomasFolder.file(filename, fileInfo.csvString);
            });
        }
        
        try {
            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, `${nombreUsuario}.zip`);
        } catch (error) {
            console.error("Error al generar el ZIP:", error);
            alert("Error al generar el archivo ZIP.");
        } finally {
            setDownloadingZip(null);
        }
    };
   
    return (
        <div style={{ 
            minHeight: '100vh',
            background: 'linear-gradient(to bottom, #f8f9fa 0%, #e9ecef 100%)',
            padding: '2rem'
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                
                <div style={{ 
                    background: 'white',
                    borderRadius: '16px',
                    padding: '2rem',
                    marginBottom: '2rem',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h1 style={{ 
                            fontSize: '2rem', 
                            margin: 0,
                            background: 'linear-gradient(135deg, #667eea 0%, #204194 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            fontWeight: '700'
                        }}>
                            <FontAwesomeIcon icon={faChartPie} style={{ marginRight: '12px' }} />
                            Panel de Administración
                        </h1>
                        <p style={{ color: '#6c757d', margin: '0.5rem 0 0 0', fontSize: '0.95rem' }}>
                            <FontAwesomeIcon icon={faUser} style={{ marginRight: '6px' }} />
                            {currentUser.email}
                        </p>
                    </div>
                    <button 
                        onClick={() => signOut(auth)} 
                        style={{ 
                            padding: '0.75rem 1.5rem', 
                            background: 'white',
                            color: '#667eea',
                            border: '2px solid #667eea', 
                            borderRadius: '10px', 
                            cursor: 'pointer',
                            fontWeight: '600',
                            transition: 'all 0.3s'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.background = '#667eea';
                            e.target.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'white';
                            e.target.style.color = '#667eea';
                        }}
                    >
                        <FontAwesomeIcon icon={faSignOutAlt} style={{ marginRight: '8px' }} />
                        Cerrar Sesión
                    </button>
                </div>

              
                <div style={{ 
                    background: 'white',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    marginBottom: '2rem',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.07)'
                }}>
                    <label style={{ 
                        display: 'block', 
                        marginBottom: '0.75rem', 
                        fontWeight: 600, 
                        fontSize: '1rem',
                        color: '#495057'
                    }}>
                        <FontAwesomeIcon icon={faSearch} style={{ marginRight: '8px', color: '#667eea' }} />
                        Buscar Usuario
                    </label>
                    <input
                        type="text"
                        placeholder="Busca por nombre o UID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ 
                            width: '100%', 
                            padding: '0.875rem', 
                            fontSize: '1rem', 
                            border: '2px solid #e9ecef', 
                            borderRadius: '10px', 
                            outline: 'none',
                            transition: 'border 0.3s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#667eea'}
                        onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                    />
                </div>
            
             
                {error && (
                    <div style={{ 
                        padding: '1rem', 
                        marginBottom: '1rem', 
                        background: '#fee', 
                        color: '#c33', 
                        borderRadius: '12px',
                        border: '1px solid #fcc'
                    }}>
                        {error}
                    </div>
                )}
                
                {loading && (
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '4rem',
                        background: 'white',
                        borderRadius: '16px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.07)'
                    }}>
                        <FontAwesomeIcon 
                            icon={faSpinner} 
                            spin 
                            style={{ 
                                fontSize: '3rem', 
                                color: '#667eea',
                                marginBottom: '1rem'
                            }} 
                        />
                        <p style={{ fontSize: '1.1rem', color: '#6c757d', margin: 0 }}>
                            Cargando usuarios...
                        </p>
                    </div>
                )}
                
                {!loading && filteredUsuarios.length === 0 && (
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '4rem', 
                        background: 'white',
                        borderRadius: '16px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.07)'
                    }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            background: 'linear-gradient(135deg, #667eea 0%, #204194 100%)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.5rem',
                            opacity: 0.8
                        }}>
                            <FontAwesomeIcon icon={faSearch} style={{ fontSize: '2rem', color: 'white' }} />
                        </div>
                        <p style={{ fontSize: '1.1rem', color: '#6c757d' }}>
                            {searchTerm ? `No se encontraron usuarios con "${searchTerm}"` : 'No hay usuarios para mostrar'}
                        </p>
                    </div>
                )}

             
                {!loading && filteredUsuarios.length > 0 && (
                    <div>
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            marginBottom: '1.5rem'
                        }}>
                            <h2 style={{ 
                                fontSize: '1.5rem', 
                                margin: 0,
                                color: '#495057',
                                fontWeight: '600'
                            }}>
                                Usuarios Registrados
                            </h2>
                            <span style={{
                                background: 'linear-gradient(135deg, #667eea 0%, #204194 100%)',
                                color: 'white',
                                padding: '0.5rem 1rem',
                                borderRadius: '20px',
                                fontWeight: '600',
                                fontSize: '0.9rem'
                            }}>
                                {filteredUsuarios.length} {filteredUsuarios.length === 1 ? 'usuario' : 'usuarios'}
                            </span>
                        </div>
                        
                        {filteredUsuarios.map((usuario) => (
                            <div 
                                key={usuario.userId} 
                                style={{ 
                                    marginBottom: '1.5rem', 
                                    background: 'white',
                                    borderRadius: '16px', 
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                                    overflow: 'hidden',
                                    transition: 'transform 0.2s, box-shadow 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 8px 15px rgba(0,0,0,0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.07)';
                                }}
                            >
                                
                                <div style={{ 
                                    padding: '1.25rem', 
                                    background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center'
                                }}>
                                    <button
                                        onClick={() => toggleUser(usuario.userId)}
                                        style={{ 
                                            background: 'none', 
                                            border: 'none', 
                                            cursor: 'pointer', 
                                            padding: 0, 
                                            flexGrow: 1, 
                                            textAlign: 'left',
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <div style={{
                                            width: '45px',
                                            height: '45px',
                                            background: 'linear-gradient(135deg, #667eea 0%, #204194 100%)',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: '1rem',
                                            flexShrink: 0
                                        }}>
                                            <FontAwesomeIcon icon={faUser} style={{ color: 'white', fontSize: '1.2rem' }} />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#333', marginBottom: '0.25rem' }}>
                                                {usuario.nombre}
                                            </div>
                                            <div style={{ color: '#6c757d', fontSize: '0.85rem' }}>
                                                ID: {usuario.userId}
                                            </div>
                                        </div>
                                    </button>
                                    
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                       
                                        <button
                                            onClick={() => handleDeleteUser(usuario)}
                                            disabled={deletingUser === usuario.userId}
                                            style={{ 
                                                width: '40px',
                                                height: '40px',
                                                background: deletingUser === usuario.userId ? '#adb5bd' : '#dc3545', 
                                                color: 'white', 
                                                border: 'none', 
                                                borderRadius: '10px', 
                                                cursor: deletingUser === usuario.userId ? 'not-allowed' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.3s'
                                            }}
                                            title="Eliminar usuario de Firebase Authentication"
                                            onMouseEnter={(e) => {
                                                if (deletingUser !== usuario.userId) {
                                                    e.target.style.transform = 'scale(1.1)';
                                                    e.target.style.background = '#c82333';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.transform = 'scale(1)';
                                                if (deletingUser !== usuario.userId) {
                                                    e.target.style.background = '#dc3545';
                                                }
                                            }}
                                        >
                                            <FontAwesomeIcon 
                                                icon={deletingUser === usuario.userId ? faSpinner : faTrash} 
                                                spin={deletingUser === usuario.userId}
                                                style={{ fontSize: '1rem' }}
                                            />
                                        </button>

                                
                                        <button
                                            onClick={() => handleDownloadAllCsv(usuario)}
                                            disabled={downloadingZip === usuario.userId}
                                            style={{ 
                                                padding: '0.6rem 1.2rem', 
                                                background: downloadingZip === usuario.userId ? '#adb5bd' : 'linear-gradient(135deg, #667eea 0%, #204194 100%)', 
                                                color: 'white', 
                                                border: 'none', 
                                                borderRadius: '10px', 
                                                cursor: downloadingZip === usuario.userId ? 'not-allowed' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                fontWeight: '600',
                                                fontSize: '0.9rem',
                                                transition: 'all 0.3s',
                                                boxShadow: downloadingZip === usuario.userId ? 'none' : '0 2px 8px rgba(102, 126, 234, 0.3)'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (downloadingZip !== usuario.userId) {
                                                    e.target.style.transform = 'translateY(-2px)';
                                                    e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.transform = 'translateY(0)';
                                                if (downloadingZip !== usuario.userId) {
                                                    e.target.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
                                                }
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
                                            style={{ 
                                                background: 'white',
                                                border: '2px solid #dee2e6', 
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '10px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.3s'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.borderColor = '#667eea';
                                                e.target.style.background = '#f8f9fa';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.borderColor = '#dee2e6';
                                                e.target.style.background = 'white';
                                            }}
                                        >
                                            <FontAwesomeIcon 
                                                icon={expandedUsers[usuario.userId] ? faChevronDown : faChevronRight} 
                                                style={{ color: '#667eea' }}
                                            />
                                        </button>
                                    </div>
                                </div>

                   
                                {expandedUsers[usuario.userId] && (
                                    <div style={{ padding: '0' }}>
                  
                                        <div style={{ borderBottom: '1px solid #e9ecef' }}>
                                            <button
                                                onClick={() => toggleSection(`${usuario.userId}-perfil`)}
                                                style={{ 
                                                    width: '100%', 
                                                    padding: '1rem 1.25rem', 
                                                    background: 'linear-gradient(to right, #e7f3ff, #f8f9fa)',
                                                    border: 'none', 
                                                    textAlign: 'left', 
                                                    cursor: 'pointer', 
                                                    fontSize: '0.95rem', 
                                                    display: 'flex', 
                                                    justifyContent: 'space-between', 
                                                    alignItems: 'center',
                                                    fontWeight: '600',
                                                    color: '#495057',
                                                    transition: 'background 0.3s'
                                                }}
                                                onMouseEnter={(e) => e.target.style.background = 'linear-gradient(to right, #cfe2ff, #e9ecef)'}
                                                onMouseLeave={(e) => e.target.style.background = 'linear-gradient(to right, #e7f3ff, #f8f9fa)'}
                                            >
                                                <span>
                                                    <FontAwesomeIcon icon={faIdCard} fixedWidth style={{ marginRight: '10px', color: '#0d6efd' }} />
                                                    Información de Perfil
                                                    <span style={{ 
                                                        marginLeft: '8px',
                                                        background: '#0d6efd',
                                                        color: 'white',
                                                        padding: '0.15rem 0.5rem',
                                                        borderRadius: '12px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600'
                                                    }}>
                                                        {usuario.perfiles.length}
                                                    </span>
                                                </span>
                                                <FontAwesomeIcon 
                                                    icon={expandedSections[`${usuario.userId}-perfil`] ? faChevronDown : faChevronRight}
                                                    style={{ color: '#0d6efd' }}
                                                />
                                            </button>
                                            {expandedSections[`${usuario.userId}-perfil`] && (
                                                <div style={{ padding: '1.25rem', background: 'white' }}>
                                                    {usuario.perfiles.length === 0 && (
                                                        <p style={{ color: '#6c757d', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>
                                                            No hay registros
                                                        </p>
                                                    )}
                                                    {usuario.perfiles.map((perfil) => (
                                                        <div 
                                                            key={perfil.id} 
                                                            style={{ 
                                                                marginBottom: '1rem', 
                                                                padding: '1rem', 
                                                                border: '2px solid #cfe2ff', 
                                                                borderRadius: '12px', 
                                                                background: '#f8f9fa' 
                                                            }}
                                                        >
                                                            <h6 style={{ 
                                                                fontSize: '0.9rem', 
                                                                fontWeight: 600, 
                                                                color: '#0d6efd', 
                                                                marginBottom: '0.75rem',
                                                                paddingBottom: '0.5rem',
                                                                borderBottom: '1px solid #cfe2ff'
                                                            }}>
                                                                Documento: {perfil.id}
                                                            </h6>
                                                            <RenderDataList data={perfil} />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                      
                                        <div style={{ borderBottom: '1px solid #e9ecef' }}>
                                            <button
                                                onClick={() => toggleSection(`${usuario.userId}-seguimiento`)}
                                                style={{ 
                                                    width: '100%', 
                                                    padding: '1rem 1.25rem', 
                                                    background: 'linear-gradient(to right, #d1e7dd, #f8f9fa)',
                                                    border: 'none', 
                                                    textAlign: 'left', 
                                                    cursor: 'pointer', 
                                                    fontSize: '0.95rem', 
                                                    display: 'flex', 
                                                    justifyContent: 'space-between', 
                                                    alignItems: 'center',
                                                    fontWeight: '600',
                                                    color: '#495057',
                                                    transition: 'background 0.3s'
                                                }}
                                                onMouseEnter={(e) => e.target.style.background = 'linear-gradient(to right, #badbcc, #e9ecef)'}
                                                onMouseLeave={(e) => e.target.style.background = 'linear-gradient(to right, #d1e7dd, #f8f9fa)'}
                                            >
                                                <span>
                                                    <FontAwesomeIcon icon={faChartLine} fixedWidth style={{ marginRight: '10px', color: '#198754' }} />
                                                    Seguimiento
                                                    <span style={{ 
                                                        marginLeft: '8px',
                                                        background: '#198754',
                                                        color: 'white',
                                                        padding: '0.15rem 0.5rem',
                                                        borderRadius: '12px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600'
                                                    }}>
                                                        {usuario.seguimiento.length}
                                                    </span>
                                                </span>
                                                <FontAwesomeIcon 
                                                    icon={expandedSections[`${usuario.userId}-seguimiento`] ? faChevronDown : faChevronRight}
                                                    style={{ color: '#198754' }}
                                                />
                                            </button>
                                            {expandedSections[`${usuario.userId}-seguimiento`] && (
                                                <div style={{ padding: '1.25rem', background: 'white' }}>
                                                    {usuario.seguimiento.length === 0 && (
                                                        <p style={{ color: '#6c757d', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>
                                                            No hay registros
                                                        </p>
                                                    )}
                                                    {usuario.seguimiento.map((seg) => {
                                                        const key = `seg-${usuario.userId}-${seg.id}`;
                                                        return (
                                                            <div 
                                                                key={seg.id} 
                                                                style={{ 
                                                                    marginBottom: '0.75rem', 
                                                                    border: '1px solid #d1e7dd', 
                                                                    borderRadius: '10px',
                                                                    overflow: 'hidden'
                                                                }}
                                                            >
                                                                <button
                                                                    onClick={() => toggleDate(key)}
                                                                    style={{ 
                                                                        width: '100%', 
                                                                        padding: '0.75rem 1rem', 
                                                                        background: '#f8f9fa', 
                                                                        border: 'none', 
                                                                        textAlign: 'left', 
                                                                        cursor: 'pointer', 
                                                                        fontSize: '0.875rem', 
                                                                        display: 'flex', 
                                                                        justifyContent: 'space-between',
                                                                        fontWeight: '500',
                                                                        transition: 'background 0.3s'
                                                                    }}
                                                                    onMouseEnter={(e) => e.target.style.background = '#e9ecef'}
                                                                    onMouseLeave={(e) => e.target.style.background = '#f8f9fa'}
                                                                >
                                                                    <span>
                                                                        <FontAwesomeIcon icon={faCalendarAlt} fixedWidth style={{ marginRight: '8px', color: '#198754' }} />
                                                                        {seg.fecha}
                                                                    </span>
                                                                    <FontAwesomeIcon 
                                                                        icon={expandedDates[key] ? faChevronDown : faChevronRight}
                                                                        style={{ color: '#6c757d' }}
                                                                    />
                                                                </button>
                                                                {expandedDates[key] && (
                                                                    <div style={{ padding: '1rem', background: 'white', borderTop: '1px solid #e9ecef' }}>
                                                                        <RenderDataList data={seg} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                       
                                        <div>
                                            <button
                                                onClick={() => toggleSection(`${usuario.userId}-tomas`)}
                                                style={{ 
                                                    width: '100%', 
                                                    padding: '1rem 1.25rem', 
                                                    background: 'linear-gradient(to right, #fff3cd, #f8f9fa)',
                                                    border: 'none', 
                                                    textAlign: 'left', 
                                                    cursor: 'pointer', 
                                                    fontSize: '0.95rem', 
                                                    display: 'flex', 
                                                    justifyContent: 'space-between', 
                                                    alignItems: 'center',
                                                    fontWeight: '600',
                                                    color: '#495057',
                                                    borderRadius: '0 0 16px 16px',
                                                    transition: 'background 0.3s'
                                                }}
                                                onMouseEnter={(e) => e.target.style.background = 'linear-gradient(to right, #ffe69c, #e9ecef)'}
                                                onMouseLeave={(e) => e.target.style.background = 'linear-gradient(to right, #fff3cd, #f8f9fa)'}
                                            >
                                                <span>
                                                    <FontAwesomeIcon icon={faPills} fixedWidth style={{ marginRight: '10px', color: '#ffc107' }} />
                                                    Tomas Diarias
                                                    <span style={{ 
                                                        marginLeft: '8px',
                                                        background: '#ffc107',
                                                        color: '#000',
                                                        padding: '0.15rem 0.5rem',
                                                        borderRadius: '12px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600'
                                                    }}>
                                                        {usuario.tomas.length}
                                                    </span>
                                                </span>
                                                <FontAwesomeIcon 
                                                    icon={expandedSections[`${usuario.userId}-tomas`] ? faChevronDown : faChevronRight}
                                                    style={{ color: '#ffc107' }}
                                                />
                                            </button>
                                            {expandedSections[`${usuario.userId}-tomas`] && (
                                                <div style={{ padding: '1.25rem', background: 'white' }}>
                                                    {usuario.tomas.length === 0 && (
                                                        <p style={{ color: '#6c757d', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>
                                                            No hay registros
                                                        </p>
                                                    )}
                                                    {usuario.tomas.map((toma) => {
                                                        const key = `toma-${usuario.userId}-${toma.id}`;
                                                        return (
                                                            <div 
                                                                key={toma.id} 
                                                                style={{ 
                                                                    marginBottom: '0.75rem', 
                                                                    border: '1px solid #fff3cd', 
                                                                    borderRadius: '10px',
                                                                    overflow: 'hidden'
                                                                }}
                                                            >
                                                                <button
                                                                    onClick={() => toggleDate(key)}
                                                                    style={{ 
                                                                        width: '100%', 
                                                                        padding: '0.75rem 1rem', 
                                                                        background: '#f8f9fa', 
                                                                        border: 'none', 
                                                                        textAlign: 'left', 
                                                                        cursor: 'pointer', 
                                                                        fontSize: '0.875rem', 
                                                                        display: 'flex', 
                                                                        justifyContent: 'space-between',
                                                                        fontWeight: '500',
                                                                        transition: 'background 0.3s'
                                                                    }}
                                                                    onMouseEnter={(e) => e.target.style.background = '#e9ecef'}
                                                                    onMouseLeave={(e) => e.target.style.background = '#f8f9fa'}
                                                                >
                                                                    <span>
                                                                        <FontAwesomeIcon icon={faCalendarAlt} fixedWidth style={{ marginRight: '8px', color: '#ffc107' }} />
                                                                        {toma.fecha}
                                                                    </span>
                                                                    <FontAwesomeIcon 
                                                                        icon={expandedDates[key] ? faChevronDown : faChevronRight}
                                                                        style={{ color: '#6c757d' }}
                                                                    />
                                                                </button>
                                                                {expandedDates[key] && (
                                                                    <div style={{ padding: '1rem', background: 'white', borderTop: '1px solid #e9ecef' }}>
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
        </div>
    );
}

// ===================================================================
// --- COMPONENTE RAÍZ: App ---
// ===================================================================
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
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: '100vh', 
                background: 'linear-gradient(135deg, #667eea 0%, #204194 100%)'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <FontAwesomeIcon 
                        icon={faSpinner} 
                        spin 
                        style={{ 
                            fontSize: '4rem', 
                            color: 'white',
                            marginBottom: '1rem'
                        }} 
                    />
                    <p style={{ color: 'white', fontSize: '1.25rem', fontWeight: '600' }}>
                        Cargando...
                    </p>
                </div>
            </div>
        );
    }
    
    if (!user) {
        return <LoginPage />;
    }
    
    if (!isAdmin) {
        return (
            <div style={{ 
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #4ba279ff 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem'
            }}>
                <div style={{ 
                    padding: '3rem', 
                    background: 'white', 
                    borderRadius: '16px', 
                    maxWidth: '500px',
                    textAlign: 'center',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        background: '#dc3545',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.5rem'
                    }}>
                        <FontAwesomeIcon icon={faBan} style={{ fontSize: '2.5rem', color: 'white' }} />
                    </div>
                    <h2 style={{ color: '#333', marginBottom: '1rem' }}>
                        Acceso Denegado
                    </h2>
                    <p style={{ color: '#6c757d', marginBottom: '2rem' }}>
                        Tu cuenta no tiene permisos de administrador.
                    </p>
                    <button 
                        onClick={() => signOut(auth)} 
                        style={{ 
                            padding: '0.75rem 2rem', 
                            background: '#6c757d', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '8px', 
                            cursor: 'pointer',
                            fontWeight: '600',
                            transition: 'background 0.3s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#5a6268'}
                        onMouseLeave={(e) => e.target.style.background = '#6c757d'}
                    >
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
*/

// src/components/AdminPanel.jsx

import React, { useState, useEffect } from 'react';
import RenderDataList from './RenderDataList'; // <-- Componente que ya independizaste

// Importaciones de Firebase (Asegúrate de que la ruta a tu módulo firebase.js sea correcta)
import { auth, signOut, db, collection, getDocs } from '../firebase/firebase'; 

// Importaciones para Descarga ZIP
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Importaciones de Íconos (Asumiendo que has creado el módulo Icons.jsx)
import { 
    FontAwesomeIcon, faChartPie, faSignOutAlt, faSearch, faSpinner,
    faUser, faChevronDown, faChevronRight, faFileArchive, 
    faIdCard, faChartLine, faPills, faCalendarAlt
} from './Icons'; // O de donde los importes directamente



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

// --- FUNCIÓN DE FETCHING DE DATOS (Puedes mantenerla dentro del componente o fuera) ---
// La mantendremos fuera para que sea más limpia de AdminPanel.
const fetchAllUsersData = async (db, UIDS_A_CARGAR) => {
    // ... tu lógica de fetching de Firebase usando getDocs, collection, etc.
    // Usaremos la lógica que tenías dentro del useEffect original:
    const listaUsuarios = [];
    for (const userId of UIDS_A_CARGAR) {
        try {
            const [perfilSnap, segSnap, tomasSnap] = await Promise.all([
                getDocs(collection(db, 'Usuarios', userId, 'InformacionPerfil')),
                getDocs(collection(db, 'Usuarios', userId, 'Seguimiento')),
                getDocs(collection(db, 'Usuarios', userId, 'TomasDiarias'))
            ]);
            const perfiles = perfilSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const sortFn = (a, b) => b.fecha.localeCompare(a.fecha); 
            const seguimiento = segSnap.docs.map(doc => ({ id: doc.id, fecha: doc.id, ...doc.data() })).sort(sortFn);
            const tomas = tomasSnap.docs.map(doc => ({ id: doc.id, fecha: doc.id, ...doc.data() })).sort(sortFn);

            listaUsuarios.push({
                userId: userId,
                nombre: perfiles.length > 0 ? perfiles[0].nombre || 'Sin nombre' : `Usuario ${userId.substring(0, 5)}...`,
                perfiles: perfiles,
                seguimiento: seguimiento,
                tomas: tomas
            });
        } catch (err) {
            console.error(`Error con usuario ${userId}:`, err.message);
             listaUsuarios.push({ userId: userId, nombre: `Error al cargar ${userId.substring(0,5)}...`, perfiles: [], seguimiento: [], tomas: [] });
        }
    }
    return listaUsuarios;
};


// ===================================================================
// --- SUB-COMPONENTES PARA LIMPIAR EL JSX ---
// ===================================================================

// 1. Componente para un ítem de fecha dentro de una sección (ej. Seguimiento)
const DateDetail = ({ data, parentKey, expandedDates, toggleDate, icon }) => {
    const key = `${parentKey}-${data.id}`;
    return (
        <div key={data.id} style={{ marginBottom: '0.5rem', border: '1px solid #dee2e6', borderRadius: '4px' }}>
            <button
                onClick={() => toggleDate(key)}
                style={{ width: '100%', padding: '0.5rem', background: '#f8f9fa', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between' }}
            >
                <span>
                    <FontAwesomeIcon icon={icon} fixedWidth style={{ marginRight: '8px' }} />
                    {data.fecha}
                </span>
                <span>
                    <FontAwesomeIcon icon={expandedDates[key] ? faChevronDown : faChevronRight} />
                </span>
            </button>
            {expandedDates[key] && (
                <div style={{ padding: '0.75rem', background: 'white' }}>
                    <RenderDataList data={data} />
                </div>
            )}
        </div>
    );
};

// 2. Componente para las secciones (Perfil, Seguimiento, TomasDiarias)
const SectionToggle = ({ title, data, icon, sectionKey, expandedSections, toggleSection, expandedDates, toggleDate, isList = false, listIcon = faCalendarAlt }) => {
    const isExpanded = expandedSections[sectionKey];
    const bgColor = sectionKey.includes('perfil') ? '#e7f3ff' : sectionKey.includes('seguimiento') ? '#d1e7dd' : '#fff3cd';

    return (
        <div style={{ borderBottom: '1px solid #dee2e6' }}>
            <button
                onClick={() => toggleSection(sectionKey)}
                style={{ width: '100%', padding: '0.75rem 1rem', background: bgColor, border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
                <span>
                    <FontAwesomeIcon icon={icon} fixedWidth style={{ marginRight: '8px' }} />
                    {title} ({data.length})
                </span>
                <FontAwesomeIcon icon={isExpanded ? faChevronDown : faChevronRight} />
            </button>
            {isExpanded && (
                <div style={{ padding: '1rem', background: 'white' }}>
                    {data.length === 0 && <p style={{ color: '#6c757d', fontSize: '0.875rem' }}>No hay registros</p>}
                    {/* Renderiza como lista de fechas (Seguimiento, Tomas) o como lista de documentos (Perfil) */}
                    {isList ? (
                        data.map((item) => (
                            <DateDetail 
                                key={item.id} 
                                data={item} 
                                parentKey={sectionKey} 
                                expandedDates={expandedDates} 
                                toggleDate={toggleDate}
                                icon={listIcon}
                            />
                        ))
                    ) : (
                        data.map((perfil) => (
                            <div key={perfil.id} style={{ marginBottom: '1rem', padding: '0.75rem', border: '1px solid #cfe2ff', borderRadius: '4px', background: '#f8f9fa' }}>
                                <h6 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0d6efd', marginBottom: '0.5rem' }}>Documento: {perfil.id}</h6>
                                <RenderDataList data={perfil} />
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

// 3. Componente para la cabecera de cada usuario (con toggle y botón ZIP)
const UserHeader = ({ usuario, isExpanded, toggleUser, handleDownloadAllCsv, downloadingZip }) => (
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
        
        {/* BOTÓN PARA DESCARGAR TODO (ZIP) */}
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
            <FontAwesomeIcon icon={isExpanded ? faChevronDown : faChevronRight} />
        </button>
    </div>
);

// ===================================================================
// --- COMPONENTE PRINCIPAL: AdminPanel ---
// ===================================================================
export default function AdminPanel({ currentUser }) {
    // --- ESTADOS ---
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedUsers, setExpandedUsers] = useState({});
    const [expandedSections, setExpandedSections] = useState({});
    const [expandedDates, setExpandedDates] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [downloadingZip, setDownloadingZip] = useState(null);

    // --- EFECTO DE CARGA DE DATOS ---
   useEffect(() => {
        const fetchUsuarios = async () => {
            setLoading(true);
            setError('');

            try {
                // 🔹 1️⃣ Obtener automáticamente los UIDs desde Firestore
                // Busca documentos en la colección raíz 'Usuarios'. El ID de cada documento es el UID.
                const snapshot = await getDocs(collection(db, "Usuarios"));
                const uids = snapshot.docs.map(doc => doc.id);

                if (uids.length === 0) {
                    console.warn("⚠️ No se encontraron usuarios en la colección 'Usuarios'");
                    setUsuarios([]);
                    setLoading(false);
                    return;
                }

                // 🔹 2️⃣ Cargar información de cada usuario
                const listaUsuarios = [];

                for (const userId of uids) {
                    try {
                        const [perfilSnap, segSnap, tomasSnap] = await Promise.all([
                            getDocs(collection(db, 'Usuarios', userId, 'InformacionPerfil')),
                            getDocs(collection(db, 'Usuarios', userId, 'Seguimiento')),
                            getDocs(collection(db, 'Usuarios', userId, 'TomasDiarias'))
                        ]);

                        const perfiles = perfilSnap.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data(),
                        }));

                        const seguimiento = segSnap.docs
                            .map(doc => ({ id: doc.id, fecha: doc.id, ...doc.data() }))
                            .sort((a, b) => b.fecha.localeCompare(a.fecha));

                        const tomas = tomasSnap.docs
                            .map(doc => ({ id: doc.id, fecha: doc.id, ...doc.data() }))
                            .sort((a, b) => b.fecha.localeCompare(a.fecha));

                        listaUsuarios.push({
                            userId: userId,
                            // Usa el nombre del perfil si existe, si no, usa un ID parcial
                            nombre:
                                perfiles.length > 0 && perfiles[0].nombre
                                    ? perfiles[0].nombre
                                    : `Usuario ${userId.substring(0, 5)}...`,
                            perfiles,
                            seguimiento,
                            tomas,
                        });
                    } catch (err) {
                        console.error(`Error con usuario ${userId}:`, err.message);
                        listaUsuarios.push({
                            userId: userId,
                            nombre: `Error al cargar ${userId.substring(0, 5)}...`,
                            perfiles: [],
                            seguimiento: [],
                            tomas: [],
                        });
                    }
                }

                // 🔹 3️⃣ Guardar resultado final
                setUsuarios(listaUsuarios);
            } catch (error) {
                console.error("❌ Error general al cargar usuarios:", error);
                setError("Error al cargar usuarios: " + error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUsuarios();
    }, []); // ⚠️ Dependencias vacías: se ejecuta solo al montar el componente

    // --- HANDLERS (Toggles y Búsqueda) ---
    const filteredUsuarios = usuarios.filter(usuario =>
        usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        usuario.userId.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const toggleUser = (userId) => setExpandedUsers(prev => ({ ...prev, [userId]: !prev[userId] }));
    const toggleSection = (key) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    const toggleDate = (key) => setExpandedDates(prev => ({ ...prev, [key]: !prev[key] }));

    // --- FUNCIÓN PRINCIPAL DE DESCARGA ZIP (USANDO FUNCIONES AUXILIARES) ---
    const handleDownloadAllCsv = async (usuario) => {
        // Lógica de descarga que usaste, encapsulada en la función downloadUserZip
        setDownloadingZip(usuario.userId);
        const zip = new JSZip();
        const nombreUsuario = usuario.nombre.replace(/[^a-zA-Z0-9]/g, '_') || `Usuario_${usuario.userId.substring(0,5)}`;
        const rootFolder = zip.folder(nombreUsuario);

        const profileCsvString = prepareProfileCsv(usuario.perfiles);
        if (profileCsvString) {
            rootFolder.file(`InformacionPerfil/Perfil.csv`, profileCsvString);
        }

        const seguimientoFiles = prepareSeguimientoCsv(usuario.seguimiento);
        if (seguimientoFiles.length > 0) {
            const segFolder = rootFolder.folder(`Seguimiento`);
            seguimientoFiles.forEach(fileInfo => {
                const filename = fileInfo.filename.split('/')[1]; 
                segFolder.file(filename, fileInfo.csvString); 
            });
        }

        const tomasFiles = prepareTomasCsv(usuario.tomas);
        if (tomasFiles.length > 0) {
            const tomasFolder = rootFolder.folder(`TomasDiarias`);
            tomasFiles.forEach(fileInfo => {
                const filename = fileInfo.filename.split('/')[1]; 
                tomasFolder.file(filename, fileInfo.csvString);
            });
        }
        
        try {
            const content = await zip.generateAsync({ type: "blob" });
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
            {/* --- Cabecera y Cerrar Sesión --- */}
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
            
            {/* --- Barra de Búsqueda --- */}
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
            
            {/* --- Estados de Carga/Error/Vacío --- */}
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

            {/* --- Lista de Usuarios (Usando Sub-Componentes) --- */}
            {!loading && filteredUsuarios.length > 0 && (
                <div>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Usuarios Registrados ({filteredUsuarios.length})</h2>
                    {filteredUsuarios.map((usuario) => {
                        const isUserExpanded = expandedUsers[usuario.userId];
                        return (
                            <div key={usuario.userId} style={{ marginBottom: '1rem', border: '1px solid #dee2e6', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                
                                {/* CABECERA DE USUARIO */}
                                <UserHeader 
                                    usuario={usuario}
                                    isExpanded={isUserExpanded}
                                    toggleUser={toggleUser}
                                    handleDownloadAllCsv={handleDownloadAllCsv}
                                    downloadingZip={downloadingZip}
                                />

                                {/* CONTENIDO EXPANDIDO */}
                                {isUserExpanded && (
                                    <div style={{ padding: '0' }}>
                                        
                                        {/* 1. INFORMACIÓN PERFIL */}
                                        <SectionToggle
                                            title="InformacionPerfil"
                                            data={usuario.perfiles}
                                            icon={faIdCard}
                                            sectionKey={`${usuario.userId}-perfil`}
                                            expandedSections={expandedSections}
                                            toggleSection={toggleSection}
                                            isList={false}
                                        />
                                        
                                        {/* 2. SEGUIMIENTO */}
                                        <SectionToggle
                                            title="Seguimiento"
                                            data={usuario.seguimiento}
                                            icon={faChartLine}
                                            sectionKey={`${usuario.userId}-seguimiento`}
                                            expandedSections={expandedSections}
                                            toggleSection={toggleSection}
                                            expandedDates={expandedDates}
                                            toggleDate={toggleDate}
                                            isList={true}
                                        />
                                        
                                        {/* 3. TOMAS DIARIAS */}
                                        <SectionToggle
                                            title="TomasDiarias"
                                            data={usuario.tomas}
                                            icon={faPills}
                                            sectionKey={`${usuario.userId}-tomas`}
                                            expandedSections={expandedSections}
                                            toggleSection={toggleSection}
                                            expandedDates={expandedDates}
                                            toggleDate={toggleDate}
                                            isList={true}
                                            listIcon={faCalendarAlt}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
