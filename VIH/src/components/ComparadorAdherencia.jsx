import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faUsers, faSpinner, faChartBar, faPills, 
    faUserCheck, faUserTimes, faTimes, faInfoCircle,
    faTrophy, faChartLine, faExclamationCircle
} from '@fortawesome/free-solid-svg-icons';

// ===================================================================
// ALGORITMOS DE COMPARACIÓN POBLACIONAL
// ===================================================================

// Calcular estadísticas de adherencia para un grupo de usuarios
const calcularEstadisticasGrupo = (usuarios) => {
    let totalTomas = 0;
    let tomasCumplidas = 0;
    let tomasOmitidas = 0;
    let usuariosConDatos = 0;
    const adherenciasIndividuales = [];
    const diasConRegistro = [];

    usuarios.forEach(usuario => {
        let tomasUsuario = 0;
        let cumplidasUsuario = 0;
        let omisionesusuario = 0;

        if (usuario.tomas && usuario.tomas.length > 0) {
            usuariosConDatos++;
            diasConRegistro.push(usuario.tomas.length);

            usuario.tomas.forEach(dia => {
                if (dia.tomas && typeof dia.tomas === 'object') {
                    Object.keys(dia.tomas).forEach(hora => {
                        const medicamentos = dia.tomas[hora];
                        if (medicamentos && typeof medicamentos === 'object') {
                            Object.keys(medicamentos).forEach(med => {
                                tomasUsuario++;
                                totalTomas++;
                                
                                if (medicamentos[med].tomado === true) {
                                    cumplidasUsuario++;
                                    tomasCumplidas++;
                                } else {
                                    omisionesusuario++;
                                    tomasOmitidas++;
                                }
                            });
                        }
                    });
                }
            });

            // Calcular adherencia individual
            if (tomasUsuario > 0) {
                const adherenciaIndividual = (cumplidasUsuario / tomasUsuario) * 100;
                adherenciasIndividuales.push(adherenciaIndividual);
            }
        }
    });

    // Calcular estadísticas agregadas
    const adherenciaPromedio = totalTomas > 0 ? (tomasCumplidas / totalTomas) * 100 : 0;
    
    // Calcular desviación estándar
    let desviacionEstandar = 0;
    if (adherenciasIndividuales.length > 0) {
        const promedio = adherenciasIndividuales.reduce((a, b) => a + b, 0) / adherenciasIndividuales.length;
        const varianza = adherenciasIndividuales.reduce((sum, val) => sum + Math.pow(val - promedio, 2), 0) / adherenciasIndividuales.length;
        desviacionEstandar = Math.sqrt(varianza);
    }

    // Calcular mediana de adherencia
    const adherenciasOrdenadas = [...adherenciasIndividuales].sort((a, b) => a - b);
    let mediana = 0;
    if (adherenciasOrdenadas.length > 0) {
        const mid = Math.floor(adherenciasOrdenadas.length / 2);
        mediana = adherenciasOrdenadas.length % 2 !== 0
            ? adherenciasOrdenadas[mid]
            : (adherenciasOrdenadas[mid - 1] + adherenciasOrdenadas[mid]) / 2;
    }

    // Clasificar usuarios por nivel de adherencia
    const adherenciaAlta = adherenciasIndividuales.filter(a => a >= 80).length;
    const adherenciaMedia = adherenciasIndividuales.filter(a => a >= 60 && a < 80).length;
    const adherenciaBaja = adherenciasIndividuales.filter(a => a < 60).length;

    // Promedio de días con registro
    const promedioDias = diasConRegistro.length > 0 
        ? diasConRegistro.reduce((a, b) => a + b, 0) / diasConRegistro.length 
        : 0;

    return {
        totalUsuarios: usuarios.length,
        usuariosConDatos,
        totalTomas,
        tomasCumplidas,
        tomasOmitidas,
        adherenciaPromedio: adherenciaPromedio.toFixed(1),
        mediana: mediana.toFixed(1),
        desviacionEstandar: desviacionEstandar.toFixed(1),
        adherenciaAlta,
        adherenciaMedia,
        adherenciaBaja,
        promedioDias: promedioDias.toFixed(1),
        adherenciasIndividuales
    };
};

// Realizar comparación estadística entre grupos
const compararGrupos = (statsA, statsB) => {
    const comparaciones = [];

    // Comparación 1: Adherencia promedio
    const difAdherencia = parseFloat(statsA.adherenciaPromedio) - parseFloat(statsB.adherenciaPromedio);
    comparaciones.push({
        metrica: 'Adherencia Promedio',
        valorA: `${statsA.adherenciaPromedio}%`,
        valorB: `${statsB.adherenciaPromedio}%`,
        diferencia: `${difAdherencia > 0 ? '+' : ''}${difAdherencia.toFixed(1)}%`,
        favorece: difAdherencia > 0 ? 'A' : difAdherencia < 0 ? 'B' : 'Empate',
        significativo: Math.abs(difAdherencia) > 10
    });

    // Comparación 2: Mediana de adherencia
    const difMediana = parseFloat(statsA.mediana) - parseFloat(statsB.mediana);
    comparaciones.push({
        metrica: 'Mediana de Adherencia',
        valorA: `${statsA.mediana}%`,
        valorB: `${statsB.mediana}%`,
        diferencia: `${difMediana > 0 ? '+' : ''}${difMediana.toFixed(1)}%`,
        favorece: difMediana > 0 ? 'A' : difMediana < 0 ? 'B' : 'Empate',
        significativo: Math.abs(difMediana) > 10
    });

    // Comparación 3: Consistencia (Desviación estándar - menor es mejor)
    const difConsistencia = parseFloat(statsB.desviacionEstandar) - parseFloat(statsA.desviacionEstandar);
    comparaciones.push({
        metrica: 'Consistencia',
        valorA: `±${statsA.desviacionEstandar}%`,
        valorB: `±${statsB.desviacionEstandar}%`,
        diferencia: `${difConsistencia > 0 ? 'Más' : 'Menos'} consistente`,
        favorece: difConsistencia > 0 ? 'A' : difConsistencia < 0 ? 'B' : 'Empate',
        significativo: Math.abs(difConsistencia) > 5
    });

    // Comparación 4: Usuarios con alta adherencia (>=80%)
    const pctAltaA = statsA.usuariosConDatos > 0 ? (statsA.adherenciaAlta / statsA.usuariosConDatos) * 100 : 0;
    const pctAltaB = statsB.usuariosConDatos > 0 ? (statsB.adherenciaAlta / statsB.usuariosConDatos) * 100 : 0;
    const difAlta = pctAltaA - pctAltaB;
    
    comparaciones.push({
        metrica: '% Alta Adherencia (≥80%)',
        valorA: `${pctAltaA.toFixed(0)}%`,
        valorB: `${pctAltaB.toFixed(0)}%`,
        diferencia: `${difAlta > 0 ? '+' : ''}${difAlta.toFixed(1)}%`,
        favorece: difAlta > 0 ? 'A' : difAlta < 0 ? 'B' : 'Empate',
        significativo: Math.abs(difAlta) > 15
    });

    // Comparación 5: Promedio de días con registro
    const difDias = parseFloat(statsA.promedioDias) - parseFloat(statsB.promedioDias);
    comparaciones.push({
        metrica: 'Días de Registro Promedio',
        valorA: statsA.promedioDias,
        valorB: statsB.promedioDias,
        diferencia: `${difDias > 0 ? '+' : ''}${difDias.toFixed(1)} días`,
        favorece: difDias > 0 ? 'A' : difDias < 0 ? 'B' : 'Empate',
        significativo: Math.abs(difDias) > 3
    });

    return comparaciones;
};

// Generar insights basados en las comparaciones
const generarInsights = (statsA, statsB, comparaciones) => {
    const insights = [];

    // Insight 1: Grupo con mejor adherencia general
    const difAdherencia = parseFloat(statsA.adherenciaPromedio) - parseFloat(statsB.adherenciaPromedio);
    if (Math.abs(difAdherencia) > 10) {
        const mejorGrupo = difAdherencia > 0 ? 'A' : 'B';
        insights.push({
            tipo: 'significativo',
            titulo: 'Diferencia Significativa en Adherencia',
            descripcion: `Los Usuarios ${mejorGrupo} muestran una adherencia ${Math.abs(difAdherencia).toFixed(1)}% superior, lo que sugiere diferencias importantes en el cumplimiento del tratamiento.`
        });
    } else {
        insights.push({
            tipo: 'neutral',
            titulo: 'Adherencia Similar',
            descripcion: 'Ambos grupos mantienen niveles de adherencia comparables, con diferencias menores al 10%.'
        });
    }

    // Insight 2: Consistencia del grupo
    const difDesviacion = Math.abs(parseFloat(statsA.desviacionEstandar) - parseFloat(statsB.desviacionEstandar));
    if (difDesviacion > 5) {
        const masConsistente = parseFloat(statsA.desviacionEstandar) < parseFloat(statsB.desviacionEstandar) ? 'A' : 'B';
        insights.push({
            tipo: 'importante',
            titulo: 'Diferencia en Consistencia',
            descripcion: `Los Usuarios ${masConsistente} muestran mayor consistencia en su adherencia (menor variabilidad), lo que indica un patrón más estable de cumplimiento.`
        });
    }

    // Insight 3: Distribución de adherencia alta
    const pctAltaA = statsA.usuariosConDatos > 0 ? (statsA.adherenciaAlta / statsA.usuariosConDatos) * 100 : 0;
    const pctAltaB = statsB.usuariosConDatos > 0 ? (statsB.adherenciaAlta / statsB.usuariosConDatos) * 100 : 0;
    
    if (Math.abs(pctAltaA - pctAltaB) > 20) {
        const mejorDistribucion = pctAltaA > pctAltaB ? 'A' : 'B';
        insights.push({
            tipo: 'alerta',
            titulo: 'Diferencia en Adherencia Óptima',
            descripcion: `El ${Math.max(pctAltaA, pctAltaB).toFixed(0)}% de Usuarios ${mejorDistribucion} mantienen adherencia alta (≥80%), comparado con solo ${Math.min(pctAltaA, pctAltaB).toFixed(0)}% del otro grupo.`
        });
    }

    // Insight 4: Usuarios con datos insuficientes
    const pctSinDatosA = statsA.totalUsuarios > 0 ? ((statsA.totalUsuarios - statsA.usuariosConDatos) / statsA.totalUsuarios) * 100 : 0;
    const pctSinDatosB = statsB.totalUsuarios > 0 ? ((statsB.totalUsuarios - statsB.usuariosConDatos) / statsB.totalUsuarios) * 100 : 0;
    
    if (pctSinDatosA > 30 || pctSinDatosB > 30) {
        insights.push({
            tipo: 'advertencia',
            titulo: 'Datos Incompletos',
            descripcion: `Algunos usuarios no tienen registros de tomas (Tipo A: ${pctSinDatosA.toFixed(0)}%, Tipo B: ${pctSinDatosB.toFixed(0)}%). Esto puede afectar la precisión del análisis.`
        });
    }

    // Insight 5: Recomendación general
    const adherenciaGlobalA = parseFloat(statsA.adherenciaPromedio);
    const adherenciaGlobalB = parseFloat(statsB.adherenciaPromedio);
    
    if (adherenciaGlobalA < 75 || adherenciaGlobalB < 75) {
        const grupoNecesitaAtencion = adherenciaGlobalA < adherenciaGlobalB ? 'A' : 'B';
        insights.push({
            tipo: 'recomendacion',
            titulo: 'Acción Recomendada',
            descripcion: `Se recomienda implementar estrategias de mejora de adherencia enfocadas en Usuarios ${grupoNecesitaAtencion}, como recordatorios personalizados, educación sobre el tratamiento y seguimiento más cercano.`
        });
    }

    return insights;
};

// ===================================================================
// COMPONENTE PRINCIPAL
// ===================================================================

const ComparadorAdherencia = ({ usuarios }) => {
    const [showModal, setShowModal] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState(null);

    const realizarAnalisis = () => {
        setAnalyzing(true);
        setShowModal(true);

        setTimeout(() => {
            try {
                // Separar usuarios por tipo
                const usuariosA = usuarios.filter(u => {
                    const perfil = u.perfiles && u.perfiles[0];
                    return perfil && perfil.tipoUsuario === 'Usuario A';
                });

                const usuariosB = usuarios.filter(u => {
                    const perfil = u.perfiles && u.perfiles[0];
                    return perfil && perfil.tipoUsuario === 'Usuario B';
                });

                // Calcular estadísticas para cada grupo
                const statsA = calcularEstadisticasGrupo(usuariosA);
                const statsB = calcularEstadisticasGrupo(usuariosB);

                // Realizar comparaciones
                const comparaciones = compararGrupos(statsA, statsB);

                // Generar insights
                const insights = generarInsights(statsA, statsB, comparaciones);

                setAnalysis({
                    statsA,
                    statsB,
                    comparaciones,
                    insights,
                    totalUsuarios: usuarios.length
                });
            } catch (error) {
                console.error('Error en análisis comparativo:', error);
            } finally {
                setAnalyzing(false);
            }
        }, 1500);
    };

    const Modal = () => {
        if (!showModal) return null;

        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.7)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000,
                padding: '1rem',
                overflowY: 'auto'
            }}>
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    maxWidth: '1000px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                    margin: '2rem auto'
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '1.5rem',
                        background: 'linear-gradient(135deg, #FEBE10 0%, #DD971A 100%)',
                        color: 'white',
                        borderRadius: '12px 12px 0 0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>
                            <FontAwesomeIcon icon={faUsers} style={{ marginRight: '10px' }} />
                            Análisis Comparativo: Usuario A vs Usuario B
                        </h2>
                        <button
                            onClick={() => setShowModal(false)}
                            style={{
                                background: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                fontSize: '1.5rem',
                                cursor: 'pointer',
                                color: 'white',
                                borderRadius: '50%',
                                width: '40px',
                                height: '40px'
                            }}
                        >
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </div>

                    <div style={{ padding: '1.5rem' }}>
                        {analyzing && (
                            <div style={{ textAlign: 'center', padding: '3rem' }}>
                                <FontAwesomeIcon icon={faSpinner} spin size="3x" style={{ color: '#4facfe', marginBottom: '1rem' }} />
                                <p style={{ fontSize: '1.1rem', color: '#6c757d' }}>
                                    Analizando adherencia poblacional...
                                </p>
                                <p style={{ fontSize: '0.9rem', color: '#adb5bd' }}>
                                    Procesando datos de {usuarios.length} usuarios
                                </p>
                            </div>
                        )}

                        {analysis && !analyzing && (
                            <div>
                                {/* Resumen General */}
                                <div style={{
                                    padding: '1rem',
                                    backgroundColor: '#e8ffe7ff',
                                    borderRadius: '8px',
                                    marginBottom: '1.5rem',
                                    textAlign: 'center'
                                }}>
                                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#222222' }}>
                                         Muestra Analizada
                                    </h3>
                                    <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '1rem' }}>
                                        <div>
                                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>
                                                {analysis.statsA.totalUsuarios}
                                            </div>
                                            <div style={{ fontSize: '0.9rem' }}>Usuarios Tipo A</div>
                                            <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>
                                                ({analysis.statsA.usuariosConDatos} con datos)
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#007bff' }}>
                                                {analysis.statsB.totalUsuarios}
                                            </div>
                                            <div style={{ fontSize: '0.9rem' }}>Usuarios Tipo B</div>
                                            <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>
                                                ({analysis.statsB.usuariosConDatos} con datos)
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Tarjetas Comparativas Grandes */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                    gap: '1rem',
                                    marginBottom: '1.5rem'
                                }}>
                                    {/* Usuario A */}
                                    <div style={{
                                        padding: '1.5rem',
                                        background: 'linear-gradient(135deg, #d6fad4ff 0%, #a3d69fff 100%)',
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                                    }}>
                                        <h3 style={{ margin: '0 0 1rem 0', color: '#333', fontSize: '1.3rem' }}>
                                            <FontAwesomeIcon icon={faUserCheck} style={{ marginRight: '8px' }} />
                                            Usuario A
                                        </h3>
                                        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem' }}>
                                            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '6px' }}>
                                                <strong> Adherencia Promedio:</strong> <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#28a745' }}>{analysis.statsA.adherenciaPromedio}%</span>
                                            </div>
                                            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '6px' }}>
                                                <strong> Mediana:</strong> {analysis.statsA.mediana}%
                                            </div>
                                            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '6px' }}>
                                                <strong> Desviación:</strong> ±{analysis.statsA.desviacionEstandar}%
                                            </div>
                                            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '6px' }}>
                                                <strong> Alta adherencia:</strong> {analysis.statsA.adherenciaAlta} usuarios
                                            </div>
                                            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '6px' }}>
                                                <strong> Días promedio:</strong> {analysis.statsA.promedioDias}
                                            </div>
                                            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '6px' }}>
                                                <strong> Total tomas:</strong> {analysis.statsA.totalTomas}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Usuario B */}
                                    <div style={{
                                        padding: '1.5rem',
                                        background: 'linear-gradient(135deg, #d6fad4ff 0%, #a3d69fff 100%)',
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                                    }}>
                                        <h3 style={{ margin: '0 0 1rem 0', color: '#333', fontSize: '1.3rem' }}>
                                            <FontAwesomeIcon icon={faUserTimes} style={{ marginRight: '8px' }} />
                                            Usuario B
                                        </h3>
                                        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem' }}>
                                            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '6px' }}>
                                                <strong> Adherencia Promedio:</strong> <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#007bff' }}>{analysis.statsB.adherenciaPromedio}%</span>
                                            </div>
                                            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '6px' }}>
                                                <strong> Mediana:</strong> {analysis.statsB.mediana}%
                                            </div>
                                            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '6px' }}>
                                                <strong> Desviación:</strong> ±{analysis.statsB.desviacionEstandar}%
                                            </div>
                                            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '6px' }}>
                                                <strong> Alta adherencia:</strong> {analysis.statsB.adherenciaAlta} usuarios
                                            </div>
                                            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '6px' }}>
                                                <strong> Días promedio:</strong> {analysis.statsB.promedioDias}
                                            </div>
                                            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '6px' }}>
                                                <strong> Total tomas:</strong> {analysis.statsB.totalTomas}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Tabla de Comparaciones */}
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1.1rem', color: '#495057', marginBottom: '0.75rem' }}>
                                        <FontAwesomeIcon icon={faChartBar} style={{ marginRight: '8px' }} />
                                        Comparación Detallada
                                    </h3>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                            <thead>
                                                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                                                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Métrica</th>
                                                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>Usuario A</th>
                                                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>Usuario B</th>
                                                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>Diferencia</th>
                                                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>Favorece</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {analysis.comparaciones.map((comp, idx) => (
                                                    <tr key={idx} style={{
                                                        borderBottom: '1px solid #dee2e6',
                                                        backgroundColor: comp.significativo ? '#fff3cd' : 'white'
                                                    }}>
                                                        <td style={{ padding: '0.75rem', fontWeight: comp.significativo ? 'bold' : 'normal' }}>
                                                            {comp.metrica}
                                                            {comp.significativo && <FontAwesomeIcon icon={faExclamationCircle} style={{ marginLeft: '5px', color: '#ffc107' }} />}
                                                        </td>
                                                        <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', color: '#28a745' }}>
                                                            {comp.valorA}
                                                        </td>
                                                        <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', color: '#007bff' }}>
                                                            {comp.valorB}
                                                        </td>
                                                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                            {comp.diferencia}
                                                        </td>
                                                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                            {comp.favorece === 'A' && <span style={{ color: '#28a745', fontWeight: 'bold' }}>A <FontAwesomeIcon icon={faTrophy} /></span>}
                                                            {comp.favorece === 'B' && <span style={{ color: '#007bff', fontWeight: 'bold' }}>B <FontAwesomeIcon icon={faTrophy} /></span>}
                                                            {comp.favorece === 'Empate' && <span style={{ color: '#6c757d' }}>—</span>}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Insights */}
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1.1rem', color: '#495057', marginBottom: '0.75rem' }}>
                                        <FontAwesomeIcon icon={faChartLine} style={{ marginRight: '8px' }} />
                                        Insights Clínicos ({analysis.insights.length})
                                    </h3>
                                    {analysis.insights.map((insight, idx) => (
                                        <div key={idx} style={{
                                            padding: '1rem',
                                            backgroundColor: 
                                                insight.tipo === 'significativo' ? '#fff3cd' :
                                                insight.tipo === 'importante' ? '#d1ecf1' :
                                                insight.tipo === 'alerta' ? '#f8d7da' :
                                                insight.tipo === 'advertencia' ? '#fff3cd' :
                                                insight.tipo === 'recomendacion' ? '#d1e7dd' :
                                                '#e7f3ff',
                                            borderRadius: '6px',
                                            marginBottom: '0.75rem',
                                            borderLeft: `4px solid ${
                                                insight.tipo === 'significativo' ? '#ffc107' :
                                                insight.tipo === 'importante' ? '#17a2b8' :
                                                insight.tipo === 'alerta' ? '#dc3545' :
                                                insight.tipo === 'advertencia' ? '#ffc107' :
                                                insight.tipo === 'recomendacion' ? '#28a745' :
                                                '#0d6efd'
                                            }`
                                        }}>
                                            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '1rem' }}>
                                                {insight.tipo === 'significativo' && '⚠️'}
                                                {insight.tipo === 'importante' && 'ℹ️'}
                                                {insight.tipo === 'alerta' && '🚨'}
                                                {insight.tipo === 'advertencia' && '⚡'}
                                                {insight.tipo === 'recomendacion' && '💡'}
                                                {insight.tipo === 'neutral' && '📊'}
                                                {' '}{insight.titulo}
                                            </div>
                                            <div style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
                                                {insight.descripcion}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Distribución de Adherencia */}
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1.1rem', color: '#495057', marginBottom: '0.75rem' }}>
                                        <FontAwesomeIcon icon={faChartBar} style={{ marginRight: '8px' }} />
                                        Distribución por Niveles de Adherencia
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                                        {/* Usuario A */}
                                        <div style={{
                                            padding: '1rem',
                                            backgroundColor: '#f8f9fa',
                                            borderRadius: '8px',
                                            border: '2px solid #28a745'
                                        }}>
                                            <h4 style={{ margin: '0 0 1rem 0', color: '#28a745' }}>Usuario A</h4>
                                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span>🟢 Alta (≥80%)</span>
                                                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                                                        {analysis.statsA.adherenciaAlta} 
                                                        <span style={{ fontSize: '0.85rem', color: '#6c757d', marginLeft: '5px' }}>
                                                            ({analysis.statsA.usuariosConDatos > 0 ? 
                                                                ((analysis.statsA.adherenciaAlta / analysis.statsA.usuariosConDatos) * 100).toFixed(0) 
                                                                : 0}%)
                                                        </span>
                                                    </span>
                                                </div>
                                                <div style={{
                                                    height: '10px',
                                                    backgroundColor: '#e9ecef',
                                                    borderRadius: '5px',
                                                    overflow: 'hidden'
                                                }}>
                                                    <div style={{
                                                        width: `${analysis.statsA.usuariosConDatos > 0 ? 
                                                            (analysis.statsA.adherenciaAlta / analysis.statsA.usuariosConDatos) * 100 
                                                            : 0}%`,
                                                        height: '100%',
                                                        backgroundColor: '#28a745'
                                                    }}></div>
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                                                    <span>🟡 Media (60-79%)</span>
                                                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                                                        {analysis.statsA.adherenciaMedia}
                                                        <span style={{ fontSize: '0.85rem', color: '#6c757d', marginLeft: '5px' }}>
                                                            ({analysis.statsA.usuariosConDatos > 0 ? 
                                                                ((analysis.statsA.adherenciaMedia / analysis.statsA.usuariosConDatos) * 100).toFixed(0) 
                                                                : 0}%)
                                                        </span>
                                                    </span>
                                                </div>
                                                <div style={{
                                                    height: '10px',
                                                    backgroundColor: '#e9ecef',
                                                    borderRadius: '5px',
                                                    overflow: 'hidden'
                                                }}>
                                                    <div style={{
                                                        width: `${analysis.statsA.usuariosConDatos > 0 ? 
                                                            (analysis.statsA.adherenciaMedia / analysis.statsA.usuariosConDatos) * 100 
                                                            : 0}%`,
                                                        height: '100%',
                                                        backgroundColor: '#ffc107'
                                                    }}></div>
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                                                    <span>🔴 Baja (&lt;60%)</span>
                                                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                                                        {analysis.statsA.adherenciaBaja}
                                                        <span style={{ fontSize: '0.85rem', color: '#6c757d', marginLeft: '5px' }}>
                                                            ({analysis.statsA.usuariosConDatos > 0 ? 
                                                                ((analysis.statsA.adherenciaBaja / analysis.statsA.usuariosConDatos) * 100).toFixed(0) 
                                                                : 0}%)
                                                        </span>
                                                    </span>
                                                </div>
                                                <div style={{
                                                    height: '10px',
                                                    backgroundColor: '#e9ecef',
                                                    borderRadius: '5px',
                                                    overflow: 'hidden'
                                                }}>
                                                    <div style={{
                                                        width: `${analysis.statsA.usuariosConDatos > 0 ? 
                                                            (analysis.statsA.adherenciaBaja / analysis.statsA.usuariosConDatos) * 100 
                                                            : 0}%`,
                                                        height: '100%',
                                                        backgroundColor: '#dc3545'
                                                    }}></div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Usuario B */}
                                        <div style={{
                                            padding: '1rem',
                                            backgroundColor: '#f8f9fa',
                                            borderRadius: '8px',
                                            border: '2px solid #007bff'
                                        }}>
                                            <h4 style={{ margin: '0 0 1rem 0', color: '#007bff' }}>Usuario B</h4>
                                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span>🟢 Alta (≥80%)</span>
                                                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                                                        {analysis.statsB.adherenciaAlta}
                                                        <span style={{ fontSize: '0.85rem', color: '#6c757d', marginLeft: '5px' }}>
                                                            ({analysis.statsB.usuariosConDatos > 0 ? 
                                                                ((analysis.statsB.adherenciaAlta / analysis.statsB.usuariosConDatos) * 100).toFixed(0) 
                                                                : 0}%)
                                                        </span>
                                                    </span>
                                                </div>
                                                <div style={{
                                                    height: '10px',
                                                    backgroundColor: '#e9ecef',
                                                    borderRadius: '5px',
                                                    overflow: 'hidden'
                                                }}>
                                                    <div style={{
                                                        width: `${analysis.statsB.usuariosConDatos > 0 ? 
                                                            (analysis.statsB.adherenciaAlta / analysis.statsB.usuariosConDatos) * 100 
                                                            : 0}%`,
                                                        height: '100%',
                                                        backgroundColor: '#28a745'
                                                    }}></div>
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                                                    <span>🟡 Media (60-79%)</span>
                                                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                                                        {analysis.statsB.adherenciaMedia}
                                                        <span style={{ fontSize: '0.85rem', color: '#6c757d', marginLeft: '5px' }}>
                                                            ({analysis.statsB.usuariosConDatos > 0 ? 
                                                                ((analysis.statsB.adherenciaMedia / analysis.statsB.usuariosConDatos) * 100).toFixed(0) 
                                                                : 0}%)
                                                        </span>
                                                    </span>
                                                </div>
                                                <div style={{
                                                    height: '10px',
                                                    backgroundColor: '#e9ecef',
                                                    borderRadius: '5px',
                                                    overflow: 'hidden'
                                                }}>
                                                    <div style={{
                                                        width: `${analysis.statsB.usuariosConDatos > 0 ? 
                                                            (analysis.statsB.adherenciaMedia / analysis.statsB.usuariosConDatos) * 100 
                                                            : 0}%`,
                                                        height: '100%',
                                                        backgroundColor: '#ffc107'
                                                    }}></div>
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                                                    <span>🔴 Baja (&lt;60%)</span>
                                                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                                                        {analysis.statsB.adherenciaBaja}
                                                        <span style={{ fontSize: '0.85rem', color: '#6c757d', marginLeft: '5px' }}>
                                                            ({analysis.statsB.usuariosConDatos > 0 ? 
                                                                ((analysis.statsB.adherenciaBaja / analysis.statsB.usuariosConDatos) * 100).toFixed(0) 
                                                                : 0}%)
                                                        </span>
                                                    </span>
                                                </div>
                                                <div style={{
                                                    height: '10px',
                                                    backgroundColor: '#e9ecef',
                                                    borderRadius: '5px',
                                                    overflow: 'hidden'
                                                }}>
                                                    <div style={{
                                                        width: `${analysis.statsB.usuariosConDatos > 0 ? 
                                                            (analysis.statsB.adherenciaBaja / analysis.statsB.usuariosConDatos) * 100 
                                                            : 0}%`,
                                                        height: '100%',
                                                        backgroundColor: '#dc3545'
                                                    }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div style={{
                                    padding: '1rem',
                                    backgroundColor: '#e7f3ff',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    color: '#495057',
                                    textAlign: 'center'
                                }}>
                                    <FontAwesomeIcon icon={faInfoCircle} style={{ marginRight: '5px' }} />
                                    Análisis comparativo generado el {new Date().toLocaleDateString('es-MX', { 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', opacity: 0.8 }}>
                                        📊 Sistema de Análisis Poblacional v1.0 • 
                                        {analysis.totalUsuarios} usuarios totales • 
                                        {analysis.statsA.totalTomas + analysis.statsB.totalTomas} tomas analizadas
                                    </div>
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', opacity: 0.7 }}>
                                        ⚠️ Los resultados marcados con 🏆 indican diferencias estadísticamente significativas
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <button
                onClick={realizarAnalisis}
                disabled={analyzing}
                style={{
                    padding: '0.5rem 1rem',
                    background: analyzing ? '#adb5bd' : 'linear-gradient(135deg, #48b1b8ff 0%, #20419A 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: analyzing ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    whiteSpace: 'nowrap',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    transition: 'all 0.3s ease',
                    boxShadow: analyzing ? 'none' : '0 4px 15px rgba(79, 172, 254, 0.4)'
                }}
                onMouseEnter={(e) => {
                    if (!analyzing) {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 6px 20px rgba(79, 172, 254, 0.6)';
                    }
                }}
                onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = analyzing ? 'none' : '0 4px 15px rgba(79, 172, 254, 0.4)';
                }}
            >
                <FontAwesomeIcon 
                    icon={analyzing ? faSpinner : faUsers} 
                    spin={analyzing}
                    style={{ marginRight: '8px', padding: '0.50rem 0.75rem', }} 
                />
                {analyzing ? 'Comparando...' : 'Comparar A vs B'}
            </button>

            <Modal />
        </>
    );
};

export default ComparadorAdherencia;