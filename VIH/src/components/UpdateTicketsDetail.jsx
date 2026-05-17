import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { logAction } from '../utils/adminLogs';
import {
    faArrowLeft, faCheckCircle, faTimesCircle, faSpinner, faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';

// ── Labels ────────────────────────────────────────────────────
const CONDICION_LABELS = {
    pruebaVIH:           '¿Prueba de VIH?',
    hipercolesterolemia: 'Hipercolesterolemia',
    hipertrigliceridemia:'Hipertrigliceridemia',
    diabetes:            'Diabetes',
    hipertension:        'Hipertensión',
    otraCondicionSalud:  'Otra condición',
};

const ARV_LABELS = {
    efavirenz:   'EFV (Efavirenz)',
    doravirina:  'Doravirina',
    bictegravir: 'Bictegravir',
    dolutegravir:'Dolutegravir',
    raltegravir: 'Raltegravir',
    darunavir:   'Darunavir',
};

const STATUS_MAP = {
    pendiente: { label: 'Pendiente', color: '#b45309', bg: '#fef3c7' },
    aprobado:  { label: 'Aprobado',  color: '#065f46', bg: '#d1fae5' },
    rechazado: { label: 'Rechazado', color: '#991b1b', bg: '#fee2e2' },
};

const formatDate = (ts) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// ── Helpers visuales ──────────────────────────────────────────
const boolLabel = (val) => val ? 'Sí' : 'No';

// Devuelve el estilo de fondo para una celda según si cambió
const cellBg = (changed) => changed ? '#fef9c3' : 'transparent';

// ── Estilos ───────────────────────────────────────────────────
const s = {
    page: { fontFamily: "'DM Sans', sans-serif", maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' },
    backBtn: {
        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
        background: 'none', border: 'none', color: '#6b7280',
        fontFamily: "'DM Sans', sans-serif", fontSize: '0.875rem',
        fontWeight: '600', cursor: 'pointer', padding: '0.25rem 0', marginBottom: '1.5rem',
    },
    topRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' },
    name: { fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: '0 0 0.25rem', letterSpacing: '-0.02em' },
    meta: { fontSize: '0.8rem', color: '#9ca3af' },
    badge: (color, bg) => ({
        padding: '0.35rem 0.9rem', borderRadius: '999px',
        background: bg, color: color, fontSize: '0.78rem', fontWeight: '700',
    }),
    warningBox: {
        display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
        padding: '0.75rem 1rem', background: '#fffbeb', border: '1.5px solid #fde68a',
        borderRadius: '8px', fontSize: '0.8rem', color: '#92400e', marginBottom: '1.5rem',
    },
    // Tabla comparativa
    table: { width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', fontSize: '0.875rem' },
    th: (side) => ({
        padding: '0.6rem 1rem', textAlign: 'left', fontWeight: '700',
        fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em',
        background: side === 'actual' ? '#f3f4f6' : '#f0fdf4',
        color: side === 'actual' ? '#374151' : '#065f46',
        borderBottom: '2px solid #e5e7eb',
    }),
    thLabel: {
        padding: '0.6rem 1rem', textAlign: 'left', fontWeight: '700',
        fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em',
        background: '#fff', color: '#9ca3af', borderBottom: '2px solid #e5e7eb',
        width: '30%',
    },
    td: (changed, side) => ({
        padding: '0.6rem 1rem',
        background: changed ? (side === 'nuevo' ? '#f0fdf4' : '#fef9c3') : '#fff',
        borderBottom: '1px solid #f3f4f6',
        color: changed && side === 'nuevo' ? '#065f46' : '#111827',
        fontWeight: changed && side === 'nuevo' ? '600' : '400',
    }),
    tdLabel: {
        padding: '0.6rem 1rem', borderBottom: '1px solid #f3f4f6',
        color: '#6b7280', fontSize: '0.8rem', fontWeight: '500',
    },
    sectionHeader: {
        padding: '0.5rem 1rem', background: '#f9fafb',
        borderBottom: '1px solid #e5e7eb', fontWeight: '700',
        fontSize: '0.75rem', textTransform: 'uppercase',
        letterSpacing: '0.06em', color: '#6b7280',
    },
    tableWrapper: {
        border: '1.5px solid #e5e7eb', borderRadius: '12px',
        overflow: 'hidden', marginBottom: '1.5rem',
    },
    // Acciones
    actionsBox: {
        background: '#fff', border: '1.5px solid #e5e7eb',
        borderRadius: '12px', padding: '1.25rem', marginTop: '1rem',
    },
    actionTitle: { fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '1rem' },
    btnRow: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap' },
    approveBtn: (loading) => ({
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.65rem 1.4rem', borderRadius: '8px', border: 'none',
        background: loading ? '#d1fae5' : '#10b981', color: '#fff',
        fontFamily: "'DM Sans', sans-serif", fontSize: '0.875rem',
        fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
    }),
    rejectToggleBtn: {
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.65rem 1.4rem', borderRadius: '8px',
        border: '1.5px solid #fca5a5', background: '#fff5f5',
        color: '#dc2626', fontFamily: "'DM Sans', sans-serif",
        fontSize: '0.875rem', fontWeight: '700', cursor: 'pointer',
    },
    rejectArea: {
        marginTop: '1rem', padding: '1rem', background: '#fff5f5',
        border: '1.5px solid #fca5a5', borderRadius: '10px',
        display: 'flex', flexDirection: 'column', gap: '0.75rem',
    },
    rejectInput: {
        width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px',
        border: '1.5px solid #fca5a5', fontFamily: "'DM Sans', sans-serif",
        fontSize: '0.875rem', color: '#374151', resize: 'vertical',
        minHeight: '80px', outline: 'none', boxSizing: 'border-box',
    },
    confirmRejectBtn: (loading) => ({
        alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none',
        background: loading ? '#fca5a5' : '#dc2626', color: '#fff',
        fontFamily: "'DM Sans', sans-serif", fontSize: '0.875rem',
        fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
    }),
    doneBox: (color, bg) => ({
        padding: '0.75rem 1rem', borderRadius: '8px', background: bg, color: color,
        fontSize: '0.875rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem',
    }),
    loading: { textAlign: 'center', padding: '4rem', color: '#9ca3af', fontSize: '0.9rem' },
    changePill: {
        display: 'inline-block', padding: '0.1rem 0.45rem',
        borderRadius: '999px', background: '#dcfce7', color: '#15803d',
        fontSize: '0.7rem', fontWeight: '700', marginLeft: '0.4rem',
    },
};

// ── Componente de fila comparativa ────────────────────────────
function CompareRow({ label, actual, nuevo }) {
    const changed = String(actual ?? '') !== String(nuevo ?? '');
    return (
        <tr>
            <td style={s.tdLabel}>{label}</td>
            <td style={s.td(changed, 'actual')}>{String(actual ?? '—')}</td>
            <td style={s.td(changed, 'nuevo')}>
                {String(nuevo ?? '—')}
                {changed && <span style={s.changePill}>Cambio</span>}
            </td>
        </tr>
    );
}

// ── Componente principal ──────────────────────────────────────
export default function UpdateTicketDetail({ uid, onBack }) {
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showReject, setShowReject] = useState(false);
    const [razon, setRazon] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [done, setDone] = useState(null);

    useEffect(() => {
        const fetch = async () => {
            try {
                const snap = await getDoc(doc(db, 'SolicitudesActualizacion', uid));
                if (snap.exists()) setTicket({ uid: snap.id, ...snap.data() });
            } catch (err) {
                console.error('Error cargando ticket:', err);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [uid]);

    // ── APROBAR ──────────────────────────────────────────────
    const handleApprove = async () => {
        if (actionLoading) return;
        setActionLoading(true);
        try {
            const datosNuevos = ticket.datosNuevos || {};

            // 1. Sobrescribir el perfil con los datos nuevos
            const profileRef = doc(db, 'Usuarios', uid, 'InformacionPerfil', 'perfilPrincipal');
            await setDoc(profileRef, {
                ...datosNuevos,
                ultimaActualizacion: serverTimestamp(),
                actualizadoPor: 'admin',
            }, { merge: true });

            // 2. Marcar ticket como aprobado
            await updateDoc(doc(db, 'SolicitudesActualizacion', uid), {
                estado: 'aprobado',
                fechaActualizacion: serverTimestamp(),
            });

            setDone('aprobado');
            logAction('actualizacion_aprobada', {
    ticketUid: uid,
    nombre: nuevo.nombre || actual.nombre,
});
        } catch (err) {
            console.error('Error aprobando:', err);
            alert('Error al aprobar. Revisa la consola.');
        } finally {
            setActionLoading(false);
        }
    };

    // ── RECHAZAR ─────────────────────────────────────────────
    const handleReject = async () => {
        if (actionLoading) return;
        setActionLoading(true);
        try {
            await updateDoc(doc(db, 'SolicitudesActualizacion', uid), {
                estado: 'rechazado',
                razonRechazo: razon.trim(),
                fechaActualizacion: serverTimestamp(),
            });
            setDone('rechazado');
            logAction('actualizacion_rechazada', {
    ticketUid: uid,
    nombre: ticket.datosNuevos?.nombre || ticket.datosActuales?.nombre,
    razon: razon.trim() || '(sin motivo)',
});
        } catch (err) {
            console.error('Error rechazando:', err);
            alert('Error al rechazar. Revisa la consola.');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <div style={s.loading}><FontAwesomeIcon icon={faSpinner} spin /> Cargando...</div>;
    if (!ticket)  return <div style={s.loading}>No se encontró el ticket.</div>;

    const actual = ticket.datosActuales || {};
    const nuevo  = ticket.datosNuevos  || {};
    const status = STATUS_MAP[ticket.estado] || STATUS_MAP.pendiente;
    const isPending = ticket.estado === 'pendiente';

    // Unión de todas las claves de medicación adicional
    const allMedKeys = [...new Set([
        ...Object.keys(actual.medicacionAdicional || {}),
        ...Object.keys(nuevo.medicacionAdicional  || {}),
    ])];

    return (
        <div style={s.page}>
            {/* Volver */}
            <button style={s.backBtn} onClick={onBack}>
                <FontAwesomeIcon icon={faArrowLeft} /> Volver a solicitudes
            </button>

            {/* Encabezado */}
            <div style={s.topRow}>
                <div>
                    <h1 style={s.name}>{nuevo.nombre || actual.nombre || 'Sin nombre'}</h1>
                    <span style={s.meta}>UID: {uid} · Enviado: {formatDate(ticket.fechaSolicitud)}</span>
                </div>
                <span style={s.badge(status.color, status.bg)}>{status.label}</span>
            </div>

            {/* Aviso si ya procesado */}
            {!isPending && (
                <div style={s.warningBox}>
                    <FontAwesomeIcon icon={faExclamationTriangle} style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span>
                        Este ticket ya fue <strong>{status.label.toLowerCase()}</strong>
                        {ticket.razonRechazo ? `. Motivo: "${ticket.razonRechazo}"` : ''}.
                    </span>
                </div>
            )}

            {/* ── TABLA COMPARATIVA ── */}
            <div style={s.tableWrapper}>
                <table style={s.table}>
                    <thead>
                        <tr>
                            <th style={s.thLabel}>Campo</th>
                            <th style={s.th('actual')}>Datos actuales</th>
                            <th style={s.th('nuevo')}>Cambios propuestos</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Datos personales */}
                        <tr><td colSpan={3} style={s.sectionHeader}>Datos personales</td></tr>
                        <CompareRow label="Nombre"              actual={actual.nombre}          nuevo={nuevo.nombre} />
                        <CompareRow label="Género"              actual={actual.genero}          nuevo={nuevo.genero} />
                        <CompareRow label="Año de nacimiento"   actual={actual.anoNacimiento}   nuevo={nuevo.anoNacimiento} />
                        <CompareRow label="Escolaridad"         actual={actual.escolaridad}     nuevo={nuevo.escolaridad} />
                        <CompareRow label="País de origen"      actual={actual.paisOrigen}      nuevo={nuevo.paisOrigen} />
                        <CompareRow label="Años en BC"          actual={actual.anosRadicandoBC} nuevo={nuevo.anosRadicandoBC} />
                        <CompareRow label="Tipo de usuario"     actual={actual.tipoUsuario}     nuevo={nuevo.tipoUsuario} />

                        {/* Condiciones médicas */}
                        <tr><td colSpan={3} style={s.sectionHeader}>Condiciones médicas</td></tr>
                        {Object.keys(CONDICION_LABELS).map(k => (
                            <CompareRow
                                key={k}
                                label={CONDICION_LABELS[k]}
                                actual={boolLabel(actual.condiciones?.[k])}
                                nuevo={boolLabel(nuevo.condiciones?.[k])}
                            />
                        ))}
                        <CompareRow
                            label="Otras condiciones (descripción)"
                            actual={actual.otraCondicionSaludDescripcion}
                            nuevo={nuevo.otraCondicionSaludDescripcion}
                        />

                        {/* Medicación ARV */}
                        <tr><td colSpan={3} style={s.sectionHeader}>Medicación ARV</td></tr>
                        {Object.keys(ARV_LABELS).map(k => (
                            <CompareRow
                                key={k}
                                label={ARV_LABELS[k]}
                                actual={boolLabel(actual.medicacionVIH?.[k])}
                                nuevo={boolLabel(nuevo.medicacionVIH?.[k])}
                            />
                        ))}

                        {/* Medicación adicional */}
                        {allMedKeys.length > 0 && (
                            <>
                                <tr><td colSpan={3} style={s.sectionHeader}>Medicación adicional</td></tr>
                                {allMedKeys.map(k => {
                                    const a = actual.medicacionAdicional?.[k];
                                    const n = nuevo.medicacionAdicional?.[k];
                                    const nombreMed = k.replace(/_/g, ' ');
                                    const actualStr = a ? `${a.activo ? 'Activo' : 'Inactivo'} · ${a.frecuencia}×/día` : 'No existía';
                                    const nuevoStr  = n ? `${n.activo ? 'Activo' : 'Inactivo'} · ${n.frecuencia}×/día` : 'Eliminado';
                                    return (
                                        <CompareRow key={k} label={nombreMed} actual={actualStr} nuevo={nuevoStr} />
                                    );
                                })}
                            </>
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── ACCIONES ── */}
            <div style={s.actionsBox}>
                {done === 'aprobado' && (
                    <div style={s.doneBox('#065f46', '#d1fae5')}>
                        <FontAwesomeIcon icon={faCheckCircle} />
                        Cambios aprobados y aplicados al perfil del usuario.
                    </div>
                )}
                {done === 'rechazado' && (
                    <div style={s.doneBox('#991b1b', '#fee2e2')}>
                        <FontAwesomeIcon icon={faTimesCircle} />
                        Solicitud rechazada. El usuario verá el motivo en la app.
                    </div>
                )}

                {!done && isPending && (
                    <>
                        <p style={s.actionTitle}>Decisión</p>
                        <div style={s.btnRow}>
                            <button style={s.approveBtn(actionLoading)} onClick={handleApprove} disabled={actionLoading}>
                                {actionLoading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faCheckCircle} />}
                                Aprobar cambios
                            </button>
                            <button style={s.rejectToggleBtn} onClick={() => setShowReject(v => !v)}>
                                <FontAwesomeIcon icon={faTimesCircle} />
                                {showReject ? 'Cancelar' : 'Rechazar cambios'}
                            </button>
                        </div>

                        {showReject && (
                            <div style={s.rejectArea}>
                                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#dc2626' }}>
                                    Motivo del rechazo (opcional — el usuario lo verá en la app)
                                </label>
                                <textarea
                                    style={s.rejectInput}
                                    placeholder="Ej: El cambio de medicamento no coincide con el expediente clínico."
                                    value={razon}
                                    onChange={e => setRazon(e.target.value)}
                                />
                                <button style={s.confirmRejectBtn(actionLoading)} onClick={handleReject} disabled={actionLoading}>
                                    {actionLoading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faTimesCircle} />}
                                    Confirmar rechazo
                                </button>
                            </div>
                        )}
                    </>
                )}

                {!done && !isPending && (
                    <div style={s.doneBox(status.color, status.bg)}>
                        Esta solicitud ya fue procesada ({status.label.toLowerCase()}).
                    </div>
                )}
            </div>
        </div>
    );
}