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
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

/* ─── TOKENS ────────────────────────────────────────────────────── */
const C = {
  green:      '#00723F',
  greenDark:  '#024731',
  greenLight: '#e8f5ee',
  greenFaint: '#f4faf7',
  white:      '#ffffff',
  gray50:     '#fafafa',
  gray100:    '#f4f4f5',
  gray200:    '#e4e4e7',
  gray300:    '#d1d5db',
  gray500:    '#71717a',
  gray700:    '#3f3f46',
  gray900:    '#18181b',
  red:        '#dc2626',
  redLight:   '#fef2f2',
};

const T = {
  base: `font-family:'DM Sans',system-ui,sans-serif`,
};

/* ─── SHARED STYLES ─────────────────────────────────────────────── */
const pill = (text) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: C.greenLight,
  color: C.greenDark,
  borderRadius: '999px',
  padding: '0.2rem 0.65rem',
  fontSize: '0.8rem',
  fontWeight: 700,
  letterSpacing: '0.02em',
});

const btnBase = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
  padding: '0.5rem 1rem',
  borderRadius: '6px',
  border: 'none',
  cursor: 'pointer',
  fontSize: '0.8rem',
  fontWeight: 600,
  letterSpacing: '0.03em',
  transition: 'opacity 0.15s, box-shadow 0.15s',
  whiteSpace: 'nowrap',
};

const btnGreen = {
  ...btnBase,
  background: C.green,
  color: C.white,
};

const btnOutline = {
  ...btnBase,
  background: C.white,
  color: C.gray700,
  border: `1px solid ${C.gray200}`,
};

const btnDanger = {
  ...btnBase,
  background: C.white,
  color: C.red,
  border: `1px solid ${C.gray200}`,
};

const card = {
  border: `1px solid ${C.gray200}`,
  borderRadius: '10px',
  background: C.white,
  overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
};

const divider = { borderBottom: `1px solid ${C.gray100}` };

/* ─── CSV HELPERS (unchanged) ───────────────────────────────────── */
const escapeCsvValue = (value) => {
  let stringValue = String(value ?? '');
  if (stringValue.includes('"')) stringValue = stringValue.replace(/"/g, '""');
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"'))
    stringValue = `"${stringValue}"`;
  return stringValue;
};

const addBOM = (csvString) => '\uFEFF' + csvString;

const flattenObject = (obj, prefix = '') =>
  Object.keys(obj).reduce((acc, k) => {
    const pre = prefix.length ? prefix + '.' : '';
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      Object.assign(acc, flattenObject(obj[k], pre + k));
    } else {
      const value = obj[k];
      acc[pre + k] = typeof value === 'boolean' ? (value ? 'true' : 'false') : (value ?? '');
    }
    return acc;
  }, {});

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
    return { filename: `Seguimiento/${fecha}.csv`, csvString: addBOM(csvContent) };
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
    if (hasData) filesData.push({ filename: `TomasDiarias/${fecha}.csv`, csvString: addBOM(csvContent) });
  });
  return filesData;
};

/* ─── DATE DETAIL ───────────────────────────────────────────────── */
const DateDetail = ({ data, parentKey, expandedDates, toggleDate, icon }) => {
  const key = `${parentKey}-${data.id}`;
  return (
    <div style={{ marginBottom: '0.4rem', border: `1px solid ${C.gray100}`, borderRadius: '6px', overflow: 'hidden' }}>
      <button
        onClick={() => toggleDate(key)}
        style={{
          width: '100%', padding: '0.55rem 0.75rem',
          background: C.gray50, border: 'none', textAlign: 'left',
          cursor: 'pointer', fontSize: '0.8rem', color: C.gray700,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontWeight: 500,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FontAwesomeIcon icon={icon} style={{ color: C.green, fontSize: '0.75rem' }} />
          {data.fecha}
        </span>
        <FontAwesomeIcon
          icon={expandedDates[key] ? faChevronDown : faChevronRight}
          style={{ color: C.gray500, fontSize: '0.7rem' }}
        />
      </button>
      {expandedDates[key] && (
        <div style={{ padding: '0.75rem', background: C.white }}>
          <RenderDataList data={data} />
        </div>
      )}
    </div>
  );
};

/* ─── SECTION TOGGLE ────────────────────────────────────────────── */
const SectionToggle = ({ title, data, icon, sectionKey, expandedSections, toggleSection, expandedDates, toggleDate, isList = false, listIcon = faCalendarAlt }) => {
  const isExpanded = expandedSections[sectionKey];
  return (
    <div style={divider}>
      <button
        onClick={() => toggleSection(sectionKey)}
        style={{
          width: '100%', padding: '0.75rem 1.25rem',
          background: C.white, border: 'none', textAlign: 'left',
          cursor: 'pointer', fontSize: '0.82rem', color: C.gray700,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontWeight: 500, transition: 'background 0.1s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = C.gray50}
        onMouseLeave={e => e.currentTarget.style.background = C.white}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{
            width: '26px', height: '26px', borderRadius: '6px',
            background: C.greenLight, display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <FontAwesomeIcon icon={icon} style={{ color: C.green, fontSize: '0.75rem' }} />
          </span>
          {title}
          <span style={pill(data.length)}>{data.length}</span>
        </span>
        <FontAwesomeIcon
          icon={isExpanded ? faChevronDown : faChevronRight}
          style={{ color: C.gray300, fontSize: '0.7rem' }}
        />
      </button>

      {isExpanded && (
        <div style={{ padding: '1rem 1.25rem', background: C.gray50, borderTop: `1px solid ${C.gray100}` }}>
          {data.length === 0 && (
            <p style={{ color: C.gray500, fontSize: '0.8rem', margin: 0 }}>Sin registros</p>
          )}
          {isList ? (
            data.map(item => (
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
            data.map(perfil => (
              <div key={perfil.id} style={{
                marginBottom: '0.75rem', padding: '0.75rem',
                border: `1px solid ${C.gray200}`, borderRadius: '6px',
                background: C.white,
              }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: C.green, marginBottom: '0.5rem', margin: '0 0 0.5rem' }}>
                  Documento: {perfil.id}
                </p>
                <RenderDataList data={perfil} />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

/* ─── USER HEADER ───────────────────────────────────────────────── */
const UserHeader = ({ usuario, isExpanded, toggleUser, handleDownloadAllCsv, downloadingZip, handleDeleteUser, isDeletingUser }) => (
  <div style={{
    padding: '0.85rem 1.25rem',
    background: C.white,
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
    alignItems: 'center',
    borderBottom: isExpanded ? `1px solid ${C.gray100}` : 'none',
  }}>
    {/* Name + ID */}
    <button
      onClick={() => toggleUser(usuario.userId)}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexGrow: 1, minWidth: '180px', textAlign: 'left' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span style={{
          width: '34px', height: '34px', borderRadius: '50%',
          background: C.greenLight, display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <FontAwesomeIcon icon={faUser} style={{ color: C.green, fontSize: '0.8rem' }} />
        </span>
        <div>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: C.gray900 }}>{usuario.nombre}</span>
          <span style={{ display: 'block', color: C.gray500, fontSize: '0.72rem', marginTop: '1px', fontFamily: 'monospace' }}>
            {usuario.userId}
          </span>
        </div>
      </div>
    </button>

    {/* Actions */}
    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
      <button
        onClick={() => handleDownloadAllCsv(usuario)}
        disabled={downloadingZip === usuario.userId || isDeletingUser}
        style={{
          ...btnGreen,
          opacity: (downloadingZip === usuario.userId || isDeletingUser) ? 0.5 : 1,
          cursor: (downloadingZip === usuario.userId || isDeletingUser) ? 'not-allowed' : 'pointer',
        }}
      >
        <FontAwesomeIcon icon={downloadingZip === usuario.userId ? faSpinner : faFileArchive} spin={downloadingZip === usuario.userId} />
        ZIP
      </button>

      <button
        onClick={() => handleDeleteUser(usuario)}
        disabled={isDeletingUser}
        style={{ ...btnDanger, opacity: isDeletingUser ? 0.5 : 1, cursor: isDeletingUser ? 'not-allowed' : 'pointer' }}
      >
        <FontAwesomeIcon icon={isDeletingUser ? faSpinner : faSignOutAlt} spin={isDeletingUser} />
        {isDeletingUser ? 'Eliminando…' : 'Eliminar'}
      </button>

      <AnalizadorInteligente usuario={usuario} />

      <button
        onClick={() => toggleUser(usuario.userId)}
        style={{ ...btnOutline, padding: '0.5rem 0.65rem' }}
      >
        <FontAwesomeIcon
          icon={isExpanded ? faChevronDown : faChevronRight}
          style={{ color: C.gray500, fontSize: '0.75rem' }}
        />
      </button>
    </div>
  </div>
);

/* ─── GROUP HEADER ──────────────────────────────────────────────── */
const GroupHeader = ({ title, count }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    padding: '0.5rem 0', marginBottom: '0.75rem',
  }}>
    <span style={{
      display: 'block', width: '3px', height: '22px',
      background: C.green, borderRadius: '2px', flexShrink: 0,
    }} />
    <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: C.gray900 }}>{title}</h2>
    <span style={pill(count)}>{count}</span>
  </div>
);

/* ─── MAIN COMPONENT ─────────────────────────────────────────────── */
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
      setLoading(true); setError('');
      try {
        const snapshot = await getDocs(collection(db, "Usuarios"));
        const uids = snapshot.docs.map(doc => doc.id);
        if (uids.length === 0) {
          toast.info('No se encontraron usuarios en la base de datos', { position: "top-right", autoClose: 3000 });
          setUsuarios([]); setLoading(false); return;
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
  ...doc.data() 
}));

const seguimiento = segSnap.docs.map(doc => ({ 
  id: doc.id, 
  fecha: doc.id, 
  ...doc.data() 
})).sort((a, b) => b.id.localeCompare(a.id));

const tomas = tomasSnap.docs.map(doc => ({ 
  id: doc.id,      // <-- IMPORTANTE: El ID debe ser la fecha string "2026-03-24"
  fecha: doc.id, 
  ...doc.data() 
})).sort((a, b) => b.id.localeCompare(a.id));
            listaUsuarios.push({ userId, nombre: (perfiles.length > 0 && perfiles[0].nombre) ? perfiles[0].nombre : `Usuario ${userId.substring(0, 5)}...`, perfiles, seguimiento, tomas });
          } catch (err) {
            listaUsuarios.push({ userId, nombre: `Error al cargar ${userId.substring(0, 5)}...`, perfiles: [], seguimiento: [], tomas: [] });
          }
        }
        setUsuarios(listaUsuarios);
      } catch (error) {
        const errorMsg = "Error al cargar usuarios: " + error.message;
        setError(errorMsg);
        toast.error(errorMsg, { position: "top-right", autoClose: 5000 });
      } finally {
        setLoading(false);
      }
    };
    fetchUsuarios();
  }, []);

  const filteredUsuarios = usuarios.filter(u =>
    u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.userId.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const usuariosA = filteredUsuarios.filter(u => u.perfiles?.[0]?.tipoUsuario === 'Usuario A');
  const usuariosB = filteredUsuarios.filter(u => u.perfiles?.[0]?.tipoUsuario === 'Usuario B');

  const toggleUser    = id  => setExpandedUsers(p => ({ ...p, [id]: !p[id] }));
  const toggleSection = key => setExpandedSections(p => ({ ...p, [key]: !p[key] }));
  const toggleDate    = key => setExpandedDates(p => ({ ...p, [key]: !p[key] }));

  const handleDeleteUser = async (usuario) => {
    const confirmDelete = await new Promise((resolve) => {
      toast.warn(
        <div>
          <p style={{ marginBottom: '0.75rem', fontWeight: 700, fontSize: '0.9rem' }}>
            ¿Eliminar a "{usuario.nombre}"?
          </p>
          <p style={{ marginBottom: '0.75rem', fontSize: '0.8rem', color: C.gray500 }}>
            Esta acción eliminará todos sus datos permanentemente.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button onClick={() => { toast.dismiss(); resolve(false); }} style={{ ...btnOutline, fontSize: '0.8rem' }}>Cancelar</button>
            <button onClick={() => { toast.dismiss(); resolve(true); }} style={{ ...btnBase, background: C.red, color: C.white, fontSize: '0.8rem' }}>Eliminar</button>
          </div>
        </div>,
        { position: "top-center", autoClose: false, closeButton: false, draggable: false }
      );
    });
    if (!confirmDelete) return;
    setIsDeletingUser(true);
    const deleteToastId = toast.loading(`Eliminando "${usuario.nombre}"…`, { position: "bottom-right" });
    try {
      const response = await fetch('https://api-ten-delta-47.vercel.app/api/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: usuario.userId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error desconocido');
      setUsuarios(prev => prev.filter(u => u.userId !== usuario.userId));
      toast.update(deleteToastId, { render: `✅ "${usuario.nombre}" eliminado`, type: "success", isLoading: false, autoClose: 3000 });
    } catch (error) {
      toast.update(deleteToastId, { render: `❌ ${error.message}`, type: "error", isLoading: false, autoClose: 5000 });
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleDownloadAllCsv = async (usuario) => {
    setDownloadingZip(usuario.userId);
    const toastId = toast.loading(`Generando ZIP…`, { position: "bottom-right" });
    try {
      const zip = new JSZip();
      const nombre = usuario.nombre.replace(/[^a-zA-Z0-9]/g, '_') || `Usuario_${usuario.userId.substring(0,5)}`;
      const root = zip.folder(nombre);
      const profileCsv = prepareProfileCsv(usuario.perfiles);
      if (profileCsv) root.file('InformacionPerfil/Perfil.csv', profileCsv);
      const segFiles = prepareSeguimientoCsv(usuario.seguimiento);
      if (segFiles.length > 0) {
        const segFolder = root.folder('Seguimiento');
        segFiles.forEach(f => segFolder.file(f.filename.split('/')[1], f.csvString));
      }
      const tomasFiles = prepareTomasCsv(usuario.tomas);
      if (tomasFiles.length > 0) {
        const tomasFolder = root.folder('TomasDiarias');
        tomasFiles.forEach(f => tomasFolder.file(f.filename.split('/')[1], f.csvString));
      }
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${nombre}.zip`);
      toast.update(toastId, { render: `✅ ZIP descargado`, type: "success", isLoading: false, autoClose: 3000 });
    } catch (e) {
      toast.update(toastId, { render: "❌ Error al generar ZIP", type: "error", isLoading: false, autoClose: 5000 });
    } finally {
      setDownloadingZip(null);
    }
  };

  const handleDownloadAllUsersZip = async () => {
    if (usuarios.length === 0) { toast.warning('No hay usuarios cargados', { position: "top-right" }); return; }
    setIsDownloadingAll(true);
    const toastId = toast.loading(`Generando ZIP con ${usuarios.length} usuarios…`, { position: "bottom-right" });
    try {
      const zip = new JSZip();
      const root = zip.folder("Datos_Todos_Usuarios");
      for (const usuario of usuarios) {
        const nombre = usuario.nombre.replace(/[^a-zA-Z0-9]/g, '_') || `Usuario_${usuario.userId.substring(0,5)}`;
        const userFolder = root.folder(nombre);
        const profileCsv = prepareProfileCsv(usuario.perfiles);
        if (profileCsv) userFolder.file('InformacionPerfil/Perfil.csv', profileCsv);
        prepareSeguimientoCsv(usuario.seguimiento).forEach(f => userFolder.file(f.filename, f.csvString));
        prepareTomasCsv(usuario.tomas).forEach(f => userFolder.file(f.filename, f.csvString));
      }
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `Datos_Todos_Usuarios_${new Date().toISOString().substring(0, 10)}.zip`);
      toast.update(toastId, { render: `🎉 ${usuarios.length} usuarios descargados`, type: "success", isLoading: false, autoClose: 4000 });
    } catch (e) {
      toast.update(toastId, { render: "❌ Error al generar ZIP global", type: "error", isLoading: false, autoClose: 5000 });
    } finally {
      setIsDownloadingAll(false);
    }
  };

  const renderUserList = (userList) =>
    userList.map(usuario => {
      const isUserExpanded = expandedUsers[usuario.userId];
      return (
        <div key={usuario.userId} style={{ ...card, marginBottom: '0.6rem' }}>
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
            <div>
              <SectionToggle title="Información de Perfil" data={usuario.perfiles} icon={faIdCard} sectionKey={`${usuario.userId}-perfil`} expandedSections={expandedSections} toggleSection={toggleSection} isList={false} />
              <SectionToggle title="Seguimiento" data={usuario.seguimiento} icon={faChartLine} sectionKey={`${usuario.userId}-seguimiento`} expandedSections={expandedSections} toggleSection={toggleSection} expandedDates={expandedDates} toggleDate={toggleDate} isList={true} />
              <SectionToggle title="Tomas Diarias" data={usuario.tomas} icon={faPills} sectionKey={`${usuario.userId}-tomas`} expandedSections={expandedSections} toggleSection={toggleSection} expandedDates={expandedDates} toggleDate={toggleDate} isList={true} listIcon={faCalendarAlt} />
            </div>
          )}
        </div>
      );
    });

  return (
    <div style={{ minHeight: '100vh', background: C.gray50, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <ToastContainer />

      {/* ── Top bar ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: C.white,
        borderBottom: `1px solid ${C.gray200}`,
        padding: '0 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '64px',
        boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <img src={Escudo} alt="Escudo" style={{ height: '36px', width: 'auto' }} />
          <div style={{ borderLeft: `2px solid ${C.gray200}`, paddingLeft: '0.9rem' }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: C.greenDark, lineHeight: 1.2 }}>
              Panel de Administración
            </p>
            <p style={{ margin: 0, fontSize: '0.72rem', color: C.gray500 }}>{currentUser.email}</p>
          </div>
        </div>
        <button onClick={() => signOut(auth)} style={{ ...btnOutline }}>
          <FontAwesomeIcon icon={faSignOutAlt} style={{ fontSize: '0.8rem' }} />
          Cerrar sesión
        </button>
      </header>

      {/* ── Main content ── */}
      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Search + actions bar */}
        <div style={{
          ...card,
          padding: '1.25rem',
          marginBottom: '1.75rem',
          display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center',
        }}>
          {/* Search input */}
          <div style={{ position: 'relative', flexGrow: 1, minWidth: '220px' }}>
            <FontAwesomeIcon icon={faSearch} style={{
              position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)',
              color: C.gray300, fontSize: '0.8rem', pointerEvents: 'none',
            }} />
            <input
              type="text"
              placeholder="Buscar por nombre o UID…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '0.6rem 0.85rem 0.6rem 2.2rem',
                fontSize: '0.85rem', border: `1px solid ${C.gray200}`,
                borderRadius: '6px', outline: 'none', color: C.gray900,
                background: C.gray50, boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = C.green}
              onBlur={e => e.target.style.borderColor = C.gray200}
            />
          </div>

          {/* Global ZIP */}
          <button
            onClick={handleDownloadAllUsersZip}
            disabled={loading || isDownloadingAll || filteredUsuarios.length === 0}
            style={{
              ...btnGreen,
              opacity: (loading || isDownloadingAll || filteredUsuarios.length === 0) ? 0.45 : 1,
              cursor: (loading || isDownloadingAll || filteredUsuarios.length === 0) ? 'not-allowed' : 'pointer',
            }}
          >
            <FontAwesomeIcon icon={isDownloadingAll ? faSpinner : faFileArchive} spin={isDownloadingAll} />
            {isDownloadingAll ? 'Comprimiendo…' : `Descargar ZIP (${usuarios.length})`}
          </button>

          <ComparadorAdherencia usuarios={usuarios} />
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: '0.85rem 1rem', marginBottom: '1rem', background: C.redLight, color: C.red, borderRadius: '6px', fontSize: '0.85rem', border: `1px solid #fecaca` }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem', color: C.gray500, fontSize: '0.9rem' }}>
            <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '0.5rem', color: C.green }} />
            Cargando usuarios…
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredUsuarios.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3.5rem', background: C.white, borderRadius: '10px', border: `1px solid ${C.gray200}`, color: C.gray500, fontSize: '0.875rem' }}>
            {searchTerm ? `Sin resultados para "${searchTerm}"` : 'No hay usuarios para mostrar'}
          </div>
        )}

        {/* User lists */}
        {!loading && filteredUsuarios.length > 0 && (
          <>
            {usuariosA.length > 0 && (
              <section style={{ marginBottom: '2.5rem' }}>
                <GroupHeader title="Usuarios Tipo A" count={usuariosA.length} />
                {renderUserList(usuariosA)}
              </section>
            )}
            {usuariosB.length > 0 && (
              <section style={{ marginBottom: '2.5rem' }}>
                <GroupHeader title="Usuarios Tipo B" count={usuariosB.length} />
                {renderUserList(usuariosB)}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}