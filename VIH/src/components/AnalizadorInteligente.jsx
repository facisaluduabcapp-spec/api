import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBrain, faSpinner, faExclamationTriangle,
    faCheckCircle, faLightbulb, faTimes, faCalendarCheck,
    faHeartbeat, faPills
} from '@fortawesome/free-solid-svg-icons';

// ─────────────────────────────────────────────────────────────────────
// UTILIDADES DE FECHA
// ─────────────────────────────────────────────────────────────────────

const toDateStr = (raw) => {
    if (!raw) return null;
    if (typeof raw.toDate === 'function') raw = raw.toDate();
    if (raw instanceof Date) {
        return isNaN(raw.getTime()) ? null : raw.toISOString().substring(0, 10);
    }
    const s = String(raw);
    const dmY = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dmY) {
        const [, d, m, y] = dmY;
        return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    }
    const dt = new Date(s);
    return isNaN(dt.getTime()) ? null : dt.toISOString().substring(0, 10);
};

const offsetDate = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const year  = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day   = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const diaSemanaDeStr = (dateStr) => {
    if (!dateStr) return 0;
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt  = new Date(y, m - 1, d);
    const dow = dt.getDay();
    return dow === 0 ? 6 : dow - 1;
};

// ─────────────────────────────────────────────────────────────────────
// LECTURA DE RESPUESTAS
// Recibe usuario.tomas (colección TomasDiarias)
// Estructura: [ { id:"2026-03-24", fecha:"2026-03-24", tomas:{ "14:00":{ bictegravir:{ tomado, horaReal } } } } ]
// ─────────────────────────────────────────────────────────────────────

const extraerRespuestas = (tomasDocs, desde = null) => {
    const resultados = [];

    (tomasDocs || []).forEach(dia => {
        const fechaDoc = dia.id;

        // 🚀 Skip temprano: ignorar docs fuera del rango necesario
        if (desde && fechaDoc < desde) return;

        // Estructura nueva: dia.tomas -> hora -> medicamento -> { tomado, horaReal }
        if (dia.tomas && typeof dia.tomas === 'object') {
            Object.entries(dia.tomas).forEach(([hora, medicamentosEnHora]) => {
                if (!medicamentosEnHora || typeof medicamentosEnHora !== 'object') return;
                Object.entries(medicamentosEnHora).forEach(([nombreMed, datos]) => {
                    if (!datos || typeof datos !== 'object') return;
                    resultados.push({
                        fecha:          fechaDoc,
                        categoria:      'Farmaco',
                        respuesta:      datos.tomado ? 'Sí' : 'No',
                        nombre:         datos.medicamentoNombre || nombreMed,
                        horaProgramada: hora,
                        tomado:         datos.tomado,
                        horaReal:       datos.horaReal || '',
                    });
                });
            });
        }

        // Estructura antigua: campos directos con { categoria, respuesta }
        Object.keys(dia).forEach(key => {
            if (['id', 'fecha', 'tomas', 'fechaCreacion', 'ultimaActualizacion', 'userId'].includes(key)) return;
            const p = dia[key];
            if (p && typeof p === 'object' && p.categoria) {
                resultados.push({
                    fecha:     fechaDoc,
                    categoria: p.categoria,
                    respuesta: p.respuesta || '',
                    ...p,
                });
            }
        });
    });

    console.log('✅ extraerRespuestas resultado:', resultados.length, 'entradas', resultados.slice(0, 3));
    return resultados;
};

const esSi = (r) => /^s[\u00edi]/i.test((r || '').trim());

// ─────────────────────────────────────────────────────────────────────
// CONSTRUCCIÓN DEL HISTORIAL
// Ambas funciones reciben usuario.tomas (NO usuario.seguimiento)
// ─────────────────────────────────────────────────────────────────────

const construirHistorial = (tomasDocs, n = 12) => {
    const desde = offsetDate(n); // solo procesa los últimos N días
    const respFarmaco = extraerRespuestas(tomasDocs, desde).filter(r => r.categoria === 'Farmaco');

    const porFecha = {};
    respFarmaco.forEach(r => {
        if (!r.fecha) return;
        porFecha[r.fecha] = porFecha[r.fecha] === 1 ? 1 : (esSi(r.respuesta) ? 1 : 0);
    });

    const historial = [];
    for (let i = n; i >= 1; i--) {
        historial.push(porFecha[offsetDate(i)] ?? 0);
    }

    console.log('[Historial] Fechas y valores:');
    for (let i = n; i >= 1; i--) {
        console.log(`  ${offsetDate(i)} → ${porFecha[offsetDate(i)] ?? 0}`);
    }

    return historial;
};

const construirEventosLSTM = (tomasDocs, stress, activity, social, age) => {
    const desde = offsetDate(6); // solo necesitamos 6 días
    const respFarmaco = extraerRespuestas(tomasDocs, desde).filter(r => r.categoria === 'Farmaco');

    const porFecha = {};
    respFarmaco.forEach(r => {
        if (!r.fecha) return;
        porFecha[r.fecha] = porFecha[r.fecha] === 1 ? 1 : (esSi(r.respuesta) ? 1 : 0);
    });

    const eventos = [];
    for (let i = 6; i >= 1; i--) {
        const dateStr = offsetDate(i);
        eventos.push({
            taken:          porFecha[dateStr] ?? 0,
            dia_semana:     diaSemanaDeStr(dateStr),
            stress_level:   stress,
            social_support: social,
            age,
            activity_level: activity,
        });
    }

    console.log('[LSTM] Eventos (día-6 → día-1):');
    for (let i = 6; i >= 1; i--) {
        const ds = offsetDate(i);
        console.log(`  ${ds} dia_semana=${diaSemanaDeStr(ds)} taken=${porFecha[ds] ?? 0}`);
    }

    return eventos;
};

// ─────────────────────────────────────────────────────────────────────
// MÉTRICAS PSICOSOCIALES — usan usuario.seguimiento (correcto)
// ─────────────────────────────────────────────────────────────────────

const hace30 = offsetDate(30);

const calcularStress = (seguimientos) => {
    const NEG = ['avergonzado','ansioso','tristeza','enojado','humillado','miedo','culpable'];
    const items = extraerRespuestas(seguimientos, hace30)
        .filter(r => r.categoria === 'Estigma');
    if (!items.length) return 3.0;
    const neg = items.filter(r => NEG.some(e => (r.respuesta || '').toLowerCase().includes(e))).length;
    return Number(Math.max(1, Math.min(5, (neg / items.length) * 5)).toFixed(1));
};

const calcularActividad = (seguimientos) => {
    const items = extraerRespuestas(seguimientos, hace30)
        .filter(r => r.categoria === 'ActividadFisica');
    if (!items.length) return 3.0;
    const pos = items.filter(r => esSi(r.respuesta)).length;
    return Number(Math.max(1, Math.min(5, (pos / items.length) * 5)).toFixed(1));
};

const calcularSocial = (seguimientos) => {
    const items = extraerRespuestas(seguimientos, hace30)
        .filter(r => r.categoria === 'Alimentacion');
    if (!items.length) return 3.0;
    const pos = items.filter(r => esSi(r.respuesta)).length;
    return Number(Math.max(1, Math.min(5, (pos / items.length) * 5)).toFixed(1));
};

// ─────────────────────────────────────────────────────────────────────
// ADHERENCIA DESDE HISTORIAL — exportada
// ─────────────────────────────────────────────────────────────────────

export const calcularAdherenciaDesdeHistorial = (historial) => {
    if (!historial?.length) return null;
    const ultimos6       = historial.slice(-6);
    const diasAdherentes = ultimos6.reduce((s, v) => s + (v === 1 ? 1 : 0), 0);
    return {
        porcentaje:    Number(((diasAdherentes / ultimos6.length) * 100).toFixed(1)),
        diasAdherentes,
        diasTotales:   ultimos6.length,
        dias:          ultimos6,
    };
};

// ─────────────────────────────────────────────────────────────────────
// ANÁLISIS LOCAL
// ─────────────────────────────────────────────────────────────────────

const parseNumber = (v, fb = 0) => { const n = Number(v); return Number.isFinite(n) ? n : fb; };

const calcularDifMin = (hp, hr) => {
    try {
        const [h1, m1] = hp.split(':').map(Number);
        const [h2, m2] = hr.split(':').map(Number);
        return Math.abs((h1 * 60 + m1) - (h2 * 60 + m2));
    } catch { return 0; }
};

const analizarCategorias = (seguimientos) => {
    const cats = {
        Farmaco:         { total:0, positivos:0, negativos:0 },
        Estigma:         { total:0, positivos:0, negativos:0 },
        Alimentacion:    { total:0, positivos:0, negativos:0 },
        ActividadFisica: { total:0, positivos:0, negativos:0 },
    };
    seguimientos.forEach(dia => {
        Object.keys(dia).forEach(key => {
            if (key === 'id' || key === 'fecha') return;
            const p = dia[key];
            if (!p || typeof p !== 'object') return;
            const cat = p.categoria || 'Otros';
            const res = p.respuesta || '';
            if (!cats[cat]) cats[cat] = { total:0, positivos:0, negativos:0 };
            cats[cat].total++;
            if (cat === 'Estigma') {
                const pos = ['Autocompasivo','Contento','Alegría','Confiado'];
                const neg = ['Avergonzado','Ansioso','Tristeza','Enojado','Humillado','Miedo','Culpable'];
                if (pos.some(e => res.includes(e)))      cats[cat].positivos++;
                else if (neg.some(e => res.includes(e))) cats[cat].negativos++;
            } else {
                if (res.includes('Sí')) cats[cat].positivos++;
                else                    cats[cat].negativos++;
            }
        });
    });
    Object.keys(cats).forEach(c => {
        const t = cats[c].total;
        cats[c].adherencia = t > 0 ? ((cats[c].positivos / t) * 100).toFixed(1) : 0;
    });
    return { categorias: cats };
};

const calcularEstadsMeds = (tomas) => {
    // Solo contamos los últimos 6 días (misma ventana que la adherencia mostrada)
    const desde6 = offsetDate(6);
    let total = 0, cumplidas = 0, omitidas = 0, fueraH = 0;
    const unicos = new Set();

    tomas.forEach(dia => {
        if (!dia.id || dia.id < desde6) return; // fuera de ventana
        if (!dia.tomas) return;
        Object.keys(dia.tomas).forEach(hora => {
            const meds = dia.tomas[hora];
            if (!meds) return;
            Object.keys(meds).forEach(nm => {
                unicos.add(nm);
                total++;
                const reg = meds[nm];
                if (reg.tomado === true) {
                    cumplidas++;
                    if (reg.horaReal && calcularDifMin(hora, reg.horaReal) > 30) fueraH++;
                } else {
                    omitidas++;
                }
            });
        });
    });

    const diasConRegistro = tomas.filter(d => d.id && d.id >= desde6).length;

    return {
        adherencia:          total > 0 ? ((cumplidas / total) * 100).toFixed(1) : '0.0',
        totalTomas:          total,
        tomasCumplidas:      cumplidas,
        tomasOmitidas:       omitidas,
        tomasFueraDeHorario: fueraH,
        medicamentosActivos: unicos.size,
        diasConRegistro,
    };
};

const analizarTendencia = (seguimientos) => {
    if (seguimientos.length < 3) return { tendencia:'insuficiente', cambio:0, descripcion:'Datos insuficientes' };
    const t  = Math.ceil(seguimientos.length / 3);
    const aR = analizarCategorias(seguimientos.slice(0, t));
    const aA = analizarCategorias(seguimientos.slice(-t));
    let pR = 0, pA = 0, n = 0;
    Object.keys(aR.categorias).forEach(c => {
        if (aR.categorias[c].total > 0 && aA.categorias[c].total > 0) {
            pR += parseFloat(aR.categorias[c].adherencia);
            pA += parseFloat(aA.categorias[c].adherencia);
            n++;
        }
    });
    if (!n) return { tendencia:'estable', cambio:0, descripcion:'Sin datos' };
    const cambio = (pR / n) - (pA / n);
    let tendencia = 'estable', descripcion = 'Estado estable';
    if      (cambio > 15)  { tendencia = 'mejorando';          descripcion = 'Mejora significativa'; }
    else if (cambio < -15) { tendencia = 'deteriorando';        descripcion = 'Deterioro detectado'; }
    else if (cambio > 5)   { tendencia = 'mejorando_leve';      descripcion = 'Tendencia positiva leve'; }
    else if (cambio < -5)  { tendencia = 'deteriorando_leve';   descripcion = 'Ligera tendencia negativa'; }
    return { tendencia, cambio: cambio.toFixed(1), descripcion };
};

const generarAlertas = (cats, meds, tendencia, seguimientos, a6d) => {
    const alertas = [];
    const pct = a6d?.porcentaje ?? parseFloat(meds.adherencia);
    if      (pct < 60) alertas.push({ nivel:'alta',  categoria:'Farmacológico', mensaje:`Adherencia crítica últimos 6 días: ${pct}%`,    accion:'Intervención urgente' });
    else if (pct < 80) alertas.push({ nivel:'media', categoria:'Farmacológico', mensaje:`Adherencia subóptima últimos 6 días: ${pct}%`, accion:'Reforzar consistencia' });
    const estigma = cats.categorias.Estigma;
    if (estigma?.total > 0) {
        const neg = (estigma.negativos / estigma.total) * 100;
        if      (neg > 70) alertas.push({ nivel:'alta',  categoria:'Salud Mental', mensaje:'Predominio severo de estados negativos', accion:'Atención urgente' });
        else if (neg > 50) alertas.push({ nivel:'media', categoria:'Salud Mental', mensaje:'Estados negativos frecuentes',           accion:'Monitoreo cercano' });
    }
    if      (tendencia.tendencia === 'deteriorando')       alertas.push({ nivel:'alta',  categoria:'Evolución', mensaje:`Deterioro significativo (${tendencia.cambio}%)`, accion:'Reevaluar plan' });
    else if (tendencia.tendencia === 'deteriorando_leve')  alertas.push({ nivel:'media', categoria:'Evolución', mensaje:'Ligera tendencia negativa',                      accion:'Revisar estresores' });
    if (!alertas.length) alertas.push({ nivel:'baja', categoria:'Estado General', mensaje:'Sin alertas críticas', accion:'Mantener plan actual' });
    return alertas;
};

const generarRecomendaciones = (cats, meds, tendencia, a6d) => {
    const rec = [];
    const pct = a6d?.porcentaje ?? parseFloat(meds.adherencia);
    if (pct < 85 && meds.totalTomas > 0)
        rec.push({ prioridad: pct < 70 ? 'alta' : 'media', area:'Adherencia Farmacológica', recomendacion:'Implementar estrategias de mejora de adherencia', impacto:'Estabilidad del tratamiento' });
    const estigma = cats.categorias.Estigma;
    if (estigma?.negativos > estigma?.positivos)
        rec.push({ prioridad:'alta', area:'Salud Mental', recomendacion:'Incrementar sesiones terapéuticas', impacto:'Estabilización anímica' });
    const alim = cats.categorias.Alimentacion;
    if (alim?.total >= 2 && parseFloat(alim.adherencia) < 60)
        rec.push({ prioridad:'media', area:'Nutrición', recomendacion:'Plan nutricional estructurado', impacto:'Mejora en energía' });
    const act = cats.categorias.ActividadFisica;
    if (act?.total >= 2 && parseFloat(act.adherencia) < 60)
        rec.push({ prioridad:'media', area:'Actividad Física', recomendacion:'Activación gradual: caminatas 10-15 min', impacto:'Reducción de síntomas' });
    if (tendencia.tendencia.includes('mejorando'))
        rec.push({ prioridad:'baja', area:'Refuerzo Positivo', recomendacion:'Reconocer logros, replicar estrategias exitosas', impacto:'Fortalecer motivación' });
    if (pct >= 85 && !tendencia.tendencia.includes('deteriorando'))
        rec.push({ prioridad:'baja', area:'Mantenimiento', recomendacion:'Continuar plan actual, prevención de recaídas', impacto:'Sostenimiento a largo plazo' });
    return rec;
};

// ── CORRECCIÓN CLAVE: historial usa usuario.tomas, NO usuario.seguimiento ──
const generarAnalisisLocal = (usuario, historialML = null) => {
    const cats      = analizarCategorias(usuario.seguimiento || []);
    const meds      = calcularEstadsMeds(usuario.tomas || []);
    const tendencia = analizarTendencia(usuario.seguimiento || []);
    const hist      = historialML ?? construirHistorial(usuario.tomas || [], 12); // ← CORREGIDO
    const a6d       = calcularAdherenciaDesdeHistorial(hist);
    const alertas   = generarAlertas(cats, meds, tendencia, usuario.seguimiento || [], a6d);
    const recs      = generarRecomendaciones(cats, meds, tendencia, a6d);
    const pct6d     = a6d?.porcentaje ?? parseFloat(meds.adherencia);
    let pts = (pct6d / 100) * 40;
    Object.keys(cats.categorias).forEach(c => {
        if (cats.categorias[c].total > 0) pts += (parseFloat(cats.categorias[c].adherencia) / 100) * 10;
    });
    if      (tendencia.tendencia === 'mejorando')           pts += 15;
    else if (tendencia.tendencia === 'mejorando_leve')      pts += 10;
    else if (tendencia.tendencia === 'estable')             pts += 7.5;
    else if (tendencia.tendencia === 'deteriorando_leve')   pts += 3;
    pts = Math.max(0, Math.min(100, pts));
    const prob = Number((pts / 100).toFixed(4));
    return {
        puntuacionGeneral:  pts.toFixed(0),
        analisisCategorias: cats,
        estadisticasMeds:   meds,
        tendencia,
        alertas,
        recomendaciones:    recs,
        adherencia6d:       a6d,
        prob,
        will_take: prob >= 0.50,
        risk:      prob >= 0.70 ? 'low' : prob >= 0.50 ? 'medium' : 'high',
    };
};

// ─────────────────────────────────────────────────────────────────────
// PAYLOADS PARA LOS MODELOS
// Ambos usan usuario.tomas para el historial/eventos
// ─────────────────────────────────────────────────────────────────────

const prepararPayloadRF = (usuario) => {
    const perfil    = usuario.perfiles?.[0] ?? {};
    const seg       = usuario.seguimiento ?? [];
    const tomas     = usuario.tomas ?? [];          // ← TomasDiarias
    const stress    = calcularStress(seg);
    const activity  = calcularActividad(seg);
    const social    = calcularSocial(seg);
    const historial = construirHistorial(tomas, 12); // ← CORREGIDO
    return {
        patient_id:     usuario.userId || perfil.id || 'sin_id',
        age:            parseNumber(perfil.edad, 45),
        activity_level: activity,
        stress_level:   stress,
        social_support: social,
        dia_semana:     diaSemanaDeStr(offsetDate(0)),
        historial,
    };
};

const prepararPayloadLSTM = (usuario) => {
    const perfil   = usuario.perfiles?.[0] ?? {};
    const seg      = usuario.seguimiento ?? [];
    const tomas    = usuario.tomas ?? [];           // ← TomasDiarias
    const age      = parseNumber(perfil.edad, 45);
    const stress   = calcularStress(seg);
    const activity = calcularActividad(seg);
    const social   = calcularSocial(seg);
    return {
        patient_id: usuario.userId || perfil.id || 'sin_id',
        eventos:    construirEventosLSTM(tomas, stress, activity, social, age), // ← CORREGIDO
    };
};

const obtenerDiasDesdeCreacion = (usuario) => {
    const raw = usuario.perfiles?.[0]?.createdAt;
    if (!raw) return null;
    const d = typeof raw.toDate === 'function' ? raw.toDate() : new Date(raw);
    if (isNaN(d.getTime())) return null;
    return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
};

// ─────────────────────────────────────────────────────────────────────
// COLORES / UI HELPERS
// ─────────────────────────────────────────────────────────────────────

const C = {
    green:'#00723F', greenDark:'#024731', greenLight:'#e8f5ee',
    white:'#ffffff',  gray50:'#fafafa',   gray100:'#f4f4f5',
    gray200:'#e4e4e7',gray500:'#71717a',  gray700:'#3f3f46',
    gray900:'#18181b',red:'#dc2626',      amber:'#d97706',
};
const nivelColor = n => n === 'alta' ? C.red  : n === 'media' ? C.amber : C.green;
const nivelBg    = n => n === 'alta' ? '#fef2f2' : n === 'media' ? '#fffbeb' : C.greenLight;
const emoji      = n => n === 'alta' ? '🔴' : n === 'media' ? '🟡' : '🟢';

const ENDPOINTS = {
    rf:   'https://fernanda7171-randomforestfeatures.hf.space/predict',
    lstm: 'https://fernanda7171-lstm-features.hf.space/predict',
};

// ─────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────

const AnalizadorInteligente = ({ usuario }) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis]       = useState(null);
    const [showModal, setShowModal]     = useState(false);

    const analizarConModelo = async (modelo) => {
        setIsAnalyzing(true);
        setShowModal(true);

        const diasCreacion = obtenerDiasDesdeCreacion(usuario);
        if (diasCreacion !== null && diasCreacion < 6) {
            setAnalysis({
                ...generarAnalisisLocal(usuario),
                model: modelo,
                modelDetails: { prob:null, will_take:null, risk:'datos insuficientes', patient_id:usuario.userId },
                apiRaw: null, apiError: null, notEnoughData: true,
                notEnoughDataMsg: `Usuario con ${diasCreacion} días de registro. Se necesitan al menos 6.`,
            });
            setIsAnalyzing(false);
            return;
        }

        const payload = modelo === 'lstm' ? prepararPayloadLSTM(usuario) : prepararPayloadRF(usuario);
        console.log(`\n${'='.repeat(60)}\n[${modelo.toUpperCase()}] Payload:`, JSON.stringify(payload, null, 2));

        try {
            const res  = await fetch(ENDPOINTS[modelo], { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(payload) });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const histUsado = payload.historial ?? payload.eventos?.map(e => e.taken) ?? null;
            setAnalysis({
                ...generarAnalisisLocal(usuario, histUsado),
                model: modelo,
                modelDetails: {
                    prob:       data.prob       ?? null,
                    will_take:  data.will_take  ?? null,
                    risk:       data.risk       ?? null,
                    threshold:  data.threshold  ?? null,
                    patient_id: data.patient_id ?? usuario.userId,
                },
                apiRaw: data, apiError: null,
            });
        } catch (err) {
            console.error(`[${modelo.toUpperCase()}] Error:`, err.message);
            setAnalysis({
                ...generarAnalisisLocal(usuario),
                model: modelo,
                modelDetails: { prob:null, will_take:null, risk:'error', patient_id:usuario.userId },
                apiRaw: null, apiError: err.message,
            });
        } finally { setIsAnalyzing(false); }
    };

    // ── MODAL ──────────────────────────────────────────────────────────

    const Modal = () => {
        if (!showModal) return null;

        const HistorialBar = ({ dias }) => {
            if (!dias?.length) return null;
            const fechas = Array.from({ length: dias.length }, (_, i) =>
                offsetDate(dias.length - i).substring(5)
            );
            return (
                <div style={{ display:'flex', gap:'4px', alignItems:'flex-end', justifyContent:'center', marginTop:'0.6rem' }}>
                    {dias.map((v, i) => (
                        <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'3px' }}>
                            <div style={{
                                width:'32px', height: v === 1 ? '34px' : '12px',
                                borderRadius:'4px 4px 2px 2px',
                                background: v === 1 ? C.green : '#fca5a5',
                                transition:'height 0.3s',
                            }}/>
                            <span style={{ fontSize:'0.58rem', color:C.gray500 }}>{fechas[i]}</span>
                        </div>
                    ))}
                </div>
            );
        };

        return (
            <div style={{ position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.45)', display:'flex', justifyContent:'center', alignItems:'flex-start', zIndex:1000, padding:'1rem', overflowY:'auto', backdropFilter:'blur(2px)' }}>
                <div style={{ backgroundColor:C.white, borderRadius:'12px', maxWidth:'760px', width:'100%', maxHeight:'90vh', overflow:'auto', margin:'2rem auto', boxShadow:'0 20px 60px rgba(0,0,0,0.15)', border:`1px solid ${C.gray200}` }}>

                    {/* Header */}
                    <div style={{ padding:'1.1rem 1.5rem', borderBottom:`1px solid ${C.gray100}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
                            <span style={{ width:'32px', height:'32px', borderRadius:'8px', background:C.greenLight, display:'flex', alignItems:'center', justifyContent:'center' }}>
                                <FontAwesomeIcon icon={faBrain} style={{ color:C.green, fontSize:'0.85rem' }}/>
                            </span>
                            <div>
                                <p style={{ margin:0, fontWeight:700, fontSize:'0.95rem', color:C.gray900 }}>Análisis: {usuario.nombre}</p>
                                <p style={{ margin:0, fontSize:'0.72rem', color:C.gray500 }}>
                                    {analysis?.model?.toUpperCase()} · {new Date().toLocaleDateString('es-MX')}
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setShowModal(false)} style={{ background:C.gray100, border:'none', cursor:'pointer', borderRadius:'50%', width:'32px', height:'32px', display:'flex', alignItems:'center', justifyContent:'center', color:C.gray500 }}>
                            <FontAwesomeIcon icon={faTimes} style={{ fontSize:'0.8rem' }}/>
                        </button>
                    </div>

                    <div style={{ padding:'1.25rem', display:'flex', flexDirection:'column', gap:'1.25rem' }}>

                        {isAnalyzing && (
                            <div style={{ textAlign:'center', padding:'3rem' }}>
                                <FontAwesomeIcon icon={faSpinner} spin size="2x" style={{ color:C.green, marginBottom:'0.75rem' }}/>
                                <p style={{ fontSize:'0.9rem', color:C.gray500, margin:0 }}>Analizando datos…</p>
                            </div>
                        )}

                        {analysis && !isAnalyzing && (<>

                            {/* Errores / advertencias */}
                            {(analysis.apiError || analysis.notEnoughData) && (
                                <div style={{ padding:'0.85rem 1rem', borderRadius:'8px', border:`1px solid ${C.gray200}`, background:C.gray50, fontSize:'0.82rem' }}>
                                    {analysis.apiError     && <span style={{ color:C.red   }}>⚠️ Error API: {analysis.apiError}</span>}
                                    {analysis.notEnoughData && <span style={{ color:C.amber }}>⚠️ {analysis.notEnoughDataMsg}</span>}
                                </div>
                            )}

                            {/* Resultado modelo ML */}
                            {analysis.modelDetails?.prob != null && (
                                <div style={{ padding:'0.85rem 1rem', borderRadius:'8px', background:C.greenLight, border:`1px solid ${C.green}22`, fontSize:'0.82rem', color:C.greenDark, display:'flex', gap:'1.5rem', flexWrap:'wrap' }}>
                                    <span>Prob: <strong>{analysis.modelDetails.prob}</strong></span>
                                    <span>Will take: <strong>{String(analysis.modelDetails.will_take)}</strong></span>
                                    <span>Risk: <strong>{analysis.modelDetails.risk}</strong></span>
                                    {analysis.modelDetails.threshold != null && <span>Threshold: <strong>{analysis.modelDetails.threshold}</strong></span>}
                                </div>
                            )}

                            {/* Adherencia 6 días */}
                            {analysis.adherencia6d && (
                                <div style={{ padding:'1.1rem 1.25rem', borderRadius:'10px', border:`1px solid ${C.gray200}`, background:C.white }}>
                                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'0.75rem' }}>
                                        <div>
                                            <p style={{ margin:'0 0 0.15rem', fontSize:'0.7rem', fontWeight:600, color:C.gray500, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                                                Adherencia · últimos 6 días calendario
                                            </p>
                                            <p style={{ margin:0, fontSize:'2.25rem', fontWeight:800, lineHeight:1, color:
                                                analysis.adherencia6d.porcentaje >= 80 ? C.green :
                                                analysis.adherencia6d.porcentaje >= 60 ? C.amber : C.red }}>
                                                {analysis.adherencia6d.porcentaje}%
                                            </p>
                                            <p style={{ margin:'0.25rem 0 0', fontSize:'0.75rem', color:C.gray500 }}>
                                                {analysis.adherencia6d.diasAdherentes} de {analysis.adherencia6d.diasTotales} días adherentes
                                                &nbsp;·&nbsp;
                                                {offsetDate(6)} → {offsetDate(1)}
                                            </p>
                                        </div>
                                        <div style={{ textAlign:'center' }}>
                                            <p style={{ margin:'0 0 0.2rem', fontSize:'0.68rem', color:C.gray500, textTransform:'uppercase', letterSpacing:'0.05em' }}>Día a día</p>
                                            <HistorialBar dias={analysis.adherencia6d.dias}/>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Métricas generales */}
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:'0.75rem' }}>
                                <div style={{ padding:'1rem', background:C.greenLight, borderRadius:'10px', textAlign:'center' }}>
                                    <div style={{ fontSize:'2rem', fontWeight:800, color:C.greenDark, lineHeight:1 }}>{analysis.puntuacionGeneral}</div>
                                    <div style={{ fontSize:'0.72rem', color:C.green, marginTop:'0.3rem', fontWeight:600 }}>Puntuación Global</div>
                                </div>
                                <div style={{ padding:'1rem', borderRadius:'10px', textAlign:'center',
                                    background: analysis.tendencia.tendencia.includes('mejorando') ? C.greenLight :
                                                analysis.tendencia.tendencia.includes('deteriorando') ? '#fef2f2' : C.gray100 }}>
                                    <FontAwesomeIcon icon={faHeartbeat} style={{ fontSize:'1.5rem', color:
                                        analysis.tendencia.tendencia.includes('mejorando')   ? C.green :
                                        analysis.tendencia.tendencia.includes('deteriorando') ? C.red   : C.gray500 }}/>
                                    <div style={{ fontSize:'0.72rem', fontWeight:600, marginTop:'0.3rem', color:C.gray700 }}>
                                        {analysis.tendencia.tendencia.replace('_', ' ')}
                                    </div>
                                </div>
                                {analysis.estadisticasMeds.totalTomas > 0 && (
                                    <div style={{ padding:'1rem', background:C.gray50, border:`1px solid ${C.gray200}`, borderRadius:'10px', textAlign:'center' }}>
                                        <div style={{ fontSize:'1.25rem', fontWeight:800, color:C.gray700, lineHeight:1 }}>
                                            {analysis.estadisticasMeds.tomasCumplidas}/{analysis.estadisticasMeds.totalTomas}
                                        </div>
                                        <div style={{ fontSize:'0.72rem', color:C.gray500, marginTop:'0.3rem', fontWeight:600 }}>
                                            <FontAwesomeIcon icon={faPills} style={{ marginRight:'4px' }}/>Tomas registradas
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Alertas */}
                            <div>
                                <p style={{ margin:'0 0 0.6rem', fontSize:'0.78rem', fontWeight:700, color:C.gray700, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                                    <FontAwesomeIcon icon={faExclamationTriangle} style={{ marginRight:'5px', color:C.red }}/>
                                    Alertas clínicas
                                </p>
                                {analysis.alertas.map((a, i) => (
                                    <div key={i} style={{ padding:'0.75rem 1rem', marginBottom:'0.4rem', background:nivelBg(a.nivel), borderLeft:`3px solid ${nivelColor(a.nivel)}`, borderRadius:'0 6px 6px 0', fontSize:'0.82rem' }}>
                                        <span style={{ fontWeight:700, display:'block', marginBottom:'0.2rem' }}>{emoji(a.nivel)} {a.categoria}</span>
                                        <span style={{ color:C.gray700 }}>{a.mensaje}</span>
                                        <span style={{ display:'block', marginTop:'0.2rem', color:C.gray500, fontStyle:'italic' }}>💡 {a.accion}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Recomendaciones */}
                            <div>
                                <p style={{ margin:'0 0 0.6rem', fontSize:'0.78rem', fontWeight:700, color:C.gray700, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                                    <FontAwesomeIcon icon={faLightbulb} style={{ marginRight:'5px', color:C.amber }}/>
                                    Recomendaciones
                                </p>
                                {analysis.recomendaciones.map((r, i) => (
                                    <div key={i} style={{ padding:'0.85rem 1rem', marginBottom:'0.4rem', border:`1px solid ${C.gray200}`, borderRadius:'8px', background:C.white }}>
                                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.25rem' }}>
                                            <span style={{ fontWeight:700, fontSize:'0.82rem', color:nivelColor(r.prioridad) }}>{emoji(r.prioridad)} {r.area}</span>
                                            <span style={{ fontSize:'0.7rem', color:C.gray500, textTransform:'uppercase' }}>Prioridad {r.prioridad}</span>
                                        </div>
                                        <p style={{ margin:'0 0 0.35rem', fontSize:'0.82rem', color:C.gray700 }}>{r.recomendacion}</p>
                                        <div style={{ fontSize:'0.75rem', background:C.greenLight, color:C.green, borderRadius:'4px', padding:'0.3rem 0.6rem', display:'inline-block' }}>
                                            <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight:'4px' }}/>
                                            {r.impacto}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Footer */}
                            <div style={{ padding:'0.75rem 1rem', background:C.gray50, borderRadius:'8px', fontSize:'0.75rem', color:C.gray500, textAlign:'center' }}>
                                <FontAwesomeIcon icon={faCalendarCheck} style={{ marginRight:'4px' }}/>
                                {new Date().toLocaleDateString('es-MX', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                                &nbsp;·&nbsp;{usuario.seguimiento?.length ?? 0} docs de seguimiento
                                &nbsp;·&nbsp;{analysis.estadisticasMeds.totalTomas} tomas registradas
                            </div>

                        </>)}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem', maxWidth:'220px' }}>
                {[{ id:'rf', label:'RandomForest' }, { id:'lstm', label:'LSTM' }].map(btn => (
                    <button key={btn.id} onClick={() => analizarConModelo(btn.id)} disabled={isAnalyzing}
                        style={{ padding:'0.5rem 1rem', background:isAnalyzing ? '#e4e4e7' : '#024731', color:isAnalyzing ? '#71717a' : '#fff', border:'none', borderRadius:'6px', cursor:isAnalyzing ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'7px', fontSize:'0.8rem', fontWeight:600, letterSpacing:'0.02em' }}>
                        <FontAwesomeIcon icon={isAnalyzing ? faSpinner : faBrain} spin={isAnalyzing}/>
                        {isAnalyzing ? 'Analizando…' : btn.label}
                    </button>
                ))}
            </div>
            <Modal/>
        </>
    );
};

export default AnalizadorInteligente;