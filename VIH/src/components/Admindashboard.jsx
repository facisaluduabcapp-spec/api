import React, { useState } from 'react';
import TicketsPanel from './TicketsPanel';
import UpdateTicketsPanel from './UpdateTicketsPanel';
import AdminPanel from './AdminPanel';
import AdminManagerPanel from './AdminManagerPanel';
import LogsPanel from './LogsPanel';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUserPlus, faPenToSquare, faUsers, faSignOutAlt,
    faUserShield, faBars, faXmark, faClockRotateLeft
} from '@fortawesome/free-solid-svg-icons';
import { auth } from '../firebase/firebase';
import { signOut } from 'firebase/auth';

const tabs = [
    { key: 'registro',      label: 'Solicitudes de registro',     shortLabel: 'Registro',      icon: faUserPlus },
    { key: 'actualizacion', label: 'Solicitudes de actualización', shortLabel: 'Actualizacion', icon: faPenToSquare },
    { key: 'panel',         label: 'Panel de usuarios',            shortLabel: 'Usuarios',      icon: faUsers },
    { key: 'admins',        label: 'Administradores',              shortLabel: 'Admins',        icon: faUserShield },
    { key: 'logs',          label: 'Logs de actividad',            shortLabel: 'Logs',          icon: faClockRotateLeft },
];

export default function AdminDashboard({ role, currentUser }) {
    const [activeTab, setActiveTab] = useState('registro');
    const [menuOpen, setMenuOpen] = useState(false);

  const visibleTabs = role === 'asignador'
    ? tabs.filter(t => t.key !== 'panel' && t.key !== 'admins' && t.key !== 'logs')
    : tabs;

    const activeTabData = visibleTabs.find(t => t.key === activeTab);

    const handleTabClick = (key) => {
        setActiveTab(key);
        setMenuOpen(false);
    };

    return (
        <div style={styles.page}>
            <style>{css}</style>

            {/* ── Top bar ── */}
            <div style={styles.topBar}>
                {/* Desktop tabs */}
                <div style={styles.tabRow} className="desktop-tabs">
                    {visibleTabs.map(tab => (
                        <button
                            key={tab.key}
                            style={styles.tab(activeTab === tab.key)}
                            onClick={() => handleTabClick(tab.key)}
                        >
                            <FontAwesomeIcon icon={tab.icon} />
                            <span className="tab-label">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Mobile: título activo + hamburguesa */}
                <div style={styles.mobileHeader} className="mobile-header">
                    <div style={styles.mobileTitle}>
                        <FontAwesomeIcon icon={activeTabData?.icon} style={{ color: '#226d70' }} />
                        <span>{activeTabData?.shortLabel}</span>
                    </div>
                    <button style={styles.hamburger} onClick={() => setMenuOpen(v => !v)}>
                        <FontAwesomeIcon icon={menuOpen ? faXmark : faBars} />
                    </button>
                </div>

                {/* Logout — siempre visible */}
                <button style={styles.logoutBtn} className="logout-btn" onClick={() => signOut(auth)}>
                    <FontAwesomeIcon icon={faSignOutAlt} />
                    <span className="logout-text">Cerrar sesión</span>
                </button>
            </div>

            {/* ── Menú móvil desplegable ── */}
            {menuOpen && (
                <div style={styles.mobileMenu} className="mobile-menu">
                    {visibleTabs.map(tab => (
                        <button
                            key={tab.key}
                            style={styles.mobileMenuItem(activeTab === tab.key)}
                            onClick={() => handleTabClick(tab.key)}
                        >
                            <FontAwesomeIcon icon={tab.icon} style={{ width: '16px' }} />
                            {tab.label}
                        </button>
                    ))}
                    <div style={styles.mobileMenuDivider} />
                    <button style={styles.mobileLogout} onClick={() => signOut(auth)}>
                        <FontAwesomeIcon icon={faSignOutAlt} />
                        Cerrar sesión
                    </button>
                </div>
            )}

           {/* ── Contenido ── */}
<div className="admin-content">
    {activeTab === 'registro'      && <TicketsPanel />}
    {activeTab === 'actualizacion' && <UpdateTicketsPanel />}
    {activeTab === 'logs'          && <LogsPanel />}
    {activeTab === 'panel'         && role === 'admin' && <AdminPanel currentUser={currentUser} />}
    {activeTab === 'admins'        && (role === 'admin' || role === 'superadmin') && (
        <AdminManagerPanel currentRole={role} currentUid={currentUser.uid} />
    )}
</div>
        </div>
    );
}

// ── Estilos ────────────────────────────────────────────────────────────
const styles = {
    page: {
        fontFamily: "'DM Sans', sans-serif",
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
    },
    topBar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderBottom: '2px solid #e5e7eb',
        paddingLeft: '2rem',
        paddingRight: '1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 100,
    },
tabRow: {
    display: 'flex',
    gap: 0,
    overflow: 'hidden',           // ← sin flex:1
},
tab: (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '1rem 0.85rem',      // ← menos padding horizontal
    border: 'none',
    borderBottom: active ? '2px solid #226d70' : '2px solid transparent',
    marginBottom: '-2px',
    background: 'none',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.8rem',            // ← un poco más pequeño
    fontWeight: active ? '700' : '500',
    color: active ? '#226d70' : '#6b7280',
    cursor: 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
}),
    logoutBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.5rem 1rem',
        borderRadius: '6px',
        border: '1px solid #e4e4e7',
        background: '#fff',
        color: '#3f3f46',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '0.8rem',
        fontWeight: '600',
        cursor: 'pointer',
        flexShrink: 0,
        marginLeft: '1rem',
    },
    // Mobile
    mobileHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flex: 1,
        padding: '0.75rem 0',
    },
    mobileTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.95rem',
        fontWeight: '700',
        color: '#111827',
    },
    hamburger: {
        background: 'none',
        border: 'none',
        fontSize: '1.2rem',
        color: '#374151',
        cursor: 'pointer',
        padding: '0.25rem 0.5rem',
    },
    mobileMenu: {
        position: 'sticky',
        top: '57px',
        zIndex: 99,
        backgroundColor: '#fff',
        borderBottom: '1.5px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        padding: '0.5rem',
        gap: '0.25rem',
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    },
    mobileMenuItem: (active) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        border: 'none',
        background: active ? '#f0fdf4' : 'transparent',
        color: active ? '#226d70' : '#374151',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '0.9rem',
        fontWeight: active ? '700' : '500',
        cursor: 'pointer',
        textAlign: 'left',
    }),
    mobileMenuDivider: {
        height: '1px',
        background: '#e5e7eb',
        margin: '0.25rem 0',
    },
    mobileLogout: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        border: 'none',
        background: 'transparent',
        color: '#dc2626',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '0.9rem',
        fontWeight: '600',
        cursor: 'pointer',
        textAlign: 'left',
    },
};
const css = `
    html, body, #root {
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
    }

    .desktop-tabs { display: flex !important; }
    .mobile-header { display: none !important; }
    .logout-text   { display: inline !important; }

    .admin-content {
        height: calc(100vh - 57px);
        overflow-y: auto;
        scrollbar-width: none;
        -ms-overflow-style: none;
    }

    .admin-content::-webkit-scrollbar {
        display: none;
    }

    @media (max-width: 768px) {
        .desktop-tabs  { display: none !important; }
        .mobile-header { display: flex !important; }
        .logout-text   { display: none !important; }
        .logout-btn    { padding: 0.5rem !important; }
        .mobile-menu   { display: flex; }
    }
`;