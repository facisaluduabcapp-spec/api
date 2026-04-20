import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUsers, faSpinner, faTimes
} from '@fortawesome/free-solid-svg-icons';
import { calcularAdherenciaDesdeHistorial } from './AnalizadorInteligente';

// ─────────────────────────────────────────────────────────────────────
// HELPERS DE FECHA (duplicados localmente para no acoplar más el módulo)
// ─────────────────────────────────────────────────────────────────────

const toDateStr = (raw) => {
    if (!raw) return null;
    if (typeof raw.toDate === 'function') raw = raw.toDate();
    if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw.toISOString().substring(0,10);
    const s = String(raw);
    const dmY = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dmY) { const [,d,m,y]=dmY; return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`; }
    const dt = new Date(s);
    return isNaN(dt.getTime()) ? null : dt.toISOString().substring(0,10);
};

const offsetDate = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`; // Retorna "2026-03-24" exacto
};
const esSi = (r) => /^s[\u00edi]/i.test((r||'').trim());
const esTomado = (v) => v === true || /^s[\u00edi]/i.test(String(v||'').trim());

// ─────────────────────────────────────────────────────────────────────
// CONSTRUCCION DE HISTORIAL POR FECHA REAL
// (misma logica que AnalizadorInteligente — fuente unica de verdad)
// ─────────────────────────────────────────────────────────────────────
const extraerRespuestasFarmaco = (tomas) => {
    const resultado = [];
    (tomas || []).forEach(dia => {
        const fechaDia = toDateStr(dia.fecha || dia.id);

        // 1. PROCESAR MAPA DE TOMAS (Estructura nueva - 24 de marzo)
        if (dia.tomas && typeof dia.tomas === 'object') {
            Object.keys(dia.tomas).forEach(hora => {
                const medsEnHora = dia.tomas[hora];
                if (medsEnHora && typeof medsEnHora === 'object') {
                    Object.keys(medsEnHora).forEach(nombreMed => {
                        const registro = medsEnHora[nombreMed];
                        resultado.push({
                            respuesta: esTomado(registro?.tomado) ? 'Sí' : 'No',
                            fecha: fechaDia,
                        });
                    });
                }
            });
        }

        // 2. PROCESAR ESTRUCTURA ANTERIOR (Si existe)
        Object.keys(dia).forEach(key => {
            if (key === 'id' || key === 'fecha' || key === 'tomas') return;
            const item = dia[key];
            if (item && typeof item === 'object' && item.categoria === 'Farmaco') {
                resultado.push({
                    respuesta: (item.respuesta || '').trim(),
                    fecha: toDateStr(item.fechaRespuesta) ?? fechaDia,
                });
            }
        });
    });
    return resultado;
};
const construirHistorial = (tomas, n = 12) => {
    const resp = extraerRespuestasFarmaco(tomas);
    const porFecha = {};
    resp.forEach(r => {
        if (!r.fecha) return;
        porFecha[r.fecha] = porFecha[r.fecha]===1 ? 1 : (esSi(r.respuesta)?1:0);
    });
    const hist = [];
    if (n === 6) {
        for (let i = n - 1; i >= 0; i--) hist.push(porFecha[offsetDate(i)] ?? 0);
    } else {
        for (let i = n; i >= 1; i--) hist.push(porFecha[offsetDate(i)] ?? 0);
    }
    return hist;
};

const contarRegistrosUltimos6Dias = (tomas) => {
    if (!Array.isArray(tomas)) return 0;
    const desde = offsetDate(5);
    const hasta = offsetDate(0);
    return tomas.filter(d => {
        const fecha = toDateStr(d.fecha || d.id);
        return fecha && fecha >= desde && fecha <= hasta;
    }).length;
};

// ─────────────────────────────────────────────────────────────────────
// ESTADISTICAS POBLACIONALES — basadas en historial real
// ─────────────────────────────────────────────────────────────────────

const calcularEstadisticasGrupo = (usuarios) => {
    const adherencias = [];
    let usuariosConDatos = 0;
    let registrosUltimos6Dias = 0;
    let registrosRecientes = 0;

    usuarios.forEach(usuario => {
        const tomas = usuario.tomas || [];
        const registros = contarRegistrosUltimos6Dias(tomas);
        const hist = construirHistorial(tomas, 6);
        const a6d = calcularAdherenciaDesdeHistorial(hist);

        registrosUltimos6Dias += registros;
        registrosRecientes += registros;

        if (registros > 0) {
            adherencias.push(a6d?.porcentaje ?? 0);
            usuariosConDatos++;
        }
    });

    if (!adherencias.length) {
        return { totalUsuarios:usuarios.length, usuariosConDatos:0,
            adherenciaPromedio:'0.0', mediana:'0.0', desviacionEstandar:'0.0',
            adherenciaAlta:0, adherenciaMedia:0, adherenciaBaja:0, adherencias,
            registrosUltimos6Dias, registrosRecientes };
    }

    const promedio = adherencias.reduce((a,b)=>a+b,0) / adherencias.length;
    const varianza = adherencias.reduce((s,v)=>s+Math.pow(v-promedio,2),0) / adherencias.length;
    const ds       = Math.sqrt(varianza);
    const ord      = [...adherencias].sort((a,b)=>a-b);
    const mid      = Math.floor(ord.length/2);
    const mediana  = ord.length%2!==0 ? ord[mid] : (ord[mid-1]+ord[mid])/2;

    return {
        totalUsuarios: usuarios.length,
        usuariosConDatos,
        adherenciaPromedio:  promedio.toFixed(1),
        mediana:             mediana.toFixed(1),
        desviacionEstandar:  ds.toFixed(1),
        adherenciaAlta:  adherencias.filter(a=>a>=80).length,
        adherenciaMedia: adherencias.filter(a=>a>=60&&a<80).length,
        adherenciaBaja:  adherencias.filter(a=>a<60).length,
        registrosUltimos6Dias,
        registrosRecientes,
        adherencias,
    };
};

// ─────────────────────────────────────────────────────────────────────
// COLORES
// ─────────────────────────────────────────────────────────────────────

const C = {
    green:'#00723F', greenDark:'#024731', greenLight:'#e8f5ee',
    white:'#ffffff',  gray50:'#fafafa',   gray100:'#f4f4f5',
    gray200:'#e4e4e7',gray500:'#71717a',  gray700:'#3f3f46',
    gray900:'#18181b',red:'#dc2626',      amber:'#d97706',
};

// ─────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────

const ComparadorAdherencia = ({ usuarios }) => {
    const [showModal, setShowModal] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [analysis, setAnalysis]   = useState(null);
    const usuariosArray = Array.isArray(usuarios) ? usuarios : [];

    const realizarAnalisis = () => {
        if (usuariosArray.length === 0) {
            console.warn('ComparadorAdherencia: no hay usuarios cargados para comparar');
            return;
        }
        setAnalyzing(true);
        setShowModal(true);
        setTimeout(() => {
            try {
                const uA = usuariosArray.filter(u => u.perfiles?.find(p => p?.tipoUsuario === 'Usuario A'));
                const uB = usuariosArray.filter(u => u.perfiles?.find(p => p?.tipoUsuario === 'Usuario B'));
                console.log('ComparadorAdherencia: usuarios total=', usuariosArray.length, 'A=', uA.length, 'B=', uB.length);
                console.log('ComparadorAdherencia: uA sample=', uA.map(u => ({ userId:u.userId, tipoUsuario:u.perfiles?.find(p=>p?.tipoUsuario)?.tipoUsuario, tomasCount:u.tomas?.length, tomasIds:u.tomas?.slice(0,8).map(d=>d.id)})).slice(0,5));
                console.log('ComparadorAdherencia: uB sample=', uB.map(u => ({ userId:u.userId, tipoUsuario:u.perfiles?.find(p=>p?.tipoUsuario)?.tipoUsuario, tomasCount:u.tomas?.length, tomasIds:u.tomas?.slice(0,8).map(d=>({id:d.id, fecha:d.fecha, tomas:d.tomas}))})).slice(0,5));
                const sA = calcularEstadisticasGrupo(uA);
                const sB = calcularEstadisticasGrupo(uB);
                console.log('ComparadorAdherencia: statsA=', sA, 'statsB=', sB);
                setAnalysis({
                    statsA: sA,
                    statsB: sB,
                    totalUsuarios: usuarios.length,
                    periodoStr: `${offsetDate(5)} → ${offsetDate(0)}`,
                });
            } catch(e) { console.error('ComparadorAdherencia error', e); }
            finally    { setAnalyzing(false); }
        }, 800);
    };

    const Modal = () => {
        if (!showModal) return null;
        return (
            <div style={{position:'fixed',inset:0,backgroundColor:'rgba(0,0,0,0.45)',display:'flex',justifyContent:'center',alignItems:'flex-start',zIndex:1000,padding:'1rem',overflowY:'auto',backdropFilter:'blur(2px)'}}>
                <div style={{backgroundColor:C.white,borderRadius:'12px',maxWidth:'960px',width:'100%',maxHeight:'90vh',overflow:'auto',margin:'2rem auto',boxShadow:'0 20px 60px rgba(0,0,0,0.15)',border:`1px solid ${C.gray200}`}}>

                    {/* Header */}
                    <div style={{padding:'1.1rem 1.5rem',borderBottom:`1px solid ${C.gray100}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'0.6rem'}}>
                            <span style={{width:'32px',height:'32px',borderRadius:'8px',background:C.greenLight,display:'flex',alignItems:'center',justifyContent:'center'}}>
                                <FontAwesomeIcon icon={faUsers} style={{color:C.green,fontSize:'0.85rem'}}/>
                            </span>
                            <div>
                                <p style={{margin:0,fontWeight:700,fontSize:'0.95rem',color:C.gray900}}>Comparación de Adherencia</p>
                                <p style={{margin:0,fontSize:'0.72rem',color:C.gray500}}>
                                    Ultimos 6 dias · {analysis?.periodoStr??'...'} · Usuario A vs Usuario B
                                </p>
                            </div>
                        </div>
                        <button onClick={()=>setShowModal(false)} style={{background:C.gray100,border:'none',cursor:'pointer',borderRadius:'50%',width:'32px',height:'32px',display:'flex',alignItems:'center',justifyContent:'center',color:C.gray500}}>
                            <FontAwesomeIcon icon={faTimes} style={{fontSize:'0.8rem'}}/>
                        </button>
                    </div>

                    <div style={{padding:'1.5rem',display:'flex',flexDirection:'column',gap:'1.5rem'}}>

                        {analyzing && (
                            <div style={{textAlign:'center',padding:'3rem'}}>
                                <FontAwesomeIcon icon={faSpinner} spin size="2x" style={{color:C.green,marginBottom:'0.75rem'}}/>
                                <p style={{fontSize:'0.9rem',color:C.gray500,margin:0}}>
                                    Calculando adherencia real de {usuarios.length} usuarios…
                                </p>
                            </div>
                        )}

                        {analysis && !analyzing && (<>

                            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:'1rem'}}>
                                {[
                                    {stats:analysis.statsA,label:'Usuario A',color:C.green},
                                    {stats:analysis.statsB,label:'Usuario B',color:C.amber},
                                ].map(({stats,label,color})=>{
                                    const pct = parseFloat(stats.adherenciaPromedio) || 0;
                                    return (
                                        <div key={label} style={{padding:'1.5rem',border:`1px solid ${C.gray200}`,borderRadius:'10px',background:C.white,textAlign:'center'}}>
                                            <p style={{margin:'0 0 0.75rem',fontSize:'0.85rem',fontWeight:700,color:C.gray700}}>{label}</p>
                                            <p style={{margin:0,fontSize:'2.75rem',fontWeight:800,color:color}}>{pct.toFixed(1)}%</p>
                                            <p style={{margin:'0.5rem 0 0',fontSize:'0.78rem',color:C.gray500}}>Adherencia promedio ultimos 6 dias</p>
                                            <p style={{margin:'0.25rem 0 0',fontSize:'0.72rem',color:C.gray500}}>{stats.registrosUltimos6Dias} registros en TomasDiarias</p>
                                        </div>
                                    );
                                })}
                            </div>

                            <div style={{padding:'1.25rem',border:`1px solid ${C.gray200}`,borderRadius:'10px',background:C.gray50}}>
                                <p style={{margin:'0 0 0.75rem',fontSize:'0.78rem',fontWeight:700,color:C.gray700,textTransform:'uppercase',letterSpacing:'0.06em'}}>Comparacion de adherencia</p>
                                <p style={{margin:'0',fontSize:'1rem',color:C.gray900}}>
                                    Usuario A tiene <strong>{(parseFloat(analysis.statsA.adherenciaPromedio)-parseFloat(analysis.statsB.adherenciaPromedio)).toFixed(1)}%</strong> {parseFloat(analysis.statsA.adherenciaPromedio) >= parseFloat(analysis.statsB.adherenciaPromedio) ? 'mas' : 'menos'} adherencia que Usuario B.
                                </p>
                            </div>

                        </>)}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <button onClick={realizarAnalisis} disabled={analyzing || usuariosArray.length === 0}
                style={{padding:'0.5rem 1rem',background:(analyzing || usuariosArray.length === 0)?C.gray100:C.greenDark,color:(analyzing || usuariosArray.length === 0)?C.gray500:C.white,border:'none',borderRadius:'6px',cursor:(analyzing || usuariosArray.length === 0)?'not-allowed':'pointer',display:'flex',alignItems:'center',gap:'7px',fontSize:'0.8rem',fontWeight:600,whiteSpace:'nowrap',letterSpacing:'0.02em'}}>
                <FontAwesomeIcon icon={analyzing?faSpinner:faUsers} spin={analyzing}/>
                {analyzing?'Comparando…':'Comparar A vs B'}
            </button>
            {usuariosArray.length === 0 && (
                <p style={{margin:'0.75rem 0 0',fontSize:'0.78rem',color:C.gray500}}>Esperando carga de usuarios para comparar...</p>
            )}
            <Modal/>
        </>
    );
};

export default ComparadorAdherencia;