import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faBrain, faSpinner, faExclamationTriangle, 
    faCheckCircle, faLightbulb, faTimes, faCalendarCheck,
    faHeartbeat, faPills
} from '@fortawesome/free-solid-svg-icons';

// ── Algoritmos auxiliares ────────────────────────────────────────────

const calcularDiferenciaMinutos = (horaProgramada, horaReal) => {
    try {
        const [h1, m1] = horaProgramada.split(':').map(Number);
        const [h2, m2] = horaReal.split(':').map(Number);
        return Math.abs((h1 * 60 + m1) - (h2 * 60 + m2));
    } catch { return 0; }
};

const parseNumber = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) && !Number.isNaN(n) ? n : fallback;
};

// == LECTURA ESTRUCTURA REAL FIRESTORE ==================================
// usuario.seguimiento = array de docs donde cada doc tiene claves random
// (ID de pregunta) con { categoria, respuesta, pregunta, fechaRespuesta }
// mas opcionalmente { id, fecha } como metadatos del dia.

const extraerRespuestas = (seguimientos) => {
    const resultado = [];
    (seguimientos || []).forEach(dia => {
        const fechaDia = dia.fecha || dia.id || null;
        Object.keys(dia).forEach(key => {
            if (key === 'id' || key === 'fecha') return;
            const item = dia[key];
            if (!item || typeof item !== 'object' || !item.categoria) return;
            resultado.push({
                categoria: item.categoria,
                respuesta:  (item.respuesta || '').trim(),
                fecha:      item.fechaRespuesta || fechaDia || null,
            });
        });
    });
    return resultado;
};

// "Si", "SI", "si", "Sí" -> true
const esSi = (respuesta) => /^s[\u00edi]/i.test((respuesta || '').trim());

// stress_level (1-5): proporcion de emociones negativas en Estigma
const calcularStressDesdeRespuestas = (seguimientos) => {
    const NEG = ['avergonzado','ansioso','tristeza','enojado','humillado','miedo','culpable'];
    const items = extraerRespuestas(seguimientos).filter(r => r.categoria === 'Estigma');
    if (items.length === 0) return 3.0;
    const negativos = items.filter(r => NEG.some(e => r.respuesta.toLowerCase().includes(e))).length;
    return Number(Math.max(1, Math.min(5, (negativos / items.length) * 5)).toFixed(1));
};

// activity_level (1-5): proporcion de Si en ActividadFisica
const calcularActividadDesdeRespuestas = (seguimientos) => {
    const items = extraerRespuestas(seguimientos).filter(r => r.categoria === 'ActividadFisica');
    if (items.length === 0) return 3.0;
    const positivos = items.filter(r => esSi(r.respuesta)).length;
    return Number(Math.max(1, Math.min(5, (positivos / items.length) * 5)).toFixed(1));
};

// social_support (1-5): proporcion de Si en Alimentacion
const calcularSocialDesdeRespuestas = (seguimientos) => {
    const items = extraerRespuestas(seguimientos).filter(r => r.categoria === 'Alimentacion');
    if (items.length === 0) return 3.0;
    const positivos = items.filter(r => esSi(r.respuesta)).length;
    return Number(Math.max(1, Math.min(5, (positivos / items.length) * 5)).toFixed(1));
};

// historial de tomas: array de 1/0 desde respuestas Farmaco (mas antiguo primero)
const extraerHistorialTomas = (seguimientos, n = 12) => {
    const tomas = extraerRespuestas(seguimientos)
        .filter(r => r.categoria === 'Farmaco')
        .sort((a, b) => {
            if (!a.fecha || !b.fecha) return 0;
            return new Date(a.fecha) - new Date(b.fecha);
        })
        .slice(-n)
        .map(r => esSi(r.respuesta) ? 1 : 0);
    while (tomas.length < n) tomas.unshift(0);
    return tomas;
};

const analizarSeguimientoPorCategorias = (seguimientos) => {
    const categorias = {
        Farmaco:        { total: 0, positivos: 0, negativos: 0 },
        Estigma:        { total: 0, positivos: 0, negativos: 0 },
        Alimentacion:   { total: 0, positivos: 0, negativos: 0 },
        ActividadFisica:{ total: 0, positivos: 0, negativos: 0 }
    };

    seguimientos.forEach(dia => {
        Object.keys(dia).forEach(key => {
            if (key === 'id' || key === 'fecha') return;
            const pregunta = dia[key];
            if (!pregunta || typeof pregunta !== 'object') return;

            const categoria = pregunta.categoria || 'Otros';
            const respuesta = pregunta.respuesta || '';
            if (!categorias[categoria]) categorias[categoria] = { total: 0, positivos: 0, negativos: 0 };
            categorias[categoria].total++;

            if (categoria === 'Estigma') {
                const pos = ['Autocompasivo','Contento','Alegría','Confiado'];
                const neg = ['Avergonzado','Ansioso','Tristeza','Enojado','Humillado','Miedo','Culpable'];
                if (pos.some(e => respuesta.includes(e))) categorias[categoria].positivos++;
                else if (neg.some(e => respuesta.includes(e))) categorias[categoria].negativos++;
            } else {
                if (respuesta.includes('Sí')) categorias[categoria].positivos++;
                else categorias[categoria].negativos++;
            }
        });
    });

    Object.keys(categorias).forEach(cat => {
        const t = categorias[cat].total;
        categorias[cat].adherencia = t > 0 ? ((categorias[cat].positivos / t) * 100).toFixed(1) : 0;
    });

    return { categorias };
};

const calcularEstadisticasMedicamentos = (tomas) => {
    let totalTomas = 0, tomasCumplidas = 0, tomasOmitidas = 0, tomasFueradeHorario = 0;
    const medicamentosUnicos = new Set();

    tomas.forEach(dia => {
        if (dia.tomas && typeof dia.tomas === 'object') {
            Object.keys(dia.tomas).forEach(hora => {
                const medicamentos = dia.tomas[hora];
                if (medicamentos && typeof medicamentos === 'object') {
                    Object.keys(medicamentos).forEach(nombreMed => {
                        medicamentosUnicos.add(nombreMed);
                        totalTomas++;
                        const registro = medicamentos[nombreMed];
                        if (registro.tomado === true) {
                            tomasCumplidas++;
                            if (registro.horaReal && calcularDiferenciaMinutos(hora, registro.horaReal) > 30)
                                tomasFueradeHorario++;
                        } else { tomasOmitidas++; }
                    });
                }
            });
        }
    });

    const adherencia = totalTomas > 0 ? (tomasCumplidas / totalTomas) * 100 : 0;
    return {
        adherencia: adherencia.toFixed(1), totalTomas, tomasCumplidas,
        tomasOmitidas, tomasFueradeHorario,
        medicamentosActivos: medicamentosUnicos.size, diasConRegistro: tomas.length
    };
};

const analizarTendenciaTemporal = (seguimientos) => {
    if (seguimientos.length < 3)
        return { tendencia: 'insuficiente', cambio: 0, descripcion: 'Datos insuficientes' };

    const tercio = Math.ceil(seguimientos.length / 3);
    const analisisReciente = analizarSeguimientoPorCategorias(seguimientos.slice(0, tercio));
    const analisisAntiguo  = analizarSeguimientoPorCategorias(seguimientos.slice(-tercio));

    let pR = 0, pA = 0, cats = 0;
    Object.keys(analisisReciente.categorias).forEach(cat => {
        if (analisisReciente.categorias[cat].total > 0 && analisisAntiguo.categorias[cat].total > 0) {
            pR += parseFloat(analisisReciente.categorias[cat].adherencia);
            pA += parseFloat(analisisAntiguo.categorias[cat].adherencia);
            cats++;
        }
    });

    if (cats === 0) return { tendencia: 'estable', cambio: 0, descripcion: 'Sin datos por categoría' };

    const cambio = (pR / cats) - (pA / cats);
    let tendencia = 'estable', descripcion = 'Estado estable en todas las áreas';
    if (cambio > 15)       { tendencia = 'mejorando';         descripcion = 'Mejora significativa'; }
    else if (cambio < -15) { tendencia = 'deteriorando';      descripcion = 'Deterioro detectado'; }
    else if (cambio > 5)   { tendencia = 'mejorando_leve';    descripcion = 'Tendencia positiva leve'; }
    else if (cambio < -5)  { tendencia = 'deteriorando_leve'; descripcion = 'Ligera tendencia negativa'; }

    return { tendencia, cambio: cambio.toFixed(1), descripcion };
};

const generarAlertas = (analisisCategorias, estadisticasMeds, tendencia, seguimientos) => {
    const alertas = [];

    if (estadisticasMeds.adherencia < 60)
        alertas.push({ nivel: 'alta', categoria: 'Farmacológico', mensaje: `Adherencia crítica: ${estadisticasMeds.adherencia}%`, accion: 'Intervención urgente' });
    else if (estadisticasMeds.adherencia < 80)
        alertas.push({ nivel: 'media', categoria: 'Farmacológico', mensaje: `Adherencia subóptima: ${estadisticasMeds.adherencia}%`, accion: 'Reforzar consistencia en el tratamiento' });

    const estigma = analisisCategorias.categorias.Estigma;
    if (estigma?.total > 0) {
        const pct = (estigma.negativos / estigma.total) * 100;
        if (pct > 70)      alertas.push({ nivel: 'alta',  categoria: 'Salud Mental', mensaje: 'Predominio severo de estados negativos', accion: 'Atención a la brevedad' });
        else if (pct > 50) alertas.push({ nivel: 'media', categoria: 'Salud Mental', mensaje: 'Estados negativos frecuentes', accion: 'Monitoreo cercano' });
    }

    if (tendencia.tendencia === 'deteriorando')
        alertas.push({ nivel: 'alta', categoria: 'Evolución', mensaje: `Deterioro significativo (${tendencia.cambio}%)`, accion: 'Reevaluar plan terapéutico' });
    else if (tendencia.tendencia === 'deteriorando_leve')
        alertas.push({ nivel: 'media', categoria: 'Evolución', mensaje: 'Ligera tendencia negativa', accion: 'Revisar factores estresores' });

    if (seguimientos.length > 0) {
        const dias = Math.floor((new Date() - new Date(seguimientos[0].fecha)) / 86400000);
        if (dias > 7) alertas.push({ nivel: 'media', categoria: 'Seguimiento', mensaje: `${dias} días sin registro`, accion: 'Contactar al paciente' });
    }

    if (alertas.length === 0)
        alertas.push({ nivel: 'baja', categoria: 'Estado General', mensaje: 'Sin alertas críticas', accion: 'Mantener plan actual' });

    return alertas;
};

const generarRecomendaciones = (analisisCategorias, estadisticasMeds, tendencia) => {
    const rec = [];

    if (estadisticasMeds.adherencia < 85 && estadisticasMeds.totalTomas > 0)
        rec.push({ prioridad: estadisticasMeds.adherencia < 70 ? 'alta' : 'media', area: 'Adherencia Farmacológica', recomendacion: 'Implementar estrategias para mejorar adherencia', impacto: 'Estabilidad del tratamiento' });

    const estigma = analisisCategorias.categorias.Estigma;
    if (estigma?.negativos > estigma?.positivos)
        rec.push({ prioridad: 'alta', area: 'Salud Mental', recomendacion: 'Incrementar sesiones terapéuticas, técnicas de regulación emocional', impacto: 'Estabilización del estado anímico' });

    const alim = analisisCategorias.categorias.Alimentacion;
    if (alim?.total >= 2 && parseFloat(alim.adherencia) < 60)
        rec.push({ prioridad: 'media', area: 'Nutrición', recomendacion: 'Plan nutricional estructurado con metas alcanzables', impacto: 'Mejora en energía y estado de ánimo' });

    const act = analisisCategorias.categorias.ActividadFisica;
    if (act?.total >= 2 && parseFloat(act.adherencia) < 60)
        rec.push({ prioridad: 'media', area: 'Actividad Física', recomendacion: 'Activación gradual: caminatas cortas 10-15 min', impacto: 'Reducción de síntomas depresivos' });

    if (tendencia.tendencia.includes('mejorando'))
        rec.push({ prioridad: 'baja', area: 'Refuerzo Positivo', recomendacion: 'Reconocer logros y replicar estrategias exitosas', impacto: 'Fortalecimiento de motivación' });

    if (estadisticasMeds.adherencia >= 85 && !tendencia.tendencia.includes('deteriorando'))
        rec.push({ prioridad: 'baja', area: 'Mantenimiento', recomendacion: 'Continuar plan actual, prevención de recaídas', impacto: 'Sostenimiento a largo plazo' });

    return rec;
};

const generarAnalisisLocal = (usuario) => {
    const analisisCategorias = analizarSeguimientoPorCategorias(usuario.seguimiento || []);
    const estadisticasMeds   = calcularEstadisticasMedicamentos(usuario.tomas || []);
    const tendencia          = analizarTendenciaTemporal(usuario.seguimiento || []);
    const alertas            = generarAlertas(analisisCategorias, estadisticasMeds, tendencia, usuario.seguimiento || []);
    const recomendaciones    = generarRecomendaciones(analisisCategorias, estadisticasMeds, tendencia);

    let puntuacionGeneral = 0;
    if (estadisticasMeds.totalTomas > 0)
        puntuacionGeneral += (parseFloat(estadisticasMeds.adherencia) / 100) * 25;
    Object.keys(analisisCategorias.categorias).forEach(cat => {
        if (analisisCategorias.categorias[cat].total > 0)
            puntuacionGeneral += (parseFloat(analisisCategorias.categorias[cat].adherencia) / 100) * 15;
    });
    if (tendencia.tendencia === 'mejorando')              puntuacionGeneral += 15;
    else if (tendencia.tendencia === 'mejorando_leve')    puntuacionGeneral += 10;
    else if (tendencia.tendencia === 'estable')           puntuacionGeneral += 7.5;
    else if (tendencia.tendencia === 'deteriorando_leve') puntuacionGeneral += 3;

    puntuacionGeneral = Math.max(0, Math.min(100, puntuacionGeneral));
    const prob = Number((puntuacionGeneral / 100).toFixed(4));
    const risk = prob >= 0.70 ? 'low' : prob >= 0.50 ? 'medium' : 'high';

    return { puntuacionGeneral: puntuacionGeneral.toFixed(0), analisisCategorias, estadisticasMeds, tendencia, alertas, recomendaciones, prob, will_take: prob >= 0.50, risk };
};

// == Payload RF =========================================================
const prepararPayloadRF = (usuario) => {
    const perfil      = (usuario.perfiles && usuario.perfiles[0]) || {};
    const seguimiento = usuario.seguimiento || [];
    const wd = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
    return {
        patient_id:     usuario.userId || perfil.id || 'paciente_sin_id',
        age:            parseNumber(perfil.edad, 45),
        activity_level: calcularActividadDesdeRespuestas(seguimiento),
        stress_level:   calcularStressDesdeRespuestas(seguimiento),
        social_support: calcularSocialDesdeRespuestas(seguimiento),
        dia_semana:     wd,
        historial:      extraerHistorialTomas(seguimiento, 12),
    };
};

// == Payload LSTM =======================================================
// Parsea fechas en formato "28/10/2025, 10:01:12 p. m." o ISO
const parsearFecha = (fechaStr) => {
    if (!fechaStr) return null;
    // Formato Firestore: "28/10/2025, 10:01:12 p. m."
    const m = String(fechaStr).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) {
        // Construir fecha valida: YYYY-MM-DD
        const [, d, mo, y] = m;
        return new Date(`${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`);
    }
    // Intentar parseo ISO o cualquier otro formato
    const dt = new Date(fechaStr);
    return isNaN(dt.getTime()) ? null : dt;
};

const diaSemanaDesde = (fechaStr, fallback = 0) => {
    const dt = parsearFecha(fechaStr);
    if (!dt) return fallback;
    // Firestore usa lun=1..dom=7 -> convertir a lun=0..dom=6
    const d = dt.getDay(); // 0=dom, 1=lun ... 6=sab
    return d === 0 ? 6 : d - 1;
};

const prepararPayloadLSTM = (usuario) => {
    const perfil         = (usuario.perfiles && usuario.perfiles[0]) || {};
    const seguimiento    = usuario.seguimiento || [];
    const age            = parseNumber(perfil.edad, 45);
    const stress_level   = calcularStressDesdeRespuestas(seguimiento);
    const activity_level = calcularActividadDesdeRespuestas(seguimiento);
    const social_support = calcularSocialDesdeRespuestas(seguimiento);

    // Ultimas 6 respuestas Farmaco ordenadas por fecha (mas antiguo primero)
    const tomasRaw = extraerRespuestas(seguimiento)
        .filter(r => r.categoria === 'Farmaco')
        .sort((a, b) => {
            const da = parsearFecha(a.fecha);
            const db = parsearFecha(b.fecha);
            if (!da || !db) return 0;
            return da - db;
        })
        .slice(-6);
    while (tomasRaw.length < 6) tomasRaw.unshift(null);

    const diaActual = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

    const eventos = tomasRaw.map((item, idx) => ({
        taken:          item ? (esSi(item.respuesta) ? 1 : 0) : 0,
        dia_semana:     item?.fecha ? diaSemanaDesde(item.fecha, idx % 7) : idx % 7,
        stress_level,
        social_support,
        age,
        activity_level,
    }));

    return {
        patient_id: usuario.userId || perfil.id || 'paciente_sin_id',
        eventos,
    };
};

const obtenerDiasDesdeCreacion = (usuario) => {
    const perfil = (usuario.perfiles && usuario.perfiles[0]) || {};
    const rawCreatedAt = perfil.createdAt;
    if (!rawCreatedAt) return null;

    let createdDate;
    if (rawCreatedAt instanceof Date) {
        createdDate = rawCreatedAt;
    } else if (typeof rawCreatedAt.toDate === 'function') {
        createdDate = rawCreatedAt.toDate();
    } else {
        createdDate = new Date(rawCreatedAt);
    }

    if (Number.isNaN(createdDate.getTime())) return null;
    return Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
};

// ── Componente principal ─────────────────────────────────────────────

const ENDPOINTS = {
    rf:   'https://fernanda7171-randomforestfeatures.hf.space/predict',
    lstm: 'https://fernanda7171-lstm-features.hf.space/predict',
};

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
                modelDetails: {
                    prob: null,
                    will_take: null,
                    risk: 'información insuficiente',
                    patient_id: usuario.userId,
                },
                apiRaw: null,
                apiError: null,
                notEnoughData: true,
                notEnoughDataMsg: `Usuario con ${diasCreacion} días de registro. Se requieren al menos 6 días para análisis con modelo IA.`
            });
            setIsAnalyzing(false);
            return;
        }

        const payload = modelo === 'lstm'
            ? prepararPayloadLSTM(usuario)
            : prepararPayloadRF(usuario);

        console.log(`\n${'='.repeat(60)}`);
        console.log(`[${modelo.toUpperCase()}] Payload → ${ENDPOINTS[modelo]}`);
        console.log(JSON.stringify(payload, null, 2));
        console.log('='.repeat(60));

        try {
            const response = await fetch(ENDPOINTS[modelo], {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload),
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();

            setAnalysis({
                ...generarAnalisisLocal(usuario),
                model: modelo,
                modelDetails: {
                    prob:       data.prob       ?? null,
                    will_take:  data.will_take  ?? null,
                    risk:       data.risk       ?? null,
                    threshold:  data.threshold  ?? null,
                    patient_id: data.patient_id ?? usuario.userId,
                },
                apiRaw:   data,
                apiError: null,
            });
        } catch (error) {
            console.error(`[${modelo.toUpperCase()}] Error:`, error.message);
            setAnalysis({
                ...generarAnalisisLocal(usuario),
                model: modelo,
                modelDetails: { prob: null, will_take: null, risk: 'error', patient_id: usuario.userId },
                apiRaw:   null,
                apiError: error.message,
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const analizarConAlgoritmos = () => {
        setIsAnalyzing(true);
        setShowModal(true);
        setTimeout(() => {
            setAnalysis({
                ...generarAnalisisLocal(usuario),
                model: 'local',
                modelDetails: { prob: 'N/A', will_take: 'N/A', risk: 'N/A', patient_id: usuario.userId },
            });
            setIsAnalyzing(false);
        }, 1800);
    };

    // ── Modal ──────────────────────────────────────────────────────────

    const Modal = () => {
        if (!showModal) return null;
        const nivelColor = (nivel) => nivel === 'alta' ? '#dc3545' : nivel === 'media' ? '#ffc107' : '#198754';
        const nivelBg    = (nivel) => nivel === 'alta' ? '#f8d7da' : nivel === 'media' ? '#fff3cd' : '#d1e7dd';
        const emoji      = (nivel) => nivel === 'alta' ? '🔴' : nivel === 'media' ? '🟡' : '🟢';

        return (
            <div style={{ position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.7)', display:'flex', justifyContent:'center', alignItems:'flex-start', zIndex:1000, padding:'1rem', overflowY:'auto' }}>
                <div style={{ backgroundColor:'white', borderRadius:'12px', maxWidth:'780px', width:'100%', maxHeight:'90vh', overflow:'auto', boxShadow:'0 10px 40px rgba(0,0,0,0.3)', margin:'2rem auto' }}>

                    {/* Header */}
                    <div style={{ padding:'1.25rem 1.5rem', background:'linear-gradient(135deg, #FEBE10 0%, #DD971A 100%)', color:'white', borderRadius:'12px 12px 0 0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <h2 style={{ margin:0, fontSize:'1.3rem' }}>
                            <FontAwesomeIcon icon={faBrain} style={{ marginRight:'10px' }} />
                            Análisis: {usuario.nombre}
                        </h2>
                        <button onClick={() => setShowModal(false)} style={{ background:'rgba(255,255,255,0.2)', border:'none', cursor:'pointer', color:'white', borderRadius:'50%', width:'36px', height:'36px', fontSize:'1rem' }}>
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </div>

                    <div style={{ padding:'1.25rem' }}>

                        {/* Cargando */}
                        {isAnalyzing && (
                            <div style={{ textAlign:'center', padding:'3rem' }}>
                                <FontAwesomeIcon icon={faSpinner} spin size="3x" style={{ color:'#667eea', marginBottom:'1rem' }} />
                                <p style={{ fontSize:'1rem', color:'#6c757d' }}>Analizando datos multidimensionales…</p>
                            </div>
                        )}

                        {analysis && !isAnalyzing && (
                            <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>

                                {/* Resultado del modelo */}
                                <div style={{ padding:'1rem', backgroundColor:'#e9f7fd', border:'1px solid #a0d9f8', borderRadius:'8px', fontSize:'0.875rem', color:'#05213a' }}>
                                    <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:'0.5rem' }}>
                                        <span><strong>Modelo:</strong> {analysis.model?.toUpperCase()}</span>
                                        {analysis.modelDetails && (
                                            <span style={{ color:'#4a6fa5' }}>
                                                Prob: <strong>{analysis.modelDetails.prob ?? 'N/A'}</strong> &nbsp;·&nbsp;
                                                Will_take: <strong>{String(analysis.modelDetails.will_take ?? 'N/A')}</strong> &nbsp;·&nbsp;
                                                Risk: <strong>{analysis.modelDetails.risk ?? 'N/A'}</strong>
                                                {analysis.modelDetails.threshold != null && (
                                                    <>&nbsp;·&nbsp;Threshold: <strong>{analysis.modelDetails.threshold}</strong></>
                                                )}
                                            </span>
                                        )}
                                    </div>
                                    {analysis.apiError && (
                                        <div style={{ marginTop:'0.5rem', color:'#b02a37', fontWeight:'bold' }}>
                                            ⚠️ Error API: {analysis.apiError}
                                        </div>
                                    )}

                                    {analysis.notEnoughData && (
                                        <div style={{ marginTop:'0.5rem', color:'#0f5132', backgroundColor:'#d1e7dd', border:'1px solid #badbcc', borderRadius:'6px', padding:'0.5rem' }}>
                                            ⚠️ {analysis.notEnoughDataMsg}
                                        </div>
                                    )}
                                </div>

                                {/* Métricas clave */}
                                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:'0.75rem' }}>
                                    <div style={{ padding:'1.25rem', background:'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius:'10px', color:'white', textAlign:'center' }}>
                                        <div style={{ fontSize:'2.5rem', fontWeight:'bold', lineHeight:1 }}>{analysis.puntuacionGeneral}</div>
                                        <div style={{ fontSize:'0.8rem', opacity:0.9, marginTop:'0.4rem' }}>Puntuación Global</div>
                                    </div>

                                    {analysis.estadisticasMeds.totalTomas > 0 && (
                                        <div style={{ padding:'1.25rem', background: parseFloat(analysis.estadisticasMeds.adherencia) >= 80 ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' : 'linear-gradient(135deg, #f5576c 0%, #f093fb 100%)', borderRadius:'10px', color:'white', textAlign:'center' }}>
                                            <div style={{ fontSize:'2.5rem', fontWeight:'bold', lineHeight:1 }}>{analysis.estadisticasMeds.adherencia}%</div>
                                            <div style={{ fontSize:'0.8rem', opacity:0.9, marginTop:'0.4rem' }}>
                                                <FontAwesomeIcon icon={faPills} style={{ marginRight:'4px' }} />Adherencia
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ padding:'1.25rem', background: analysis.tendencia.tendencia.includes('mejorando') ? 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)' : analysis.tendencia.tendencia.includes('deteriorando') ? 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' : 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', borderRadius:'10px', color:'white', textAlign:'center' }}>
                                        <div style={{ fontSize:'2rem', lineHeight:1 }}>
                                            <FontAwesomeIcon icon={faHeartbeat} />
                                        </div>
                                        <div style={{ fontSize:'0.8rem', opacity:0.9, marginTop:'0.4rem', fontWeight:600 }}>
                                            {analysis.tendencia.tendencia.replace('_',' ')}
                                        </div>
                                    </div>
                                </div>

                                {/* Alertas */}
                                <div>
                                    <h3 style={{ fontSize:'1rem', color:'#dc3545', margin:'0 0 0.75rem 0' }}>
                                        <FontAwesomeIcon icon={faExclamationTriangle} style={{ marginRight:'6px' }} />
                                        Alertas Clínicas ({analysis.alertas.length})
                                    </h3>
                                    {analysis.alertas.map((a, i) => (
                                        <div key={i} style={{ padding:'0.85rem 1rem', backgroundColor:nivelBg(a.nivel), borderLeft:`4px solid ${nivelColor(a.nivel)}`, borderRadius:'6px', marginBottom:'0.5rem' }}>
                                            <div style={{ fontWeight:'bold', fontSize:'0.8rem', textTransform:'uppercase', marginBottom:'0.2rem' }}>{emoji(a.nivel)} {a.categoria}</div>
                                            <div style={{ marginBottom:'0.3rem', fontSize:'0.9rem' }}>{a.mensaje}</div>
                                            <div style={{ fontSize:'0.8rem', fontStyle:'italic', color:'#495057' }}>💡 {a.accion}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Recomendaciones */}
                                <div>
                                    <h3 style={{ fontSize:'1rem', color:'#856404', margin:'0 0 0.75rem 0' }}>
                                        <FontAwesomeIcon icon={faLightbulb} style={{ marginRight:'6px' }} />
                                        Recomendaciones ({analysis.recomendaciones.length})
                                    </h3>
                                    {analysis.recomendaciones.map((r, i) => (
                                        <div key={i} style={{ padding:'0.85rem 1rem', backgroundColor:'white', border:'1px solid #dee2e6', borderRadius:'6px', marginBottom:'0.5rem' }}>
                                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.3rem' }}>
                                                <span style={{ fontWeight:'bold', color: nivelColor(r.prioridad) }}>{emoji(r.prioridad)} {r.area}</span>
                                                <span style={{ fontSize:'0.75rem', color:'#6c757d', textTransform:'uppercase' }}>Prioridad {r.prioridad}</span>
                                            </div>
                                            <div style={{ fontSize:'0.9rem', marginBottom:'0.4rem' }}>{r.recomendacion}</div>
                                            <div style={{ fontSize:'0.8rem', color:'#198754', backgroundColor:'#d1e7dd', borderRadius:'4px', padding:'0.4rem 0.6rem' }}>
                                                <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight:'4px' }} />
                                                {r.impacto}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Footer */}
                                <div style={{ padding:'0.75rem 1rem', backgroundColor:'#e7f3ff', borderRadius:'8px', fontSize:'0.8rem', color:'#495057', textAlign:'center' }}>
                                    <FontAwesomeIcon icon={faCalendarCheck} style={{ marginRight:'5px' }} />
                                    {new Date().toLocaleDateString('es-MX', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                                    &nbsp;·&nbsp;{usuario.seguimiento.length} días de seguimiento
                                    &nbsp;·&nbsp;{analysis.estadisticasMeds.totalTomas} tomas registradas
                                </div>

                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // ── Botones ────────────────────────────────────────────────────────

    return (
        <>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem', width:'100%', maxWidth:'320px' }}>
                {[
                    { id:'rf',   label:'RandomForest', gradient:'linear-gradient(135deg, #48b1b8 0%, #20419A 100%)', shadow:'rgba(102,126,234,0.4)' },
                    { id:'lstm', label:'LSTM',          gradient:'linear-gradient(135deg, #efb9f5 0%, #c567d8 100%)', shadow:'rgba(126,63,181,0.4)' },
                ].map(btn => (
                    <button key={btn.id} onClick={() => analizarConModelo(btn.id)} disabled={isAnalyzing}
                        style={{ padding:'0.5rem 1rem', background: isAnalyzing ? '#adb5bd' : btn.gradient, color:'white', border:'none', borderRadius:'6px', cursor: isAnalyzing ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', fontSize:'0.875rem', fontWeight:600, transition:'all 0.3s ease', boxShadow: isAnalyzing ? 'none' : `0 4px 15px ${btn.shadow}` }}>
                        <FontAwesomeIcon icon={isAnalyzing ? faSpinner : faBrain} spin={isAnalyzing} />
                        {isAnalyzing ? 'Analizando…' : btn.label}
                    </button>
                ))}
            </div>
            <Modal />
        </>
    );
};

export default AnalizadorInteligente;