import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faBrain, faSpinner, faChartLine, faExclamationTriangle, 
    faCheckCircle, faLightbulb, faTimes, faFileAlt, faCalendarCheck,
    faHeartbeat, faPills, faAppleAlt,
    faRunning, faSmile, faFrown, faMeh, faHeart
} from '@fortawesome/free-solid-svg-icons';


// Algoritmo 1: Analizar datos de seguimiento por categorías
const analizarSeguimientoPorCategorias = (seguimientos) => {
    const categorias = {
        'Farmaco': { total: 0, positivos: 0, negativos: 0, respuestas: [] },
        'Estigma': { total: 0, positivos: 0, negativos: 0, respuestas: [] },
        'Alimentacion': { total: 0, positivos: 0, negativos: 0, respuestas: [] },
        'ActividadFisica': { total: 0, positivos: 0, negativos: 0, respuestas: [] }
    };

    const estadosEmocionales = [];
    
    seguimientos.forEach(dia => {
        // Cada día puede tener múltiples preguntas como objetos anidados
        Object.keys(dia).forEach(key => {
            if (key === 'id' || key === 'fecha') return;
            
            const pregunta = dia[key];
            if (!pregunta || typeof pregunta !== 'object') return;
            
            const categoria = pregunta.categoria || 'Otros';
            const respuesta = pregunta.respuesta || '';
            
            if (!categorias[categoria]) {
                categorias[categoria] = { total: 0, positivos: 0, negativos: 0, respuestas: [] };
            }
            
            categorias[categoria].total++;
            categorias[categoria].respuestas.push({
                pregunta: pregunta.pregunta,
                respuesta: respuesta,
                fecha: dia.fecha
            });
            
            
            if (categoria === 'Farmaco') {
                if (respuesta.includes('Sí') || respuesta.includes('Sí')) {
                    categorias[categoria].positivos++;
                } else {
                    categorias[categoria].negativos++;
                }
            } else if (categoria === 'Estigma') {
                // Analizar estados emocionales
                estadosEmocionales.push(respuesta);
                
                const emocionesPositivas = ['Autocompasivo', 'Contento', 'Alegría', 'Confiado'];
                const emocionesNegativas = ['Avergonzado', 'Ansioso', 'Tristeza', 'Enojado', 'Humillado', 'Orgulloso', 'Miedo', 'Culpable'];
                
                if (emocionesPositivas.some(e => respuesta.includes(e))) {
                    categorias[categoria].positivos++;
                } else if (emocionesNegativas.some(e => respuesta.includes(e))) {
                    categorias[categoria].negativos++;
                }
            } else if (categoria === 'Alimentacion' || categoria === 'ActividadFisica') {
                if (respuesta.includes('Sí') || respuesta.includes('Sí')) {
                    categorias[categoria].positivos++;
                } else {
                    categorias[categoria].negativos++;
                }
            }
        });
    });
    
    // Calcular porcentajes de adherencia por categoría
    Object.keys(categorias).forEach(cat => {
        const total = categorias[cat].total;
        categorias[cat].adherencia = total > 0 ? 
            ((categorias[cat].positivos / total) * 100).toFixed(1) : 0;
    });
    
    return { categorias, estadosEmocionales };
};

// Algoritmo 2: Calcular estadísticas de medicamentos (TomasDiarias)
const calcularEstadisticasMedicamentos = (tomas) => {
    let totalTomas = 0;
    let tomasCumplidas = 0;
    let tomasOmitidas = 0;
    let tomasFueradeHorario = 0;
    const medicamentosUnicos = new Set();
    const horariosRegistrados = new Set();

    tomas.forEach(dia => {
        if (dia.tomas && typeof dia.tomas === 'object') {
            Object.keys(dia.tomas).forEach(hora => {
                horariosRegistrados.add(hora);
                const medicamentos = dia.tomas[hora];
                if (medicamentos && typeof medicamentos === 'object') {
                    Object.keys(medicamentos).forEach(nombreMed => {
                        medicamentosUnicos.add(nombreMed);
                        totalTomas++;
                        const registro = medicamentos[nombreMed];
                        
                        if (registro.tomado === true) {
                            tomasCumplidas++;
                            if (registro.horaReal && hora) {
                                const diff = calcularDiferenciaMinutos(hora, registro.horaReal);
                                if (diff > 30) tomasFueradeHorario++;
                            }
                        } else {
                            tomasOmitidas++;
                        }
                    });
                }
            });
        }
    });

    const adherencia = totalTomas > 0 ? (tomasCumplidas / totalTomas) * 100 : 0;
    
    return {
        adherencia: adherencia.toFixed(1),
        totalTomas,
        tomasCumplidas,
        tomasOmitidas,
        tomasFueradeHorario,
        medicamentosActivos: medicamentosUnicos.size,
        horariosDelDia: horariosRegistrados.size,
        diasConRegistro: tomas.length
    };
};

// Algoritmo 3: Analizar tendencia temporal
const analizarTendenciaTemporal = (seguimientos) => {
    if (seguimientos.length < 3) {
        return { tendencia: 'insuficiente', cambio: 0, descripcion: 'Datos insuficientes para análisis de tendencia' };
    }

    // Dividir en períodos
    const tercio = Math.ceil(seguimientos.length / 3);
    const recientes = seguimientos.slice(0, tercio);
    const antiguos = seguimientos.slice(-tercio);

    // Analizar cada período
    const analisisReciente = analizarSeguimientoPorCategorias(recientes);
    const analisisAntiguo = analizarSeguimientoPorCategorias(antiguos);

    // Calcular puntuación compuesta
    let puntajeReciente = 0;
    let puntajeAntiguo = 0;
    let categoriasCon = 0;

    Object.keys(analisisReciente.categorias).forEach(cat => {
        if (analisisReciente.categorias[cat].total > 0 && analisisAntiguo.categorias[cat].total > 0) {
            puntajeReciente += parseFloat(analisisReciente.categorias[cat].adherencia);
            puntajeAntiguo += parseFloat(analisisAntiguo.categorias[cat].adherencia);
            categoriasCon++;
        }
    });

    if (categoriasCon === 0) {
        return { tendencia: 'estable', cambio: 0, descripcion: 'Datos insuficientes por categoría' };
    }

    const promedioReciente = puntajeReciente / categoriasCon;
    const promedioAntiguo = puntajeAntiguo / categoriasCon;
    const cambio = promedioReciente - promedioAntiguo;

    let tendencia = 'estable';
    let descripcion = 'El paciente mantiene un estado estable en todas las áreas';

    if (cambio > 15) {
        tendencia = 'mejorando';
        descripcion = 'Mejora significativa observada en múltiples áreas de seguimiento';
    } else if (cambio < -15) {
        tendencia = 'deteriorando';
        descripcion = 'Deterioro detectado en indicadores clave de salud';
    } else if (cambio > 5) {
        tendencia = 'mejorando_leve';
        descripcion = 'Tendencia positiva leve en las áreas evaluadas';
    } else if (cambio < -5) {
        tendencia = 'deteriorando_leve';
        descripcion = 'Ligera tendencia negativa que requiere monitoreo';
    }

    return { tendencia, cambio: cambio.toFixed(1), descripcion, categoriasCon };
};

// Algoritmo 4: Detectar patrones específicos
const detectarPatrones = (seguimientos, estadisticasMeds, analisisCategorias) => {
    const patrones = [];

    // Patrón 1: Consistencia en registro
    if (seguimientos.length >= 7) {
        patrones.push({
            tipo: 'positivo',
            patron: 'Consistencia en seguimiento',
            descripcion: `${seguimientos.length} días con registro completo de seguimiento`
        });
    } else if (seguimientos.length > 0 && seguimientos.length < 5) {
        patrones.push({
            tipo: 'alerta',
            patron: 'Seguimiento irregular',
            descripcion: 'Pocos días de registro, se recomienda mayor frecuencia'
        });
    }

    // Patrón 2: Adherencia a medicamentos (TomasDiarias)
    if (estadisticasMeds.adherencia >= 90) {
        patrones.push({
            tipo: 'positivo',
            patron: 'Excelente adherencia farmacológica',
            descripcion: `${estadisticasMeds.adherencia}% de cumplimiento en tomas programadas`
        });
    } else if (estadisticasMeds.adherencia < 70) {
        patrones.push({
            tipo: 'alerta',
            patron: 'Adherencia farmacológica baja',
            descripcion: `Solo ${estadisticasMeds.adherencia}% de adherencia, por debajo del objetivo`
        });
    }

    // Patrón 3: Estado emocional (categoría Estigma)
    const estigma = analisisCategorias.categorias.Estigma;
    if (estigma && estigma.total > 0) {
        const porcentajeNegativo = (estigma.negativos / estigma.total) * 100;
        
        if (porcentajeNegativo > 60) {
            patrones.push({
                tipo: 'alerta',
                patron: 'Estados emocionales negativos predominantes',
                descripcion: `${porcentajeNegativo.toFixed(0)}% de respuestas indican estado emocional negativo`
            });
        } else if (estigma.positivos > estigma.negativos) {
            patrones.push({
                tipo: 'positivo',
                patron: 'Estado emocional favorable',
                descripcion: 'Predominio de emociones positivas en el seguimiento'
            });
        }
    }

    // Patrón 4: Alimentación
    const alimentacion = analisisCategorias.categorias.Alimentacion;
    if (alimentacion && alimentacion.total >= 3) {
        if (parseFloat(alimentacion.adherencia) >= 80) {
            patrones.push({
                tipo: 'positivo',
                patron: 'Buenos hábitos alimenticios',
                descripcion: `${alimentacion.adherencia}% de adherencia a recomendaciones nutricionales`
            });
        } else if (parseFloat(alimentacion.adherencia) < 50) {
            patrones.push({
                tipo: 'alerta',
                patron: 'Hábitos alimenticios a mejorar',
                descripcion: 'Baja adherencia a recomendaciones nutricionales'
            });
        }
    }

    // Patrón 5: Actividad Física
    const actividad = analisisCategorias.categorias.ActividadFisica;
    if (actividad && actividad.total >= 3) {
        if (parseFloat(actividad.adherencia) >= 80) {
            patrones.push({
                tipo: 'positivo',
                patron: 'Actividad física regular',
                descripcion: `${actividad.adherencia}% de cumplimiento en actividad física`
            });
        } else if (parseFloat(actividad.adherencia) < 50) {
            patrones.push({
                tipo: 'alerta',
                patron: 'Sedentarismo detectado',
                descripcion: 'Baja frecuencia de actividad física registrada'
            });
        }
    }

    // Patrón 6: Tomas fuera de horario
    if (estadisticasMeds.tomasFueradeHorario > estadisticasMeds.tomasCumplidas * 0.3) {
        patrones.push({
            tipo: 'alerta',
            patron: 'Inconsistencia horaria en medicación',
            descripcion: `${estadisticasMeds.tomasFueradeHorario} tomas fuera del intervalo de 8 horas`
        });
    }

    return patrones;
};

// Algoritmo 5: Generar alertas clínicas
const generarAlertas = (analisisCategorias, estadisticasMeds, tendencia, seguimientos) => {
    const alertas = [];

    // Alerta 1: Adherencia farmacológica crítica
    if (estadisticasMeds.adherencia < 60) {
        alertas.push({
            nivel: 'alta',
            categoria: 'Tratamiento Farmacológico',
            mensaje: `Adherencia crítica: ${estadisticasMeds.adherencia}%`,
            accion: 'Intervención urgente - Identificar barreras al tratamiento'
        });
    } else if (estadisticasMeds.adherencia < 80) {
        alertas.push({
            nivel: 'media',
            categoria: 'Tratamiento Farmacológico',
            mensaje: `Adherencia subóptima: ${estadisticasMeds.adherencia}%`,
            accion: 'Reforzar la importancia de la consistencia en el tratamiento'
        });
    }

    // Alerta 2: Estado emocional
    const estigma = analisisCategorias.categorias.Estigma;
    if (estigma && estigma.total > 0) {
        const porcentajeNegativo = (estigma.negativos / estigma.total) * 100;
        if (porcentajeNegativo > 70) {
            alertas.push({
                nivel: 'alta',
                categoria: 'Salud Mental',
                mensaje: 'Predominio severo de estados emocionales negativos',
                accion: 'Atención necesaria a la brevedad'
            });
        } else if (porcentajeNegativo > 50) {
            alertas.push({
                nivel: 'media',
                categoria: 'Salud Mental',
                mensaje: 'Estados emocionales negativos frecuentes',
                accion: 'Enfatizar monitoreo cercano'
            });
        }
    }

    // Alerta 3: Tendencia general
    if (tendencia.tendencia === 'deteriorando') {
        alertas.push({
            nivel: 'alta',
            categoria: 'Evolución General',
            mensaje: `Deterioro significativo detectado (${tendencia.cambio}% de cambio)`,
            accion: 'Considerar reevaluar el plan terapéutico'
        });
    } else if (tendencia.tendencia === 'deteriorando_leve') {
        alertas.push({
            nivel: 'media',
            categoria: 'Evolución General',
            mensaje: 'Ligera tendencia negativa en indicadores',
            accion: 'Monitoreo cercano y revisión de factores estresores'
        });
    }

    // Alerta 4: Alimentación
    const alimentacion = analisisCategorias.categorias.Alimentacion;
    if (alimentacion && alimentacion.total >= 3 && parseFloat(alimentacion.adherencia) < 40) {
        alertas.push({
            nivel: 'media',
            categoria: 'Hábitos de Vida',
            mensaje: 'Hábitos alimenticios deficientes',
            accion: 'Referir a nutrición y establecer metas alcanzables'
        });
    }

    // Alerta 5: Actividad Física
    const actividad = analisisCategorias.categorias.ActividadFisica;
    if (actividad && actividad.total >= 3 && parseFloat(actividad.adherencia) < 30) {
        alertas.push({
            nivel: 'media',
            categoria: 'Hábitos de Vida',
            mensaje: 'Sedentarismo marcado',
            accion: 'Programa gradual de activación física adaptado'
        });
    }

    // Alerta 6: Falta de seguimiento reciente
    if (seguimientos.length > 0) {
        const ultimoRegistro = new Date(seguimientos[0].fecha);
        const hoy = new Date();
        const diasSinRegistro = Math.floor((hoy - ultimoRegistro) / (1000 * 60 * 60 * 24));
        
        if (diasSinRegistro > 7) {
            alertas.push({
                nivel: 'media',
                categoria: 'Adherencia al Seguimiento',
                mensaje: `${diasSinRegistro} días sin registro de seguimiento`,
                accion: 'Contactar al paciente para verificar continuidad del tratamiento'
            });
        }
    }

    // Si no hay alertas graves, mensaje positivo
    if (alertas.length === 0 || alertas.every(a => a.nivel === 'baja')) {
        alertas.push({
            nivel: 'baja',
            categoria: 'Estado General',
            mensaje: 'Evolución favorable sin alertas críticas',
            accion: 'Mantener plan terapéutico actual y seguimiento regular'
        });
    }

    return alertas;
};

// Algoritmo 6: Generar recomendaciones personalizadas
const generarRecomendaciones = (analisisCategorias, estadisticasMeds, tendencia, patrones) => {
    const recomendaciones = [];

    // Recomendación por adherencia farmacológica
    if (estadisticasMeds.adherencia < 85 && estadisticasMeds.totalTomas > 0) {
        recomendaciones.push({
            prioridad: estadisticasMeds.adherencia < 70 ? 'alta' : 'media',
            area: 'Adherencia Farmacológica',
            recomendacion: 'Implementar estrategias para mejorar la adherencia',
            impacto: 'Mejora en estabilidad del tratamiento y síntomas'
        });
    }

    // Recomendación por estado emocional
    const estigma = analisisCategorias.categorias.Estigma;
    if (estigma && estigma.negativos > estigma.positivos) {
        recomendaciones.push({
            prioridad: 'alta',
            area: 'Salud Mental',
            recomendacion: 'Incrementar frecuencia de sesiones terapéuticas, técnicas de regulación emocional (mindfulness, respiración), revisar ajuste farmacológico',
            impacto: 'Estabilización del estado anímico y reducción de síntomas negativos'
        });
    }

    // Recomendación por alimentación
    const alimentacion = analisisCategorias.categorias.Alimentacion;
    if (alimentacion && alimentacion.total >= 2 && parseFloat(alimentacion.adherencia) < 60) {
        recomendaciones.push({
            prioridad: 'media',
            area: 'Nutrición',
            recomendacion: 'Establecer plan nutricional estructurado, metas pequeñas alcanzables, posible referencia a nutrición especializada',
            impacto: 'Mejora en energía, estado de ánimo y salud física general'
        });
    }

    // Recomendación por actividad física
    const actividad = analisisCategorias.categorias.ActividadFisica;
    if (actividad && actividad.total >= 2 && parseFloat(actividad.adherencia) < 60) {
        recomendaciones.push({
            prioridad: 'media',
            area: 'Actividad Física',
            recomendacion: 'Iniciar programa de activación gradual: caminatas cortas (10-15 min), aumentar progresivamente, vincular con actividades placenteras',
            impacto: 'Reducción de síntomas depresivos y ansiosos, mejora en calidad de sueño'
        });
    }

    // Recomendación por tendencia
    if (tendencia.tendencia.includes('mejorando')) {
        recomendaciones.push({
            prioridad: 'baja',
            area: 'Refuerzo Positivo',
            recomendacion: 'Reconocer logros, identificar estrategias exitosas para replicarlas, celebrar avances con el paciente',
            impacto: 'Fortalecimiento de motivación y autoeficacia'
        });
    }

    // Recomendación por tomas fuera de horario
    if (estadisticasMeds.tomasFueradeHorario > 3) {
        recomendaciones.push({
            prioridad: 'media',
            area: 'Organización del Tratamiento',
            recomendacion: 'Asociar tomas con actividades diarias habituales',
            impacto: 'Mayor facilidad para mantener adherencia sostenida'
        });
    }

    // Recomendación por seguimiento irregular
    if (patrones.some(p => p.patron.includes('irregular'))) {
        recomendaciones.push({
            prioridad: 'media',
            area: 'Adherencia al Seguimiento',
            recomendacion: 'Atender a los recordatorios para registro diario, explorar barreras percibidas',
            impacto: 'Datos más precisos para evaluación y ajuste terapéutico'
        });
    }

    // Recomendación general si todo va bien
    if (estadisticasMeds.adherencia >= 85 && !tendencia.tendencia.includes('deteriorando')) {
        recomendaciones.push({
            prioridad: 'baja',
            area: 'Mantenimiento',
            recomendacion: 'Continuar con plan actual, sesiones de mantenimiento, prevención de recaídas, identificación temprana de señales de alarma',
            impacto: 'Sostenimiento a largo plazo de resultados positivos'
        });
    }

    return recomendaciones;
};

// Funciones auxiliares
const calcularDiferenciaMinutos = (horaProgramada, horaReal) => {
    try {
        const [h1, m1] = horaProgramada.split(':').map(Number);
        const [h2, m2] = horaReal.split(':').map(Number);
        return Math.abs((h1 * 60 + m1) - (h2 * 60 + m2));
    } catch {
        return 0;
    }
};

const generarAnalisisLocal = (usuario) => {
    const analisisCategorias = analizarSeguimientoPorCategorias(usuario.seguimiento || []);
    const estadisticasMeds = calcularEstadisticasMedicamentos(usuario.tomas || []);
    const tendencia = analizarTendenciaTemporal(usuario.seguimiento || []);
    const patrones = detectarPatrones(usuario.seguimiento || [], estadisticasMeds, analisisCategorias);
    const alertas = generarAlertas(analisisCategorias, estadisticasMeds, tendencia, usuario.seguimiento || []);
    const recomendaciones = generarRecomendaciones(analisisCategorias, estadisticasMeds, tendencia, patrones);

    let puntuacionGeneral = 0;
    if (estadisticasMeds.totalTomas > 0) {
        puntuacionGeneral += (parseFloat(estadisticasMeds.adherencia) / 100) * 25;
    }

    Object.keys(analisisCategorias.categorias).forEach(cat => {
        if (analisisCategorias.categorias[cat].total > 0) {
            puntuacionGeneral += (parseFloat(analisisCategorias.categorias[cat].adherencia) / 100) * 15;
        }
    });

    if (tendencia.tendencia === 'mejorando') puntuacionGeneral += 15;
    else if (tendencia.tendencia === 'mejorando_leve') puntuacionGeneral += 10;
    else if (tendencia.tendencia === 'estable') puntuacionGeneral += 7.5;
    else if (tendencia.tendencia === 'deteriorando_leve') puntuacionGeneral += 3;

    puntuacionGeneral = Math.max(0, Math.min(100, puntuacionGeneral));

    let prioridadAtencion = 'baja';
    if (puntuacionGeneral < 50 || alertas.some(a => a.nivel === 'alta')) {
        prioridadAtencion = 'alta';
    } else if (puntuacionGeneral < 70 || alertas.some(a => a.nivel === 'media')) {
        prioridadAtencion = 'media';
    }

    return {
        puntuacionGeneral: puntuacionGeneral.toFixed(0),
        analisisCategorias,
        estadisticasMeds,
        tendencia,
        patrones,
        alertas,
        recomendaciones,
        prioridadAtencion,
        ...evaluarRiesgoLocal(puntuacionGeneral)
    };
};

const evaluarRiesgoLocal = (puntuacionGeneral) => {
    const prob = Number((puntuacionGeneral / 100).toFixed(4));
    const will_take = prob >= 0.50;
    const risk = prob >= 0.70 ? 'low' : prob >= 0.50 ? 'medium' : 'high';

    return { prob, will_take, risk };
};

const parseNumber = (value, fallback = 0) => {
    const n = Number(value);
    if (Number.isFinite(n) && !Number.isNaN(n)) {
        return n;
    }
    return fallback;
};

const prepararPayloadIA = (usuario) => {
    const perfil = (usuario.perfiles && usuario.perfiles[0]) || {};

    const edad = parseNumber(perfil.edad, 45);
    let bmi = parseNumber(perfil.BMI || perfil.imc || perfil.IMC, 0);
    if (!bmi) {
        const peso = parseNumber(perfil.pesoKg || perfil.peso || perfil.peso_kg, 70);
        const altura = parseNumber(perfil.alturaM || (perfil.alturaCm / 100) || (perfil.altura_cm / 100), 1.7);
        bmi = altura > 0 ? Number((peso / (altura * altura)).toFixed(1)) : 27.5;
    }

    const blood_glucose = parseNumber(perfil.blood_glucose || perfil.glucosa || perfil.glucemia, 95);
    const heart_rate = parseNumber(perfil.heart_rate || perfil.frecuencia_cardiaca || perfil.fc, 72);
    const sleep_hours = parseNumber(perfil.sleep_hours || perfil.horas_sueno || perfil.sueno, 7);
    const bp_sist = parseNumber(perfil.bp_sist || perfil.presion_sistolica || perfil.tension_sistolica, 120);
    const comorbidities = parseNumber(perfil.comorbilidades || perfil.comorbidities || perfil.comorbids, 1);

    const seguimiento = usuario.seguimiento || [];
    const actividad = seguimiento.filter(s => ['ActividadFisica', 'actividadfisica', 'Actividad Física', 'actividad_fisica'].includes(s.categoria));
    const actividadPos = actividad.filter(item => (item.respuesta || '').toLowerCase().includes('sí') || (item.respuesta || '').toLowerCase().includes('si')).length;
    const activity_level = actividad.length > 0 ? Number(((actividadPos / actividad.length) * 5).toFixed(1)) : 3.0;

    const estigma = seguimiento.filter(s => ['Estigma', 'estigma'].includes(s.categoria));
    const estigmaNeg = estigma.filter(item => {
        const r = (item.respuesta || '').toLowerCase();
        return ['ansioso', 'estresado', 'triste', 'deprimido', 'abrumado', 'culpable', 'avergonzado', 'preocupado', 'nervioso'].some(w => r.includes(w));
    }).length;
    const stress_level = estigma.length > 0 ? Number(((estigmaNeg / estigma.length) * 5).toFixed(1)) : 3.0;

    const socialCandidates = seguimiento.filter(s => ['Alimentacion', 'alimentacion', 'Farmaco', 'farmaco'].includes(s.categoria));
    const socialPos = socialCandidates.filter(item => (item.respuesta || '').toLowerCase().includes('sí') || (item.respuesta || '').toLowerCase().includes('si')).length;
    const social_support = socialCandidates.length > 0 ? Number(((socialPos / socialCandidates.length) * 5).toFixed(1)) : 3.0;

    const reminder_sent = seguimiento.some(item => {
        const q = (item.pregunta || item.categoria || '').toLowerCase();
        return q.includes('recordatorio') || q.includes('recordar') || q.includes('alarma');
    }) ? 1 : 0;

    const now = new Date();
    const weekday = now.getDay();
    const dia_semana = weekday === 0 ? 7 : weekday;
    const es_fin_semana = dia_semana === 6 || dia_semana === 7 ? 1 : 0;

    const historial = seguimiento
        .slice(-12)
        .map(item => ((item.respuesta || '').toLowerCase().includes('sí') || (item.respuesta || '').toLowerCase().includes('si')) ? 1 : 0);

    while (historial.length < 12) historial.unshift(0);

    return {
        patient_id: usuario.userId || perfil.id || 'test_001',
        age: edad,
        BMI: bmi,
        heart_rate: heart_rate,
        blood_glucose: blood_glucose,
        activity_level: activity_level,
        sleep_hours: sleep_hours,
        stress_level: stress_level,
        social_support: social_support,
        bp_sist: bp_sist,
        comorbidities: comorbidities,
        reminder_sent: reminder_sent,
        dia_semana: dia_semana,
        es_fin_semana: es_fin_semana,
        historial: historial,
    };
};

// ===================================================================
// COMPONENTE PRINCIPAL
// ===================================================================

const AnalizadorInteligente = ({ usuario }) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const prepararPayloadLSTM = (usuario) => {
        const profile = (usuario.perfiles && usuario.perfiles[0]) || {};
        const age = parseNumber(profile.edad, 45);
        const seguimiento = usuario.seguimiento || [];

        const eventos = seguimiento
            .slice(-6)
            .map(item => ({
                taken: ((item.respuesta || '').toLowerCase().includes('sí') || (item.respuesta || '').toLowerCase().includes('si')) ? 1 : 0,
                dia_semana: !item.fecha ? 0 : (new Date(item.fecha).getDay() || 0),
                stress_level: parseNumber(item.stress_level || item.nivel_estrés || item.nivel_estres, 3),
                sleep_hours: parseNumber(item.sleep_hours || item.horas_sueno || item.horas_sueño, 7),
                social_support: parseNumber(item.social_support || item.apoyo_social || item.red_social, 3),
                age,
                heart_rate: parseNumber(item.heart_rate || item.frecuencia_cardiaca || item.fc, 72),
                activity_level: parseNumber(item.activity_level || item.actividad || item.nivel_actividad, 3),
                reminder_sent: ((item.pregunta || '').toLowerCase().includes('recordatorio') || (item.respuesta || '').toLowerCase().includes('recordatorio')) ? 1 : 0
            }));

        while (eventos.length < 6) {
            eventos.unshift({
                taken: 0,
                dia_semana: 0,
                stress_level: 3,
                sleep_hours: 7,
                social_support: 3,
                age,
                heart_rate: 72,
                activity_level: 3,
                reminder_sent: 0
            });
        }

        return {
            patient_id: usuario.userId || profile.id || 'test_001',
            eventos
        };
    };

    const analizarConModelo = async (modelo) => {
        setIsAnalyzing(true);
        setShowModal(true);

        const urls = {
            rf: import.meta.env.VITE_AI_RF_URL || 'https://fernanda7171-RandomForest.hf.space/predict',
            lstm: import.meta.env.VITE_AI_LSTM_URL || 'https://fernanda7171-lstm.hf.space/predict'
        };

        const apiUrl = urls[modelo];
        if (!apiUrl) {
            console.error(`URL no configurada para modelo ${modelo}`);
            setIsAnalyzing(false);
            return;
        }

        const payload = modelo === 'lstm' ? prepararPayloadLSTM(usuario) : prepararPayloadIA(usuario);

        console.log(`[${modelo.toUpperCase()}] URL:`, apiUrl);
        console.log(`[${modelo.toUpperCase()}] Payload:`, JSON.stringify(payload, null, 2));

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.text().catch(() => 'No response body');
                console.error(`[${modelo.toUpperCase()}] API Error - Status: ${response.status}, Body:`, errorData);
                throw new Error(errorData?.error || `Error ${response.status}: ${errorData}`);
            }

            const data = await response.json();
            console.log(`[${modelo.toUpperCase()}] API Response:`, data);
            const apiAnalysis = data?.analysis || data;
            const localAnalysis = generarAnalisisLocal(usuario);

            const modelResult = apiAnalysis.predictions || apiAnalysis.data || apiAnalysis.rows || apiAnalysis || {};
            const rfResult = (Array.isArray(modelResult) && modelResult.length > 0) ? modelResult[0] : modelResult;

            setAnalysis({
                ...localAnalysis,
                model: modelo,
                apiRaw: data,
                modelResult: rfResult,
                modelDetails: {
                    prob: rfResult?.prob ?? rfResult?.probability ?? rfResult?.score ?? null,
                    will_take: rfResult?.will_take ?? rfResult?.will_take ?? null,
                    risk: rfResult?.risk ?? null,
                    patient_id: rfResult?.patient_id ?? apiAnalysis?.patient_id ?? usuario.userId
                }
            });
        } catch (error) {
            console.error('Error en análisis con IA:', error);
            const localAnalysis = generarAnalisisLocal(usuario);
            setAnalysis({
                ...localAnalysis,
                model: modelo,
                modelResult: null,
                modelDetails: {
                    prob: null,
                    will_take: null,
                    risk: 'error',
                    patient_id: usuario.userId || (usuario.perfiles?.[0]?.id || 'test_001')
                },
                apiRaw: null,
                apiError: error.message
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const analizarConAlgoritmos = () => {
        setIsAnalyzing(true);
        setShowModal(true);

        setTimeout(() => {
            try {
                const localResult = generarAnalisisLocal(usuario);
                setAnalysis({
                    ...localResult,
                    model: 'local',
                    modelResult: null,
                    apiRaw: null,
                    modelDetails: {
                        prob: 'N/A',
                        will_take: 'N/A',
                        risk: 'N/A',
                        patient_id: usuario.userId || (usuario.perfiles?.[0]?.id || 'test_001')
                    }
                });
            } catch (error) {
                console.error('Error en análisis local:', error);
            } finally {
                setIsAnalyzing(false);
            }
        }, 1800);
    };

    // Componente del Modal
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
                    maxWidth: '950px',
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
                            <FontAwesomeIcon icon={faBrain} style={{ marginRight: '10px' }} />
                            Análisis Integral: {usuario.nombre}
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
                        {isAnalyzing && (
                            <div style={{ textAlign: 'center', padding: '3rem' }}>
                                <FontAwesomeIcon icon={faSpinner} spin size="3x" style={{ color: '#667eea', marginBottom: '1rem' }} />
                                <p style={{ fontSize: '1.1rem', color: '#6c757d' }}>
                                    Analizando datos multidimensionales...
                                </p>
                                <p style={{ fontSize: '0.9rem', color: '#adb5bd' }}>
                                    Procesando: Seguimiento, Medicamentos, Estado Emocional, Hábitos de Vida
                                </p>
                            </div>
                        )}

                        {analysis && !isAnalyzing && (
                            <div>
                                {/* Resumen de modelo IA */}
                                {analysis.model && (
                                    <div style={{
                                        padding: '0.85rem',
                                        marginBottom: '1rem',
                                        backgroundColor: '#e9f7fd',
                                        border: '1px solid #a0d9f8',
                                        borderRadius: '8px',
                                        color: '#05213a'
                                    }}>
                                        <strong>Modelo:</strong> {analysis.model.toUpperCase()}
                                        <div style={{ marginTop: '0.3rem', fontSize: '0.85rem' }}>
                                            {analysis.modelDetails && (
                                                <span>
                                                    Prob: {analysis.modelDetails.prob ?? 'N/A'} •
                                                    Will_take: {String(analysis.modelDetails.will_take ?? 'N/A')} •
                                                    Risk: {analysis.modelDetails.risk ?? 'N/A'}
                                                </span>
                                            )}
                                        </div>
                                        {analysis.apiRaw && (
                                            <pre style={{
                                                marginTop: '0.5rem',
                                                maxHeight: '120px',
                                                overflowY: 'auto',
                                                background: '#f4f8fc',
                                                padding: '0.5rem',
                                                borderRadius: '6px',
                                                fontSize: '0.75rem'
                                            }}>
                                                {JSON.stringify(analysis.apiRaw, null, 2)}
                                            </pre>
                                        )}

                                        {analysis.apiError && (
                                            <div style={{
                                                marginTop: '0.4rem',
                                                color: '#b02a37',
                                                fontWeight: 'bold',
                                                fontSize: '0.82rem'
                                            }}>
                                                Error API: {analysis.apiError}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {/* Tarjetas de métricas principales */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                    gap: '1rem',
                                    marginBottom: '1.5rem'
                                }}>
                                    {/* Puntuación Global */}
                                    <div style={{
                                        padding: '1.5rem',
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        borderRadius: '12px',
                                        color: 'white',
                                        textAlign: 'center',
                                        boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
                                    }}>
                                        <div style={{ fontSize: '3rem', fontWeight: 'bold' }}>
                                            {analysis.puntuacionGeneral}
                                        </div>
                                        <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                                            Puntuación Global
                                        </div>
                                    </div>

                                    {/* Adherencia Farmacológica */}
                                    {analysis.estadisticasMeds.totalTomas > 0 && (
                                        <div style={{
                                            padding: '1.5rem',
                                            background: parseFloat(analysis.estadisticasMeds.adherencia) >= 80 ? 
                                                'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' :
                                                'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                            borderRadius: '12px',
                                            color: 'white',
                                            textAlign: 'center',
                                            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
                                        }}>
                                            <div style={{ fontSize: '3rem', fontWeight: 'bold' }}>
                                                {analysis.estadisticasMeds.adherencia}%
                                            </div>
                                            <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                                                <FontAwesomeIcon icon={faPills} style={{ marginRight: '5px' }} />
                                                Adherencia Fármacos
                                            </div>
                                        </div>
                                    )}

                                    {/* Tendencia */}
                                    <div style={{
                                        padding: '1.5rem',
                                        background: analysis.tendencia.tendencia.includes('mejorando') ?
                                            'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)' :
                                            analysis.tendencia.tendencia.includes('deteriorando') ?
                                            'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' :
                                            'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                                        borderRadius: '12px',
                                        color: 'white',
                                        textAlign: 'center',
                                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
                                    }}>
                                        <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
                                            <FontAwesomeIcon icon={
                                                analysis.tendencia.tendencia.includes('mejorando') ? faHeart: 
                                                analysis.tendencia.tendencia.includes('deteriorando') ? faHeart :
                                                faHeartbeat
                                            } />
                                        </div>
                                        <div style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: '0.5rem' }}>
                                            {analysis.tendencia.tendencia.replace('_', ' ')}
                                        </div>
                                    </div>

                                    {/* Estado Emocional */}
                                    {analysis.analisisCategorias.categorias.Estigma?.total > 0 && (
                                        <div style={{
                                            padding: '1.5rem',
                                            background: analysis.analisisCategorias.categorias.Estigma.positivos > 
                                                       analysis.analisisCategorias.categorias.Estigma.negativos ?
                                                'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' :
                                                'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
                                            borderRadius: '12px',
                                            color: '#333',
                                            textAlign: 'center',
                                            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
                                        }}>
                                            <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
                                                <FontAwesomeIcon icon={
                                                    analysis.analisisCategorias.categorias.Estigma.positivos > 
                                                    analysis.analisisCategorias.categorias.Estigma.negativos ? 
                                                    faSmile : faFrown
                                                } />
                                            </div>
                                            <div style={{ fontSize: '0.85rem', marginTop: '0.5rem', fontWeight: 600 }}>
                                                Estado Emocional
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Prioridad de Atención 
                                <div style={{
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    marginBottom: '1.5rem',
                                    backgroundColor: analysis.prioridadAtencion === 'alta' ? '#fee' : 
                                                    analysis.prioridadAtencion === 'media' ? '#ffc' : '#efe',
                                    border: `2px solid ${analysis.prioridadAtencion === 'alta' ? '#dc3545' : 
                                                         analysis.prioridadAtencion === 'media' ? '#ffc107' : '#198754'}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}>*/}
                                   {/*  <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                                         Prioridad de Atención Clínica
                                    </span>
                                    
                                    <span style={{ 
                                        fontWeight: 'bold', 
                                        fontSize: '1.2rem',
                                        textTransform: 'uppercase',
                                        color: analysis.prioridadAtencion === 'alta' ? '#dc3545' : 
                                               analysis.prioridadAtencion === 'media' ? '#f57c00' : '#198754'
                                    }}>
                                        {analysis.prioridadAtencion}
                                    </span>
                                   
                                </div>

                                {/* Análisis por Categorías */}
                                <div style={{
                                    padding: '1rem',
                                    backgroundColor: '#f8f9fa',
                                    borderRadius: '8px',
                                    marginBottom: '1.5rem'
                                }}>
                                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#495057' }}>
                                        <FontAwesomeIcon icon={faChartLine} style={{ marginRight: '8px' }} />
                                        Análisis por Áreas de Seguimiento
                                    </h3>
                                    <div style={{ display: 'grid', gap: '1rem' }}>
                                        {Object.keys(analysis.analisisCategorias.categorias).map(categoria => {
                                            const datos = analysis.analisisCategorias.categorias[categoria];
                                            if (datos.total === 0) return null;
                                            
                                            const iconMap = {
                                                'Farmaco': faPills,
                                                'Estigma': faHeartbeat,
                                                'Alimentacion': faAppleAlt,
                                                'ActividadFisica': faRunning
                                            };
                                            
                                            return (
                                                <div key={categoria} style={{
                                                    padding: '1rem',
                                                    backgroundColor: 'white',
                                                    borderRadius: '6px',
                                                    border: '1px solid #dee2e6'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                        <span style={{ fontWeight: 600, fontSize: '1rem' }}>
                                                            <FontAwesomeIcon icon={iconMap[categoria] || faCheckCircle} style={{ marginRight: '8px', color: '#00723f' }} />
                                                            {categoria === 'Farmaco' ? 'Adherencia Farmacológica' :
                                                             categoria === 'Estigma' ? 'Estado Emocional' :
                                                             categoria === 'Alimentacion' ? 'Alimentación' :
                                                             categoria === 'ActividadFisica' ? 'Actividad Física' : categoria}
                                                        </span>
                                                        <span style={{
                                                            fontWeight: 'bold',
                                                            fontSize: '1.2rem',
                                                            color: parseFloat(datos.adherencia) >= 80 ? '#198754' :
                                                                   parseFloat(datos.adherencia) >= 60 ? '#ffc107' : '#dc3545'
                                                        }}>
                                                            {datos.adherencia}%
                                                        </span>
                                                    </div>
                                                    <div style={{ 
                                                        display: 'grid', 
                                                        gridTemplateColumns: 'repeat(3, 1fr)',
                                                        gap: '0.5rem',
                                                        fontSize: '0.85rem',
                                                        color: '#6c757d'
                                                    }}>
                                                        <div> Total: {datos.total}</div>
                                                        <div> Positivos: {datos.positivos}</div>
                                                        <div> Negativos: {datos.negativos}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Estadísticas de Medicamentos */}
                                {analysis.estadisticasMeds.totalTomas > 0 && (
                                    <div style={{
                                        padding: '1rem',
                                        backgroundColor: '#e7f3ff',
                                        borderRadius: '8px',
                                        marginBottom: '1.5rem',
                                        borderLeft: '4px solid #0d6efd'
                                    }}>
                                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#0d6efd' }}>
                                            <FontAwesomeIcon icon={faPills} style={{ marginRight: '8px' }} />
                                            Detalle de Tratamiento Farmacológico
                                        </h3>
                                        <div style={{ 
                                            display: 'grid', 
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                            gap: '0.75rem',
                                            fontSize: '0.9rem'
                                        }}>
                                            <div><strong> Medicamentos activos:</strong> {analysis.estadisticasMeds.medicamentosActivos}</div>
                                            <div><strong> Total de tomas:</strong> {analysis.estadisticasMeds.totalTomas}</div>
                                            <div><strong> Tomas cumplidas:</strong> {analysis.estadisticasMeds.tomasCumplidas}</div>
                                            <div><strong> Tomas omitidas:</strong> {analysis.estadisticasMeds.tomasOmitidas}</div>
                                            <div><strong> Fuera de horario:</strong> {analysis.estadisticasMeds.tomasFueradeHorario}</div>
                                            <div><strong> Días registrados:</strong> {analysis.estadisticasMeds.diasConRegistro}</div>
                                        </div>
                                    </div>
                                )}

                                {/* Alertas Clínicas */}
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1.1rem', color: '#dc3545', marginBottom: '0.75rem' }}>
                                        <FontAwesomeIcon icon={faExclamationTriangle} style={{ marginRight: '8px' }} />
                                        Alertas Clínicas ({analysis.alertas.length})
                                    </h3>
                                    {analysis.alertas.map((alerta, idx) => (
                                        <div key={idx} style={{
                                            padding: '1rem',
                                            backgroundColor: alerta.nivel === 'alta' ? '#f8d7da' :
                                                           alerta.nivel === 'media' ? '#fff3cd' : '#d1e7dd',
                                            borderRadius: '6px',
                                            marginBottom: '0.75rem',
                                            borderLeft: `4px solid ${alerta.nivel === 'alta' ? '#dc3545' :
                                                                    alerta.nivel === 'media' ? '#ffc107' : '#198754'}`
                                        }}>
                                            <div style={{ fontWeight: 'bold', marginBottom: '0.25rem', textTransform: 'uppercase', fontSize: '0.85rem' }}>
                                                {alerta.nivel === 'alta' ? '🔴' : alerta.nivel === 'media' ? '🟡' : '🟢'} {alerta.categoria}
                                            </div>
                                            <div style={{ marginBottom: '0.5rem' }}>{alerta.mensaje}</div>
                                            <div style={{ fontSize: '0.85rem', fontStyle: 'italic', color: '#495057' }}>
                                                💡 <strong>Acción recomendada:</strong> {alerta.accion}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Patrones Detectados */}
                                {analysis.patrones.length > 0 && (
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <h3 style={{ fontSize: '1.1rem', color: '#0d6efd', marginBottom: '0.75rem' }}>
                                            <FontAwesomeIcon icon={faChartLine} style={{ marginRight: '8px' }} />
                                            Patrones Identificados ({analysis.patrones.length})
                                        </h3>
                                        {analysis.patrones.map((patron, idx) => (
                                            <div key={idx} style={{
                                                padding: '0.75rem',
                                                backgroundColor: patron.tipo === 'positivo' ? '#d1e7dd' : '#fff3cd',
                                                borderRadius: '6px',
                                                marginBottom: '0.5rem',
                                                borderLeft: `4px solid ${patron.tipo === 'positivo' ? '#198754' : '#ffc107'}`
                                            }}>
                                                <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                                                    {patron.tipo === 'positivo' ? '✅' : '⚠️'} {patron.patron}
                                                </div>
                                                <div style={{ fontSize: '0.9rem' }}>{patron.descripcion}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Recomendaciones */}
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1.1rem', color: '#ffc107', marginBottom: '0.75rem' }}>
                                        <FontAwesomeIcon icon={faLightbulb} style={{ marginRight: '8px' }} />
                                        Recomendaciones Terapéuticas ({analysis.recomendaciones.length})
                                    </h3>
                                    {analysis.recomendaciones.map((rec, idx) => (
                                        <div key={idx} style={{
                                            padding: '1rem',
                                            backgroundColor: '#fff',
                                            border: '1px solid #dee2e6',
                                            borderRadius: '6px',
                                            marginBottom: '0.75rem',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                <span style={{ 
                                                    fontWeight: 'bold',
                                                    color: rec.prioridad === 'alta' ? '#dc3545' :
                                                           rec.prioridad === 'media' ? '#ffc107' : '#198754'
                                                }}>
                                                    {rec.prioridad === 'alta' ? '🔴' : rec.prioridad === 'media' ? '🟡' : '🟢'} {rec.area}
                                                </span>
                                                <span style={{ 
                                                    fontSize: '0.75rem',
                                                    textTransform: 'uppercase',
                                                    fontWeight: 'bold',
                                                    color: '#6c757d'
                                                }}>
                                                    Prioridad {rec.prioridad}
                                                </span>
                                            </div>
                                            <div style={{ marginBottom: '0.5rem', lineHeight: '1.5' }}>{rec.recomendacion}</div>
                                            <div style={{ 
                                                fontSize: '0.85rem', 
                                                color: '#198754',
                                                fontStyle: 'italic',
                                                padding: '0.5rem',
                                                backgroundColor: '#d1e7dd',
                                                borderRadius: '4px'
                                            }}>
                                                <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: '5px' }} />
                                                <strong>Impacto esperado:</strong> {rec.impacto}
                                            </div>
                                        </div>
                                    ))}
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
                                    <FontAwesomeIcon icon={faCalendarCheck} style={{ marginRight: '5px' }} />
                                    Análisis generado el {new Date().toLocaleDateString('es-MX', { 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', opacity: 0.8 }}>
                                        📊 Sistema de Análisis Clínico Multidimensional v2.0 • 
                                        {usuario.seguimiento.length} días de seguimiento • 
                                        {analysis.estadisticasMeds.totalTomas} tomas registradas • 
                                        {Object.keys(analysis.analisisCategorias.categorias).filter(c => 
                                            analysis.analisisCategorias.categorias[c].total > 0
                                        ).length} áreas evaluadas
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: '320px' }}>
                <button
                    onClick={() => analizarConModelo('rf')}
                    disabled={isAnalyzing}
                    style={{
                        padding: '0.5rem 1rem',
                        background: isAnalyzing ? '#adb5bd' : 'linear-gradient(135deg, #48b1b8ff 0%, #20419A 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        whiteSpace: 'nowrap',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        transition: 'all 0.3s ease',
                        boxShadow: isAnalyzing ? 'none' : '0 4px 15px rgba(102, 126, 234, 0.4)'
                    }}
                >
                    <FontAwesomeIcon 
                        icon={isAnalyzing ? faSpinner : faBrain} 
                        spin={isAnalyzing}
                        style={{ marginRight: '8px' }} 
                    />
                    {isAnalyzing ? 'Analizando...' : 'RandomForest'}
                </button>

                <button
                    onClick={() => analizarConModelo('lstm')}
                    disabled={isAnalyzing}
                    style={{
                        padding: '0.5rem 1rem',
                        background: isAnalyzing ? '#adb5bd' : 'linear-gradient(135deg, #efb9f5 0%, #c567d8 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        whiteSpace: 'nowrap',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        transition: 'all 0.3s ease',
                        boxShadow: isAnalyzing ? 'none' : '0 4px 15px rgba(126, 63, 181, 0.4)'
                    }}
                >
                    <FontAwesomeIcon 
                        icon={isAnalyzing ? faSpinner : faBrain} 
                        spin={isAnalyzing}
                        style={{ marginRight: '8px' }} 
                    />
                    {isAnalyzing ? 'Analizando...' : 'LSTM'}
                </button>
            </div>

            <Modal />
        </>
    );
};

export default AnalizadorInteligente;