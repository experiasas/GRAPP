import axios, { AxiosError } from 'axios';

export const apiClient = axios.create({
    baseURL: 'http://127.0.0.1:8000',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Interceptor para manejar errores
apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        if (error.response?.status === 404) {
            // Token inválido o expirado
            throw new Error('Enlace inválido o expirado');
        }

        if (error.response?.status === 400 && error.response.data) {
            // Errores de validación de campos
            throw error.response.data;
        }

        throw new Error('Error al procesar la solicitud');
    }
);

// API para vinculación
export const vinculacionAPI = {
    getInvitacion: async (token: string) => {
        const { data } = await apiClient.get(`/api/vinculacion/${token}/`);
        return data;
    },

    submitTercero: async (token: string, datos: any) => {
        const { data } = await apiClient.post(`/api/vinculacion/${token}/`, datos);
        return data;
    },

    uploadDocumento: async (terceroId: number, tipoCode: string, file: File) => {
        const formData = new FormData();
        formData.append('archivo', file);
        const { data } = await apiClient.post(
            `/api/terceros/${terceroId}/documentos/${tipoCode}/upload`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return data;
    },

    bulkUploadDocumentos: async (terceroId: number, files: Record<string, File>) => {
        const formData = new FormData();
        Object.entries(files).forEach(([tipoCode, file]) => {
            formData.append(tipoCode, file);
        });
        const { data } = await apiClient.post(
            `/api/terceros/${terceroId}/documentos/bulk-upload`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return data;
    },

    // Parallel upload utility with concurrency limit
    uploadDocumentosParallel: async (
        terceroId: number,
        files: Record<string, File>,
        concurrency: number = 3,
        onProgress?: (code: string, status: 'uploading' | 'success' | 'error') => void
    ) => {
        const entries = Object.entries(files);
        const results: Record<string, any> = {};

        // Process in chunks for parallel upload with limit
        for (let i = 0; i < entries.length; i += concurrency) {
            const chunk = entries.slice(i, i + concurrency);
            await Promise.all(
                chunk.map(async ([code, file]) => {
                    try {
                        onProgress?.(code, 'uploading');
                        results[code] = await vinculacionAPI.uploadDocumento(terceroId, code, file);
                        onProgress?.(code, 'success');
                    } catch (error) {
                        results[code] = { error };
                        onProgress?.(code, 'error');
                    }
                })
            );
        }

        return results;
    },
};

// ========================================
// API para perfil de terceros (Wizard)
// ========================================
export const terceroAPI = {
    // Status de completitud
    getStatus: async (terceroId: number) => {
        const { data } = await apiClient.get(`/api/terceros/${terceroId}/status/`);
        return data;
    },

    // CRUD Estudios
    estudios: {
        list: async (terceroId: number) => {
            const { data } = await apiClient.get(`/api/terceros/${terceroId}/estudios/`);
            return data;
        },
        create: async (terceroId: number, estudio: any) => {
            const { data } = await apiClient.post(`/api/terceros/${terceroId}/estudios/`, estudio);
            return data;
        },
        update: async (terceroId: number, estudioId: number, estudio: any) => {
            const { data } = await apiClient.put(
                `/api/terceros/${terceroId}/estudios/${estudioId}/`,
                estudio
            );
            return data;
        },
        delete: async (terceroId: number, estudioId: number) => {
            await apiClient.delete(`/api/terceros/${terceroId}/estudios/${estudioId}/`);
        },
    },

    // CRUD Cursos
    cursos: {
        list: async (terceroId: number) => {
            const { data } = await apiClient.get(`/api/terceros/${terceroId}/cursos/`);
            return data;
        },
        create: async (terceroId: number, curso: any) => {
            const { data } = await apiClient.post(`/api/terceros/${terceroId}/cursos/`, curso);
            return data;
        },
        update: async (terceroId: number, cursoId: number, curso: any) => {
            const { data } = await apiClient.put(
                `/api/terceros/${terceroId}/cursos/${cursoId}/`,
                curso
            );
            return data;
        },
        delete: async (terceroId: number, cursoId: number) => {
            await apiClient.delete(`/api/terceros/${terceroId}/cursos/${cursoId}/`);
        },
    },

    // CRUD Certificaciones
    certificaciones: {
        list: async (terceroId: number) => {
            const { data } = await apiClient.get(`/api/terceros/${terceroId}/certificaciones/`);
            return data;
        },
        create: async (terceroId: number, certificacion: any) => {
            const { data } = await apiClient.post(
                `/api/terceros/${terceroId}/certificaciones/`,
                certificacion
            );
            return data;
        },
        update: async (terceroId: number, certificacionId: number, certificacion: any) => {
            const { data } = await apiClient.put(
                `/api/terceros/${terceroId}/certificaciones/${certificacionId}/`,
                certificacion
            );
            return data;
        },
        delete: async (terceroId: number, certificacionId: number) => {
            await apiClient.delete(
                `/api/terceros/${terceroId}/certificaciones/${certificacionId}/`
            );
        },
    },

    // CRUD Experiencias
    experiencias: {
        list: async (terceroId: number) => {
            const { data } = await apiClient.get(`/api/terceros/${terceroId}/experiencias/`);
            return data;
        },
        create: async (terceroId: number, experiencia: any) => {
            const { data } = await apiClient.post(
                `/api/terceros/${terceroId}/experiencias/`,
                experiencia
            );
            return data;
        },
        update: async (terceroId: number, experienciaId: number, experiencia: any) => {
            const { data } = await apiClient.put(
                `/api/terceros/${terceroId}/experiencias/${experienciaId}/`,
                experiencia
            );
            return data;
        },
        delete: async (terceroId: number, experienciaId: number) => {
            await apiClient.delete(
                `/api/terceros/${terceroId}/experiencias/${experienciaId}/`
            );
        },
    },

    // CRUD Idiomas
    idiomas: {
        list: async (terceroId: number) => {
            const { data } = await apiClient.get(`/api/terceros/${terceroId}/idiomas/`);
            return data;
        },
        create: async (terceroId: number, idioma: any) => {
            const { data } = await apiClient.post(`/api/terceros/${terceroId}/idiomas/`, idioma);
            return data;
        },
        update: async (terceroId: number, idiomaId: number, idioma: any) => {
            const { data } = await apiClient.put(
                `/api/terceros/${terceroId}/idiomas/${idiomaId}/`,
                idioma
            );
            return data;
        },
        delete: async (terceroId: number, idiomaId: number) => {
            await apiClient.delete(`/api/terceros/${terceroId}/idiomas/${idiomaId}/`);
        },
    },

    // Seguridad Social (singleton)
    seguridadSocial: {
        get: async (terceroId: number) => {
            const { data } = await apiClient.get(
                `/api/terceros/${terceroId}/seguridad-social/`
            );
            return data;
        },
        save: async (terceroId: number, datos: any) => {
            const { data } = await apiClient.put(
                `/api/terceros/${terceroId}/seguridad-social/`,
                datos
            );
            return data;
        },
    },

    // Catálogo de idiomas disponibles
    getIdiomasCatalog: async () => {
        const { data } = await apiClient.get('/api/idiomas/');
        return data;
    },
};

// API para radicación
export const radicacionAPI = {
    getInvitacion: async (token: string) => {
        const { data } = await apiClient.get(`/api/radicacion/${token}/`);
        return data;
    },

    submitCuenta: async (token: string, formData: FormData) => {
        const { data } = await apiClient.post(`/api/radicacion/${token}/`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return data;
    },
};
