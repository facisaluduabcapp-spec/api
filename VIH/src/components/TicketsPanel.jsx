import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faClockRotateLeft, faCheckCircle, faTimesCircle, 
    faSpinner, faInbox, faChevronRight, faRefresh
} from '@fortawesome/free-solid-svg-icons';
import TicketDetail from './TicketDetail';

const STATUS_CONFIG = {
    pendiente:  { label: 'Pendiente',  color: '#b45309', bg: '#fef3c7', dot: '#f59e0b' },
    aprobado:   { label: 'Aprobado',   color: '#065f46', bg: '#d1fae5', dot: '#10b981' },
    rechazado:  { label: 'Rechazado',  color: '#991b1b', bg: '#fee2e2', dot: '#ef4444' },
};

const styles = {
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
    },
    title: {
        fontSize: '1.6rem',
        fontWeight: '700',
        color: '#111827',
        margin: 0,
        letterSpacing: '-0.02em',
    },
    subtitle: {
        fontSize: '0.875rem',
        color: '#6b7280',
        marginTop: '0.25rem',
    },
    filterRow: {
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
    },
    filterBtn: (active, cfg) => ({
        padding: '0.4rem 1rem',
        borderRadius: '999px',
        border: `1.5px solid ${active ? cfg.dot : '#e5e7eb'}`,
        background: active ? cfg.bg : '#fff',
        color: active ? cfg.color : '#6b7280',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '0.8rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.15s',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
    }),
    dot: (color) => ({
        width: '7px',
        height: '7px',
        borderRadius: '50%',
        background: color,
        display: 'inline-block',
    }),
    refreshBtn: {
        padding: '0.4rem 0.9rem',
        borderRadius: '8px',
        border: '1.5px solid #e5e7eb',
        background: '#fff',
        color: '#374151',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '0.8rem',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
    },
    list: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
    },
    card: {
        background: '#fff',
        border: '1.5px solid #e5e7eb',
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'box-shadow 0.15s, border-color 0.15s',
    },
    cardLeft: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
    },
    cardName: {
        fontSize: '0.95rem',
        fontWeight: '600',
        color: '#111827',
        margin: 0,
    },
    cardMeta: {
        fontSize: '0.78rem',
        color: '#9ca3af',
    },
    cardRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
    },
    badge: (cfg) => ({
        padding: '0.25rem 0.75rem',
        borderRadius: '999px',
        background: cfg.bg,
        color: cfg.color,
        fontSize: '0.75rem',
        fontWeight: '700',
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
    }),
    chevron: {
        color: '#9ca3af',
        fontSize: '0.85rem',
    },
    empty: {
        textAlign: 'center',
        padding: '4rem 2rem',
        color: '#9ca3af',
    },
    emptyIcon: {
        fontSize: '2.5rem',
        marginBottom: '1rem',
        opacity: 0.4,
    },
    loading: {
        textAlign: 'center',
        padding: '4rem',
        color: '#9ca3af',
        fontSize: '0.9rem',
    },
    countBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '18px',
        height: '18px',
        borderRadius: '999px',
        background: '#f59e0b',
        color: '#fff',
        fontSize: '0.7rem',
        fontWeight: '700',
        padding: '0 5px',
    },
};

const FILTERS = [
    { key: 'todos',     label: 'Todos',     cfg: { dot: '#6b7280', color: '#374151', bg: '#f3f4f6' } },
    { key: 'pendiente', label: 'Pendientes', cfg: STATUS_CONFIG.pendiente },
    { key: 'aprobado',  label: 'Aprobados',  cfg: STATUS_CONFIG.aprobado },
    { key: 'rechazado', label: 'Rechazados', cfg: STATUS_CONFIG.rechazado },
];

export default function TicketsPanel() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pendiente'); // empieza mostrando pendientes
    const [selectedUid, setSelectedUid] = useState(null);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, 'SolicitudesRegistro'));
            const data = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
            // Ordenar: pendientes primero, luego por fecha desc
            data.sort((a, b) => {
                const order = { pendiente: 0, rechazado: 1, aprobado: 2 };
                if (order[a.estado] !== order[b.estado]) return order[a.estado] - order[b.estado];
                const dateA = a.fechaSolicitud?.toDate?.() || new Date(a.fechaSolicitud || 0);
                const dateB = b.fechaSolicitud?.toDate?.() || new Date(b.fechaSolicitud || 0);
                return dateB - dateA;
            });
            setTickets(data);
        } catch (err) {
            console.error('Error cargando tickets:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTickets(); }, []);

    // Si hay un ticket seleccionado, mostrar el detalle
    if (selectedUid) {
        return (
            <TicketDetail
                uid={selectedUid}
                onBack={() => { setSelectedUid(null); fetchTickets(); }}
            />
        );
    }

    const filtered = filter === 'todos' ? tickets : tickets.filter(t => t.estado === filter);
    const pendingCount = tickets.filter(t => t.estado === 'pendiente').length;

    const formatDate = (ts) => {
        if (!ts) return '—';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>
                        Solicitudes de registro
                        {pendingCount > 0 && (
                            <span style={{ ...styles.countBadge, marginLeft: '0.6rem', verticalAlign: 'middle' }}>
                                {pendingCount}
                            </span>
                        )}
                    </h1>
                    <p style={styles.subtitle}>{tickets.length} solicitudes en total</p>
                </div>
                <button style={styles.refreshBtn} onClick={fetchTickets}>
                    <FontAwesomeIcon icon={faRefresh} />
                    Actualizar
                </button>
            </div>

            {/* Filtros */}
            <div style={styles.filterRow}>
                {FILTERS.map(f => (
                    <button
                        key={f.key}
                        style={styles.filterBtn(filter === f.key, f.cfg)}
                        onClick={() => setFilter(f.key)}
                    >
                        <span style={styles.dot(f.cfg.dot)} />
                        {f.label}
                        {f.key === 'pendiente' && pendingCount > 0 && (
                            <span style={{ ...styles.countBadge, background: f.cfg.dot }}>
                                {pendingCount}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Lista */}
            {loading ? (
                <div style={styles.loading}>
                    <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '0.5rem' }} />
                    Cargando solicitudes...
                </div>
            ) : filtered.length === 0 ? (
                <div style={styles.empty}>
                    <div style={styles.emptyIcon}>
                        <FontAwesomeIcon icon={faInbox} />
                    </div>
                    <p style={{ margin: 0, fontWeight: '600' }}>Sin solicitudes</p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
                        No hay solicitudes con estado "{FILTERS.find(f => f.key === filter)?.label.toLowerCase()}"
                    </p>
                </div>
            ) : (
                <div style={styles.list}>
                    {filtered.map(ticket => {
                        const cfg = STATUS_CONFIG[ticket.estado] || STATUS_CONFIG.pendiente;
                        const nombre = ticket.datosPerfilPropuestos?.nombre || 'Sin nombre';
                        const email = ticket.datosPerfilPropuestos?.email || ticket.uid;
                        return (
                            <div
                                key={ticket.uid}
                                style={styles.card}
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
                                <div style={styles.cardLeft}>
                                    <p style={styles.cardName}>{nombre}</p>
                                    <span style={styles.cardMeta}>
                                        {email} · {formatDate(ticket.fechaSolicitud)}
                                    </span>
                                </div>
                                <div style={styles.cardRight}>
                                    <span style={styles.badge(cfg)}>{cfg.label}</span>
                                    <FontAwesomeIcon icon={faChevronRight} style={styles.chevron} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}