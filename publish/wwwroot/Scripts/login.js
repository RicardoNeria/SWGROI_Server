/**
 * SWGROI - Sistema de Login Simplificado
 * JavaScript básico para manejo de autenticación
 */

// Variables globales
let loginAttempts = 0;
const maxAttempts = 5;
let isSubmitting = false;
let currentCaptcha = { num1: 0, num2: 0, answer: 0 };

// Inicialización cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    initializeLogin();
    setupEventListeners();
    generateCaptcha();
});

/**
 * Alternar visibilidad de contraseña con iconos SVG del sistema
 */
function togglePassword() {
    const contrasenaInput = document.getElementById('contrasena');
    const toggleIcon = document.getElementById('passwordToggleIcon');
    if (!contrasenaInput || !toggleIcon) return;
    const isHidden = contrasenaInput.type === 'password';
    contrasenaInput.type = isHidden ? 'text' : 'password';
    // Actualizar data-icon para que icon-loader inyecte el SVG correcto
    toggleIcon.setAttribute('data-icon', isHidden ? 'eye-open' : 'eye-closed');
}

/**
 * Inicializa el sistema de login
 */
function initializeLogin() {
    console.log('Login SWGROI inicializado');
    
    // Verificar si viene de logout
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('logout') === 'true') {
        mostrarMensaje('Sesión cerrada correctamente', 'success');
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Verificar intentos almacenados
    const storedAttempts = localStorage.getItem('loginAttempts');
    const lastAttemptTime = localStorage.getItem('lastAttemptTime');
    
    if (storedAttempts && lastAttemptTime) {
        const timeDiff = Date.now() - parseInt(lastAttemptTime);
        const lockoutTime = 15 * 60 * 1000; // 15 minutos
        
        if (timeDiff < lockoutTime) {
            loginAttempts = parseInt(storedAttempts);
            if (loginAttempts >= maxAttempts) {
                const remainingTime = Math.ceil((lockoutTime - timeDiff) / 1000 / 60);
                mostrarMensaje(`Cuenta bloqueada. Intenta en ${remainingTime} minutos`, 'error');
                bloquearFormulario(lockoutTime - timeDiff);
            }
        } else {
            localStorage.removeItem('loginAttempts');
            localStorage.removeItem('lastAttemptTime');
            loginAttempts = 0;
        }
    }
    
    // Focus en el primer campo
    document.getElementById('usuario').focus();
}

/**
 * Configura los event listeners
 */
function setupEventListeners() {
    const loginForm = document.getElementById('loginForm');
    const usuarioInput = document.getElementById('usuario');
    const contrasenaInput = document.getElementById('contrasena');
    const recordarCheckbox = document.getElementById('recordar');
    
    // Submit del formulario
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Validación básica
    if (usuarioInput) {
        usuarioInput.addEventListener('blur', () => validateField('usuario'));
        usuarioInput.addEventListener('input', () => clearFieldError('usuario'));
    }
    
    if (contrasenaInput) {
        contrasenaInput.addEventListener('blur', () => validateField('contrasena'));
        contrasenaInput.addEventListener('input', () => clearFieldError('contrasena'));
    }
    
    // Recordar usuario
    if (recordarCheckbox && usuarioInput) {
        const savedUser = localStorage.getItem('rememberedUser');
        if (savedUser) {
            usuarioInput.value = savedUser;
            recordarCheckbox.checked = true;
        }
        
        recordarCheckbox.addEventListener('change', function() {
            if (!this.checked) {
                localStorage.removeItem('rememberedUser');
            }
        });
    }
}

/**
 * Maneja el proceso de login
 */
async function handleLogin(event) {
    event.preventDefault();
    
    if (isSubmitting || loginAttempts >= maxAttempts) {
        return;
    }
    
    const form = event.target;
    const formData = new FormData(form);
    const usuario = formData.get('Usuario')?.trim();
    const contrasena = formData.get('Contrasena');
    const recordar = formData.get('recordar') === 'on';
    
    // Validar campos
    if (!validateForm(usuario, contrasena)) {
        return;
    }
    
    isSubmitting = true;
    mostrarCargando(true);
    actualizarBotonSubmit(true);

    // Timeout de seguridad para evitar spinner infinito
    const controller = new AbortController();
    const timeoutMs = 15000; // 15s
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                Usuario: usuario,
                Contrasena: contrasena
            }),
            credentials: 'same-origin',
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        let result;
        try {
            result = await response.json();
        } catch (_) {
            result = { exito: false };
        }
        
        if (result.exito) {
            // Login exitoso
            loginAttempts = 0;
            localStorage.removeItem('loginAttempts');
            localStorage.removeItem('lastAttemptTime');
            
            // Guardar usuario si está marcado recordar
            if (recordar) {
                localStorage.setItem('rememberedUser', usuario);
            } else {
                localStorage.removeItem('rememberedUser');
            }
            
            mostrarMensaje('¡Bienvenido! Redirigiendo...', 'success');
            
            // Redireccionar
            setTimeout(() => {
                window.location.href = '/menu.html';
            }, 1500);
            
        } else {
            // Login fallido
            handleLoginFailure();
        }
        
    } catch (error) {
        console.error('Error en login:', error);
        if (error.name === 'AbortError') {
            mostrarMensaje('Tiempo de espera agotado. Verifica tu conexión e inténtalo de nuevo.', 'warning');
        } else {
            mostrarMensaje('Error de conexión. Intenta nuevamente.', 'error');
        }
        handleLoginFailure();

    } finally {
        isSubmitting = false;
        mostrarCargando(false);
        actualizarBotonSubmit(false);
        clearTimeout(timeoutId);
    }
}

/**
 * Maneja los fallos de login
 */
function handleLoginFailure() {
    loginAttempts++;
    localStorage.setItem('loginAttempts', loginAttempts.toString());
    localStorage.setItem('lastAttemptTime', Date.now().toString());
    
    const remainingAttempts = maxAttempts - loginAttempts;
    
    if (remainingAttempts > 0) {
        mostrarMensaje(`Credenciales incorrectas. Te quedan ${remainingAttempts} intentos.`, 'error');
        
        // Efecto de error en la tarjeta
        const card = document.querySelector('.login-card');
        if (card) {
            card.classList.add('error');
            setTimeout(() => card.classList.remove('error'), 500);
        }
        
        // Limpiar contraseña
        const contrasenaInput = document.getElementById('contrasena');
        if (contrasenaInput) {
            contrasenaInput.value = '';
            contrasenaInput.focus();
        }
        
    } else {
        mostrarMensaje('Cuenta bloqueada por 15 minutos por seguridad.', 'error');
        bloquearFormulario(15 * 60 * 1000); // 15 minutos
    }
}

/**
 * Bloquea el formulario por un tiempo determinado
 */
function bloquearFormulario(tiempo) {
    const form = document.getElementById('loginForm');
    const inputs = form.querySelectorAll('input, button');
    
    inputs.forEach(input => input.disabled = true);
    
    let tiempoRestante = Math.ceil(tiempo / 1000);
    
    const actualizarContador = () => {
        const minutos = Math.floor(tiempoRestante / 60);
        const segundos = tiempoRestante % 60;
        const tiempoFormateado = `${minutos}:${segundos.toString().padStart(2, '0')}`;
        
        mostrarMensaje(`Formulario bloqueado. Tiempo restante: ${tiempoFormateado}`, 'warning');
        
        tiempoRestante--;
        
        if (tiempoRestante < 0) {
            inputs.forEach(input => input.disabled = false);
            loginAttempts = 0;
            localStorage.removeItem('loginAttempts');
            localStorage.removeItem('lastAttemptTime');
            mostrarMensaje('Formulario desbloqueado. Puedes intentar nuevamente.', 'info');
        } else {
            setTimeout(actualizarContador, 1000);
        }
    };
    
    actualizarContador();
}

/**
 * Valida el formulario completo
 */
function validateForm(usuario, contrasena) {
    let isValid = true;
    
    if (!usuario) {
        showFieldError('usuario', 'El usuario es requerido');
        isValid = false;
    } else if (usuario.length < 3) {
        showFieldError('usuario', 'El usuario debe tener al menos 3 caracteres');
        isValid = false;
    }
    
    if (!contrasena) {
        showFieldError('contrasena', 'La contraseña es requerida');
        isValid = false;
    } else if (contrasena.length < 4) {
        showFieldError('contrasena', 'La contraseña debe tener al menos 4 caracteres');
        isValid = false;
    }
    
    // Validar captcha
    if (!validateCaptcha()) {
        const captchaInput = document.getElementById('captchaAnswer');
        if (captchaInput) {
            captchaInput.classList.add('error');
            setTimeout(() => captchaInput.classList.remove('error'), 3000);
        }
        mostrarMensaje('🤖 Respuesta de seguridad incorrecta', 'error');
        generateCaptcha(); // Generar nuevo captcha
        isValid = false;
    }
    
    return isValid;
}

/**
 * Valida un campo específico
 */
function validateField(fieldName) {
    const field = document.getElementById(fieldName);
    if (!field) return;
    
    const value = field.value.trim();
    
    switch (fieldName) {
        case 'usuario':
            if (!value) {
                showFieldError(fieldName, 'El usuario es requerido');
            } else if (value.length < 3) {
                showFieldError(fieldName, 'Mínimo 3 caracteres');
            } else {
                clearFieldError(fieldName);
            }
            break;
            
        case 'contrasena':
            if (!value) {
                showFieldError(fieldName, 'La contraseña es requerida');
            } else if (value.length < 4) {
                showFieldError(fieldName, 'Mínimo 4 caracteres');
            } else {
                clearFieldError(fieldName);
            }
            break;
    }
}

/**
 * Muestra error en un campo usando el sistema unificado
 */
function showFieldError(fieldName, message) {
    // Usar el sistema unificado si está disponible
    if (window.SWGROI && window.SWGROI.UI) {
        const autoHide = (message === 'El usuario es requerido' || message === 'La contraseña es requerida') ? 4000 : 0;
        return window.SWGROI.UI.mostrarErrorCampo(fieldName, message, autoHide);
    }
    
    // Fallback para compatibilidad
    const field = document.getElementById(fieldName);
    const feedback = document.getElementById(`${fieldName}-help`);
    
    if (field) {
        field.classList.add('error');
    }
    
    if (feedback) {
        feedback.textContent = message;
        feedback.classList.add('show');
        
        // Auto-ocultar mensajes de validación después de 4 segundos
        if (message === 'El usuario es requerido' || message === 'La contraseña es requerida') {
            setTimeout(() => {
                clearFieldError(fieldName);
            }, 4000);
        }
    }
}

/**
 * Limpia el error de un campo usando el sistema unificado
 */
function clearFieldError(fieldName) {
    // Usar el sistema unificado si está disponible
    if (window.SWGROI && window.SWGROI.UI) {
        return window.SWGROI.UI.limpiarErrorCampo(fieldName);
    }
    
    // Fallback para compatibilidad
    const field = document.getElementById(fieldName);
    const feedback = document.getElementById(`${fieldName}-help`);
    
    if (field) {
        field.classList.remove('error');
    }
    
    if (feedback) {
        feedback.textContent = '';
        feedback.classList.remove('show');
    }
}

// Nota: función unificada arriba

/**
 * Genera un nuevo captcha de sumatoria
 */
function generateCaptcha() {
    currentCaptcha.num1 = Math.floor(Math.random() * 10) + 1;
    currentCaptcha.num2 = Math.floor(Math.random() * 10) + 1;
    currentCaptcha.answer = currentCaptcha.num1 + currentCaptcha.num2;
    
    const captchaEquation = document.getElementById('captchaEquation');
    if (captchaEquation) {
        captchaEquation.textContent = `${currentCaptcha.num1} + ${currentCaptcha.num2} = ?`;
    }
    
    // Limpiar respuesta anterior
    const captchaInput = document.getElementById('captchaAnswer');
    if (captchaInput) {
        captchaInput.value = '';
    }
}

/**
 * Valida el captcha
 */
function validateCaptcha() {
    const captchaInput = document.getElementById('captchaAnswer');
    if (!captchaInput) return false;
    
    const userAnswer = parseInt(captchaInput.value);
    return userAnswer === currentCaptcha.answer;
}

/**
 * Muestra el overlay de carga
 */
function mostrarCargando(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

/**
 * Actualiza el estado del botón submit
 */
function actualizarBotonSubmit(loading) {
    const btn = document.getElementById('btnLogin');
    if (!btn) return;
    
    if (loading) {
        btn.disabled = true;
        btn.classList.add('loading');
    } else {
        btn.disabled = false;
        btn.classList.remove('loading');
    }
}

/**
 * Muestra mensajes al usuario
 */
/**
 * Muestra un mensaje usando el sistema unificado SWGROI.UI
 */
function mostrarMensaje(texto, tipo = 'info') {
    // Usar el sistema unificado si está disponible
    if (window.SWGROI && window.SWGROI.UI) {
        // Apuntar al contenedor específico del login
        return window.SWGROI.UI.mostrarMensaje(texto, tipo, 'loginMessage');
    }
    
    // Fallback para compatibilidad mínima
    const cont = document.getElementById('loginMessage');
    if (!cont) return;
    const el = document.createElement('div');
    el.className = `ui-message ui-message--${tipo} ui-message--visible`;
    el.innerHTML = `<span class="ui-message__icon" aria-hidden="true"></span><span class="ui-message__text"></span>`;
    el.querySelector('.ui-message__text').textContent = texto;
    cont.innerHTML = '';
    cont.appendChild(el);
}