import React, { useState, useEffect } from 'react';
import RenderDataList from './RenderDataList'; 
import { auth, signOut, db, collection, getDocs } from '../firebase/firebase'; 
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { 
    FontAwesomeIcon, faChartPie, faSignOutAlt, faSearch, faSpinner,
    faUser, faChevronDown, faChevronRight, faFileArchive, 
    faIdCard, faChartLine, faPills, faCalendarAlt
} from './Icons'; 
import AnalizadorInteligente from './AnalizadorInteligente';
import Escudo from './escudo.png';
import ComparadorAdherencia from './ComparadorAdherencia';

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

const SectionToggle = ({ title, data, icon, sectionKey, expandedSections, toggleSection, expandedDates, toggleDate, isList = false, listIcon = faCalendarAlt }) => {
    const isExpanded = expandedSections[sectionKey];
    const bgColor = '#fffffffa';
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
                            <div key={perfil.id} style={{ marginBottom: '1rem', padding: '0.75rem', border: '1px solid #D0BCFF', borderRadius: '4px', background: '#f8f9fa' }}>
                                <h6 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#00723F', marginBottom: '0.5rem' }}>Documento: {perfil.id}</h6>
                                <RenderDataList data={perfil} />
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

const UserHeader = ({ usuario, isExpanded, toggleUser, handleDownloadAllCsv, downloadingZip, handleDeleteUser, isDeletingUser }) => (
    <div style={{ 
        width: '100%', 
        padding: '1rem', 
        background: '#f8f9fa', 
        border: 'none', 
        textAlign: 'left', 
        borderRadius: '8px 8px 0 0', 
        display: 'flex', 
        flexWrap: 'wrap',
        gap: '1rem',
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
                minWidth: '200px',
                textAlign: 'left' 
            }}
        >
            <div>
                <span style={{ fontWeight: 600, marginRight: '0.5rem' }}>
                    <FontAwesomeIcon icon={faUser} style={{ marginRight: '8px' }} />
                    {usuario.nombre}
                </span>
                <span style={{ color: '#6c757d', fontSize: '0.875rem', display: 'block', marginTop: '0.25rem' }}>
                    ID: {usuario.userId}
                </span>
            </div>
        </button>
        
        <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            flexWrap: 'wrap',
            alignItems: 'center' 
        }}>
            <button
                onClick={() => handleDownloadAllCsv(usuario)}
                disabled={downloadingZip === usuario.userId || isDeletingUser}
                style={{ 
                    padding: '0.5rem 1rem', 
                    background: downloadingZip === usuario.userId ? '#adb5bd' : 'linear-gradient(135deg, #50b848 0%, #00723f 100%)',
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px', 
                    cursor: (downloadingZip === usuario.userId || isDeletingUser) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    whiteSpace: 'nowrap',
                    fontSize: '0.875rem'
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
                disabled={isDeletingUser}
                style={{
                    padding: '0.5rem 1rem',
                    background: isDeletingUser ? '#adb5bd' : 'linear-gradient(135deg, #d85757ff 0%, #cf2d2dff 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isDeletingUser ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    whiteSpace: 'nowrap',
                    fontSize: '0.875rem'
                }}
            >
                <FontAwesomeIcon icon={isDeletingUser ? faSpinner : faSignOutAlt} spin={isDeletingUser} style={{ marginRight: '8px' }} />
                {isDeletingUser ? 'Eliminando...' : 'Eliminar'}
            </button>
            
            <AnalizadorInteligente usuario={usuario} />
            
            <button
                onClick={() => toggleUser(usuario.userId)}
                style={{ 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    padding: '0.5rem',
                    display: 'flex',
                    alignItems: 'center'
                }}
            >
                <FontAwesomeIcon icon={isExpanded ? faChevronDown : faChevronRight} />
            </button>
        </div>
    </div>
);

export default function AdminPanel({ currentUser }) {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedUsers, setExpandedUsers] = useState({});
    const [expandedSections, setExpandedSections] = useState({});
    const [expandedDates, setExpandedDates] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [downloadingZip, setDownloadingZip] = useState(null);
    const [isDeletingUser, setIsDeletingUser] = useState(false);
    const [isDownloadingAll, setIsDownloadingAll] = useState(false);

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

    // Filtrar y separar por tipo
    const filteredUsuarios = usuarios.filter(usuario =>
        usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        usuario.userId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const usuariosA = filteredUsuarios.filter(u => {
        const perfil = u.perfiles && u.perfiles[0];
        return perfil && perfil.tipoUsuario === 'Usuario A';
    });

    const usuariosB = filteredUsuarios.filter(u => {
        const perfil = u.perfiles && u.perfiles[0];
        return perfil && perfil.tipoUsuario === 'Usuario B';
    });

    const usuariosSinTipo = filteredUsuarios.filter(u => {
        const perfil = u.perfiles && u.perfiles[0];
        return !perfil || (!perfil.tipoUsuario || (perfil.tipoUsuario !== 'Usuario A' && perfil.tipoUsuario !== 'Usuario B'));
    });

    const toggleUser = (userId) => setExpandedUsers(prev => ({ ...prev, [userId]: !prev[userId] }));
    const toggleSection = (key) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    const toggleDate = (key) => setExpandedDates(prev => ({ ...prev, [key]: !prev[key] }));
    
    const handleDeleteUser = async (usuario) => {
        const confirmar = window.confirm(`¿Seguro que deseas eliminar al usuario "${usuario.nombre}" y todos sus datos?`);
        if (!confirmar) return;

        setIsDeletingUser(true); 

        try {
            const VERCEL_PROD_URL = 'https://api-ten-delta-47.vercel.app'; 
            const response = await fetch(`${VERCEL_PROD_URL}/api/delete-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: usuario.userId }), 
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error desconocido');
            }

            setUsuarios(prev => prev.filter(u => u.userId !== usuario.userId));
            alert(`Usuario "${usuario.nombre}" eliminado correctamente. El servidor reportó: ${data.message}`);

        } catch (error) {
            console.error("❌ Error al eliminar usuario:", error);
            alert(`Error al eliminar usuario: ${error.message || 'Desconocido'}`);
        } finally {
            setIsDeletingUser(false); 
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

    const handleDownloadAllUsersZip = async () => {
        if (usuarios.length === 0) {
            alert("No hay usuarios cargados para descargar.");
            return;
        }

        setIsDownloadingAll(true);
        const zip = new JSZip();
        const allUsersFolder = zip.folder("Datos_Todos_Usuarios"); 

        for (const usuario of usuarios) {
            const nombreUsuario = usuario.nombre.replace(/[^a-zA-Z0-9]/g, '_') || `Usuario_${usuario.userId.substring(0,5)}`;
            const userFolder = allUsersFolder.folder(nombreUsuario); 

            const profileCsvString = prepareProfileCsv(usuario.perfiles);
            if (profileCsvString) {
                userFolder.file(`InformacionPerfil/Perfil.csv`, profileCsvString);
            }

            const seguimientoFiles = prepareSeguimientoCsv(usuario.seguimiento);
            seguimientoFiles.forEach(fileInfo => {
                userFolder.file(fileInfo.filename, fileInfo.csvString); 
            });

            const tomasFiles = prepareTomasCsv(usuario.tomas);
            tomasFiles.forEach(fileInfo => {
                userFolder.file(fileInfo.filename, fileInfo.csvString);
            });
        }

        try {
            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, `Datos_Todos_Usuarios_${new Date().toISOString().substring(0, 10)}.zip`);
            alert(`¡Descarga de ${usuarios.length} usuarios completada!`);
        } catch (error) {
            console.error("Error al generar el ZIP Global:", error);
            alert("Error al generar el archivo ZIP Global.");
        } finally {
            setIsDownloadingAll(false);
        }
    };

    // Función para renderizar lista de usuarios
    const renderUserList = (userList) => (
        userList.map((usuario) => {
            const isUserExpanded = expandedUsers[usuario.userId];
            return (
                <div key={usuario.userId} style={{ marginBottom: '1rem', border: '1px solid #dee2e6', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <UserHeader 
                        usuario={usuario}
                        isExpanded={isUserExpanded}
                        toggleUser={toggleUser}
                        handleDownloadAllCsv={handleDownloadAllCsv}
                        downloadingZip={downloadingZip}
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
        })
    );

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem', width: '100%' }}>
            <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '1rem', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '2rem', 
                borderBottom: '2px solid #dee2e6', 
                paddingBottom: '1rem' 
            }}>
                <div style={{ minWidth: '200px' }}>
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        gap: '1rem',          
                        marginBottom: '0.5rem'
                    }}>
                        <img src={Escudo} alt="Escudo" style={{ 
                            maxHeight: '120px', 
                            width: 'auto',
                            flexShrink: 0 
                        }} />
                        <div>
                            <h1 style={{ 
                                fontSize: '1.75rem', 
                                margin: 0, 
                                color: '#024731' 
                            }}>
                                Panel de Administración
                            </h1>
                            <p style={{ 
                                color: '#6c757d', 
                                margin: '0.5rem 0 0 0', 
                                wordBreak: 'break-word' 
                            }}>
                                Usuario: {currentUser.email}
                            </p>
                        </div>
                    </div>
                </div>
                
                <button 
                    onClick={() => signOut(auth)} 
                    style={{ 
                        padding: '0.5rem 1rem', 
                        background: 'white', 
                        border: '1px solid #dee2e6', 
                        borderRadius: '4px', 
                        cursor: 'pointer',
                        whiteSpace: 'nowrap', 
                        fontSize: '0.875rem' 
                    }}
                >
                    <FontAwesomeIcon icon={faSignOutAlt} style={{ marginRight: '8px' }} />
                    Cerrar Sesión
                </button>
            </div>

            <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#eeb95eff', borderRadius: '8px' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '1rem' }}>
                    <FontAwesomeIcon icon={faSearch} style={{ marginRight: '8px' }} />
                    Buscar Usuario
                </label>
                <input
                    type="text"
                    placeholder="Busca por nombre o UID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', border: '2px solid #dee2e6', borderRadius: '4px', outline: 'none', marginBottom: '1rem' }}
                />

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                        onClick={handleDownloadAllUsersZip}
                        disabled={loading || isDownloadingAll || filteredUsuarios.length === 0}
                        style={{
                            padding: '0.65rem 1rem',
                            background: isDownloadingAll ? '#adb5bd' : '#00723f', 
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: (loading || isDownloadingAll || filteredUsuarios.length === 0) ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            flexShrink: 0
                        }}
                    >
                        {isDownloadingAll ? (
                            <>
                                <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '8px' }} />
                                Comprimiendo todos los datos...
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faFileArchive} style={{ marginRight: '8px' }} />
                                Descargar ZIP ({usuarios.length})
                            </>
                        )}
                    </button>
                    <ComparadorAdherencia usuarios={usuarios} /> 
                </div>
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
                    {/* Sección Usuario A */}
                    {usuariosA.length > 0 && (
                        <div style={{ marginBottom: '2rem' }}>
                            <div style={{
                                padding: '1rem',
                                background: '#eeb95eff',
                                borderRadius: '8px 8px 0 0',
                                marginBottom: '0.5rem',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}>
                                <h2 style={{ 
                                    margin: 0, 
                                    fontSize: '1.5rem', 
                                    color: '#222222',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                   
                                    Usuarios Tipo A
                                    <span style={{
                                        backgroundColor: 'rgba(255,255,255,0.9)',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '15px',
                                        fontSize: '1rem',
                                        fontWeight: 'bold',
                                        marginLeft: 'auto'
                                    }}>
                                        {usuariosA.length}
                                    </span>
                                </h2>
                            </div>
                            {renderUserList(usuariosA)}
                        </div>
                    )}

                    {/* Sección Usuario B */}
                    {usuariosB.length > 0 && (
                        <div style={{ marginBottom: '2rem' }}>
                            <div style={{
                                padding: '1rem',
                                background: '#eeb95eff',
                                borderRadius: '8px 8px 0 0',
                                marginBottom: '0.5rem',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}>
                                <h2 style={{ 
                                    margin: 0, 
                                    fontSize: '1.5rem', 
                                    color: '#222222',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    Usuarios Tipo B
                                    <span style={{
                                        backgroundColor: 'rgba(255,255,255,0.9)',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '15px',
                                        fontSize: '1rem',
                                        fontWeight: 'bold',
                                        marginLeft: 'auto'
                                    }}>
                                        {usuariosB.length}
                                    </span>
                                </h2>
                            </div>
                            {renderUserList(usuariosB)}
                        </div>
                    )}

                    
                </div>
            )}
        </div>
    );
}