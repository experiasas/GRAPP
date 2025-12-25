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
