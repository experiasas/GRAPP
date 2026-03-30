import { apiClient } from '@/lib/api';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type EstadoOC =
    | 'BORRADOR' | 'EMITIDA' | 'APROBADA'
    | 'EN_EJECUCION' | 'CUMPLIDA' | 'ANULADA';

export const ESTADO_OC_LABELS: Record<EstadoOC, string> = {
    BORRADOR:     'Borrador',
    EMITIDA:      'Emitida',
    APROBADA:     'Aprobada',
    EN_EJECUCION: 'En ejecución',
    CUMPLIDA:     'Cumplida',
    ANULADA:      'Anulada',
};

export interface ItemOC {
    id:            number;
    descripcion:   string;
    cantidad:      string;
    valor_unitario: string;
    valor_total:   string;
}

export interface OCListItem {
    id:                   number;
    numero_oc:            string;
    tipo:                 string;
    estado:               EstadoOC;
    estado_display:       string;
    tercero_nombre:       string;
    tercero_documento:    string;
    empresa_nombre:       string;
    contrato_numero:      string | null;
    objeto:               string;
    valor_total:          string;
    valor_radicado:       string;
    valor_pendiente:      string;
    porcentaje_ejecutado: number;
    fecha_emision:        string;
    fecha_entrega:        string | null;
    radicaciones_count:   number;
    created_at:           string;
}

export interface OCDetalle extends Omit<OCListItem, 'objeto'> {
    tipo_display:   string;
    tercero: {
        id:           number;
        nombre:       string;
        documento:    string;
        tipo_persona: string;
    };
    empresa: {
        id:     number;
        nombre: string;
        nit:    string;
    };
    contrato: {
        id:     number;
        numero: string;
        objeto: string;
    } | null;
    valor_sin_iva:          string;
    iva:                    string;
    objeto:                 string;
    observaciones:          string;
    archivo_url:            string | null;
    items:                  ItemOC[];
    created_by:             string | null;
    updated_at:             string;
    transiciones_validas:   EstadoOC[];
}

export interface PaginatedOCResponse {
    count:     number;
    page:      number;
    page_size: number;
    pages:     number;
    results:   OCListItem[];
}

export interface CreateOCPayload {
    tercero:        number;
    empresa:        number;
    contrato?:      number | null;
    objeto:         string;
    valor_sin_iva:  number | string;
    iva?:           number | string;
    valor_total:    number | string;
    fecha_emision:  string;
    fecha_entrega?: string | null;
    numero_oc?:     string;
    tipo?:          string;
    estado?:        EstadoOC;
    observaciones?: string;
    items?: { descripcion: string; cantidad: number; valor_unitario: number }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// API client
// ─────────────────────────────────────────────────────────────────────────────

export const adminOrdenesCompraAPI = {
    list(params: {
        page?: number;
        page_size?: number;
        search?: string;
        estado?: string;
        tercero?: number;
        empresa?: number;
        contrato?: number;
        ordering?: string;
    } = {}): Promise<PaginatedOCResponse> {
        return apiClient
            .get('/api/admin/ordenes-compra/', { params })
            .then(r => r.data);
    },

    get(id: number): Promise<OCDetalle> {
        return apiClient.get(`/api/admin/ordenes-compra/${id}/`).then(r => r.data);
    },

    create(payload: CreateOCPayload): Promise<OCDetalle> {
        return apiClient.post('/api/admin/ordenes-compra/', payload).then(r => r.data);
    },

    update(id: number, payload: Partial<CreateOCPayload>): Promise<OCDetalle> {
        return apiClient.patch(`/api/admin/ordenes-compra/${id}/`, payload).then(r => r.data);
    },

    cambiarEstado(id: number, estado: EstadoOC, motivo?: string): Promise<{ ok: boolean; estado: EstadoOC; estado_display: string }> {
        return apiClient
            .post(`/api/admin/ordenes-compra/${id}/estado/`, { estado, motivo })
            .then(r => r.data);
    },

    radicaciones(id: number): Promise<{
        id: number; numero: string; periodo: string;
        valor_total: number; estado: string; estado_display: string; fecha: string;
    }[]> {
        return apiClient.get(`/api/admin/ordenes-compra/${id}/radicaciones/`).then(r => r.data);
    },
};
