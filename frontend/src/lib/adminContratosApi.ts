import { apiClient } from '@/lib/api';

// ─────────────────────────────────────────────────────────────────────────────
// Enums / literales
// ─────────────────────────────────────────────────────────────────────────────

export type EstadoContrato =
    | 'BORRADOR' | 'FIRMADO' | 'VIGENTE' | 'ACTIVO'
    | 'SUSPENDIDO' | 'LIQUIDADO' | 'FINALIZADO' | 'ANULADO';

export type PrioridadContrato = 'ALTA' | 'MEDIA' | 'BAJA';

export type EstadoPoliza = 'VIGENTE' | 'VENCIDA' | 'CANCELADA';

export type EstadoFormaPago = 'PENDIENTE' | 'PAGADO' | 'VENCIDO' | 'ANULADO';

export const ESTADO_CONTRATO_LABELS: Record<EstadoContrato, string> = {
    BORRADOR:   'Borrador',
    FIRMADO:    'Firmado',
    VIGENTE:    'Vigente',
    ACTIVO:     'Activo',
    SUSPENDIDO: 'Suspendido',
    LIQUIDADO:  'Liquidado',
    FINALIZADO: 'Finalizado',
    ANULADO:    'Anulado',
};

export const PRIORIDAD_LABELS: Record<PrioridadContrato, string> = {
    ALTA:  'Alta',
    MEDIA: 'Media',
    BAJA:  'Baja',
};

// ─────────────────────────────────────────────────────────────────────────────
// Catálogos
// ─────────────────────────────────────────────────────────────────────────────

export interface TipoContratoOption {
    id:     number;
    nombre: string;
}

export interface TipoAnexoContratoOption {
    id:        number;
    nombre:    string;
    requerido: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-recursos
// ─────────────────────────────────────────────────────────────────────────────

export interface PolizaContrato {
    id:               number;
    aseguradora:      string;
    numero_poliza:    string;
    amparo:           string;
    valor_asegurado:  string;
    fecha_inicio:     string;
    fecha_fin:        string;
    estado:           EstadoPoliza;
    observaciones:    string;
    archivo_url:      string | null;
}

export interface OtrosiContrato {
    id:              number;
    numero:          number;
    fecha:           string;
    objeto:          string;
    nuevo_valor:     string | null;
    nueva_fecha_fin: string | null;
    archivo_url:     string | null;
}

export interface FormaPagoContrato {
    id:             number;
    descripcion:    string;
    valor:          string;
    fecha_estimada: string | null;
    fecha_pago:     string | null;
    estado:         EstadoFormaPago;
    observaciones:  string;
    orden:          number;
}

export interface CondicionContractual {
    id:        number;
    titulo:    string;
    contenido: string;
    orden:     number;
}

export interface ContratoAnexo {
    id:          number;
    tipo:        { id: number; nombre: string } | null;
    descripcion: string;
    archivo_url: string;
    created_at:  string;
}

export interface ContratoFlujoItem {
    id:               number;
    estado_anterior:  string;
    estado_nuevo:     string;
    usuario:          string;
    observacion:      string;
    fecha:            string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Contrato — lista
// ─────────────────────────────────────────────────────────────────────────────

export interface ContratoListItem {
    id:            number;
    numero:        string;
    empresa:       { id: number; nombre: string };
    contratista:   { id: number; nombre: string };
    tipo_contrato: { id: number; nombre: string } | null;
    objeto:        string;
    estado:        EstadoContrato;
    prioridad:     PrioridadContrato;
    valor_total:   string;
    fecha_inicio:  string;
    fecha_fin:     string | null;
    dias_restantes: number | null;
    tiene_otrosi:  boolean;
    tiene_polizas: boolean;
    created_at:    string;
}

export interface ContratosFilterParams {
    search?:    string;
    estado?:    EstadoContrato | '';
    prioridad?: PrioridadContrato | '';
    empresa?:   number | '';
    page?:      number;
    page_size?: number;
}

export interface PaginatedContratosResponse {
    count:     number;
    page:      number;
    page_size: number;
    pages:     number;
    results:   ContratoListItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Contrato — detalle
// ─────────────────────────────────────────────────────────────────────────────

export interface ContratoDetalle extends ContratoListItem {
    dependencia_solicitante: string;
    observaciones:           string;
    fecha_solicitud:         string | null;
    fecha_contrato:          string | null;
    fecha_fin_otrosi:        string | null;
    valor_sin_iva:           string;
    iva:                     string;
    valor:                   string;
    solicitante:  { id: number; nombre: string } | null;
    empresa_rl:   { id: number; nombre: string } | null;
    tercero_rl:   { id: number; nombre: string } | null;
    created_by:   { id: number; nombre: string } | null;
    polizas:      PolizaContrato[];
    otrosis:      OtrosiContrato[];
    formas_pago:  FormaPagoContrato[];
    condiciones:  CondicionContractual[];
    anexos:       ContratoAnexo[];
    flujo:        ContratoFlujoItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Payloads de escritura
// ─────────────────────────────────────────────────────────────────────────────

export interface ContratoCreatePayload {
    empresa:                  number;
    contratista:              number;
    tipo_contrato?:           number | null;
    numero:                   string;
    objeto:                   string;
    estado?:                  EstadoContrato;
    prioridad?:               PrioridadContrato;
    dependencia_solicitante?: string;
    observaciones?:           string;
    fecha_solicitud?:         string | null;
    fecha_contrato?:          string | null;
    fecha_inicio:             string;
    fecha_fin?:               string | null;
    valor_sin_iva?:           number;
    iva?:                     number;
    valor_total?:             number;
    solicitante?:             number | null;
}

export interface ContratoUpdatePayload extends Partial<ContratoCreatePayload> {}

export interface PolizaCreatePayload {
    aseguradora:     string;
    numero_poliza?:  string;
    amparo:          string;
    valor_asegurado?: number;
    fecha_inicio:    string;
    fecha_fin:       string;
    estado?:         EstadoPoliza;
    observaciones?:  string;
}

export interface OtrosiCreatePayload {
    numero:          number;
    fecha:           string;
    objeto:          string;
    nuevo_valor?:    number | null;
    nueva_fecha_fin?: string | null;
}

export interface FormaPagoCreatePayload {
    descripcion:     string;
    valor:           number;
    fecha_estimada?: string | null;
    estado?:         EstadoFormaPago;
    observaciones?:  string;
    orden?:          number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cliente API
// ─────────────────────────────────────────────────────────────────────────────

export const adminContratosAPI = {
    // Catálogos
    tiposContrato(): Promise<TipoContratoOption[]> {
        return apiClient.get('/api/admin/tipos-contrato/').then(r => r.data);
    },
    tiposAnexo(): Promise<TipoAnexoContratoOption[]> {
        return apiClient.get('/api/admin/tipos-anexo-contrato/').then(r => r.data);
    },

    // Lista
    list(params: ContratosFilterParams = {}): Promise<PaginatedContratosResponse> {
        return apiClient.get('/api/admin/contratos/', { params: { page: 1, ...params } }).then(r => r.data);
    },

    // Detalle
    getDetalle(id: number): Promise<ContratoDetalle> {
        return apiClient.get(`/api/admin/contratos/${id}/`).then(r => r.data);
    },

    // Crear / editar
    crear(data: ContratoCreatePayload): Promise<ContratoListItem> {
        return apiClient.post('/api/admin/contratos/', data).then(r => r.data);
    },
    editar(id: number, data: ContratoUpdatePayload): Promise<ContratoDetalle> {
        return apiClient.patch(`/api/admin/contratos/${id}/`, data).then(r => r.data);
    },

    // Cambio de estado
    cambiarEstado(id: number, estado: EstadoContrato, observacion?: string): Promise<{ estado: EstadoContrato; estado_anterior: string }> {
        return apiClient.post(`/api/admin/contratos/${id}/estado/`, { estado, observacion }).then(r => r.data);
    },

    // Pólizas
    crearPoliza(contratoId: number, data: PolizaCreatePayload): Promise<PolizaContrato> {
        return apiClient.post(`/api/admin/contratos/${contratoId}/polizas/`, data).then(r => r.data);
    },
    editarPoliza(contratoId: number, polizaId: number, data: Partial<PolizaCreatePayload>): Promise<PolizaContrato> {
        return apiClient.patch(`/api/admin/contratos/${contratoId}/polizas/${polizaId}/`, data).then(r => r.data);
    },
    eliminarPoliza(contratoId: number, polizaId: number): Promise<void> {
        return apiClient.delete(`/api/admin/contratos/${contratoId}/polizas/${polizaId}/`).then(() => undefined);
    },

    // Otrosíes
    crearOtrosi(contratoId: number, data: OtrosiCreatePayload): Promise<OtrosiContrato> {
        return apiClient.post(`/api/admin/contratos/${contratoId}/otrosis/`, data).then(r => r.data);
    },
    editarOtrosi(contratoId: number, otrosiId: number, data: Partial<OtrosiCreatePayload>): Promise<OtrosiContrato> {
        return apiClient.patch(`/api/admin/contratos/${contratoId}/otrosis/${otrosiId}/`, data).then(r => r.data);
    },
    eliminarOtrosi(contratoId: number, otrosiId: number): Promise<void> {
        return apiClient.delete(`/api/admin/contratos/${contratoId}/otrosis/${otrosiId}/`).then(() => undefined);
    },

    // Formas de pago
    crearFormaPago(contratoId: number, data: FormaPagoCreatePayload): Promise<FormaPagoContrato> {
        return apiClient.post(`/api/admin/contratos/${contratoId}/formas-pago/`, data).then(r => r.data);
    },
    editarFormaPago(contratoId: number, formaId: number, data: Partial<FormaPagoCreatePayload>): Promise<FormaPagoContrato> {
        return apiClient.patch(`/api/admin/contratos/${contratoId}/formas-pago/${formaId}/`, data).then(r => r.data);
    },
    eliminarFormaPago(contratoId: number, formaId: number): Promise<void> {
        return apiClient.delete(`/api/admin/contratos/${contratoId}/formas-pago/${formaId}/`).then(() => undefined);
    },

    // Anexos
    subirAnexo(contratoId: number, file: File, tipoId?: number, descripcion?: string): Promise<ContratoAnexo> {
        const form = new FormData();
        form.append('archivo', file);
        if (tipoId) form.append('tipo', String(tipoId));
        if (descripcion) form.append('descripcion', descripcion);
        return apiClient.post(`/api/admin/contratos/${contratoId}/anexos/`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }).then(r => r.data);
    },
    eliminarAnexo(contratoId: number, anexoId: number): Promise<void> {
        return apiClient.delete(`/api/admin/contratos/${contratoId}/anexos/${anexoId}/`).then(() => undefined);
    },
};
