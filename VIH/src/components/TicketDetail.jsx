import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft, faCheckCircle, faTimesCircle, faSpinner,
    faUser, faPills, faHeartPulse, faCalendar, faMapMarkerAlt,
    faGraduationCap, faIdCard, faNotesMedical, faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';

// ── helpers ──────────────────────────────────────────────────────────
const yn = (val) => {
    if (val === true)  return { label: 'Sí',  color: '#065f46', bg: '#d1fae5' };
    if (val === false) return { label: 'No',  color: '#1e3a5f', bg: '#dbeafe' };
    return { label: '—', color: '#6b7280', bg: '#f3f4f6' };
};

const CONDICION_LABELS = {
    pruebaVIH:          '¿Prueba de VIH?',
    hipercolesterolemia:'Hipercolesterolemia',
    hipertrigliceridemia:'Hipertrigliceridemia',
    diabetes:           'Diabetes',
    hipertension:       'Hipertensión',
    otraCondicionSalud: 'Otra condición',
};

const ARV_LABELS = {
    efavirenz:   'EFV (Efavirenz)',
    doravirina:  'Doravirina',
    bictegravir: 'Bictegravir',
    dolutegravir:'Dolutegravir',
    raltegravir: 'Raltegravir',
    darunavir:   'Darunavir',
};

const formatDate = (ts) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// ── estilos ──────────────────────────────────────────────────────────
const s = {
    page: {
        fontFamily: "'DM Sans', sans-serif",
        maxWidth: '780px',
        margin: '0 auto',
        padding: '2rem 1.5rem',
    },
    backBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: 'none',
        border: 'none',
        color: '#6b7280',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '0.875rem',
        fontWeight: '600',
        cursor: 'pointer',
        padding: '0.25rem 0',
        marginBottom: '1.5rem',
    },
    assignRow: { marginBottom: '1rem' },
assignLabel: {
    fontSize: '0.8rem', fontWeight: '600',
    color: '#374151', display: 'block', marginBottom: '0.5rem',
},
tipoBtn: (active) => ({
    padding: '0.5rem 1.2rem',
    borderRadius: '8px',
    border: `1.5px solid ${active ? '#10b981' : '#e5e7eb'}`,
    background: active ? '#d1fae5' : '#fff',
    color: active ? '#065f46' : '#374151',
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: '600',
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.15s',
}),
    topRow: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '1.75rem',
        flexWrap: 'wrap',
        gap: '1rem',
    },
    name: {
        fontSize: '1.5rem',
        fontWeight: '700',
        color: '#111827',
        margin: '0 0 0.25rem',
        letterSpacing: '-0.02em',
    },
    meta: {
        fontSize: '0.8rem',
        color: '#9ca3af',
    },
    badge: (color, bg) => ({
        padding: '0.35rem 0.9rem',
        borderRadius: '999px',
        background: bg,
        color: color,
        fontSize: '0.78rem',
        fontWeight: '700',
        letterSpacing: '0.02em',
        alignSelf: 'flex-start',
    }),
    section: {
        background: '#fff',
        border: '1.5px solid #e5e7eb',
        borderRadius: '12px',
        padding: '1.25rem',
        marginBottom: '1rem',
    },
    sectionTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.75rem',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: '#9ca3af',
        marginBottom: '1rem',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '0.75rem',
    },
    field: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.15rem',
    },
    fieldLabel: {
        fontSize: '0.72rem',
        fontWeight: '600',
        color: '#9ca3af',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
    },
    fieldValue: {
        fontSize: '0.9rem',
        fontWeight: '500',
        color: '#111827',
    },
    pill: (color, bg) => ({
        display: 'inline-block',
        padding: '0.15rem 0.6rem',
        borderRadius: '999px',
        background: bg,
        color: color,
        fontSize: '0.78rem',
        fontWeight: '600',
    }),
    arvRow: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
    },
    // Área de acciones
    actionsBox: {
        background: '#fff',
        border: '1.5px solid #e5e7eb',
        borderRadius: '12px',
        padding: '1.25rem',
        marginTop: '1.5rem',
    },
    actionTitle: {
        fontSize: '0.85rem',
        fontWeight: '700',
        color: '#374151',
        marginBottom: '1rem',
    },
    btnRow: {
        display: 'flex',
        gap: '0.75rem',
        flexWrap: 'wrap',
    },
    approveBtn: (loading) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.65rem 1.4rem',
        borderRadius: '8px',
        border: 'none',
        background: loading ? '#d1fae5' : '#10b981',
        color: '#fff',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '0.875rem',
        fontWeight: '700',
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'background 0.15s',
        opacity: loading ? 0.7 : 1,
    }),
    rejectToggleBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.65rem 1.4rem',
        borderRadius: '8px',
        border: '1.5px solid #fca5a5',
        background: '#fff5f5',
        color: '#dc2626',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '0.875rem',
        fontWeight: '700',
        cursor: 'pointer',
    },
    rejectArea: {
        marginTop: '1rem',
        padding: '1rem',
        background: '#fff5f5',
        border: '1.5px solid #fca5a5',
        borderRadius: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
    },
    rejectLabel: {
        fontSize: '0.8rem',
        fontWeight: '600',
        color: '#dc2626',
    },
    rejectInput: {
        width: '100%',
        padding: '0.6rem 0.75rem',
        borderRadius: '8px',
        border: '1.5px solid #fca5a5',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '0.875rem',
        color: '#374151',
        resize: 'vertical',
        minHeight: '80px',
        outline: 'none',
        boxSizing: 'border-box',
    },
    confirmRejectBtn: (loading) => ({
        alignSelf: 'flex-end',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.6rem 1.2rem',
        borderRadius: '8px',
        border: 'none',
        background: loading ? '#fca5a5' : '#dc2626',
        color: '#fff',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '0.875rem',
        fontWeight: '700',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
    }),
    alreadyHandled: (color, bg) => ({
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        background: bg,
        color: color,
        fontSize: '0.875rem',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    }),
    loading: {
        textAlign: 'center',
        padding: '4rem',
        color: '#9ca3af',
        fontSize: '0.9rem',
    },
    warningBox: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        background: '#fffbeb',
        border: '1.5px solid #fde68a',
        borderRadius: '8px',
        fontSize: '0.8rem',
        color: '#92400e',
        marginBottom: '1rem',
    },
};

const STATUS_MAP = {
    pendiente: { label: 'Pendiente', color: '#b45309', bg: '#fef3c7' },
    aprobado:  { label: 'Aprobado',  color: '#065f46', bg: '#d1fae5' },
    rechazado: { label: 'Rechazado', color: '#991b1b', bg: '#fee2e2' },
};
const TIPOS_USUARIO = [
    'Usuario A',
    'Usuario B',
];
// ── componente ────────────────────────────────────────────────────────
export default function TicketDetail({ uid, onBack }) {
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showReject, setShowReject] = useState(false);
    const [razon, setRazon] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [done, setDone] = useState(null); // 'aprobado' | 'rechazado'
 const [tipoUsuario, setTipoUsuario] = useState('');

    useEffect(() => {
        const fetch = async () => {
            try {
                const snap = await getDoc(doc(db, 'SolicitudesRegistro', uid));
                if (snap.exists()) setTicket({ uid: snap.id, ...snap.data() });
            } catch (err) {
                console.error('Error cargando ticket:', err);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [uid]);

    // ── APROBAR ──────────────────────────────────────────────────────
    const handleApprove = async () => {
        if (actionLoading) return;
         if (!tipoUsuario) {
        alert('Debes asignar un tipo de usuario antes de aprobar.');
        return;
    }
        setActionLoading(true);
        try {
            const datos = ticket.datosPerfilPropuestos || {};

            // 1. Escribir el perfil real en InformacionPerfil (igual que saveUserProfile)
            const profileDocRef = doc(db, 'Usuarios', uid, 'InformacionPerfil', 'perfilPrincipal');
            await setDoc(profileDocRef, {
                ...datos,
                tipoUsuario,
                fechaCreacion: serverTimestamp(),
                createdAt: new Date().toISOString(),
                aprobadoPor: 'admin',
                fechaAprobacion: serverTimestamp(),
            }, { merge: true });

            // 2. Marcar nodo raíz con activo y profileDocId (igual que saveUserProfile)
            const userRef = doc(db, 'Usuarios', uid);
            await setDoc(userRef, {
                activo: true,
                profileDocId: 'perfilPrincipal',
            }, { merge: true });

            // 3. Marcar el ticket como aprobado
            const ticketRef = doc(db, 'SolicitudesRegistro', uid);
            await updateDoc(ticketRef, {
                estado: 'aprobado',
                fechaActualizacion: serverTimestamp(),
            });

            setDone('aprobado');
        } catch (err) {
            console.error('Error aprobando ticket:', err);
            alert('Error al aprobar. Revisa la consola.');
        } finally {
            setActionLoading(false);
        }
    };

    // ── RECHAZAR ─────────────────────────────────────────────────────
    const handleReject = async () => {
        if (actionLoading) return;
        setActionLoading(true);
        try {
            const ticketRef = doc(db, 'SolicitudesRegistro', uid);
            await updateDoc(ticketRef, {
                estado: 'rechazado',
                razonRechazo: razon.trim(),
                fechaActualizacion: serverTimestamp(),
            });
            setDone('rechazado');
        } catch (err) {
            console.error('Error rechazando ticket:', err);
            alert('Error al rechazar. Revisa la consola.');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <div style={s.loading}><FontAwesomeIcon icon={faSpinner} spin /> Cargando...</div>;
    if (!ticket)  return <div style={s.loading}>No se encontró el ticket.</div>;

    const datos = ticket.datosPerfilPropuestos || {};
    const status = STATUS_MAP[ticket.estado] || STATUS_MAP.pendiente;
    const arvActivos = Object.entries(datos.medicacionVIH || {}).filter(([, v]) => v).map(([k]) => ARV_LABELS[k] || k);
    const medsAdicionales = Object.entries(datos.medicacionAdicional || {});
    const isPending = ticket.estado === 'pendiente';

    return (
        <div style={s.page}>
            {/* Botón volver */}
            <button style={s.backBtn} onClick={onBack}>
                <FontAwesomeIcon icon={faArrowLeft} />
                Volver a solicitudes
            </button>

            {/* Encabezado */}
            <div style={s.topRow}>
                <div>
                    <h1 style={s.name}>{datos.nombre || 'Sin nombre'}</h1>
                    <span style={s.meta}>
                        UID: {uid} · Enviado: {formatDate(ticket.fechaSolicitud)}
                    </span>
                </div>
                <span style={s.badge(status.color, status.bg)}>{status.label}</span>
            </div>

            {/* Advertencia si ya fue procesado */}
            {!isPending && (
                <div style={s.warningBox}>
                    <FontAwesomeIcon icon={faExclamationTriangle} style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span>
                        Este ticket ya fue <strong>{status.label.toLowerCase()}</strong>
                        {ticket.razonRechazo ? `. Motivo: "${ticket.razonRechazo}"` : ''}. 
                        Puedes seguir revisando la información pero no se puede cambiar el estado.
                    </span>
                </div>
            )}

            {/* Datos personales */}
            <div style={s.section}>
                <div style={s.sectionTitle}>
                    <FontAwesomeIcon icon={faUser} /> Datos personales
                </div>
                <div style={s.grid}>
                    <div style={s.field}><span style={s.fieldLabel}>Nombre</span><span style={s.fieldValue}>{datos.nombre || '—'}</span></div>
                    <div style={s.field}><span style={s.fieldLabel}>Género</span><span style={s.fieldValue}>{datos.genero || '—'}</span></div>
                    <div style={s.field}><span style={s.fieldLabel}>Año de nacimiento</span><span style={s.fieldValue}>{datos.anoNacimiento || '—'} {datos.edad ? `(${datos.edad} años)` : ''}</span></div>
                    <div style={s.field}><span style={s.fieldLabel}>Escolaridad</span><span style={s.fieldValue}>{datos.escolaridad || '—'}</span></div>
                    <div style={s.field}><span style={s.fieldLabel}>País de origen</span><span style={s.fieldValue}>{datos.paisOrigen || '—'}</span></div>
                    <div style={s.field}><span style={s.fieldLabel}>Años en Baja California</span><span style={s.fieldValue}>{datos.anosRadicandoBC ?? '—'}</span></div>
                    <div style={s.field}><span style={s.fieldLabel}>Tipo de usuario</span><span style={s.fieldValue}>{datos.tipoUsuario || '—'}</span></div>
                </div>
            </div>

            {/* Condiciones médicas */}
            <div style={s.section}>
                <div style={s.sectionTitle}>
                    <FontAwesomeIcon icon={faHeartPulse} /> Condiciones médicas
                </div>
                <div style={s.grid}>
                    {Object.entries(datos.condiciones || {}).map(([key, val]) => {
                        const yn_ = yn(val);
                        return (
                            <div key={key} style={s.field}>
                                <span style={s.fieldLabel}>{CONDICION_LABELS[key] || key}</span>
                                <span style={s.pill(yn_.color, yn_.bg)}>{yn_.label}</span>
                            </div>
                        );
                    })}
                </div>
                {datos.otraCondicionSaludDescripcion && (
                    <div style={{ marginTop: '0.75rem', ...s.field }}>
                        <span style={s.fieldLabel}>Descripción otras condiciones</span>
                        <span style={s.fieldValue}>{datos.otraCondicionSaludDescripcion}</span>
                    </div>
                )}
            </div>

            {/* Medicación ARV */}
            <div style={s.section}>
                <div style={s.sectionTitle}>
                    <FontAwesomeIcon icon={faPills} /> Medicación ARV
                </div>
                {arvActivos.length > 0 ? (
                    <div style={s.arvRow}>
                        {arvActivos.map(name => (
                            <span key={name} style={s.pill('#065f46', '#d1fae5')}>{name}</span>
                        ))}
                    </div>
                ) : (
                    <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Ninguno seleccionado</span>
                )}
            </div>

            {/* Medicación adicional */}
            {medsAdicionales.length > 0 && (
                <div style={s.section}>
                    <div style={s.sectionTitle}>
                        <FontAwesomeIcon icon={faNotesMedical} /> Medicación adicional
                    </div>
                    <div style={s.grid}>
                        {medsAdicionales.map(([key, med]) => (
                            <div key={key} style={s.field}>
                                <span style={s.fieldLabel}>{key.replace(/_/g, ' ')}</span>
                                <span style={s.fieldValue}>
                                    {med.frecuencia} {med.frecuencia === 1 ? 'vez' : 'veces'} al día
                                    {' · '}
                                    <span style={s.pill(med.activo ? '#065f46' : '#6b7280', med.activo ? '#d1fae5' : '#f3f4f6')}>
                                        {med.activo ? 'Activo' : 'Inactivo'}
                                    </span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Área de acciones */}
            <div style={s.actionsBox}>
                {done === 'aprobado' && (
                    <div style={s.alreadyHandled('#065f46', '#d1fae5')}>
                        <FontAwesomeIcon icon={faCheckCircle} />
                        Solicitud aprobada. El usuario ya puede iniciar sesión.
                    </div>
                )}
                {done === 'rechazado' && (
                    <div style={s.alreadyHandled('#991b1b', '#fee2e2')}>
                        <FontAwesomeIcon icon={faTimesCircle} />
                        Solicitud rechazada. El usuario verá el motivo al abrir la app.
                    </div>
                )}

                {!done && isPending && (
                    <>
                        <p style={s.actionTitle}>Decisión</p>
                             <div style={s.assignRow}>
            <label style={s.assignLabel}>Tipo de usuario *</label>
            <div style={s.btnRow}>
                {TIPOS_USUARIO.map(t => (
                    <button
                        key={t}
                        style={s.tipoBtn(tipoUsuario === t)}
                        onClick={() => setTipoUsuario(t)}
                    >
                        {t}
                    </button>
                ))}
            </div>
        </div>
                        <div style={s.btnRow}>
                            <button style={s.approveBtn(actionLoading)} onClick={handleApprove} disabled={actionLoading}>
                                {actionLoading
                                    ? <FontAwesomeIcon icon={faSpinner} spin />
                                    : <FontAwesomeIcon icon={faCheckCircle} />
                                }
                                Aprobar solicitud
                            </button>
                            <button style={s.rejectToggleBtn} onClick={() => setShowReject(v => !v)}>
                                <FontAwesomeIcon icon={faTimesCircle} />
                                {showReject ? 'Cancelar' : 'Rechazar solicitud'}
                            </button>
                        </div>

                        {showReject && (
                            <div style={s.rejectArea}>
                                <label style={s.rejectLabel}>
                                    Motivo del rechazo (opcional — el usuario lo verá en la app)
                                </label>
                                <textarea
                                    style={s.rejectInput}
                                    placeholder="Ej: La información de medicamentos no coincide con el expediente clínico."
                                    value={razon}
                                    onChange={e => setRazon(e.target.value)}
                                />
                                <button
                                    style={s.confirmRejectBtn(actionLoading)}
                                    onClick={handleReject}
                                    disabled={actionLoading}
                                >
                                    {actionLoading
                                        ? <FontAwesomeIcon icon={faSpinner} spin />
                                        : <FontAwesomeIcon icon={faTimesCircle} />
                                    }
                                    Confirmar rechazo
                                </button>
                            </div>
                        )}
                    </>
                )}

                {!done && !isPending && (
                    <div style={s.alreadyHandled(
                        STATUS_MAP[ticket.estado]?.color || '#374151',
                        STATUS_MAP[ticket.estado]?.bg || '#f3f4f6'
                    )}>
                        Esta solicitud ya fue procesada ({status.label.toLowerCase()}).
                    </div>
                )}
            </div>
        </div>
    );
}