import { apiClient } from '@/lib/api';

export interface ReglasSegSocial {
    aplica: boolean;
    requiere_ss: boolean;
    acumulado_mensual: number;
    valor_actual?: number;
    total_proyectado?: number;
    umbral: number;
    salario_minimo?: number;
    porcentaje_umbral?: number;
    porcentaje_minimo_ibc: number;
}

export interface WizardEstado {
    id: number;
    estado: 'BORRADOR' | 'RADICADA' | 'EN_REVISION' | 'APROBADA' | 'RECHAZADA' | 'PAGADA';
    step1_ok: boolean;
    step2_ok: boolean;
    anexos_ok: boolean;
    tipo_documento: 'CUENTA_COBRO' | 'FACTURA';
    tipo_persona: 'NATURAL' | 'JURIDICA';
    empresa_nombre?: string;
    proveedor_nombre?: string;
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
        mes_servicio_date?: string | null;
    };
    datos_financieros: {
        valor_base: number;
        iva_porcentaje: number;
        iva_valor: number;
        admon: number;
        imprevistos: number;
        utilidad: number;
        valor_total: number;
        ibc_valor: number;
    };
    reglas_seguridad_social: ReglasSegSocial;
    proveedor_responsable_iva: boolean | null;
    proveedor_regimen_tributario: string | null;
    proveedor_agente_retenedor: boolean | null;
    anexos_count: number;
    comprobantes?: ComprobantePago[];
}

export interface ComprobantePago {
    id: number;
    archivo: string;
    fecha_pago: string;
    valor_pagado: number;
    referencia: string | null;
    created_at: string;
}

export interface Anexo {
    id: number;
    archivo: string;
    nombre_archivo: string;
    tipo: {
        id: number;
        nombre: string;
        obligatorio: boolean;
        codigo: string;
        aplica_a_persona?: string;
    };
    fecha_subida: string;
}

export interface TipoAnexo {
    id: number;
    nombre: string;
    obligatorio: boolean;
    codigo: string;
    aplica_a_persona?: string;
    descripcion?: string;
}

export const wizardApi = {
    // 1. Crear borrador (o recuperar existente de la sesion autenticada)
    createBorrador: async (token?: string) => {
        const payload = token ? { token } : {};
        const { data } = await apiClient.post('/api/cuentas-cobro/wizard/', payload);
        return data;
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

    // 9. Catalogo de tipos de anexo (general)
    getTiposAnexo: async () => {
        const { data } = await apiClient.get<TipoAnexo[]>('/api/tipos-anexo/');
        return data;
    },

    // 10. Tipos de anexo filtrados para una cuenta especifica (dinamico)
    getTiposAnexoFiltrados: async (id: number) => {
        const { data } = await apiClient.get<TipoAnexo[]>(`/api/cuentas-cobro/${id}/tipos-anexo/`);
        return data;
    },
};
