import { apiClient } from '@/lib/api';

export interface WizardEstado {
    id: number;
    estado: 'BORRADOR' | 'RADICADA';
    step1_ok: boolean;
    step2_ok: boolean;
    anexos_ok: boolean;
    contrato?: number | null;
    contrato_numero?: string | null;
    contrato_detalle?: {
        id: number;
        numero: string;
        objeto?: string;
        fecha_inicio?: string;
        fecha_fin?: string;
    } | null;
    datos_generales: {
        contrato: string;
        numero: string;
        periodo: string;
        concepto: string;
        observaciones?: string;
    };
    datos_financieros: {
        valor_base: number;
        iva_valor: number;
        admon: number;
        imprevistos: number;
        utilidad: number;
        valor_total: number; // Read only
    };
    anexos_count: number;
}

export interface Anexo {
    id: number;
    archivo: string; // URL
    nombre_archivo: string;
    tipo: {
        id: number;
        nombre: string;
        obligatorio: boolean;
        codigo: string;
    };
    fecha_subida: string;
}

export interface TipoAnexo {
    id: number;
    nombre: string;
    obligatorio: boolean;
    codigo: string;
    descripcion?: string;
}

export const wizardApi = {
    // 1. Crear borrador (o recuperar si ya existe backend side logic?) - The prompt says create with token via POST
    createBorrador: async (token: string) => {
        const { data } = await apiClient.post('/api/cuentas-cobro/wizard/', { token });
        return data; // Should return { wizardId: number, ... }
    },

    // 2. Obtener estado completo
    getEstado: async (id: number) => {
        const { data } = await apiClient.get<WizardEstado>(`/api/cuentas-cobro/${id}/wizard/`);
        return data;
    },

    // 3. Step 1: Datos Generales
    updateStep1: async (id: number, data: Partial<WizardEstado['datos_generales']>) => {
        const { data: response } = await apiClient.patch(
            `/api/cuentas-cobro/${id}/wizard/`,
            data,
            { params: { step: 1 } }
        );
        return response;
    },

    // 4. Step 2: Detalle Financiero
    updateStep2: async (id: number, data: Partial<WizardEstado['datos_financieros']>) => {
        const { data: response } = await apiClient.patch(
            `/api/cuentas-cobro/${id}/wizard/`,
            data,
            { params: { step: 2 } }
        );
        return response;
    },

    // 5. Listar anexos
    listAnexos: async (id: number) => {
        const { data } = await apiClient.get<Anexo[]>(`/api/cuentas-cobro/${id}/anexos/`);
        return data;
    },

    // 6. Subir anexo
    uploadAnexo: async (id: number, tipoAnexoId: number, file: File) => {
        const formData = new FormData();
        formData.append('archivo', file);
        formData.append('tipo_anexo_id', tipoAnexoId.toString());

        const { data } = await apiClient.post(
            `/api/cuentas-cobro/${id}/anexos/`,
            formData,
            {
                headers: { 'Content-Type': 'multipart/form-data' }
            }
        );
        return data;
    },

    // 7. Eliminar anexo
    deleteAnexo: async (id: number, anexoId: number) => {
        await apiClient.delete(`/api/cuentas-cobro/${id}/anexos/${anexoId}/`);
    },

    // 8. Radicar (Submit final)
    submit: async (id: number) => {
        const { data } = await apiClient.post(`/api/cuentas-cobro/${id}/submit/`);
        return data;
    },

    // 9. Catálogo de tipos de anexo
    getTiposAnexo: async () => {
        const { data } = await apiClient.get<TipoAnexo[]>('/api/tipos-anexo/');
        return data;
    }
};
