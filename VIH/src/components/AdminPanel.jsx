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
        
        {/* GRUPO DE ACCIONES (ZIP y BORRAR) */}
        <div style={{ display: 'flex', alignItems: 'center', marginLeft: '1rem' }}>

            {/* BOTÓN PARA DESCARGAR TODO (ZIP) */}
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

            {/* 🚨 BOTÓN PARA ELIMINAR USUARIO 🚨 */}
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

        {/* BOTÓN TOGGLE DE DETALLE */}
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
            // ... (el resto de tu código de fetch a /api/delete-user) ...
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
    // 💡 PROPS FALTANTES
    handleDeleteUser={handleDeleteUser} 
    isDeletingUser={isDeletingUser}
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