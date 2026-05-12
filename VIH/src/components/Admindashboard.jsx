import React, { useState } from 'react';
import TicketsPanel from './TicketsPanel';
import UpdateTicketsPanel from './UpdateTicketsPanel';
import AdminPanel from './AdminPanel';                          // ← agregar
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPlus, faPenToSquare, faUsers } from '@fortawesome/free-solid-svg-icons'; // ← agregar faUsers

const tabs = [
    { key: 'registro',      label: 'Solicitudes de registro',     icon: faUserPlus },
    { key: 'actualizacion', label: 'Solicitudes de actualización', icon: faPenToSquare },
    { key: 'panel',         label: 'Panel de usuarios',            icon: faUsers },   // ← agregar
];

const s = {
    page: {
        fontFamily: "'DM Sans', sans-serif",
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
    },
    tabBar: {
        display: 'flex',
        gap: '0',
        borderBottom: '2px solid #e5e7eb',
        backgroundColor: '#fff',
        paddingLeft: '2rem',
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
            <div style={s.tabBar}>
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