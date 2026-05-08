import React, { useState } from 'react';
import TicketsPanel from './TicketsPanel';           // tickets de registro (ya existe)
import UpdateTicketsPanel from './UpdateTicketsPanel'; // tickets de actualización (por crear)
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPlus, faPenToSquare } from '@fortawesome/free-solid-svg-icons';

const tabs = [
    { key: 'registro',      label: 'Solicitudes de registro',      icon: faUserPlus },
    { key: 'actualizacion', label: 'Solicitudes de actualización',  icon: faPenToSquare },
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

// Reemplaza el return <TicketsPanel /> en App.jsx por:
// return <AdminDashboard />;

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('registro');

    return (
        <div style={s.page}>
            {/* Barra de pestañas */}
            <div style={s.tabBar}>
                {tabs.map(tab => (
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

            {/* Contenido */}
            <div style={s.content}>
                {activeTab === 'registro'      && <TicketsPanel />}
                {activeTab === 'actualizacion' && <UpdateTicketsPanel />}
            </div>
        </div>
    );
}