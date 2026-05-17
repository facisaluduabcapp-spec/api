import React, { useState, useEffect } from 'react';
import { getLogs, exportLogs, clearLogs } from '../utils/adminLogs';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDownload, faTrash, faCheckCircle,
  faTimesCircle, faClockRotateLeft, faInbox
} from '@fortawesome/free-solid-svg-icons';

const ACTION_CONFIG = {
    ticket_aprobado:        { label: 'Registro aprobado',    color: '#065f46', bg: '#d1fae5', icon: faCheckCircle },
    ticket_rechazado:       { label: 'Registro rechazado',   color: '#991b1b', bg: '#fee2e2', icon: faTimesCircle },
    actualizacion_aprobada: { label: 'Actualización aprobada', color: '#1d4ed8', bg: '#dbeafe', icon: faCheckCircle },
    actualizacion_rechazada:{ label: 'Actualización rechazada', color: '#6b21a8', bg: '#f3e8ff', icon: faTimesCircle },
};
const s = {
  container: {
    fontFamily: "'DM Sans', sans-serif",
    maxWidth: '960px',
    margin: '0 auto',
    padding: '2rem 1.5rem',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  title: {
    fontSize: '1.6rem',
    fontWeight: '700',
    color: '#111827',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  subtitle: { fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' },
  btnRow: { display: 'flex', gap: '0.5rem' },
  btn: (danger) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.45rem 1rem',
    borderRadius: '8px',
    border: `1.5px solid ${danger ? '#fca5a5' : '#e5e7eb'}`,
    background: danger ? '#fff5f5' : '#fff',
    color: danger ? '#dc2626' : '#374151',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
  }),
  list: { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  card: {
    background: '#fff',
    border: '1.5px solid #e5e7eb',
    borderRadius: '10px',
    padding: '0.85rem 1.1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  cardLeft: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  icon: (cfg) => ({
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: cfg.bg,
    color: cfg.color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.85rem',
    flexShrink: 0,
  }),
  name: { fontSize: '0.9rem', fontWeight: '600', color: '#111827', margin: 0 },
  meta: { fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.1rem' },
  badge: (cfg) => ({
    padding: '0.2rem 0.65rem',
    borderRadius: '999px',
    background: cfg.bg,
    color: cfg.color,
    fontSize: '0.72rem',
    fontWeight: '700',
    whiteSpace: 'nowrap',
  }),
  timestamp: { fontSize: '0.75rem', color: '#9ca3af', whiteSpace: 'nowrap' },
  empty: { textAlign: 'center', padding: '4rem 2rem', color: '#9ca3af' },
};

const formatTs = (iso) =>
  new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

export default function LogsPanel() {
  const [logs, setLogs] = useState([]);

  useEffect(() => { setLogs(getLogs()); }, []);

  const handleClear = () => {
    if (!window.confirm('¿Eliminar todos los logs? Esta acción no se puede deshacer.')) return;
    clearLogs();
    setLogs([]);
  };

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>
            <FontAwesomeIcon icon={faClockRotateLeft} style={{ marginRight: '0.5rem', fontSize: '1.3rem' }} />
            Logs de actividad
          </h1>
          <p style={s.subtitle}>{logs.length} registros guardados localmente</p>
        </div>
        <div style={s.btnRow}>
          <button style={s.btn(false)} onClick={exportLogs} disabled={logs.length === 0}>
            <FontAwesomeIcon icon={faDownload} /> Exportar JSON
          </button>
          <button style={s.btn(true)} onClick={handleClear} disabled={logs.length === 0}>
            <FontAwesomeIcon icon={faTrash} /> Limpiar
          </button>
        </div>
      </div>

      {logs.length === 0 ? (
        <div style={s.empty}>
          <FontAwesomeIcon icon={faInbox} style={{ fontSize: '2.5rem', opacity: 0.3 }} />
          <p style={{ marginTop: '1rem', fontWeight: '600' }}>Sin actividad registrada</p>
        </div>
      ) : (
        <div style={s.list}>
          {logs.map(log => {
            const cfg = ACTION_CONFIG[log.action] || { label: log.action, color: '#374151', bg: '#f3f4f6', icon: faClockRotateLeft };
            return (
              <div key={log.id} style={s.card}>
                <div style={s.cardLeft}>
                  <div style={s.icon(cfg)}>
                    <FontAwesomeIcon icon={cfg.icon} />
                  </div>
                  <div>
                    <p style={s.name}>{log.nombre || log.ticketUid}</p>
                    <span style={s.meta}>
                      UID: {log.ticketUid}
                      {log.tipoUsuario ? ` · ${log.tipoUsuario}` : ''}
                      {log.razon ? ` · "${log.razon}"` : ''}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={s.badge(cfg)}>{cfg.label}</span>
                  <span style={s.timestamp}>{formatTs(log.timestamp)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}