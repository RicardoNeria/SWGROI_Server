/**
 * RETROALIMENTACION-VALIDATOR.JS - Validador Central
 * Módulo de Retroalimentación CCC - SWGROI
 * Centraliza toda la validación del lado del cliente con integración Toast
 */

(function(window) {
    'use strict';

    // ================================
    // CONFIGURACIÓN DE VALIDACIÓN
    // ================================
    
    const VALIDATION_RULES = {
        // Preguntas obligatorias (1-4)
        REQUIRED_QUESTIONS: [1, 2, 3, 4],
        
        // Longitudes de texto
    MIN_COMMENT_LENGTH: 1,  // Los comentarios ahora son obligatorios (al menos 1 carácter)
        MAX_COMMENT_LENGTH: 1000,
        
        // Patrones de validación
        PATTERNS: {
            // Valores válidos para preguntas de escala
            SCALE_VALUES: /^[1-5]$/,
            // Caracteres no permitidos en comentarios
            FORBIDDEN_CHARS: /<script|javascript:|on\w+=/i
        },
        
        // Mensajes de error personalizados
        MESSAGES: {
            REQUIRED: 'Esta pregunta es obligatoria',
            INVALID_SCALE: 'Debe seleccionar una opción válida (1-5)',
            COMMENT_TOO_LONG: 'El comentario no puede exceder {max} caracteres',
            FORBIDDEN_CONTENT: 'El comentario contiene contenido no permitido',
            FORM_INCOMPLETE: 'Es necesario contestar las 5 preguntas antes de enviar',
            COMMENT_REQUIRED: 'Esta pregunta es obligatoria'
        }
    };

    // ================================
    // CLASE PRINCIPAL DEL VALIDADOR
    // ================================
    
    class RetroalimentacionValidator {
        constructor() {
            this.errors = new Map();
            this.lastValidationResult = null;
        }

        /**
         * Valida el formulario completo de retroalimentación
         * @param {HTMLFormElement|HTMLElement} form - Formulario o contenedor de preguntas
         * @returns {boolean} - true si es válido, false si hay errores
         */
        validarFormularioRetro(form) {
            this.clearErrors();
            
            if (!form) {
                this.showValidationError('No se encontró el formulario');
                return false;
            }

            let isValid = true;

            // Validar preguntas obligatorias (1-4)
            for (const questionNum of VALIDATION_RULES.REQUIRED_QUESTIONS) {
                if (!this.validateQuestion(form, questionNum)) {
                    isValid = false;
                }
            }

            // Validar pregunta opcional de comentarios (5)
            if (!this.validateCommentQuestion(form, 5)) {
                isValid = false;
            }

            // Mostrar resultado global si hay errores
            if (!isValid) {
                this.showGlobalValidationError();
            }

            this.lastValidationResult = isValid;
            return isValid;
        }

        /**
         * Valida una pregunta individual de escala (1-4)
         */
        validateQuestion(form, questionNum) {
            const radios = form.querySelectorAll(`input[name="r${questionNum}"]:checked`);
            
            if (radios.length === 0) {
                const error = VALIDATION_RULES.MESSAGES.REQUIRED;
                this.addError(`r${questionNum}`, error);
                this.showFieldError(questionNum, error);
                return false;
            }

            const value = radios[0].value;
            if (!VALIDATION_RULES.PATTERNS.SCALE_VALUES.test(value)) {
                const error = VALIDATION_RULES.MESSAGES.INVALID_SCALE;
                this.addError(`r${questionNum}`, error);
                this.showFieldError(questionNum, error);
                return false;
            }

            return true;
        }

        /**
         * Valida la pregunta de comentarios (5)
         */
        validateCommentQuestion(form, questionNum) {
            const textarea = form.querySelector(`textarea[name="r${questionNum}"]`);
            
            if (!textarea) {
                // Si no existe el textarea, consideramos inválido porque las 5 preguntas son obligatorias
                return false;
            }

            const value = textarea.value.trim();
            
            // Los comentarios ahora son obligatorios (pregunta 5)
            if (value.length < VALIDATION_RULES.MIN_COMMENT_LENGTH) {
                const error = VALIDATION_RULES.MESSAGES.COMMENT_REQUIRED || VALIDATION_RULES.MESSAGES.REQUIRED;
                this.addError(`r${questionNum}`, error);
                this.showFieldError(questionNum, error);
                return false;
            }

            // Validar longitud máxima
            if (value.length > VALIDATION_RULES.MAX_COMMENT_LENGTH) {
                const error = VALIDATION_RULES.MESSAGES.COMMENT_TOO_LONG
                    .replace('{max}', VALIDATION_RULES.MAX_COMMENT_LENGTH);
                this.addError(`r${questionNum}`, error);
                this.showFieldError(questionNum, error);
                return false;
            }

            // Validar contenido prohibido
            if (VALIDATION_RULES.PATTERNS.FORBIDDEN_CHARS.test(value)) {
                const error = VALIDATION_RULES.MESSAGES.FORBIDDEN_CONTENT;
                this.addError(`r${questionNum}`, error);
                this.showFieldError(questionNum, error);
                return false;
            }

            return true;
        }

        /**
         * Validación en tiempo real de un campo
         */
        validateField(fieldName, value) {
            const questionNum = this.extractQuestionNumber(fieldName);
            if (!questionNum) return true;

            // Limpiar errores previos del campo
            this.clearFieldError(questionNum);

            if (questionNum <= 4) {
                // Pregunta de escala
                if (!value || !VALIDATION_RULES.PATTERNS.SCALE_VALUES.test(value)) {
                    return false; // No mostrar error hasta envío para UX mejor
                }
            } else {
                // Pregunta de comentarios
                if (value && value.length > VALIDATION_RULES.MAX_COMMENT_LENGTH) {
                    const error = VALIDATION_RULES.MESSAGES.COMMENT_TOO_LONG
                        .replace('{max}', VALIDATION_RULES.MAX_COMMENT_LENGTH);
                    this.showFieldError(questionNum, error);
                    return false;
                }

                if (value && VALIDATION_RULES.PATTERNS.FORBIDDEN_CHARS.test(value)) {
                    this.showFieldError(questionNum, VALIDATION_RULES.MESSAGES.FORBIDDEN_CONTENT);
                    return false;
                }
            }

            return true;
        }

        // ================================
        // GESTIÓN DE ERRORES
        // ================================
        
        addError(fieldName, message) {
            this.errors.set(fieldName, message);
        }

        clearErrors() {
            this.errors.clear();
        }

        getErrors() {
            return new Map(this.errors);
        }

        hasErrors() {
            return this.errors.size > 0;
        }

        // ================================
        // VISUALIZACIÓN DE ERRORES
        // ================================
        
        showFieldError(questionNum, message) {
            // Usar el sistema Toast para mostrar errores
            if (window.RetroToast) {
                window.RetroToast.error(message, {
                    title: `Pregunta ${questionNum}`,
                    duration: 4000
                });
            } else if (typeof window.showRetroToast === 'function') {
                window.showRetroToast(`Pregunta ${questionNum}: ${message}`, 'error', { duration: 4000 });
            }

            // También marcar visualmente el campo si es posible
            this.markFieldAsInvalid(questionNum);
        }

        showGlobalValidationError() {
            const errorCount = this.errors.size;
            let message = VALIDATION_RULES.MESSAGES.FORM_INCOMPLETE;
            
            if (errorCount > 1) {
                message += ` (${errorCount} errores encontrados)`;
            }

            if (window.RetroToast) {
                window.RetroToast.error(message, {
                    title: 'Formulario incompleto',
                    duration: 5000
                });
            } else if (typeof window.showRetroToast === 'function') {
                window.showRetroToast(message, 'error', { duration: 5000 });
            }

            // Intentar enfocar la primera pregunta con error
            try {
                const firstErrorKey = this.errors.keys().next();
                if (firstErrorKey && !firstErrorKey.done) {
                    const fieldName = firstErrorKey.value;
                    const form = document.getElementById('formRespuestas') || document;
                    const field = form.querySelector(`input[name="${fieldName}"]:not(:checked), textarea[name="${fieldName}"]`);
                    if (field) {
                        field.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        field.focus({ preventScroll: true });
                    }
                }
            } catch (e) { /* ignore focus errors */ }
        }

        showValidationError(message) {
            if (window.RetroToast) {
                window.RetroToast.error(message, {
                    title: 'Error de validación',
                    duration: 4000
                });
            } else if (typeof window.showRetroToast === 'function') {
                window.showRetroToast(message, 'error', { duration: 4000 });
            }
        }

        clearFieldError(questionNum) {
            // Remover marcas visuales de error
            try {
                const form = document.getElementById('formRespuestas') || 
                           document.getElementById('preguntasContainer') ||
                           document;
                
                const field = form.querySelector(`input[name="r${questionNum}"], textarea[name="r${questionNum}"]`);
                if (!field) return;

                const group = field.closest('.retro-pregunta');
                if (!group) return;

                // Remover clases de error
                const radios = group.querySelectorAll('.retro-escala__radio');
                radios.forEach(radio => radio.classList.remove('retro-escala__radio--error'));

                const textarea = group.querySelector('textarea');
                if (textarea) {
                    textarea.classList.remove('ui-form__input--error', 'ui-form__textarea--error');
                }

                // Remover mensajes de error inline
                const errorMessages = group.querySelectorAll('.ui-form__feedback');
                errorMessages.forEach(msg => msg.remove());
                
            } catch (e) {
                // Fallar silenciosamente
            }
        }

        markFieldAsInvalid(questionNum) {
            try {
                const form = document.getElementById('formRespuestas') || 
                           document.getElementById('preguntasContainer') ||
                           document;
                
                const field = form.querySelector(`input[name="r${questionNum}"], textarea[name="r${questionNum}"]`);
                if (!field) return;

                const group = field.closest('.retro-pregunta');
                if (!group) return;

                if (questionNum <= 4) {
                    // Marcar radio buttons como error
                    const radios = group.querySelectorAll('.retro-escala__radio');
                    radios.forEach(radio => radio.classList.add('retro-escala__radio--error'));
                } else {
                    // Marcar textarea como error
                    const textarea = group.querySelector('textarea');
                    if (textarea) {
                        textarea.classList.add('ui-form__input--error', 'ui-form__textarea--error');
                    }
                }
                
            } catch (e) {
                // Fallar silenciosamente
            }
        }

        // ================================
        // UTILIDADES
        // ================================
        
        extractQuestionNumber(fieldName) {
            const match = fieldName.match(/^r(\d+)$/);
            return match ? parseInt(match[1], 10) : null;
        }

        /**
         * Obtiene estadísticas de validación
         */
        getValidationStats() {
            return {
                hasErrors: this.hasErrors(),
                errorCount: this.errors.size,
                lastResult: this.lastValidationResult,
                errors: Object.fromEntries(this.errors)
            };
        }

        /**
         * Configura reglas de validación personalizadas
         */
        setCustomRules(rules) {
            Object.assign(VALIDATION_RULES, rules);
        }
    }

    // ================================
    // INSTANCIA GLOBAL Y API
    // ================================
    
    // Crear instancia global
    const validator = new RetroalimentacionValidator();

    // Exportar API pública
    window.RetroalimentacionValidator = {
        // Método principal
        validarFormularioRetro: (form) => validator.validarFormularioRetro(form),
        
        // Validación de campos individuales
        validateField: (fieldName, value) => validator.validateField(fieldName, value),
        
        // Gestión de errores
        getErrors: () => validator.getErrors(),
        clearErrors: () => validator.clearErrors(),
        hasErrors: () => validator.hasErrors(),
        
        // Estadísticas
        getStats: () => validator.getValidationStats(),
        
        // Configuración
        setCustomRules: (rules) => validator.setCustomRules(rules),
        
        // Acceso a instancia completa para casos avanzados
        getInstance: () => validator
    };

    // ================================
    // INTEGRACIÓN CON SISTEMA EXISTENTE
    // ================================
    
    // Integrar con SWGROI si existe
    if (window.SWGROI && window.SWGROI.UI) {
        window.SWGROI.UI.RetroalimentacionValidator = window.RetroalimentacionValidator;
    }

    // Auto-configuración cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupAutoValidation);
    } else {
        setupAutoValidation();
    }

    /**
     * Configura validación automática en el formulario
     */
    function setupAutoValidation() {
        try {
            const form = document.getElementById('formRespuestas');
            if (!form) return;

            // Validación en tiempo real para campos
            const fields = form.querySelectorAll('input[name^="r"], textarea[name^="r"]');
            fields.forEach(field => {
                field.addEventListener('input', (e) => {
                    validator.validateField(e.target.name, e.target.value);
                });
                
                field.addEventListener('change', (e) => {
                    validator.validateField(e.target.name, e.target.value);
                });
            });
            
        } catch (e) {
            console.warn('Error configurando validación automática:', e);
        }
    }

})(window);