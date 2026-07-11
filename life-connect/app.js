/**
 * LIFECONNECT PRO - Sistema de Emergencias Médicas
 * JavaScript completo con WebSocket integrado
 */

// ============================================
// WEBSOCKET SERVICE - Conexión a Centro de Comando
// ============================================

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(() => console.log('Listo para instalar en celular'))
    .catch(err => console.log('Error:', err));
}

const CONFIG = {
    ELEVENLABS_API_KEY: 'sk_180772420368c844b69f537faa6f3c2d1dbf444f1c6a66a6',
    ELEVENLABS_VOICE_ID: 'Xb7hHmiMSyWpm5mWc1y8',
    ELEVENLABS_MODEL: 'eleven_multilingual_v2',
    VOICE_SETTINGS: {
        stability: 0.25,
        similarity_boost: 0.85,
        style: 0.60,
        use_speaker_boost: true
    },
    PAUSE_BETWEEN_STEPS: 2800,
    INTRO_DELAY: 1500,
    GEO_OPTIONS: {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
    }
};

const WS_CONFIG = {
    URL: 'wss://life-connect-p10c.onrender.com',

    RECONNECT_INTERVAL: 3000,
    MAX_RECONNECT_ATTEMPTS: 10
};

class WebSocketService {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.reconnectTimer = null;
        this.messageQueue = [];
        this.listeners = new Map();
    }

    connect() {
        if (this.ws?.readyState === WebSocket.OPEN) return;
        
        try {
            console.log('Conectando a WebSocket...');
            this.ws = new WebSocket(WS_CONFIG.URL);
            
            this.ws.onopen = () => {
                console.log('✅ Conectado al Centro de Comando');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.flushQueue();
                this.emit('connection', { status: 'connected' });
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('📨 Recibido:', data);
                    this.handleServerMessage(data);
                } catch (e) { console.error('Error:', e); }
            };

            this.ws.onclose = () => {
                this.isConnected = false;
                this.attemptReconnect();
            };

            this.ws.onerror = (err) => console.error('WS Error:', err);
            
        } catch (error) {
            this.attemptReconnect();
        }
    }

    attemptReconnect() {
        if (this.reconnectAttempts >= WS_CONFIG.MAX_RECONNECT_ATTEMPTS) {
            this.emit('connection', { status: 'offline' });
            return;
        }
        this.reconnectAttempts++;
        setTimeout(() => this.connect(), WS_CONFIG.RECONNECT_INTERVAL);
    }

    send(data) {
        if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
            return true;
        } else {
            this.messageQueue.push(data);
            return false;
        }
    }

    flushQueue() {
        while (this.messageQueue.length > 0) {
            this.send(this.messageQueue.shift());
        }
    }

    handleServerMessage(data) {
        switch(data.type) {
            case 'EMERGENCY_ASSIGNED':
                this.emit('ambulanceAssigned', data);
                break;
            case 'INIT':
                this.emit('init', data);
                break;
            case 'ERROR':
                this.emit('error', data);
                break;
        }
    }

    on(event, callback) {
        if (!this.listeners.has(event)) this.listeners.set(event, []);
        this.listeners.get(event).push(callback);
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(cb => cb(data));
        }
    }
}

const wsService = new WebSocketService();

// ============================================
// ESTADO GLOBAL
// ============================================

const AppState = {
    currentScreen: 'splash',
    userProfile: null,
    currentEmergency: null,
    currentEmergencyType: null,
    isSpeaking: false,
    speechQueue: [],
    audioContext: null,
    metronomeInterval: null,
    elapsedTimeInterval: null,
    compressionCount: 0,
    hasProfile: false,
    isPracticeMode: false,
    voiceEnabled: true,
    mapsLoaded: false
};

// ============================================
// DATOS: GUÍAS DE EMERGENCIA COMPLETAS
// ============================================

const EMERGENCY_GUIDES = {
    heart: {
        id: 'heart',
        title: 'Persona desmayada o sin pulso',
        description: 'La persona no responde, no respira o no tiene pulso',
        introText: 'Voy a guiarle paso a paso para ayudar a esta persona. Mantenga la calma y escuche atentamente.',
        steps: [
            { text: 'Primero, verifique que el lugar sea seguro para usted y la víctima. No se acerque si hay peligro eléctrico, de tráfico o fuego.', pauseAfter: 3000, critical: false },
            { text: 'Acérquese y sacuda suavemente los hombros. Grite fuerte: ¿Está bien? ¿Me escucha?', pauseAfter: 2500, critical: false },
            { text: 'Si no responde, llame al nueve once inmediatamente. Diga: Necesito una ambulancia, hay una persona inconsciente que no responde.', pauseAfter: 4000, critical: true },
            { text: 'Coloque la persona boca arriba en el piso. Arrodíllese a su lado. Coloque el talón de una mano en el centro del pecho, justo entre los pezones. Coloque la otra mano encima.', pauseAfter: 5000, critical: true },
            { text: 'Con los brazos rectos, presione fuerte y rápido. Debe hacer cien compresiones por minuto. Deje que el pecho suba completamente entre cada presión.', pauseAfter: 6000, critical: true },
            { text: 'Si tiene un desfibrilador cerca, úselo inmediatamente siguiendo las instrucciones de voz del aparato. Si no, continúe con las compresiones sin parar hasta que llegue ayuda.', pauseAfter: 4000, critical: true },
            { text: 'Está haciendo un buen trabajo. Mantenga el ritmo. La ayuda viene en camino. No se rinda, cada compresión cuenta.', pauseAfter: 3000, critical: false }
        ],
        requiresMetronome: true,
        bpm: 110
    },
    bleeding: {
        id: 'bleeding',
        title: 'Sangrado grave',
        description: 'Sangrado fuerte que no para, heridas profundas',
        introText: 'Voy a ayudarle a controlar el sangrado. La presión es clave. Escuche con atención.',
        steps: [
            { text: 'No se asuste. Busque un paño limpio, toalla o camiseta. Si no tiene nada, use su propia prenda.', pauseAfter: 2500, critical: false },
            { text: 'Coloque el paño directamente sobre la herida y presione fuerte con ambas manos. Presione tan fuerte como pueda. Esto es vital para detener el sangrado.', pauseAfter: 4000, critical: true },
            { text: 'Si el paño se empapa de sangre, no lo quite. Ponga otro paño encima y siga presionando. Quitar el primer paño puede empeorar todo.', pauseAfter: 4000, critical: true },
            { text: 'Si es posible, eleve la parte del cuerpo que sangra por encima del nivel del corazón. Esto reduce la presión en la herida.', pauseAfter: 3000, critical: false },
            { text: 'Mantenga la presión firme durante al menos diez minutos. No afloje para ver si dejó de sangrar. Llame al nueve once si no ha parado.', pauseAfter: 4000, critical: true }
        ],
        requiresMetronome: false,
        bpm: null
    },
    breathing: {
        id: 'breathing',
        title: 'No puede respirar',
        description: 'Sofoco, asma grave, reacción alérgica, ahogo',
        introText: 'Vamos a ayudar a que respire mejor. Siga mis instrucciones al pie de la letra.',
        steps: [
            { text: 'Si la persona está consciente, siéntela en una silla o en el suelo, pero con el torso derecho, nunca acostada boca arriba. Esto facilita la respiración.', pauseAfter: 4000, critical: false },
            { text: 'Busque rápidamente si tiene un inhalador para el asma. Si lo tiene y está consciente, ayúdele a usarlo. Dos inhalaciones, una cada minuto.', pauseAfter: 4000, critical: true },
            { text: 'Afloje cualquier ropa ajustada. Abra botones de la camisa, afloje la corbata, el cinturón o cualquier cosa que apriete el pecho o cuello.', pauseAfter: 3000, critical: false },
            { text: 'Si tiene aire acondicionado o ventilador, póngalo cerca pero no directamente en la cara. El aire fresco ayuda.', pauseAfter: 2500, critical: false },
            { text: 'Si los labios se ponen azulados o morados, o si no puede hablar de lo afligido que está, llame al nueve once ahora mismo. Eso es una emergencia grave.', pauseAfter: 4000, critical: true },
            { text: 'Mantenga la calma usted también. El pánico contagia. Hable con voz suave y tranquila. Dígale que todo va a estar bien.', pauseAfter: 3000, critical: false }
        ],
        requiresMetronome: false,
        bpm: null
    },
    fall: {
        id: 'fall',
        title: 'Se cayó y no se mueve',
        description: 'Accidente, golpe fuerte, posible fractura',
        introText: 'En caídas fuertes, lo más importante es no mover al lesionado. Le explico por qué y qué hacer.',
        steps: [
            { text: 'No mueva a la persona de donde está, especialmente si cayó de una altura, se golpeó la cabeza o se queja de cuello o espalda. Podría empeorar una lesión grave.', pauseAfter: 4000, critical: true },
            { text: 'Si está consciente, hablele calmadamente. Pregúntele su nombre, qué día es hoy y dónde estamos. Esto evalúa si hay daño cerebral.', pauseAfter: 4000, critical: false },
            { text: 'Si se queja de dolor en cuello o espalda, dígale que no mueva la cabeza ni intente levantarse. Inmovilice su cabeza con sus manos si es necesario.', pauseAfter: 4000, critical: true },
            { text: 'Si está sangrando de la cabeza, presione suavemente con un paño limpio, pero no mueva el cuello. Mantenga la cabeza en la posición que está.', pauseAfter: 4000, critical: true },
            { text: 'Llame al nueve once. Diga: caída fuerte, posible lesión de columna. Necesito que vengan con tabla rígida para inmovilizar.', pauseAfter: 4000, critical: true },
            { text: 'Mientras llega ayuda, mantenga a la persona abrigada si hace frío, pero no la mueva. Hablele para que no se duerma si golpeó la cabeza.', pauseAfter: 3000, critical: false }
        ],
        requiresMetronome: false,
        bpm: null
    },
    poison: {
        id: 'poison',
        title: 'Se intoxicó o picó',
        description: 'Comió algo malo, picadura de insecto, quemadura',
        introText: 'Depende de la causa, pero hay reglas generales que aplican. Escuche atentamente.',
        steps: [
            { text: 'Si comió o bebió algo extraño, no le dé agua, leche ni medicinas para hacerlo vomitar. Eso puede empeorar según qué haya ingerido.', pauseAfter: 4000, critical: true },
            { text: 'Si fue picado por insecto y ve hinchazón en cara o cuello, o tiene dificultad para tragar o respirar, es una alergia grave. Llame nueve once urgente.', pauseAfter: 4000, critical: true },
            { text: 'Si fue alacrán o araña venenosa, mantenga la zona afectada inmóvil y elevada. No aplaste ni succione el veneno. Llame al nueve once.', pauseAfter: 4000, critical: true },
            { text: 'En caso de quemadura, enfríe la zona con agua corriente fría por diez minutos. No use hielo directo ni mantequilla ni pasta de dientes.', pauseAfter: 4000, critical: false },
            { text: 'Si los ojos se ven afectados, lávelos con agua limpia por quince minutos. Mantenga los párpados abiertos con los dedos mientras lava.', pauseAfter: 4000, critical: false },
            { text: 'En todos los casos, si la persona vomita, acuéstela de lado para que no se atragante. No le dé nada por la boca si está muy somnoliento.', pauseAfter: 4000, critical: true }
        ],
        requiresMetronome: false,
        bpm: null
    },
    other: {
        id: 'other',
        title: 'Otra emergencia grave',
        description: 'Dolor extremo, convulsiones, situación no listada',
        introText: 'Emergencia médica no especificada. Siga estos pasos generales de seguridad.',
        steps: [
            { text: 'Mantenga la calma. Evalúe si la persona está consciente y respira. Si no respira, elija la opción de desmayo en el menú anterior.', pauseAfter: 3000, critical: false },
            { text: 'Si está teniendo convulsiones, aleje objetos peligrosos pero no sujete los movimientos. No meta nada en su boca. Ponga algo suave bajo su cabeza.', pauseAfter: 4000, critical: true },
            { text: 'Llame al nueve once y describa exactamente lo que ve: qué le pasó, cuánto tiempo hace, cómo está ahora. Sea específico.', pauseAfter: 4000, critical: true },
            { text: 'Si tiene dolor intenso en el pecho que irradia al brazo o mandíbula, puede ser un infarto. Síntele tranquilo y llame urgente.', pauseAfter: 4000, critical: true },
            { text: 'No administre medicamentos ajenos ni agua si está inconsciente. Espere a los profesionales si no sabe exactamente qué hacer.', pauseAfter: 3000, critical: true }
        ],
        requiresMetronome: false,
        bpm: null
    }
};

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    loadUserProfile();
    initApp();
    wsService.connect();
});

function initApp() {
    setTimeout(() => {
        hideScreen('screen-splash');
        showScreen('screen-home');
        updateProfileUI();
    }, 2500);
    
    initBloodTypeButtons();
}

// ============================================
// NAVEGACIÓN
// ============================================

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.add('active');
        AppState.currentScreen = screenId;
        target.scrollTop = 0;
    }
}

function hideScreen(screenId) {
    const screen = document.getElementById(screenId);
    if (screen) screen.classList.remove('active');
}

// ============================================
// FLUJO PRINCIPAL
// ============================================

function selectEmergencyType() {
    showScreen('screen-emergency-types');
}

function selectReportType() {
    showScreen('screen-report');
}

function backHome() {
    stopSpeech();
    stopMetronome();
    clearInterval(AppState.elapsedTimeInterval);
    showScreen('screen-home');
}

function backToTypes() {
    stopSpeech();
    showScreen('screen-emergency-types');
}

function showGuideOrEmergency(type) {
    AppState.currentEmergencyType = type;
    const modal = document.getElementById('modal-confirm-emergency');
    const desc = document.getElementById('confirm-description');
    const guide = EMERGENCY_GUIDES[type];
    
    if (desc && guide) desc.textContent = guide.description;
    if (modal) modal.classList.remove('hidden');
}

function closeConfirmModal() {
    document.getElementById('modal-confirm-emergency')?.classList.add('hidden');
}

// ============================================
// CENTRO DE COMANDO - INTEGRACIÓN WEBSOCKET
// ============================================

function getEmergencyTypeName(type) {
    const types = {
        'heart': 'Paro Cardíaco/RCP',
        'bleeding': 'Sangrado Grave',
        'breathing': 'Dificultad Respiratoria',
        'fall': 'Caída/Trauma',
        'poison': 'Intoxicación',
        'other': 'Otra Emergencia'
    };
    return types[type] || 'Emergencia';
}

// Botón nuevo: Abrir modal Centro de Comando
function openCommandCenterModal() {
    const modal = document.getElementById('modal-command-center');
    if (AppState.userProfile) {
        document.getElementById('cc-patient-name').value = AppState.userProfile.name || '';
        document.getElementById('cc-patient-age').value = AppState.userProfile.age || '';
        document.getElementById('cc-patient-phone').value = AppState.userProfile.contactPhone || '';
    }
    if (modal) modal.classList.remove('hidden');
}

function closeCommandCenterModal() {
    document.getElementById('modal-command-center')?.classList.add('hidden');
}

// Enviar desde el modal del Centro de Comando
async function sendToCommandCenterFromModal() {
    const name = document.getElementById('cc-patient-name')?.value;
    const age = document.getElementById('cc-patient-age')?.value;
    const phone = document.getElementById('cc-patient-phone')?.value;
    const description = document.getElementById('cc-description')?.value;
    const typeSelect = document.getElementById('cc-emergency-type')?.value;
    
    if (!name || !age || !phone || !description) {
        showToast('Complete todos los campos obligatorios');
        return;
    }
    
    const typeNames = {
        'cardiac': 'Paro Cardíaco/RCP',
        'bleeding': 'Sangrado Grave',
        'breathing': 'Dificultad Respiratoria',
        'fall': 'Caída/Trauma',
        'poison': 'Intoxicación',
        'other': 'Otra Emergencia'
    };
    
    const patientData = {
        patientName: name,
        age: parseInt(age),
        typeId: typeSelect,
        typeName: typeNames[typeSelect] || 'Emergencia',
        phone: phone,
        description: description,
        forOther: false
    };
    
    closeCommandCenterModal();
    await sendToCommandCenter(patientData);
}

// Función principal de envío (UNIFICADA - reemplaza las duplicadas)
async function sendToCommandCenter(patientData) {
    showLoading('Obteniendo ubicación GPS...');
    
    try {
        let location = { lat: 0, lng: 0 };
        try {
            const pos = await getCurrentPosition();
            location = { lat: pos.lat, lng: pos.lng };
        } catch(e) {
            console.warn('GPS no disponible, usando fallback');
        }
        
        const payload = {
            type: "EMERGENCY_REPORT",
            payload: {
                patientName: patientData.patientName,
                age: patientData.age,
                typeId: patientData.typeId || 'general',
                typeName: patientData.typeName,
                phone: patientData.phone,
                description: patientData.description,
                lat: location.lat,
                lng: location.lng,
                timestamp: new Date().toISOString(),
                isRCP: patientData.typeId === 'cardiac',
                emergencyLevel: "critical",
                reportedBy: "app_movil_rcp"
            }
        };
        
        setupAmbulanceListener();
        
        showLoading('Enviando emergencia...');
        const sent = wsService.send(payload);
        
        if (!sent) {
            hideLoading();
            showToast('Guardado offline. Se enviará al reconectar.');
            return;
        }
        
        hideLoading();
        showScreen('screen-active-emergency');
        const caseEl = document.getElementById('active-case-number');
        if (caseEl) caseEl.textContent = 'PENDIENTE';
        showToast('Emergencia enviada. Esperando asignación...');
        
    } catch (error) {
        hideLoading();
        console.error('Error:', error);
        showToast('Error de conexión');
    }
}

function setupAmbulanceListener() {
    wsService.listeners.delete('ambulanceAssigned');
    wsService.listeners.delete('init');
    
    wsService.on('ambulanceAssigned', (data) => {
        hideLoading();
        const amb = data.ambulance || {};
        const caseEl = document.getElementById('active-case-number');
        const ambId = document.getElementById('ambulance-id');
        const eta = document.getElementById('eta-time');
        const dist = document.getElementById('eta-distance');
        
        if (caseEl) caseEl.textContent = data.code || 'ASIGNADO';
        if (ambId) ambId.textContent = amb.id || 'AMB-001';
        if (eta) eta.textContent = `${amb.eta || 8} min`;
        if (dist) dist.textContent = `${amb.distance || 2.5} km`;
        
        showToast(`¡Unidad ${amb.id || 'AMB-001'} asignada!`);
        
        if (AppState.currentEmergencyType === 'heart') {
            setTimeout(() => {
                loadGuide('heart');
                showScreen('screen-guide');
            }, 2000);
        }
    });
    
    wsService.on('init', (data) => {
        if (data.data?.status === 'queued') {
            showToast('Emergencia en cola. Esperando unidad...');
        }
    });
}

// Función para el botón "Sí, soy yo" (versión corregida y única)
async function confirmUseProfile() {
    if (!AppState.userProfile) {
        showToast('No hay perfil guardado');
        return;
    }
    
    const patientData = {
        patientName: AppState.userProfile.name || 'No identificado',
        age: parseInt(AppState.userProfile.age) || 0,
        typeId: 'cardiac',
        typeName: getEmergencyTypeName(AppState.currentEmergencyType),
        phone: AppState.userProfile.contactPhone || 'No proporcionado',
        description: `Emergencia tipo: ${getEmergencyTypeName(AppState.currentEmergencyType)}`,
        forOther: false
    };
    
    await sendToCommandCenter(patientData);
}

function selectOtherPerson() {
    showScreen('screen-describe-other');
}

function editBeforeSend() {
    showScreen('screen-medical-form');
    const title = document.getElementById('medical-form-title');
    if (title) title.textContent = 'Editar Ficha Médica';
}

function backFromDescribe() {
    if (AppState.hasProfile) {
        showScreen('screen-quick-profile');
    } else {
        showScreen('screen-emergency-types');
    }
}

// ============================================
// GUÍAS Y VOZ
// ============================================

function loadGuide(type) {
    const guide = EMERGENCY_GUIDES[type];
    if (!guide) return;
    
    const titleEl = document.getElementById('guide-title');
    const subtitleEl = document.getElementById('guide-subtitle');
    const stepsContainer = document.getElementById('steps-list');
    
    if (titleEl) titleEl.textContent = guide.title;
    if (subtitleEl) subtitleEl.textContent = guide.description;
    
    if (stepsContainer) {
        stepsContainer.innerHTML = guide.steps.map((step, index) => `
            <div class="step-card" id="step-${index}">
                <h4>Paso ${index + 1} ${step.critical ? '⚠️' : ''}</h4>
                <p>${step.text}</p>
            </div>
        `).join('');
    }
    
    const metronomeOverlay = document.getElementById('metronome-overlay');
    if (guide.requiresMetronome && metronomeOverlay) {
        metronomeOverlay.classList.remove('hidden');
    } else if (metronomeOverlay) {
        metronomeOverlay.classList.add('hidden');
    }
    
    if (AppState.voiceEnabled) {
        setTimeout(() => {
            speakText(guide.introText, () => {
                playGuideSteps(guide.steps, 0);
            });
        }, CONFIG.INTRO_DELAY);
    }
    
    startElapsedTimer();
}

function playGuideSteps(steps, index) {
    if (index >= steps.length || AppState.currentScreen !== 'screen-guide') return;
    const step = steps[index];
    
    document.querySelectorAll('.step-card').forEach((el, i) => {
        el.style.opacity = i === index ? '1' : '0.5';
        el.style.transform = i === index ? 'scale(1.02)' : 'scale(1)';
    });
    
    const currentStep = document.getElementById(`step-${index}`);
    if (currentStep) currentStep.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    speakText(step.text, () => {
        setTimeout(() => playGuideSteps(steps, index + 1), step.pauseAfter || CONFIG.PAUSE_BETWEEN_STEPS);
    });
}

function replayInstructions() {
    if (AppState.currentEmergencyType) {
        const guide = EMERGENCY_GUIDES[AppState.currentEmergencyType];
        playGuideSteps(guide.steps, 0);
    }
}

async function speakText(text, onComplete) {
    if (!AppState.voiceEnabled) {
        if (onComplete) onComplete();
        return;
    }
    
    AppState.isSpeaking = true;
    showVoiceIndicator(true);
    
    try {
        await speakWithElevenLabs(text, onComplete);
    } catch (error) {
        speakWithWebSpeech(text, onComplete);
    }
}

async function speakWithElevenLabs(text, onComplete) {
    try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${CONFIG.ELEVENLABS_VOICE_ID}/stream`, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': CONFIG.ELEVENLABS_API_KEY
            },
            body: JSON.stringify({
                text: text,
                model_id: CONFIG.ELEVENLABS_MODEL,
                voice_settings: CONFIG.VOICE_SETTINGS
            })
        });
        
        if (!response.ok) throw new Error('Error ElevenLabs');
        
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
            AppState.isSpeaking = false;
            showVoiceIndicator(false);
            URL.revokeObjectURL(audioUrl);
            if (onComplete) onComplete();
        };
        
        await audio.play();
        
    } catch (error) {
        throw error;
    }
}

function speakWithWebSpeech(text, onComplete) {
    if (!('speechSynthesis' in window)) {
        AppState.isSpeaking = false;
        if (onComplete) onComplete();
        return;
    }
    
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-MX';
    utterance.rate = 0.88;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find(v => 
        v.name.includes('Google español') || 
        v.lang === 'es-MX' || 
        v.lang === 'es-ES'
    );
    
    if (spanishVoice) utterance.voice = spanishVoice;
    
    utterance.onend = () => {
        AppState.isSpeaking = false;
        showVoiceIndicator(false);
        if (onComplete) onComplete();
    };
    
    window.speechSynthesis.speak(utterance);
}

function stopSpeech() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    AppState.isSpeaking = false;
    showVoiceIndicator(false);
}

function showVoiceIndicator(show) {
    const indicator = document.getElementById('voice-indicator');
    const replayBtn = document.getElementById('btn-replay-instructions');
    
    if (indicator) {
        if (show) indicator.classList.remove('hidden');
        else indicator.classList.add('hidden');
    }
    if (replayBtn) {
        if (show) replayBtn.classList.add('hidden');
        else replayBtn.classList.remove('hidden');
    }
}

// ============================================
// METRÓNOMO Y TIMER
// ============================================

function toggleMetronome() {
    const btn = document.getElementById('btn-toggle-metronome');
    const circle = document.getElementById('metronome-circle');
    
    if (AppState.metronomeInterval) {
        clearInterval(AppState.metronomeInterval);
        AppState.metronomeInterval = null;
        if (btn) btn.innerHTML = '<i class="fas fa-play"></i><span>Iniciar compresiones</span>';
        if (circle) circle.classList.remove('beating');
    } else {
        AppState.compressionCount = 0;
        if (circle) circle.classList.add('beating');
        
        AppState.metronomeInterval = setInterval(() => {
            AppState.compressionCount++;
            if (AppState.compressionCount > 30) AppState.compressionCount = 1;
            const countEl = document.getElementById('compression-number');
            if (countEl) countEl.textContent = AppState.compressionCount;
            playClickSound();
        }, 545);
        
        if (btn) btn.innerHTML = '<i class="fas fa-pause"></i><span>Detener</span>';
    }
}

function playClickSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.1;
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.05);
    } catch (e) {}
}

function stopMetronome() {
    if (AppState.metronomeInterval) {
        clearInterval(AppState.metronomeInterval);
        AppState.metronomeInterval = null;
    }
}

function startElapsedTimer() {
    let seconds = 0;
    const timerEl = document.getElementById('elapsed-time');
    const panel = document.getElementById('timer-panel');
    
    if (panel) panel.classList.remove('hidden');
    
    AppState.elapsedTimeInterval = setInterval(() => {
        seconds++;
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        if (timerEl) timerEl.textContent = `${mins}:${secs}`;
    }, 1000);
}

// ============================================
// ACCIONES
// ============================================

function call911() {
    window.location.href = 'tel:911';
    showToast('Llamando al 911...');
}

function call911Direct() {
    window.location.href = 'tel:911';
}

function shareLocation() {
    if (!navigator.geolocation) {
        showToast('Geolocalización no disponible');
        return;
    }
    
    showLoading('Obteniendo ubicación...');
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            hideLoading();
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
            
            if (navigator.share) {
                navigator.share({
                    title: 'Mi ubicación - Emergencia',
                    text: 'Necesito ayuda médica urgente:',
                    url: mapsUrl
                });
            } else {
                window.open(mapsUrl, '_blank');
            }
        },
        (error) => {
            hideLoading();
            showToast('No se pudo obtener ubicación');
        },
        CONFIG.GEO_OPTIONS
    );
}

function markAsResolved() {
    document.getElementById('modal-resolve')?.classList.remove('hidden');
}

function saveResolution() {
    const outcome = document.getElementById('resolve-outcome')?.value;
    const notes = document.getElementById('resolve-notes')?.value;
    
    if (!outcome) {
        showToast('Seleccione un resultado');
        return;
    }
    
    const emergency = {
        type: AppState.currentEmergencyType,
        title: EMERGENCY_GUIDES[AppState.currentEmergencyType]?.title || 'Emergencia',
        date: new Date().toISOString(),
        outcome: outcome,
        notes: notes,
        duration: document.getElementById('elapsed-time')?.textContent || '00:00'
    };
    
    let history = JSON.parse(localStorage.getItem('emergency_history') || '[]');
    history.unshift(emergency);
    localStorage.setItem('emergency_history', JSON.stringify(history));
    
    closeModal('modal-resolve');
    showToast('Emergencia guardada');
    backHome();
}

// ============================================
// FORMULARIO MÉDICO
// ============================================

function showMedicalProfile() {
    const title = document.getElementById('medical-form-title');
    const skipBtn = document.getElementById('btn-skip-medical');
    
    if (title) title.textContent = 'Mi Ficha Médica';
    if (skipBtn) skipBtn.style.display = 'block';
    
    showScreen('screen-medical-form');
    loadMedicalForm();
}

function editMedicalProfile() {
    showMedicalProfile();
}

function loadMedicalForm() {
    const profile = JSON.parse(localStorage.getItem('medical_profile'));
    if (!profile) return;
    
    document.getElementById('med-name').value = profile.name || '';
    document.getElementById('med-age').value = profile.age || '';
    document.getElementById('med-gender').value = profile.gender || '';
    document.getElementById('med-blood').value = profile.bloodType || '';
    document.getElementById('med-allergies').value = profile.allergies || '';
    document.getElementById('med-medications').value = profile.medications || '';
    document.getElementById('med-contact-name').value = profile.contactName || '';
    document.getElementById('med-contact-phone').value = profile.contactPhone || '';
    document.getElementById('med-insurance').value = profile.insurance || '';
    document.getElementById('med-policy').value = profile.policyNumber || '';
    
    document.querySelectorAll('.blood-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.value === profile.bloodType);
    });
    
    document.querySelectorAll('.condition-item input').forEach(cb => {
        cb.checked = profile.conditions?.includes(cb.value) || false;
    });
}

function initBloodTypeButtons() {
    document.querySelectorAll('.blood-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.blood-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            document.getElementById('med-blood').value = btn.dataset.value;
        });
    });
}

function saveMedicalData() {
    const profile = {
        name: document.getElementById('med-name').value,
        age: document.getElementById('med-age').value,
        gender: document.getElementById('med-gender').value,
        bloodType: document.getElementById('med-blood').value,
        allergies: document.getElementById('med-allergies').value,
        medications: document.getElementById('med-medications').value,
        conditions: Array.from(document.querySelectorAll('.condition-item input:checked')).map(cb => cb.value),
        contactName: document.getElementById('med-contact-name').value,
        contactPhone: document.getElementById('med-contact-phone').value,
        insurance: document.getElementById('med-insurance').value,
        policyNumber: document.getElementById('med-policy').value,
        updatedAt: new Date().toISOString()
    };
    
    if (!profile.name || !profile.age || !profile.bloodType) {
        showToast('Complete los campos obligatorios');
        return;
    }
    
    localStorage.setItem('medical_profile', JSON.stringify(profile));
    AppState.userProfile = profile;
    AppState.hasProfile = true;
    
    showToast('Ficha médica guardada');
    backHome();
}

function skipMedicalForm() {
    backHome();
}

function loadUserProfile() {
    const profile = JSON.parse(localStorage.getItem('medical_profile'));
    if (profile) {
        AppState.userProfile = profile;
        AppState.hasProfile = true;
    }
}

function updateProfileUI() {
    const widget = document.getElementById('profile-widget');
    const prompt = document.getElementById('profile-prompt');
    const countBadge = document.getElementById('history-count');
    
    if (AppState.hasProfile && widget) {
        widget.classList.remove('hidden');
        if (prompt) prompt.style.display = 'none';
        const nameEl = document.getElementById('widget-user-name');
        if (nameEl) nameEl.textContent = AppState.userProfile.name;
    } else if (prompt) {
        prompt.style.display = 'block';
        if (widget) widget.classList.add('hidden');
    }
    
    const history = JSON.parse(localStorage.getItem('emergency_history') || '[]');
    if (countBadge) countBadge.textContent = history.length;
}

// ============================================
// HOSPITALES
// ============================================

function showHospitalsNearby() {
    showScreen('screen-hospitals');
    initHospitalsMap();
}

function initHospitalsMap() {
    const statusEl = document.getElementById('location-status');
    
    if (!navigator.geolocation) {
        if (statusEl) statusEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> Geolocalización no soportada';
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            const mapUrl = `https://www.google.com/maps/embed?pb=!1m16!1m12!1m3!1d15000!2d${longitude}!3d${latitude}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!2m1!1shospital!5e0!3m2!1ses!2smx!4v1`;
            
            const mapContainer = document.getElementById('hospitals-map');
            if (mapContainer) {
                mapContainer.innerHTML = `<iframe width="100%" height="100%" frameborder="0" style="border:0" src="${mapUrl}" allowfullscreen></iframe>`;
            }
            
            if (statusEl) statusEl.innerHTML = '<i class="fas fa-check-circle"></i> Ubicación encontrada';
            generateHospitalsList(latitude, longitude);
        },
        (error) => {
            if (statusEl) statusEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> Active el GPS';
        }
    );
}

function generateHospitalsList(lat, lng) {
    const list = document.getElementById('hospitals-list');
    if (!list) return;
    
    const hospitals = [
        { name: 'Hospital General', distance: '1.2 km', time: '5 min', phone: '5551234567' },
        { name: 'Hospital de Emergencias', distance: '2.5 km', time: '8 min', phone: '5559876543' },
        { name: 'Centro Médico', distance: '3.1 km', time: '12 min', phone: '5554567890' }
    ];
    
    list.innerHTML = hospitals.map(h => `
        <div class="hospital-item">
            <h4>${h.name}</h4>
            <p>${h.distance} • ${h.time}</p>
            <div class="meta">
                <button onclick="window.location.href='tel:${h.phone}'"><i class="fas fa-phone"></i> Llamar</button>
                <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(h.name)}', '_blank')"><i class="fas fa-directions"></i> Cómo llegar</button>
            </div>
        </div>
    `).join('');
}

function refreshHospitals() {
    initHospitalsMap();
}

function backFromHospitals() {
    showScreen('screen-home');
}

// ============================================
// HISTORIAL
// ============================================

function showHistory() {
    showScreen('screen-history');
    loadHistory();
}

function loadHistory() {
    const history = JSON.parse(localStorage.getItem('emergency_history') || '[]');
    const list = document.getElementById('history-list');
    const empty = document.getElementById('history-empty');
    const statsTotal = document.getElementById('total-emergencies');
    const statsResolved = document.getElementById('resolved-emergencies');
    
    if (statsTotal) statsTotal.textContent = history.length;
    if (statsResolved) statsResolved.textContent = history.filter(h => h.outcome === 'resolved').length;
    
    if (history.length === 0) {
        if (list) list.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
    }
    
    if (empty) empty.style.display = 'none';
    
    if (list) {
        list.innerHTML = history.map(item => `
            <div class="history-item" onclick="showHistoryDetail('${item.date}')">
                <div class="header">
                    <span class="type">${item.title}</span>
                    <span class="date">${new Date(item.date).toLocaleDateString()}</span>
                </div>
                <div class="code">${new Date(item.date).toLocaleTimeString()}</div>
                <div class="details">${item.notes || 'Sin notas'}</div>
                <span class="outcome ${item.outcome || 'resolved'}">${getOutcomeText(item.outcome)}</span>
            </div>
        `).join('');
    }
}

function getOutcomeText(outcome) {
    const texts = { 'resolved': 'Resuelto', 'hospital': 'Hospitalizado', 'false': 'Falsa alarma', 'other': 'Otro' };
    return texts[outcome] || outcome;
}

function showHistoryDetail(date) {
    const history = JSON.parse(localStorage.getItem('emergency_history') || '[]');
    const item = history.find(h => h.date === date);
    if (item) showToast('Duración: ' + item.duration);
}

function shareHistoryItem() {
    showToast('Compartiendo...');
}

function filterHistory() {
    showToast('Filtros próximamente');
}

// ============================================
// REPORTES
// ============================================

function submitReport() {
    const report = {
        what: document.getElementById('report-what')?.value,
        when: document.getElementById('report-when')?.value,
        where: document.getElementById('report-where')?.value,
        who: document.getElementById('report-who')?.value,
        details: document.getElementById('report-details')?.value,
        actions: document.getElementById('report-actions')?.value,
        date: new Date().toISOString()
    };
    
    if (!report.what) {
        showToast('Describa qué pasó');
        return;
    }
    
    let reports = JSON.parse(localStorage.getItem('reports') || '[]');
    reports.push(report);
    localStorage.setItem('reports', JSON.stringify(reports));
    showToast('Reporte enviado');
    backHome();
}

// ============================================
// PRIMEROS AUXILIOS
// ============================================

function showFirstAidGuide() {
    showScreen('screen-first-aid');
}

function searchFirstAid(query) {
    const topics = document.querySelectorAll('.aid-topic');
    const lowerQuery = query.toLowerCase();
    topics.forEach(topic => {
        topic.style.display = topic.textContent.toLowerCase().includes(lowerQuery) ? 'flex' : 'none';
    });
}

function showAidDetail(topic) {
    AppState.isPracticeMode = true;
    const topicToType = { 'cuts': 'bleeding', 'burns': 'poison', 'fractures': 'fall', 'choking': 'breathing', 'cpr': 'heart', 'bleeding': 'bleeding' };
    if (topicToType[topic]) {
        AppState.currentEmergencyType = topicToType[topic];
        loadGuide(topicToType[topic]);
        showScreen('screen-guide');
    }
}

// ============================================
// CENTRO DE COMANDO (Emulado - funciones antiguas)
// ============================================

function startEmergencyProtocol(useProfile) {
    setTimeout(() => {
        showScreen('screen-active-emergency');
        const caseNumber = Math.floor(100000 + Math.random() * 900000);
        const caseEl = document.getElementById('active-case-number');
        if (caseEl) caseEl.textContent = caseNumber;
        simulateAmbulanceProgress();
    }, 2000);
}

function simulateAmbulanceProgress() {
    const bar = document.getElementById('ambulance-progress-bar');
    const etaEl = document.getElementById('eta-time');
    let progress = 0;
    
    const interval = setInterval(() => {
        progress += 2;
        if (bar) bar.style.width = progress + '%';
        if (progress >= 100) {
            clearInterval(interval);
            if (etaEl) {
                etaEl.textContent = 'Llegó';
                etaEl.style.color = '#6EE7B7';
            }
        }
    }, 1000);
}

function showCommandDetails() {
    showToast('Detalles del caso');
}

function speakPatientStatus() {
    if (AppState.userProfile) {
        const text = `Paciente: ${AppState.userProfile.name}, ${AppState.userProfile.age} años, tipo ${AppState.userProfile.bloodType}`;
        speakText(text);
    }
}

function shareLocationCommand() {
    shareLocation();
}

function resolveCase() {
    markAsResolved();
}

function togglePatientPanel() {
    const content = document.getElementById('patient-panel-content');
    if (content) content.style.display = content.style.display === 'none' ? 'block' : 'none';
}

function updateQuickProfile() {
    if (!AppState.userProfile) return;
    const nameEl = document.getElementById('quick-profile-name');
    const detailsEl = document.getElementById('quick-profile-details');
    const conditionsEl = document.getElementById('quick-profile-conditions');
    
    if (nameEl) nameEl.textContent = AppState.userProfile.name || 'Usuario';
    if (detailsEl) detailsEl.textContent = `${AppState.userProfile.age || '--'} años • Tipo ${AppState.userProfile.bloodType || '--'}`;
    if (conditionsEl && AppState.userProfile.conditions) {
        conditionsEl.innerHTML = AppState.userProfile.conditions.map(c => `<span class="condition-tag">${c}</span>`).join('');
    }
}

function sendEmergencyOther() {
    const description = document.getElementById('other-description')?.value;
    if (!description) {
        showToast('Describa al paciente');
        return;
    }
    
    AppState.currentEmergency = {
        forOther: true,
        description: description,
        age: document.getElementById('other-age')?.value,
        conscious: document.getElementById('other-conscious')?.value,
        alerts: document.getElementById('other-alerts')?.value
    };
    
    loadGuide(AppState.currentEmergencyType);
    showScreen('screen-guide');
    startEmergencyProtocol(false);
}

function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('No soportado'));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => reject(err),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });
}

function showOnlyGuide() {
    closeConfirmModal();
    AppState.isPracticeMode = true;
    loadGuide(AppState.currentEmergencyType);
    showScreen('screen-guide');
}

// ============================================
// UTILIDADES
// ============================================

function toggleSettings() {
    document.getElementById('modal-settings')?.classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId)?.classList.add('hidden');
}

function clearAllData() {
    if (confirm('¿Está seguro?')) {
        localStorage.clear();
        AppState.userProfile = null;
        AppState.hasProfile = false;
        location.reload();
    }
}
