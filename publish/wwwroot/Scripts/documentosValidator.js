/**
 * DOCUMENTOS-VALIDATOR.JS - Validador Centralizado
 * Módulo de Documentos CCC - SWGROI
 * Sistema de validación integrado con notificaciones Toast
 */

(function(window) {
    'use strict';

    // ================================
    // CONFIGURACIÓN Y CONSTANTES
    // ================================
    
    const VALIDATION_RULES = {
        FILE_TYPES: {
            ALLOWED: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.jpg', '.jpeg', '.png'],
            MAX_SIZE: 10 * 1024 * 1024, // 10MB
            DESCRIPTION: 'PDF, Word, Excel, PowerPoint, Texto o Imagen'
        },
        TEXT_LIMITS: {
            NOMBRE_MIN: 3,
            NOMBRE_MAX: 100,
            DESCRIPCION_MAX: 500,
            CATEGORIA_MIN: 1
        },
        PATTERNS: {
            NOMBRE_ARCHIVO: /^[a-zA-Z0-9\s\-_\.áéíóúÁÉÍÓÚñÑ]+$/,
            DESCRIPCION: /^[a-zA-Z0-9\s\-_\.\,\;áéíóúÁÉÍÓÚñÑ]*$/
        }
    };

    const MESSAGES = {
        FILE_REQUIRED: 'Debe seleccionar un archivo para subir',
        FILE_TYPE_INVALID: `Tipo de archivo no permitido. Solo se aceptan: ${VALIDATION_RULES.FILE_TYPES.DESCRIPTION}`,
        FILE_SIZE_EXCEEDED: `El archivo es demasiado grande. Tamaño máximo: ${Math.round(VALIDATION_RULES.FILE_TYPES.MAX_SIZE / 1024 / 1024)}MB`,
        NOMBRE_REQUIRED: 'El nombre del documento es obligatorio',
        NOMBRE_TOO_SHORT: `El nombre debe tener al menos ${VALIDATION_RULES.TEXT_LIMITS.NOMBRE_MIN} caracteres`,
        NOMBRE_TOO_LONG: `El nombre no puede exceder ${VALIDATION_RULES.TEXT_LIMITS.NOMBRE_MAX} caracteres`,
        NOMBRE_INVALID_CHARS: 'El nombre contiene caracteres no permitidos',
        CATEGORIA_REQUIRED: 'Debe seleccionar una categoría',
        DESCRIPCION_TOO_LONG: `La descripción no puede exceder ${VALIDATION_RULES.TEXT_LIMITS.DESCRIPCION_MAX} caracteres`,
        DESCRIPCION_INVALID_CHARS: 'La descripción contiene caracteres no permitidos',
        ID_DOCUMENTO_REQUIRED: 'ID de documento requerido para esta operación',
        ID_DOCUMENTO_INVALID: 'ID de documento inválido'
    };

    // ================================
    // OBJETO VALIDADOR PRINCIPAL
    // ================================
    
    const DocumentosValidator = {

        /**
         * Valida el formulario de subida de documentos
         * @param {FormData|HTMLFormElement} formData - Datos del formulario o elemento form
         * @returns {object} Resultado de validación
         */
        validarFormularioSubida: function(formData) {
            const result = {
                isValid: true,
                errors: [],
                warnings: []
            };

            let data;
            if (formData instanceof FormData) {
                data = this._extractFromFormData(formData);
            } else if (formData instanceof HTMLFormElement) {
                data = this._extractFromForm(formData);
            } else {
                data = formData; // Asumir que es un objeto
            }

            // Validar archivo
            const fileValidation = this._validateFile(data.file);
            if (!fileValidation.isValid) {
                result.isValid = false;
                result.errors.push(...fileValidation.errors);
            }

            // Validar nombre
            const nombreValidation = this._validateNombre(data.nombre);
            if (!nombreValidation.isValid) {
                result.isValid = false;
                result.errors.push(...nombreValidation.errors);
            }

            // Validar categoría
            const categoriaValidation = this._validateCategoria(data.categoria);
            if (!categoriaValidation.isValid) {
                result.isValid = false;
                result.errors.push(...categoriaValidation.errors);
            }

            // Validar descripción (opcional)
            if (data.descripcion) {
                const descripcionValidation = this._validateDescripcion(data.descripcion);
                if (!descripcionValidation.isValid) {
                    result.isValid = false;
                    result.errors.push(...descripcionValidation.errors);
                }
            }

            // Mostrar errores usando Toast
            if (!result.isValid) {
                this._showValidationErrors(result.errors);
            }

            return result;
        },

        /**
         * Valida operaciones de eliminación de documentos
         * @param {string|number} documentoId - ID del documento
         * @returns {object} Resultado de validación
         */
        validarEliminacion: function(documentoId) {
            const result = {
                isValid: true,
                errors: []
            };

            if (!documentoId) {
                result.isValid = false;
                result.errors.push(MESSAGES.ID_DOCUMENTO_REQUIRED);
            } else if (!this._isValidId(documentoId)) {
                result.isValid = false;
                result.errors.push(MESSAGES.ID_DOCUMENTO_INVALID);
            }

            if (!result.isValid) {
                this._showValidationErrors(result.errors);
            }

            return result;
        },

        /**
         * Valida operaciones de descarga de documentos
         * @param {string|number} documentoId - ID del documento
         * @returns {object} Resultado de validación
         */
        validarDescarga: function(documentoId) {
            return this.validarEliminacion(documentoId); // Misma validación
        },

        /**
         * Valida filtros de búsqueda
         * @param {object} filtros - Objeto con filtros de búsqueda
         * @returns {object} Resultado de validación
         */
        validarFiltros: function(filtros) {
            const result = {
                isValid: true,
                errors: [],
                warnings: []
            };

            if (filtros.nombre && filtros.nombre.length < 2) {
                result.warnings.push('El filtro de nombre es muy corto, use al menos 2 caracteres');
            }

            if (filtros.categoria && !this._isValidId(filtros.categoria)) {
                result.isValid = false;
                result.errors.push('Categoría de filtro inválida');
            }

            if (result.warnings.length > 0) {
                this._showValidationWarnings(result.warnings);
            }

            if (!result.isValid) {
                this._showValidationErrors(result.errors);
            }

            return result;
        },

        // ================================
        // MÉTODOS PRIVADOS DE VALIDACIÓN
        // ================================

        /**
         * Valida un archivo seleccionado
         * @private
         */
        _validateFile: function(file) {
            const result = { isValid: true, errors: [] };

            if (!file) {
                result.isValid = false;
                result.errors.push(MESSAGES.FILE_REQUIRED);
                return result;
            }

            // Validar tipo de archivo
            const fileName = file.name || '';
            const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
            
            if (!VALIDATION_RULES.FILE_TYPES.ALLOWED.includes(fileExtension)) {
                result.isValid = false;
                result.errors.push(MESSAGES.FILE_TYPE_INVALID);
            }

            // Validar tamaño
            if (file.size > VALIDATION_RULES.FILE_TYPES.MAX_SIZE) {
                result.isValid = false;
                result.errors.push(MESSAGES.FILE_SIZE_EXCEEDED);
            }

            return result;
        },

        /**
         * Valida el nombre del documento
         * @private
         */
        _validateNombre: function(nombre) {
            const result = { isValid: true, errors: [] };

            if (!nombre || typeof nombre !== 'string') {
                result.isValid = false;
                result.errors.push(MESSAGES.NOMBRE_REQUIRED);
                return result;
            }

            const nombreTrimmed = nombre.trim();

            if (nombreTrimmed.length < VALIDATION_RULES.TEXT_LIMITS.NOMBRE_MIN) {
                result.isValid = false;
                result.errors.push(MESSAGES.NOMBRE_TOO_SHORT);
            }

            if (nombreTrimmed.length > VALIDATION_RULES.TEXT_LIMITS.NOMBRE_MAX) {
                result.isValid = false;
                result.errors.push(MESSAGES.NOMBRE_TOO_LONG);
            }

            if (!VALIDATION_RULES.PATTERNS.NOMBRE_ARCHIVO.test(nombreTrimmed)) {
                result.isValid = false;
                result.errors.push(MESSAGES.NOMBRE_INVALID_CHARS);
            }

            return result;
        },

        /**
         * Valida la categoría seleccionada
         * @private
         */
        _validateCategoria: function(categoria) {
            const result = { isValid: true, errors: [] };

            if (!categoria || categoria === '' || categoria === '0') {
                result.isValid = false;
                result.errors.push(MESSAGES.CATEGORIA_REQUIRED);
            }

            return result;
        },

        /**
         * Valida la descripción opcional
         * @private
         */
        _validateDescripcion: function(descripcion) {
            const result = { isValid: true, errors: [] };

            if (descripcion && typeof descripcion === 'string') {
                if (descripcion.length > VALIDATION_RULES.TEXT_LIMITS.DESCRIPCION_MAX) {
                    result.isValid = false;
                    result.errors.push(MESSAGES.DESCRIPCION_TOO_LONG);
                }

                if (!VALIDATION_RULES.PATTERNS.DESCRIPCION.test(descripcion)) {
                    result.isValid = false;
                    result.errors.push(MESSAGES.DESCRIPCION_INVALID_CHARS);
                }
            }

            return result;
        },

        /**
         * Valida si un ID es válido
         * @private
         */
        _isValidId: function(id) {
            return id && (typeof id === 'number' || /^\d+$/.test(id));
        },

        /**
         * Extrae datos de FormData
         * @private
         */
        _extractFromFormData: function(formData) {
            return {
                file: formData.get('archivo'),
                nombre: formData.get('titulo') || formData.get('nombreDocumento') || '',
                categoria: formData.get('categoria_id') || formData.get('categoria') || '',
                descripcion: formData.get('descripcion') || ''
            };
        },

        /**
         * Extrae datos de un formulario HTML
         * @private
         */
        _extractFromForm: function(form) {
            const fileInput = form.querySelector('input[type="file"]');
            const nombreInput = form.querySelector('input[name="titulo"], input[name="nombreDocumento"], #tituloDocumento, #nombreDocumento');
            const categoriaSelect = form.querySelector('select[name="categoria_id"], select[name="categoria"], #categoriaDocumento, #categoria');
            const descripcionInput = form.querySelector('textarea[name="descripcion"], #descripcionDocumento, #descripcion');

            return {
                file: fileInput ? fileInput.files[0] : null,
                nombre: nombreInput ? nombreInput.value : '',
                categoria: categoriaSelect ? categoriaSelect.value : '',
                descripcion: descripcionInput ? descripcionInput.value : ''
            };
        },

        /**
         * Muestra errores de validación usando Toast
         * @private
         */
        _showValidationErrors: function(errors) {
            errors.forEach((error, index) => {
                setTimeout(() => {
                    if (window.showDocsToast) {
                        window.showDocsToast(error, 'error', {
                            title: 'Error de Validación',
                            duration: 6000,
                            closable: true
                        });
                    } else {
                        console.error('[DocumentosValidator] showDocsToast no disponible:', error);
                    }
                }, index * 300); // Escalonar los errores
            });
        },

        /**
         * Muestra advertencias de validación usando Toast
         * @private
         */
        _showValidationWarnings: function(warnings) {
            warnings.forEach((warning, index) => {
                setTimeout(() => {
                    if (window.showDocsToast) {
                        window.showDocsToast(warning, 'warning', {
                            title: 'Advertencia',
                            duration: 4000,
                            closable: true
                        });
                    }
                }, index * 200);
            });
        },

        /**
         * Valida un formulario en tiempo real (para eventos de input)
         * @param {HTMLElement} element - Elemento que cambió
         * @param {HTMLFormElement} form - Formulario contenedor
         */
        validarTiempoReal: function(element, form) {
            const fieldName = element.name || element.id;
            let isValid = true;

            switch (fieldName) {
                case 'titulo':
                case 'tituloDocumento':
                case 'nombreDocumento':
                    const nombreResult = this._validateNombre(element.value);
                    isValid = nombreResult.isValid;
                    break;

                case 'categoria_id':
                case 'categoriaDocumento':
                case 'categoria':
                    const categoriaResult = this._validateCategoria(element.value);
                    isValid = categoriaResult.isValid;
                    break;

                case 'archivo':
                    if (element.files && element.files[0]) {
                        const fileResult = this._validateFile(element.files[0]);
                        isValid = fileResult.isValid;
                    }
                    break;
            }

            // Aplicar estilos visuales
            this._applyFieldValidationStyle(element, isValid);
            
            return isValid;
        },

        /**
         * Aplica estilos de validación a un campo
         * @private
         */
        _applyFieldValidationStyle: function(element, isValid) {
            element.classList.remove('field-valid', 'field-invalid');
            
            if (element.value.trim() !== '') {
                element.classList.add(isValid ? 'field-valid' : 'field-invalid');
            }
        }
    };

    // ================================
    // EXPORTAR API PÚBLICA
    // ================================
    
    window.DocumentosValidator = DocumentosValidator;

    // CSS para estilos de validación
    if (!document.querySelector('.docs-validation-styles')) {
        const style = document.createElement('style');
        style.className = 'docs-validation-styles';
        style.textContent = `
            .field-valid {
                border-color: #10b981 !important;
                box-shadow: 0 0 0 1px rgba(16, 185, 129, 0.2) !important;
            }
            
            .field-invalid {
                border-color: #ef4444 !important;
                box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.2) !important;
            }
            
            .field-valid:focus,
            .field-invalid:focus {
                outline: none !important;
                box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
            }
        `;
        document.head.appendChild(style);
    }

    console.log('[DocumentosValidator] Validador centralizado del módulo de documentos inicializado');

})(window);