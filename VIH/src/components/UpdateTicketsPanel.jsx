import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faInbox, faChevronRight, faRefresh } from '@fortawesome/free-solid-svg-icons';
import UpdateTicketsDetail from './UpdateTicketsDetail';

const STATUS_CONFIG = {
    pendiente: { label: 'Pendiente', color: '#b45309', bg: '#fef3c7', dot: '#f59e0b' },
    aprobado:  { label: 'Aprobado',  color: '#065f46', bg: '#d1fae5', dot: '#10b981' },
    rechazado: { label: 'Rechazado', color: '#991b1b', bg: '#fee2e2', dot: '#ef4444' },
};

const FILTERS = [
    { key: 'todos',     label: 'Todos',      cfg: { dot: '#6b7280', color: '#374151', bg: '#f3f4f6' } },
    { key: 'pendiente', label: 'Pendientes', cfg: STATUS_CONFIG.pendiente },
    { key: 'aprobado',  label: 'Aprobados',  cfg: STATUS_CONFIG.aprobado },
    { key: 'rechazado', label: 'Rechazados', cfg: STATUS_CONFIG.rechazado },
];

const s = {
    container: { fontFamily: "'DM Sans', sans-serif", maxWidth: '960px', margin: '0 auto', padding: '2rem 1.5rem' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' },
    title: { fontSize: '1.6rem', fontWeight: '700', color: '#111827', margin: 0, letterSpacing: '-0.02em' },
    subtitle: { fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' },
    filterRow: { display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' },
    filterBtn: (active, cfg) => ({
        padding: '0.4rem 1rem', borderRadius: '999px',
        border: `1.5px solid ${active ? cfg.dot : '#e5e7eb'}`,
        background: active ? cfg.bg : '#fff',
        color: active ? cfg.color : '#6b7280',
        fontFamily: "'DM Sans', sans-serif", fontSize: '0.8rem', fontWeight: '600',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
    }),
    dot: (color) => ({ width: '7px', height: '7px', borderRadius: '50%', background: color, display: 'inline-block' }),
    refreshBtn: {
        padding: '0.4rem 0.9rem', borderRadius: '8px', border: '1.5px solid #e5e7eb',
        background: '#fff', color: '#374151', fontFamily: "'DM Sans', sans-serif",
        fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
    },
    list: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
    card: {
        background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '12px',
        padding: '1rem 1.25rem', cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
        transition: 'box-shadow 0.15s, border-color 0.15s',
    },
    cardName: { fontSize: '0.95rem', fontWeight: '600', color: '#111827', margin: '0 0 0.2rem' },
    cardMeta: { fontSize: '0.78rem', color: '#9ca3af' },
    cardRight: { display: 'flex', alignItems: 'center', gap: '1rem' },
    badge: (cfg) => ({
        padding: '0.25rem 0.75rem', borderRadius: '999px',
        background: cfg.bg, color: cfg.color,
        fontSize: '0.75rem', fontWeight: '700', whiteSpace: 'nowrap',
    }),
    countBadge: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        minWidth: '18px', height: '18px', borderRadius: '999px',
        background: '#f59e0b', color: '#fff', fontSize: '0.7rem', fontWeight: '700', padding: '0 5px',
    },
    empty: { textAlign: 'center', padding: '4rem 2rem', color: '#9ca3af' },
    loading: { textAlign: 'center', padding: '4rem', color: '#9ca3af', fontSize: '0.9rem' },
    // Chips de cambios detectados
    changeChip: {
        display: 'inline-block', padding: '0.15rem 0.5rem',
        borderRadius: '999px', background: '#fef3c7', color: '#b45309',
        fontSize: '0.7rem', fontWeight: '600', marginLeft: '0.5rem',
    },
};

const formatDate = (ts) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Detecta cuántos campos cambiaron entre datosActuales y datosNuevos
const countChanges = (ticket) => {
    const actual = ticket.datosActuales || {};
    const nuevo = ticket.datosNuevos || {};
    let changes = 0;

    const simpleFields = ['nombre', 'genero', 'escolaridad', 'paisOrigen', 'tipoUsuario',
                          'anoNacimiento', 'anosRadicandoBC', 'otraCondicionSaludDescripcion'];
    simpleFields.forEach(f => { if (String(actual[f] ?? '') !== String(nuevo[f] ?? '')) changes++; });

    Object.keys({ ...actual.condiciones, ...nuevo.condiciones }).forEach(k => {
        if ((actual.condiciones?.[k]) !== (nuevo.condiciones?.[k])) changes++;
    });
    Object.keys({ ...actual.medicacionVIH, ...nuevo.medicacionVIH }).forEach(k => {
        if ((actual.medicacionVIH?.[k]) !== (nuevo.medicacionVIH?.[k])) changes++;
    });

    const allMedKeys = new Set([
        ...Object.keys(actual.medicacionAdicional || {}),
        ...Object.keys(nuevo.medicacionAdicional || {}),
    ]);
    allMedKeys.forEach(k => {
        const a = actual.medicacionAdicional?.[k];
        const n = nuevo.medicacionAdicional?.[k];
        if (!a || !n || a.activo !== n.activo || a.frecuencia !== n.frecuencia) changes++;
    });

    return changes;
};

export default function UpdateTicketsPanel() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pendiente');
    const [selectedUid, setSelectedUid] = useState(null);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, 'SolicitudesActualizacion'));
            const data = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
            data.sort((a, b) => {
                const order = { pendiente: 0, rechazado: 1, aprobado: 2 };
                if (order[a.estado] !== order[b.estado]) return order[a.estado] - order[b.estado];
                const dateA = a.fechaSolicitud?.toDate?.() || new Date(a.fechaSolicitud || 0);
                const dateB = b.fechaSolicitud?.toDate?.() || new Date(b.fechaSolicitud || 0);
                return dateB - dateA;
            });
            setTickets(data);
        } catch (err) {
            console.error('Error cargando tickets de actualización:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTickets(); }, []);

    if (selectedUid) {
        return (
            <UpdateTicketsDetail
                uid={selectedUid}
                onBack={() => { setSelectedUid(null); fetchTickets(); }}
            />
        );
    }

    const filtered = filter === 'todos' ? tickets : tickets.filter(t => t.estado === filter);
    const pendingCount = tickets.filter(t => t.estado === 'pendiente').length;

    return (
        <div style={s.container}>
            {/* Header */}
            <div style={s.header}>
                <div>
                    <h1 style={s.title}>
                        Solicitudes de actualización
                        {pendingCount > 0 && (
                            <span style={{ ...s.countBadge, marginLeft: '0.6rem', verticalAlign: 'middle' }}>
                                {pendingCount}
                            </span>
                        )}
                    </h1>
                    <p style={s.subtitle}>{tickets.length} solicitudes en total</p>
                </div>
                <button style={s.refreshBtn} onClick={fetchTickets}>
                    <FontAwesomeIcon icon={faRefresh} />
                    Actualizar
                </button>
            </div>

            {/* Filtros */}
            <div style={s.filterRow}>
                {FILTERS.map(f => (
                    <button key={f.key} style={s.filterBtn(filter === f.key, f.cfg)} onClick={() => setFilter(f.key)}>
                        <span style={s.dot(f.cfg.dot)} />
                        {f.label}
                        {f.key === 'pendiente' && pendingCount > 0 && (
                            <span style={{ ...s.countBadge, background: f.cfg.dot }}>{pendingCount}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Lista */}
            {loading ? (
                <div style={s.loading}>
                    <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '0.5rem' }} />
                    Cargando solicitudes...
                </div>
            ) : filtered.length === 0 ? (
                <div style={s.empty}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.4 }}>
                        <FontAwesomeIcon icon={faInbox} />
                    </div>
                    <p style={{ margin: 0, fontWeight: '600' }}>Sin solicitudes</p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
                        No hay solicitudes con estado "{FILTERS.find(f => f.key === filter)?.label.toLowerCase()}"
                    </p>
                </div>
            ) : (
                <div style={s.list}>
                    {filtered.map(ticket => {
                        const cfg = STATUS_CONFIG[ticket.estado] || STATUS_CONFIG.pendiente;
                        const nombre = ticket.datosNuevos?.nombre || ticket.datosActuales?.nombre || 'Sin nombre';
                        const nChanges = countChanges(ticket);
                        return (
                            <div
                                key={ticket.uid}
                                style={s.card}
                                onClick={() => setSelectedUid(ticket.uid)}
                                onMouseEnter={e => {
                                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
                                    e.currentTarget.style.borderColor = '#d1d5db';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.boxShadow = 'none';
                                    e.currentTarget.style.borderColor = '#e5e7eb';
                                }}
                            >
                                <div>
                                    <p style={s.cardName}>
                                        {nombre}
                                        {nChanges > 0 && (
                                            <span style={s.changeChip}>
                                                {nChanges} {nChanges === 1 ? 'cambio' : 'cambios'}
                                            </span>
                                        )}
                                    </p>
                                    <span style={s.cardMeta}>
                                        {ticket.uid} · {formatDate(ticket.fechaSolicitud)}
                                    </span>
                                </div>
                                <div style={s.cardRight}>
                                    <span style={s.badge(cfg)}>{cfg.label}</span>
                                    <FontAwesomeIcon icon={faChevronRight} style={{ color: '#9ca3af' }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}