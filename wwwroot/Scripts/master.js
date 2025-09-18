/* master.js
   Funcionalidades globales para el sistema SWGROI */

// Funcionalidad para tarjetas expandibles - solo una abierta a la vez
document.addEventListener('DOMContentLoaded', function() {
    
    // Gestión de tarjetas expandibles
    const tarjetas = document.querySelectorAll('.tarjeta-dashboard');
    
    tarjetas.forEach(tarjeta => {
        const header = tarjeta.querySelector('.tarjeta-header');
        if (header) {
            header.addEventListener('click', function() {
                // Cerrar todas las demás tarjetas
                tarjetas.forEach(otraTarjeta => {
                    if (otraTarjeta !== tarjeta) {
                        otraTarjeta.classList.remove('is-open');
                    }
                });
                
                // Alternar la tarjeta actual
                tarjeta.classList.toggle('is-open');
            });
        }
    });

    // Funcionalidad para modales
    setupModals();
    
    // Validación de formularios
    setupFormValidation();
    
    // Funcionalidad para toasts
    setupToasts();
});

// Configuración de modales
function setupModals() {
    const modals = document.querySelectorAll('.modal-overlay');
    
    modals.forEach(modal => {
        // Cerrar modal al hacer clic en el overlay
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal(modal);
            }
        });
        
        // Cerrar modal con botón de cerrar
        const closeBtn = modal.querySelector('.modal-close, .btn-cancelar');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                closeModal(modal);
            });
        }
    });
}

// Abrir modal
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('is-visible');
        document.body.style.overflow = 'hidden';
    }
}

// Cerrar modal
function closeModal(modal) {
    if (typeof modal === 'string') {
        modal = document.getElementById(modal);
    }
    if (modal) {
        modal.classList.remove('is-visible');
        document.body.style.overflow = '';
        
        // Limpiar formularios dentro del modal
        const forms = modal.querySelectorAll('form');
        forms.forEach(form => form.reset());
    }
}

// Configuración de validación de formularios
function setupFormValidation() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        const inputs = form.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            // Validación en tiempo real
            input.addEventListener('blur', function() {
                validateField(input);
            });
            
            input.addEventListener('input', function() {
                // Limpiar mensaje de error mientras el usuario escribe
                clearFieldError(input);
            });
        });
        
        // Validación al enviar formulario
        form.addEventListener('submit', function(e) {
            let isValid = true;
            
            inputs.forEach(input => {
                if (!validateField(input)) {
                    isValid = false;
                }
            });
            
            if (!isValid) {
                e.preventDefault();
                showToast('Por favor corrige los errores en el formulario', 'error');
            }
        });
    });
}

// Validar campo individual
function validateField(field) {
    const value = field.value.trim();
    const type = field.type;
    const required = field.hasAttribute('required');
    const minLength = field.getAttribute('minlength');
    const maxLength = field.getAttribute('maxlength');
    
    let isValid = true;
    let message = '';
    
    // Validar campo requerido
    if (required && !value) {
        isValid = false;
        message = 'Este campo es requerido';
    }
    
    // Validar longitud mínima
    else if (minLength && value.length < minLength) {
        isValid = false;
        message = `Mínimo ${minLength} caracteres`;
    }
    
    // Validar longitud máxima
    else if (maxLength && value.length > maxLength) {
        isValid = false;
        message = `Máximo ${maxLength} caracteres`;
    }
    
    // Validar email
    else if (type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            isValid = false;
            message = 'Email inválido';
        }
    }
    
    // Validar número
    else if (type === 'number' && value) {
        const min = field.getAttribute('min');
        const max = field.getAttribute('max');
        const numValue = parseFloat(value);
        
        if (isNaN(numValue)) {
            isValid = false;
            message = 'Debe ser un número válido';
        } else if (min && numValue < parseFloat(min)) {
            isValid = false;
            message = `Mínimo ${min}`;
        } else if (max && numValue > parseFloat(max)) {
            isValid = false;
            message = `Máximo ${max}`;
        }
    }
    
    // Mostrar/limpiar error
    if (isValid) {
        clearFieldError(field);
    } else {
        showFieldError(field, message);
    }
    
    return isValid;
}

// Mostrar error en campo
function showFieldError(field, message) {
    const feedback = field.parentNode.nextElementSibling;
    if (feedback && feedback.classList.contains('field-feedback')) {
        feedback.textContent = message;
        feedback.classList.add('error');
    }
    field.classList.add('error');
}

// Limpiar error en campo
function clearFieldError(field) {
    const feedback = field.parentNode.nextElementSibling;
    if (feedback && feedback.classList.contains('field-feedback')) {
        feedback.textContent = '';
        feedback.classList.remove('error');
    }
    field.classList.remove('error');
}

// Sistema de toasts/notificaciones
function setupToasts() {
    // Los toasts se crean dinámicamente cuando se necesitan
}

// Mostrar toast
function showToast(message, type = 'success', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type} toast--show`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Auto-remover el toast
    setTimeout(() => {
        toast.classList.remove('toast--show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
}

// Función para limpiar formularios
function limpiarFormulario(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.reset();
        
        // Limpiar mensajes de error
        const feedbacks = form.querySelectorAll('.field-feedback');
        feedbacks.forEach(feedback => {
            feedback.textContent = '';
            feedback.classList.remove('error');
        });
        
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.classList.remove('error');
        });
    }
}

// Funciones de utilidad para confirmar acciones
function confirmarAccion(mensaje, callback) {
    if (confirm(mensaje)) {
        callback();
    }
}

// Función para formatear números como moneda
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(amount);
}

// Función para formatear fechas
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// Exportar funciones globales
window.openModal = openModal;
window.closeModal = closeModal;
window.showToast = showToast;
window.limpiarFormulario = limpiarFormulario;
window.confirmarAccion = confirmarAccion;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;