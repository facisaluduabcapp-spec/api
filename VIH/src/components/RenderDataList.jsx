// src/components/RenderDataList.jsx
import React from 'react';

// ===================================================================
// --- COMPONENTE AUXILIAR: RenderDataList ---
// ===================================================================
// Usamos const en lugar de function para mantener la consistencia
const RenderDataList = ({ data, isNested = false }) => {
    // Es CRUCIAL que el componente recursivo (RenderDataList)
    // se llame a sí mismo aquí. Esto funciona porque se exporta
    // por defecto y se usa internamente.

    const keys = Object.keys(data).filter(key => key !== 'id' && key !== 'fecha');
    const simpleKeys = [];
    const complexKeys = [];
    
    keys.forEach(key => {
        const value = data[key];
        if (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length > 0) {
            complexKeys.push(key);
        } else {
            simpleKeys.push(key);
        }
    });

    const orderedKeys = [...simpleKeys, ...complexKeys];
    
    if (orderedKeys.length === 0) {
        return <p style={{ color: '#6c757d', fontSize: '0.875rem', margin: 0 }}>No hay detalles adicionales</p>;
    }
    
    const renderItem = (key) => {
        let value = data[key];
        let displayValue;
        let isComplex = false;
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length > 0) {
            isComplex = true;
            displayValue = (
                <div style={{ marginTop: '0.25rem', marginBottom: '0.25rem' }}>
                    {/* LLAMADA RECURSIVA */}
                    <RenderDataList data={value} isNested={true} /> 
                </div>
            );
        } else if (Array.isArray(value)) {
             isComplex = true;
             displayValue = (
                 <div style={{ marginTop: '0.25rem', marginBottom: '0.25rem', marginLeft: '0.5rem' }}>
                     {value.map((item, index) => (
                         <div key={index} style={{ padding: '0.25rem', background: '#6c757d', color: 'white', borderRadius: '1rem', display: 'inline-block', margin: '0.125rem', fontSize: '0.75rem' }}>
                             {index + 1}: {typeof item === 'object' && item !== null ? '[Objeto]' : String(item)}
                         </div>
                     ))}
                 </div>
             );
        } else {
             if (typeof value === 'boolean') {
                 value = value ? 'Sí (true)' : 'No (false)';
             } else if (value === null || value === undefined) {
                 value = 'N/A';
             }
             value = String(value); 
             displayValue = (
                 <span style={{ background: '#6c757d', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem', marginLeft: 'auto', wordBreak: 'break-word' }}>
                     {value}
                 </span>
             );
        }
        
        const separator = isComplex && !isNested ? <hr style={{ margin: '0.25rem 0', borderTop: '1px solid rgba(0,0,0,0.1)' }} /> : null;
        
        return (
            <div key={key}>
                {separator}
                <div style={{ display: 'flex', alignItems: 'start', padding: '0.25rem 0.5rem', flexDirection: isComplex ? 'column' : 'row', justifyContent: isComplex ? 'flex-start' : 'space-between' }}>
                    <span style={{ fontWeight: 600, marginRight: '0.5rem', whiteSpace: 'nowrap' }}>{key}:</span>
                    {displayValue}
                </div>
            </div>
        );
    };
    
    return (
        <div style={{ fontSize: '0.875rem', borderLeft: isNested ? '2px solid #dee2e6' : 'none', marginLeft: isNested ? '0.5rem' : 0, paddingLeft: isNested ? '0.5rem' : 0 }}>
            {orderedKeys.map(renderItem)}
        </div>
    );
};

export default RenderDataList; // <--- Exportación por defecto