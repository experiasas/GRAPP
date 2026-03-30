import { apiClient as api } from "@/lib/api";

// ── List item (from admin_cuentas_cobro_list) ─────────────────────────────────

export type TipoDocumentoCuenta = "FACTURA" | "CUENTA_COBRO";

export interface CuentaCobroListItem {
    id: number;
    numero: string;
    tercero_id: number;
    tercero_nombre: string;
    tipo_documento: TipoDocumentoCuenta;
    tipo_documento_label: string;
    periodo: string;
    concepto: string;
    valor_base: number;
    valor_total: number;
    estado: string;
    fecha_radicacion: string;   // ISO datetime
    dias_pendiente: number;
    urgencia: "alta" | "media" | "baja";
    anexos_count: number;
}

export interface CuentaCobroListResponse {
    count: number;
    page: number;
    page_size: number;
    pages: number;
    results: CuentaCobroListItem[];
}

// ── Detail (from admin_cuenta_cobro_detalle) ──────────────────────────────────

export interface AnexoCuenta {
    id: number;
    tipo_anexo: string;
    descripcion: string;
    archivo_url: string | null;
    fecha_carga: string;   // ISO datetime
}

export interface ComprobantePago {
    fecha_pago: string;        // ISO date
    valor_pagado: number;
    referencia: string;
    archivo_url: string | null;
}

export interface CuentaCobroDetalle {
    id: number;
    numero: string;
    tipo_documento: TipoDocumentoCuenta;
    tipo_documento_label: string;
    tercero: {
        id: number;
        nombre: string;
        tipo_documento: string;
        numero_documento: string;
    };
    contrato: {
        id: number;
        numero: string;
    } | null;
    orden_compra: {
        id: number;
        numero_oc: string;
        objeto: string;
        valor_total: string;
        valor_pendiente: string;
    } | null;
    periodo: string;
    concepto: string;
    observaciones: string;
    valor_base: number;
    iva_porcentaje: number;
    iva_valor: number;
    admon: number;
    imprevistos: number;
    utilidad: number;
    valor_total: number;
    estado: string;
    fecha_radicacion: string;  // ISO datetime
    updated_at: string;        // ISO datetime
    comprobante: ComprobantePago | null;
    anexos: AnexoCuenta[];
}

// ── Estado change (PATCH admin_cuenta_cobro_estado) ───────────────────────────

export interface CambioEstadoCuentaPayload {
    estado: string;
    observaciones_revision?: string;
}

export interface CambioEstadoCuentaResponse {
    ok: boolean;
    estado: string;
}

// ── Query params for list ─────────────────────────────────────────────────────

export interface CuentaCobroListParams {
    page?: number;
    page_size?: number;
    estado?: string;
    search?: string;
    tercero?: number | string;
    periodo?: string;
    ordering?: string;
}

// ── API client ────────────────────────────────────────────────────────────────

export const adminCuentasCobroAPI = {
    list(params: CuentaCobroListParams = {}): Promise<CuentaCobroListResponse> {
        return api
            .get<CuentaCobroListResponse>("/api/admin/cuentas-cobro/", { params })
            .then((r) => r.data);
    },

    getDetalle(id: number): Promise<CuentaCobroDetalle> {
        return api
            .get<CuentaCobroDetalle>(`/api/admin/cuentas-cobro/${id}/detalle/`)
            .then((r) => r.data);
    },

    cambiarEstado(
        id: number,
        data: CambioEstadoCuentaPayload | FormData | Record<string, string>,
    ): Promise<CambioEstadoCuentaResponse> {
        return api
            .patch<CambioEstadoCuentaResponse>(
                `/api/admin/cuentas-cobro/${id}/estado/`,
                data,
            )
            .then((r) => r.data);
    },
};
