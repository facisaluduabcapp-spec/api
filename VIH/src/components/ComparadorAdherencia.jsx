import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUsers, faSpinner, faChartBar,
    faUserCheck, faUserTimes, faTimes, faInfoCircle,
    faTrophy, faChartLine, faExclamationCircle
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

// ─────────────────────────────────────────────────────────────────────
// CONSTRUCCIÓN DE HISTORIAL POR FECHA REAL
// (misma lógica que AnalizadorInteligente — fuente única de verdad)
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
                            // Forzamos la respuesta para el historial
                            respuesta: registro.tomado ? 'Sí' : 'No',
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
    console.log("🔍 usuario.tomas:", usuario.tomas);
console.log("🔍 usuario.seguimiento:", usuario.tomas);
console.log("🔍 keys del usuario:", Object.keys(usuario));
    const resp = extraerRespuestasFarmaco(tomas);
    const porFecha = {};
    resp.forEach(r => {
        if (!r.fecha) return;
        porFecha[r.fecha] = porFecha[r.fecha]===1 ? 1 : (esSi(r.respuesta)?1:0);
    });
    const hist = [];
    for (let i=n; i>=1; i--) hist.push(porFecha[offsetDate(i)]??0);
    return hist;
};

// ─────────────────────────────────────────────────────────────────────
// ESTADÍSTICAS POBLACIONALES — basadas en historial real
// ─────────────────────────────────────────────────────────────────────

const calcularEstadisticasGrupo = (usuarios) => {
    const adherencias = [];
    let usuariosConDatos = 0;

    usuarios.forEach(usuario => {
        const hist = construirHistorial(usuario.tomas||[], 12);
        const a6d  = calcularAdherenciaDesdeHistorial(hist);
        // Solo contar si tiene al menos 1 día con dato real (no todos 0 por defecto)
        const tieneDatos = hist.some(v => v === 1) ||
    extraerRespuestasFarmaco(usuario.tomas||[]).length > 0;
        if (tieneDatos) {
            adherencias.push(a6d?.porcentaje ?? 0);
            usuariosConDatos++;
        }
    });

    if (!adherencias.length) {
        return { totalUsuarios:usuarios.length, usuariosConDatos:0,
            adherenciaPromedio:'0.0', mediana:'0.0', desviacionEstandar:'0.0',
            adherenciaAlta:0, adherenciaMedia:0, adherenciaBaja:0, adherencias };
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
        adherencias,
    };
};

const compararGrupos = (sA, sB) => {
    const fav = d => d>0?'A':d<0?'B':'Empate';
    const dA   = parseFloat(sA.adherenciaPromedio)-parseFloat(sB.adherenciaPromedio);
    const dM   = parseFloat(sA.mediana)-parseFloat(sB.mediana);
    const dDS  = parseFloat(sB.desviacionEstandar)-parseFloat(sA.desviacionEstandar);
    const pAA  = sA.usuariosConDatos>0?(sA.adherenciaAlta/sA.usuariosConDatos)*100:0;
    const pAB  = sB.usuariosConDatos>0?(sB.adherenciaAlta/sB.usuariosConDatos)*100:0;
    const dAlt = pAA-pAB;
    return [
        { metrica:'Adherencia Promedio (últimos 6 días)', valorA:`${sA.adherenciaPromedio}%`, valorB:`${sB.adherenciaPromedio}%`, diferencia:`${dA>0?'+':''}${dA.toFixed(1)}%`,    favorece:fav(dA),  significativo:Math.abs(dA)>10 },
        { metrica:'Mediana de Adherencia',                valorA:`${sA.mediana}%`,             valorB:`${sB.mediana}%`,            diferencia:`${dM>0?'+':''}${dM.toFixed(1)}%`,    favorece:fav(dM),  significativo:Math.abs(dM)>10 },
        { metrica:'Consistencia (menor DS = mejor)',      valorA:`±${sA.desviacionEstandar}%`, valorB:`±${sB.desviacionEstandar}%`,diferencia:`${dDS>0?'A':'B'} más consistente`,    favorece:fav(dDS), significativo:Math.abs(dDS)>5 },
        { metrica:'% Alta Adherencia (≥80%)',             valorA:`${pAA.toFixed(0)}%`,          valorB:`${pAB.toFixed(0)}%`,         diferencia:`${dAlt>0?'+':''}${dAlt.toFixed(1)}%`, favorece:fav(dAlt),significativo:Math.abs(dAlt)>15 },
    ];
};

const generarInsights = (sA, sB) => {
    const insights = [];
    const dA = parseFloat(sA.adherenciaPromedio)-parseFloat(sB.adherenciaPromedio);
    if (Math.abs(dA)>10) {
        const m=dA>0?'A':'B';
        insights.push({tipo:'significativo',titulo:'Diferencia Significativa en Adherencia',
            descripcion:`Los Usuarios ${m} muestran una adherencia ${Math.abs(dA).toFixed(1)}% superior en los últimos 6 días calendario.`});
    } else {
        insights.push({tipo:'neutral',titulo:'Adherencia Similar',
            descripcion:'Ambos grupos mantienen niveles de adherencia comparables en los últimos 6 días.'});
    }
    const dDS=Math.abs(parseFloat(sA.desviacionEstandar)-parseFloat(sB.desviacionEstandar));
    if(dDS>5){
        const mc=parseFloat(sA.desviacionEstandar)<parseFloat(sB.desviacionEstandar)?'A':'B';
        insights.push({tipo:'importante',titulo:'Diferencia en Consistencia',
            descripcion:`Los Usuarios ${mc} muestran mayor regularidad de cumplimiento entre sus miembros.`});
    }
    const pAA=sA.usuariosConDatos>0?(sA.adherenciaAlta/sA.usuariosConDatos)*100:0;
    const pAB=sB.usuariosConDatos>0?(sB.adherenciaAlta/sB.usuariosConDatos)*100:0;
    if(Math.abs(pAA-pAB)>20){
        const mg=pAA>pAB?'A':'B';
        insights.push({tipo:'alerta',titulo:'Diferencia en Adherencia Óptima',
            descripcion:`El ${Math.max(pAA,pAB).toFixed(0)}% de Usuarios ${mg} alcanzan ≥80% de adherencia, frente al ${Math.min(pAA,pAB).toFixed(0)}% del otro grupo.`});
    }
    const sinA=sA.totalUsuarios>0?((sA.totalUsuarios-sA.usuariosConDatos)/sA.totalUsuarios)*100:0;
    const sinB=sB.totalUsuarios>0?((sB.totalUsuarios-sB.usuariosConDatos)/sB.totalUsuarios)*100:0;
    if(sinA>30||sinB>30){
        insights.push({tipo:'advertencia',titulo:'Usuarios sin Datos Recientes',
            descripcion:`Tipo A sin respuestas de Farmaco: ${sinA.toFixed(0)}% · Tipo B: ${sinB.toFixed(0)}%. Esto puede afectar la precisión.`});
    }
    const menor=parseFloat(sA.adherenciaPromedio)<parseFloat(sB.adherenciaPromedio)?'A':'B';
    if(Math.min(parseFloat(sA.adherenciaPromedio),parseFloat(sB.adherenciaPromedio))<75){
        insights.push({tipo:'recomendacion',titulo:'Acción Recomendada',
            descripcion:`Implementar estrategias de mejora enfocadas en Usuarios ${menor}: recordatorios, educación y seguimiento cercano.`});
    }
    return insights;
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

const insightStyle = (tipo) => ({
    significativo:{ bg:'#fffbeb',  border:C.amber },
    importante:   { bg:'#eff6ff',  border:'#3b82f6' },
    alerta:       { bg:'#fef2f2',  border:C.red },
    advertencia:  { bg:'#fffbeb',  border:C.amber },
    recomendacion:{ bg:C.greenLight,border:C.green },
    neutral:      { bg:C.gray50,   border:C.gray200 },
}[tipo] ?? { bg:C.gray50, border:C.gray200 });

const insightEmoji = (tipo) => ({
    significativo:'⚠️', importante:'ℹ️', alerta:'🚨',
    advertencia:'⚡', recomendacion:'💡', neutral:'📊',
}[tipo]??'•');

const DistBar = ({ label, count, total, color }) => {
    const pct = total>0?(count/total)*100:0;
    return (
        <div style={{marginBottom:'0.65rem'}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.78rem',marginBottom:'0.25rem'}}>
                <span style={{color:C.gray700}}>{label}</span>
                <span style={{fontWeight:700,color:C.gray900}}>{count} <span style={{color:C.gray500,fontWeight:400}}>({pct.toFixed(0)}%)</span></span>
            </div>
            <div style={{height:'7px',background:C.gray100,borderRadius:'4px',overflow:'hidden'}}>
                <div style={{height:'100%',width:`${pct}%`,background:color,borderRadius:'4px',transition:'width 0.5s'}}/>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────

const ComparadorAdherencia = ({ usuarios }) => {
    const [showModal, setShowModal] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [analysis, setAnalysis]   = useState(null);

    const realizarAnalisis = () => {
        setAnalyzing(true);
        setShowModal(true);
        setTimeout(() => {
            try {
                const uA = usuarios.filter(u => u.perfiles?.[0]?.tipoUsuario==='Usuario A');
                const uB = usuarios.filter(u => u.perfiles?.[0]?.tipoUsuario==='Usuario B');
                const sA = calcularEstadisticasGrupo(uA);
                const sB = calcularEstadisticasGrupo(uB);
                setAnalysis({
                    statsA:sA, statsB:sB,
                    comparaciones: compararGrupos(sA,sB),
                    insights:      generarInsights(sA,sB),
                    totalUsuarios: usuarios.length,
                    periodoStr:    `${offsetDate(6)} → ${offsetDate(1)}`,
                });
            } catch(e) { console.error(e); }
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
                                    Últimos 6 días · {analysis?.periodoStr??'…'} · Usuario A vs Usuario B
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

                            {/* Resumen muestra */}
                            <div style={{display:'flex',gap:'0.75rem',justifyContent:'center',flexWrap:'wrap'}}>
                                {[
                                    {label:'Usuarios Tipo A',total:analysis.statsA.totalUsuarios,con:analysis.statsA.usuariosConDatos},
                                    {label:'Usuarios Tipo B',total:analysis.statsB.totalUsuarios,con:analysis.statsB.usuariosConDatos},
                                    {label:'Total',          total:analysis.totalUsuarios,        con:analysis.statsA.usuariosConDatos+analysis.statsB.usuariosConDatos},
                                ].map((g,i)=>(
                                    <div key={i} style={{textAlign:'center',padding:'0.75rem 1.25rem',background:C.gray50,borderRadius:'8px',border:`1px solid ${C.gray200}`,minWidth:'110px'}}>
                                        <p style={{margin:0,fontSize:'1.6rem',fontWeight:800,color:C.greenDark}}>{g.total}</p>
                                        <p style={{margin:0,fontSize:'0.75rem',color:C.gray700}}>{g.label}</p>
                                        <p style={{margin:0,fontSize:'0.7rem',color:C.gray500}}>{g.con} con datos</p>
                                    </div>
                                ))}
                            </div>

                            {/* Tarjetas A y B */}
                            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:'1rem'}}>
                                {[{stats:analysis.statsA,label:'Usuario A',icon:faUserCheck},{stats:analysis.statsB,label:'Usuario B',icon:faUserTimes}].map(({stats,label,icon})=>{
                                    const pct=parseFloat(stats.adherenciaPromedio);
                                    const col=pct>=80?C.green:pct>=60?C.amber:C.red;
                                    return (
                                        <div key={label} style={{padding:'1.25rem',border:`1px solid ${C.gray200}`,borderRadius:'10px',background:C.white}}>
                                            <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'1rem'}}>
                                                <span style={{width:'28px',height:'28px',borderRadius:'6px',background:C.greenLight,display:'flex',alignItems:'center',justifyContent:'center'}}>
                                                    <FontAwesomeIcon icon={icon} style={{color:C.green,fontSize:'0.75rem'}}/>
                                                </span>
                                                <span style={{fontWeight:700,fontSize:'0.9rem',color:C.gray900}}>{label}</span>
                                            </div>
                                            <div style={{textAlign:'center',padding:'0.85rem 0',borderBottom:`1px solid ${C.gray100}`,marginBottom:'0.85rem'}}>
                                                <p style={{margin:0,fontSize:'0.68rem',color:C.gray500,textTransform:'uppercase',letterSpacing:'0.06em'}}>Adherencia · últimos 6 días</p>
                                                <p style={{margin:'0.2rem 0 0',fontSize:'2.5rem',fontWeight:800,color:col,lineHeight:1}}>{stats.adherenciaPromedio}%</p>
                                                <p style={{margin:'0.2rem 0 0',fontSize:'0.72rem',color:C.gray500}}>Mediana {stats.mediana}% · DS ±{stats.desviacionEstandar}%</p>
                                            </div>
                                            <DistBar label="🟢 Alta (≥80%)"    count={stats.adherenciaAlta}  total={stats.usuariosConDatos} color={C.green}/>
                                            <DistBar label="🟡 Media (60-79%)" count={stats.adherenciaMedia} total={stats.usuariosConDatos} color={C.amber}/>
                                            <DistBar label="🔴 Baja (<60%)"    count={stats.adherenciaBaja}  total={stats.usuariosConDatos} color={C.red}/>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Tabla comparativa */}
                            <div>
                                <p style={{margin:'0 0 0.6rem',fontSize:'0.78rem',fontWeight:700,color:C.gray700,textTransform:'uppercase',letterSpacing:'0.06em'}}>
                                    <FontAwesomeIcon icon={faChartBar} style={{marginRight:'5px'}}/>
                                    Comparación Detallada
                                </p>
                                <div style={{overflowX:'auto',border:`1px solid ${C.gray200}`,borderRadius:'8px'}}>
                                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.82rem'}}>
                                        <thead>
                                            <tr style={{background:C.gray50,borderBottom:`1px solid ${C.gray200}`}}>
                                                {['Métrica','Usuario A','Usuario B','Diferencia','Favorece'].map(h=>(
                                                    <th key={h} style={{padding:'0.65rem 0.85rem',textAlign:h==='Métrica'?'left':'center',fontWeight:600,color:C.gray700,whiteSpace:'nowrap'}}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analysis.comparaciones.map((c,i)=>(
                                                <tr key={i} style={{borderBottom:`1px solid ${C.gray100}`,background:c.significativo?'#fffbeb':C.white}}>
                                                    <td style={{padding:'0.65rem 0.85rem',fontWeight:c.significativo?600:400,color:C.gray900}}>
                                                        {c.metrica}
                                                        {c.significativo&&<FontAwesomeIcon icon={faExclamationCircle} style={{marginLeft:'5px',color:C.amber,fontSize:'0.7rem'}}/>}
                                                    </td>
                                                    <td style={{padding:'0.65rem 0.85rem',textAlign:'center',fontWeight:700,color:C.green}}>{c.valorA}</td>
                                                    <td style={{padding:'0.65rem 0.85rem',textAlign:'center',fontWeight:700,color:'#3b82f6'}}>{c.valorB}</td>
                                                    <td style={{padding:'0.65rem 0.85rem',textAlign:'center',color:C.gray700}}>{c.diferencia}</td>
                                                    <td style={{padding:'0.65rem 0.85rem',textAlign:'center'}}>
                                                        {c.favorece==='Empate'
                                                            ? <span style={{color:C.gray500}}>—</span>
                                                            : <span style={{fontWeight:700,color:c.favorece==='A'?C.green:'#3b82f6'}}>{c.favorece} <FontAwesomeIcon icon={faTrophy} style={{fontSize:'0.7rem'}}/></span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Insights */}
                            <div>
                                <p style={{margin:'0 0 0.6rem',fontSize:'0.78rem',fontWeight:700,color:C.gray700,textTransform:'uppercase',letterSpacing:'0.06em'}}>
                                    <FontAwesomeIcon icon={faChartLine} style={{marginRight:'5px'}}/>
                                    Insights Clínicos
                                </p>
                                {analysis.insights.map((ins,i)=>{
                                    const col=insightStyle(ins.tipo);
                                    return (
                                        <div key={i} style={{padding:'0.85rem 1rem',marginBottom:'0.4rem',background:col.bg,borderLeft:`3px solid ${col.border}`,borderRadius:'0 8px 8px 0'}}>
                                            <p style={{margin:'0 0 0.2rem',fontWeight:700,fontSize:'0.82rem',color:C.gray900}}>{insightEmoji(ins.tipo)} {ins.titulo}</p>
                                            <p style={{margin:0,fontSize:'0.82rem',color:C.gray700,lineHeight:'1.55'}}>{ins.descripcion}</p>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Footer */}
                            <div style={{padding:'0.75rem 1rem',background:C.gray50,borderRadius:'8px',fontSize:'0.75rem',color:C.gray500,textAlign:'center'}}>
                                <FontAwesomeIcon icon={faInfoCircle} style={{marginRight:'4px'}}/>
                                {new Date().toLocaleDateString('es-MX',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})}
                                &nbsp;·&nbsp;{analysis.totalUsuarios} usuarios
                                &nbsp;·&nbsp;Período analizado: {analysis.periodoStr}
                            </div>

                        </>)}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <button onClick={realizarAnalisis} disabled={analyzing}
                style={{padding:'0.5rem 1rem',background:analyzing?C.gray100:C.greenDark,color:analyzing?C.gray500:C.white,border:'none',borderRadius:'6px',cursor:analyzing?'not-allowed':'pointer',display:'flex',alignItems:'center',gap:'7px',fontSize:'0.8rem',fontWeight:600,whiteSpace:'nowrap',letterSpacing:'0.02em'}}>
                <FontAwesomeIcon icon={analyzing?faSpinner:faUsers} spin={analyzing}/>
                {analyzing?'Comparando…':'Comparar A vs B'}
            </button>
            <Modal/>
        </>
    );
};

export default ComparadorAdherencia;