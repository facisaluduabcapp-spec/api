import React, { useState } from 'react';
import TicketsPanel from './TicketsPanel';
import UpdateTicketsPanel from './UpdateTicketsPanel';
import AdminPanel from './AdminPanel';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPlus, faPenToSquare, faUsers, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import { auth } from '../firebase/firebase';
import { signOut } from 'firebase/auth';

const tabs = [
    { key: 'registro',      label: 'Solicitudes de registro',     icon: faUserPlus },
    { key: 'actualizacion', label: 'Solicitudes de actualización', icon: faPenToSquare },
    { key: 'panel',         label: 'Panel de usuarios',            icon: faUsers },
];

const s = {
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
    },
    tabRow: {
        display: 'flex',
        gap: '0',
    },
    tab: (active) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '1rem 1.5rem',
        border: 'none',
        borderBottom: active ? '2px solid #226d70' : '2px solid transparent',
        marginBottom: '-2px',
        background: 'none',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '0.9rem',
        fontWeight: active ? '700' : '500',
        color: active ? '#226d70' : '#6b7280',
        cursor: 'pointer',
        transition: 'all 0.15s',
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
    },
    content: {
        padding: '0',
    },
};

export default function AdminDashboard({ role, currentUser }) {

    const visibleTabs = role === 'asignador'
        ? tabs.filter(t => t.key !== 'panel')
        : tabs;

    const [activeTab, setActiveTab] = useState('registro');

    return (
        <div style={s.page}>
            {/* Tab bar + botón cerrar sesión */}
            <div style={s.topBar}>
                <div style={s.tabRow}>
                    {visibleTabs.map(tab => (
                        <button
                            key={tab.key}
                            style={s.tab(activeTab === tab.key)}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            <FontAwesomeIcon icon={tab.icon} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <button style={s.logoutBtn} onClick={() => signOut(auth)}>
                    <FontAwesomeIcon icon={faSignOutAlt} />
                    Cerrar sesión
                </button>
            </div>

            <div style={s.content}>
                {activeTab === 'registro'      && <TicketsPanel />}
                {activeTab === 'actualizacion' && <UpdateTicketsPanel />}
                {activeTab === 'panel' && role === 'admin' && (
                    <AdminPanel currentUser={currentUser} />
                )}
            </div>
        </div>
    );
}