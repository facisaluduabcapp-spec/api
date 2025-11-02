// src/components/AdminPanel.jsx

import React, { useState, useEffect } from "react";
import RenderDataList from "./RenderDataList";
import {
  auth,
  signOut,
  db,
  collection,
  getDocs,
} from "../firebase/firebase";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
  FontAwesomeIcon,
  faChartPie,
  faSignOutAlt,
  faSearch,
  faSpinner,
  faUser,
  faChevronDown,
  faChevronRight,
  faFileArchive,
  faIdCard,
  faChartLine,
  faPills,
  faCalendarAlt,
} from "./Icons";

// ============================================================
// Helpers
// ============================================================
const escapeCsvValue = (value) => {
  let stringValue = String(value ?? "");
  if (stringValue.includes('"')) {
    stringValue = stringValue.replace(/"/g, '""');
  }
  if (
    stringValue.includes(",") ||
    stringValue.includes("\n") ||
    stringValue.includes('"')
  ) {
    stringValue = `"${stringValue}"`;
  }
  return stringValue;
};

const addBOM = (csvString) => "\uFEFF" + csvString;

const flattenObject = (obj, prefix = "") =>
  Object.keys(obj).reduce((acc, k) => {
    const pre = prefix.length ? prefix + "." : "";
    if (typeof obj[k] === "object" && obj[k] !== null && !Array.isArray(obj[k])) {
      Object.assign(acc, flattenObject(obj[k], pre + k));
    } else {
      const value = obj[k];
      acc[pre + k] =
        typeof value === "boolean" ? (value ? "true" : "false") : value ?? "";
    }
    return acc;
  }, {});

// ============================================================
// CSV Preparers
// ============================================================
const prepareProfileCsv = (perfiles) => {
  if (!perfiles?.length) return null;
  const { id, ...rest } = perfiles[0];
  const flatData = flattenObject(rest);

  let csv = '"Cabecera","Valor"\n';
  Object.keys(flatData)
    .sort()
    .forEach((key) => {
      csv += `${escapeCsvValue(key)},${escapeCsvValue(flatData[key])}\n`;
    });
  return addBOM(csv);
};

const prepareSeguimientoCsv = (seguimiento) => {
  if (!seguimiento?.length) return [];
  return seguimiento.map((seg) => {
    const { id, fecha, ...rest } = seg;
    const flatRest = flattenObject(rest);
    let csv = '"Cabecera","Valor"\n';
    Object.keys(flatRest)
      .sort()
      .forEach((key) => {
        csv += `${escapeCsvValue(key)},${escapeCsvValue(flatRest[key])}\n`;
      });
    return { filename: `Seguimiento/${fecha}.csv`, csvString: addBOM(csv) };
  });
};

const prepareTomasCsv = (tomas) => {
  if (!tomas?.length) return [];
  const files = [];
  tomas.forEach((dia) => {
    const fecha = dia.fecha;
    let csv = '"Cabecera","Valor"\n';
    let hasData = false;
    if (dia.tomas && typeof dia.tomas === "object") {
      Object.keys(dia.tomas).forEach((hora) => {
        const meds = dia.tomas[hora];
        if (meds && typeof meds === "object") {
          Object.keys(meds).forEach((nombre) => {
            const reg = meds[nombre];
            const prefix = `${hora} - ${nombre}`;
            csv += `${escapeCsvValue(`${prefix} (Nombre)`)},${escapeCsvValue(
              nombre
            )}\n`;
            csv += `${escapeCsvValue(`${prefix} (Hora Prog.)`)},${escapeCsvValue(
              hora
            )}\n`;
            csv += `${escapeCsvValue(`${prefix} (Tomado)`)},${escapeCsvValue(
              String(reg.tomado ?? "")
            )}\n`;
            csv += `${escapeCsvValue(`${prefix} (Hora Real)`)},${escapeCsvValue(
              reg.horaReal || ""
            )}\n`;
            csv += `${escapeCsvValue("---")},${escapeCsvValue("---")}\n`;
            hasData = true;
          });
        }
      });
    }
    if (hasData) files.push({ filename: `TomasDiarias/${fecha}.csv`, csvString: addBOM(csv) });
  });
  return files;
};

// ============================================================
// Subcomponentes visuales
// ============================================================
const UserHeader = ({
  usuario,
  isExpanded,
  toggleUser,
  handleDownloadAllCsv,
  downloadingZip,
  handleDeleteUser,
  isDeletingUser,
}) => (
  <div
    style={{
      background: "#f8fafc",
      borderBottom: "1px solid #e2e8f0",
      borderRadius: "8px 8px 0 0",
      padding: "1rem",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    }}
  >
    <div
      onClick={() => toggleUser(usuario.userId)}
      style={{ cursor: "pointer", flexGrow: 1 }}
    >
      <strong>
        <FontAwesomeIcon icon={faUser} style={{ marginRight: "8px" }} />
        {usuario.nombre}
      </strong>
      <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>
        ID: {usuario.userId}
      </div>
    </div>

    <div style={{ display: "flex", gap: "0.5rem" }}>
      <button
        onClick={() => handleDownloadAllCsv(usuario)}
        disabled={downloadingZip === usuario.userId || isDeletingUser}
        style={{
          background: "#2563eb",
          color: "white",
          border: "none",
          padding: "0.5rem 0.75rem",
          borderRadius: "6px",
          cursor:
            downloadingZip === usuario.userId || isDeletingUser
              ? "not-allowed"
              : "pointer",
        }}
      >
        {downloadingZip === usuario.userId ? (
          <FontAwesomeIcon icon={faSpinner} spin />
        ) : (
          <FontAwesomeIcon icon={faFileArchive} />
        )}{" "}
        ZIP
      </button>
      <button
        onClick={() => handleDeleteUser(usuario)}
        disabled={isDeletingUser}
        style={{
          background: "#dc2626",
          color: "white",
          border: "none",
          padding: "0.5rem 0.75rem",
          borderRadius: "6px",
          cursor: isDeletingUser ? "not-allowed" : "pointer",
        }}
      >
        {isDeletingUser ? (
          <FontAwesomeIcon icon={faSpinner} spin />
        ) : (
          <FontAwesomeIcon icon={faSignOutAlt} />
        )}{" "}
        Eliminar
      </button>
    </div>

    <button
      onClick={() => toggleUser(usuario.userId)}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        paddingLeft: "1rem",
      }}
    >
      <FontAwesomeIcon icon={isExpanded ? faChevronDown : faChevronRight} />
    </button>
  </div>
);

// ============================================================
// Componente Principal
// ============================================================
export default function AdminPanel({ currentUser }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedUsers, setExpandedUsers] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [downloadingZip, setDownloadingZip] = useState(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const snapshot = await getDocs(collection(db, "Usuarios"));
        const uids = snapshot.docs.map((doc) => doc.id);
        const lista = [];
        for (const id of uids) {
          const [perfil, seg, tomas] = await Promise.all([
            getDocs(collection(db, "Usuarios", id, "InformacionPerfil")),
            getDocs(collection(db, "Usuarios", id, "Seguimiento")),
            getDocs(collection(db, "Usuarios", id, "TomasDiarias")),
          ]);
          const perfiles = perfil.docs.map((d) => ({ id: d.id, ...d.data() }));
          const seguimiento = seg.docs
            .map((d) => ({ id: d.id, fecha: d.id, ...d.data() }))
            .sort((a, b) => b.fecha.localeCompare(a.fecha));
          const tomasDocs = tomas.docs
            .map((d) => ({ id: d.id, fecha: d.id, ...d.data() }))
            .sort((a, b) => b.fecha.localeCompare(a.fecha));

          lista.push({
            userId: id,
            nombre: perfiles[0]?.nombre || `Usuario ${id.slice(0, 5)}...`,
            perfiles,
            seguimiento,
            tomas: tomasDocs,
          });
        }
        setUsuarios(lista);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUsuarios();
  }, []);

  const filteredUsuarios = usuarios.filter(
    (u) =>
      u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.userId.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const toggleUser = (id) =>
    setExpandedUsers((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleDeleteUser = async (usuario) => {
    if (!window.confirm(`¿Eliminar ${usuario.nombre}?`)) return;
    setIsDeletingUser(true);
    try {
      const res = await fetch(
        `https://api-ten-delta-47.vercel.app/api/delete-user`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: usuario.userId }),
        }
      );
      await res.json();
      setUsuarios((prev) => prev.filter((u) => u.userId !== usuario.userId));
      alert(`Usuario "${usuario.nombre}" eliminado correctamente.`);
    } catch (err) {
      alert("Error al eliminar usuario: " + err.message);
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleDownloadAllCsv = async (usuario) => {
    setDownloadingZip(usuario.userId);
    const zip = new JSZip();
    const name = usuario.nombre.replace(/[^a-zA-Z0-9]/g, "_");
    const folder = zip.folder(name);
    const pCsv = prepareProfileCsv(usuario.perfiles);
    if (pCsv) folder.file("InformacionPerfil/Perfil.csv", pCsv);
    prepareSeguimientoCsv(usuario.seguimiento).forEach((f) =>
      folder.folder("Seguimiento").file(f.filename.split("/")[1], f.csvString)
    );
    prepareTomasCsv(usuario.tomas).forEach((f) =>
      folder.folder("TomasDiarias").file(f.filename.split("/")[1], f.csvString)
    );
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, `${name}.zip`);
    setDownloadingZip(null);
  };

  // ============================================================
  // Render
  // ============================================================
  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
          borderBottom: "2px solid #e2e8f0",
          paddingBottom: "1rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.75rem", margin: 0, color: "#1e293b" }}>
            <FontAwesomeIcon icon={faChartPie} style={{ marginRight: "10px" }} />
            Panel de Administración
          </h1>
          <p style={{ color: "#64748b", margin: "0.5rem 0 0" }}>
            Usuario: {currentUser.email}
          </p>
        </div>
        <button
          onClick={() => signOut(auth)}
          style={{
            background: "#f1f5f9",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            padding: "0.5rem 1rem",
            cursor: "pointer",
          }}
        >
          <FontAwesomeIcon icon={faSignOutAlt} style={{ marginRight: "8px" }} />
          Cerrar Sesión
        </button>
      </header>

      <div
        style={{
          marginBottom: "2rem",
          background: "#f8fafc",
          borderRadius: "8px",
          padding: "1.5rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        <label style={{ fontWeight: 600, color: "#334155" }}>
          <FontAwesomeIcon icon={faSearch} style={{ marginRight: "8px" }} />
          Buscar Usuario
        </label>
        <input
          type="text"
          placeholder="Busca por nombre o UID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%",
            marginTop: "0.75rem",
            padding: "0.75rem",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            fontSize: "1rem",
          }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <FontAwesomeIcon icon={faSpinner} spin /> Cargando usuarios...
        </div>
      ) : error ? (
        <div
          style={{
            padding: "1rem",
            background: "#fee2e2",
            color: "#b91c1c",
            borderRadius: "6px",
          }}
        >
          {error}
        </div>
      ) : filteredUsuarios.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            background: "#e0f2fe",
            padding: "2rem",
            borderRadius: "8px",
          }}
        >
          {searchTerm
            ? `No se encontraron usuarios con "${searchTerm}"`
            : "No hay usuarios registrados"}
        </div>
      ) : (
        <div>
          <h2 style={{ marginBottom: "1rem", color: "#0f172a" }}>
            Usuarios Registrados ({filteredUsuarios.length})
          </h2>
          {filteredUsuarios.map((u) => {
            const expanded = expandedUsers[u.userId];
            return (
              <div
                key={u.userId}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  marginBottom: "1rem",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}
              >
                <UserHeader
                  usuario={u}
                  isExpanded={expanded}
                  toggleUser={toggleUser}
                  handleDownloadAllCsv={handleDownloadAllCsv}
                  downloadingZip={downloadingZip}
                  handleDeleteUser={handleDeleteUser}
                  isDeletingUser={isDeletingUser}
                />
                {expanded && (
                  <div style={{ background: "white", padding: "1rem" }}>
                    <SectionBlock title="Información de Perfil" icon={faIdCard}>
                      {u.perfiles.map((p) => (
                        <RenderDataList key={p.id} data={p} />
                      ))}
                    </SectionBlock>
                    <SectionBlock title="Seguimiento" icon={faChartLine}>
                      {u.seguimiento.map((s) => (
                        <RenderDataList key={s.id} data={s} />
                      ))}
                    </SectionBlock>
                    <SectionBlock title="Tomas Diarias" icon={faPills}>
                      {u.tomas.map((t) => (
                        <RenderDataList key={t.id} data={t} />
                      ))}
                    </SectionBlock>
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

// Bloque auxiliar
const SectionBlock = ({ title, icon, children }) => (
  <div style={{ marginBottom: "1.5rem" }}>
    <h3 style={{ color: "#334155", fontSize: "1.1rem", marginBottom: "0.75rem" }}>
      <FontAwesomeIcon icon={icon} style={{ marginRight: "8px" }} />
      {title}
    </h3>
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "6px",
        padding: "1rem",
        background: "#f8fafc",
      }}
    >
      {children}
    </div>
  </div>
);
