import React, { useState, useEffect } from 'react';
import { db } from '../firebase/firebase';
import { collection, getDocs, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUserShield, faUserCog, faPlus, faTrash, faSpinner,
    faRefresh, faEdit, faCheck, faTimes
} from '@fortawesome/free-solid-svg-icons';
import { ToastContainer, toast } from 'react-toastify';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ROLE_CONFIG = {
    superadmin: { label: 'Superadmin', color: '#7c3aed', bg: '#ede9fe' },
    admin:      { label: 'Admin',      color: '#065f46', bg: '#d1fae5' },
    asignador:  { label: 'Asignador',  color: '#b45309', bg: '#fef3c7' },
};

const s = {
    container: {
        fontFamily: "'DM Sans', sans-serif",
        maxWidth: '860px',
        margin: '0 auto',
        padding: '2rem 1.5rem',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
    },
    title: {
        fontSize: '1.4rem',
        fontWeight: '700',
        color: '#111827',
        margin: 0,
    },
    subtitle: {
        fontSize: '0.85rem',
        color: '#6b7280',
        marginTop: '0.2rem',
    },
    card: {
        background: '#fff',
        border: '1.5px solid #e5e7eb',
        borderRadius: '12px',
        padding: '1.25rem',
        marginBottom: '1rem',
    },
    sectionTitle: {
        fontSize: '0.75rem',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: '#9ca3af',
        marginBottom: '1rem',
    },
    formRow: {
        display: 'flex',
        gap: '0.75rem',
        flexWrap: 'wrap',
        alignItems: 'flex-end',
    },
    input: {
        flex: 1,
        minWidth: '180px',
        padding: '0.55rem 0.85rem',
        borderRadius: '8px',
        border: '1.5px solid #e5e7eb',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '0.875rem',
        color: '#111827',
        outline: 'none',
    },
    select: {
        padding: '0.55rem 0.85rem',
        borderRadius: '8px',
        border: '1.5px solid #e5e7eb',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '0.875rem',
        color: '#111827',
        background: '#fff',
        cursor: 'pointer',
        outline: 'none',
    },
    btnGreen: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.55rem 1.1rem',
        borderRadius: '8px',
        border: 'none',
        background: '#10b981',
        color: '#fff',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '0.875rem',
        fontWeight: '700',
        cursor: 'pointer',
    },
    btnDanger: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.4rem 0.8rem',
        borderRadius: '6px',
        border: '1.5px solid #fca5a5',
        background: '#fff5f5',
        color: '#dc2626',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '0.8rem',
        fontWeight: '600',
        cursor: 'pointer',
    },
    btnSave: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.4rem 0.8rem',
        borderRadius: '6px',
        border: '1.5px solid #6ee7b7',
        background: '#d1fae5',
        color: '#065f46',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '0.8rem',
        fontWeight: '600',
        cursor: 'pointer',
    },
    btnCancel: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.4rem 0.8rem',
        borderRadius: '6px',
        border: '1.5px solid #e5e7eb',
        background: '#fff',
        color: '#6b7280',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '0.8rem',
        fontWeight: '600',
        cursor: 'pointer',
    },
    userRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.85rem 0',
        borderBottom: '1px solid #f3f4f6',
        flexWrap: 'wrap',
        gap: '0.5rem',
    },
    pill: (role) => ({
        padding: '0.2rem 0.7rem',
        borderRadius: '999px',
        background: ROLE_CONFIG[role]?.bg || '#f3f4f6',
        color: ROLE_CONFIG[role]?.color || '#374151',
        fontSize: '0.75rem',
        fontWeight: '700',
    }),
    refreshBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.4rem 0.9rem',
        borderRadius: '8px',
        border: '1.5px solid #e5e7eb',
        background: '#fff',
        color: '#374151',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '0.8rem',
        fontWeight: '600',
        cursor: 'pointer',
    },
    warningBox: {
        padding: '0.75rem 1rem',
        background: '#fffbeb',
        border: '1.5px solid #fde68a',
        borderRadius: '8px',
        fontSize: '0.8rem',
        color: '#92400e',
        marginBottom: '1.5rem',
    },
};

export default function AdminManagerPanel({ currentRole, currentUid }) {
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    // Formulario de creación
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState('asignador');

    // Edición de rol inline
    const [editingUid, setEditingUid] = useState(null);
    const [editingRole, setEditingRole] = useState('');
    const [savingRole, setSavingRole] = useState(false);

    const fetchAdmins = async () => {
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, 'admins'));
            const data = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
            // Ordenar: superadmin → admin → asignador
            const order = { superadmin: 0, admin: 1, asignador: 2 };
            data.sort((a, b) => (order[a.role] ?? 9) - (order[b.role] ?? 9));
            setAdmins(data);
        } catch (err) {
            toast.error('Error al cargar administradores');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAdmins(); }, []);

    // ── Determinar qué roles puede asignar el usuario actual ──
    const assignableRoles = currentRole === 'superadmin'
        ? ['admin', 'asignador']
        : ['asignador'];  // admin solo puede crear asignadores

    // ── Puede gestionar a un usuario según su rol ──
    const canManage = (targetRole) => {
        if (currentRole === 'superadmin') return true;
        if (currentRole === 'admin') return targetRole === 'asignador';
        return false;
    };

    // ── CREAR ──────────────────────────────────────────────
   // ── CREAR ──────────────────────────────────────────────
const handleCreate = async () => {
    if (!newEmail.trim() || !newPassword.trim()) {
        toast.warning('Completa el correo y la contraseña.');
        return;
    }
    if (newPassword.length < 6) {
        toast.warning('La contraseña debe tener al menos 6 caracteres.');
        return;
    }
    if (!assignableRoles.includes(newRole)) {
        toast.error('No tienes permiso para crear ese rol.');
        return;
    }

    setCreating(true);
    const toastId = toast.loading('Creando usuario...');

    try {
        const res = await fetch(`${API}/api/create-admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: newEmail.trim(),
                password: newPassword,
                role: newRole,        // ← nuevo
                createdBy: currentUid, // ← nuevo
            }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al crear usuario');

        // ← ELIMINA el setDoc que estaba aquí, ya lo hace el backend

        toast.update(toastId, {
            render: `✅ ${newEmail} creado correctamente`,
            type: 'success', isLoading: false, autoClose: 3000,
        });

        setNewEmail('');
        setNewPassword('');
        setNewRole('asignador');
        fetchAdmins();

    } catch (err) {
        toast.update(toastId, {
            render: `❌ ${err.message}`,
            type: 'error', isLoading: false, autoClose: 4000,
        });
    } finally {
        setCreating(false);
    }
};

    // ── CAMBIAR ROL ────────────────────────────────────────
    const handleSaveRole = async (uid) => {
        if (!canManage(editingRole)) {
            toast.error('No tienes permiso para asignar ese rol.');
            return;
        }
        setSavingRole(true);
        try {
            await updateDoc(doc(db, 'admins', uid), { role: editingRole });
            toast.success('Rol actualizado correctamente.');
            setEditingUid(null);
            fetchAdmins();
        } catch (err) {
            toast.error('Error al actualizar el rol.');
        } finally {
            setSavingRole(false);
        }
    };

    // ── ELIMINAR ───────────────────────────────────────────
    const handleDelete = async (admin) => {
        if (!canManage(admin.role)) {
            toast.error('No tienes permiso para eliminar este usuario.');
            return;
        }
        if (admin.uid === currentUid) {
            toast.error('No puedes eliminarte a ti mismo.');
            return;
        }

        const confirmed = await new Promise(resolve => {
            toast.warn(
                <div>
                    <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>
                        ¿Eliminar a "{admin.email}"?
                    </p>
                    <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                        Se eliminará de Auth y de Firestore permanentemente.
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => { toast.dismiss(); resolve(false); }}
                            style={s.btnCancel}>Cancelar</button>
                        <button onClick={() => { toast.dismiss(); resolve(true); }}
                            style={{ ...s.btnDanger, background: '#dc2626', color: '#fff', border: 'none' }}>
                            Eliminar
                        </button>
                    </div>
                </div>,
                { position: 'top-center', autoClose: false, closeButton: false, draggable: false }
            );
        });

        if (!confirmed) return;

        const toastId = toast.loading(`Eliminando ${admin.email}...`);
        try {
            const res = await fetch(`${API}/api/delete-admin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
    email: newEmail.trim(),
    password: newPassword,
    role: newRole,         // ← debe estar
    createdBy: currentUid, // ← debe estar
}),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al eliminar');

            toast.update(toastId, {
                render: `✅ ${admin.email} eliminado`,
                type: 'success', isLoading: false, autoClose: 3000,
            });
            fetchAdmins();
        } catch (err) {
            toast.update(toastId, {
                render: `❌ ${err.message}`,
                type: 'error', isLoading: false, autoClose: 4000,
            });
        }
    };

    return (
        <div style={s.container}>
            <ToastContainer />

            {/* Header */}
            <div style={s.header}>
                <div>
                    <h1 style={s.title}>Gestión de administradores</h1>
                    <p style={s.subtitle}>{admins.length} usuarios en el sistema</p>
                </div>
                <button style={s.refreshBtn} onClick={fetchAdmins}>
                    <FontAwesomeIcon icon={faRefresh} />
                    Actualizar
                </button>
            </div>

            {/* Aviso de permisos */}
            {currentRole === 'admin' && (
                <div style={s.warningBox}>
                    Como <strong>Admin</strong> puedes crear y gestionar usuarios con rol <strong>Asignador</strong>.
                    Solo el Superadmin puede gestionar Admins.
                </div>
            )}

            {/* Formulario de creación */}
            <div style={s.card}>
                <p style={s.sectionTitle}>
                    <FontAwesomeIcon icon={faPlus} style={{ marginRight: '0.4rem' }} />
                    Crear nuevo usuario
                </p>
                <div style={s.formRow}>
                    <input
                        style={s.input}
                        type="email"
                        placeholder="Correo electrónico"
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                    />
                    <input
                        style={s.input}
                        type="password"
                        placeholder="Contraseña (mín. 6 caracteres)"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                    />
                    <select
                        style={s.select}
                        value={newRole}
                        onChange={e => setNewRole(e.target.value)}
                    >
                        {assignableRoles.map(r => (
                            <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
                        ))}
                    </select>
                    <button style={s.btnGreen} onClick={handleCreate} disabled={creating}>
                        <FontAwesomeIcon icon={creating ? faSpinner : faPlus} spin={creating} />
                        {creating ? 'Creando...' : 'Crear'}
                    </button>
                </div>
            </div>

            {/* Lista de admins */}
            <div style={s.card}>
                <p style={s.sectionTitle}>
                    <FontAwesomeIcon icon={faUserShield} style={{ marginRight: '0.4rem' }} />
                    Usuarios registrados
                </p>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                        <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '0.5rem' }} />
                        Cargando...
                    </div>
                ) : admins.length === 0 ? (
                    <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No hay usuarios registrados.</p>
                ) : (
                    admins.map(admin => (
                        <div key={admin.uid} style={s.userRow}>
                            {/* Info */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '50%',
                                    background: ROLE_CONFIG[admin.role]?.bg || '#f3f4f6',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <FontAwesomeIcon
                                        icon={admin.role === 'superadmin' ? faUserShield : faUserCog}
                                        style={{ color: ROLE_CONFIG[admin.role]?.color || '#374151', fontSize: '0.85rem' }}
                                    />
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontWeight: '600', fontSize: '0.9rem', color: '#111827' }}>
                                        {admin.email}
                                        {admin.uid === currentUid && (
                                            <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: '#9ca3af' }}>
                                                (tú)
                                            </span>
                                        )}
                                    </p>
                                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#9ca3af', fontFamily: 'monospace' }}>
                                        {admin.uid}
                                    </p>
                                </div>
                            </div>

                            {/* Rol + acciones */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {editingUid === admin.uid ? (
                                    <>
                                        <select
                                            style={s.select}
                                            value={editingRole}
                                            onChange={e => setEditingRole(e.target.value)}
                                        >
                                            {assignableRoles.map(r => (
                                                <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
                                            ))}
                                        </select>
                                        <button style={s.btnSave} onClick={() => handleSaveRole(admin.uid)} disabled={savingRole}>
                                            <FontAwesomeIcon icon={savingRole ? faSpinner : faCheck} spin={savingRole} />
                                        </button>
                                        <button style={s.btnCancel} onClick={() => setEditingUid(null)}>
                                            <FontAwesomeIcon icon={faTimes} />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <span style={s.pill(admin.role)}>
                                            {ROLE_CONFIG[admin.role]?.label || admin.role}
                                        </span>
                                        {canManage(admin.role) && admin.uid !== currentUid && (
                                            <>
                                                <button
                                                    style={s.btnCancel}
                                                    onClick={() => { setEditingUid(admin.uid); setEditingRole(admin.role); }}
                                                >
                                                    <FontAwesomeIcon icon={faEdit} />
                                                </button>
                                                <button style={s.btnDanger} onClick={() => handleDelete(admin)}>
                                                    <FontAwesomeIcon icon={faTrash} />
                                                </button>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}