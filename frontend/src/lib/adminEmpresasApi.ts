import { apiClient } from '@/lib/api';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos base
// ─────────────────────────────────────────────────────────────────────────────

export type TipoContacto = 'RL' | 'GER' | 'TES' | 'CON' | 'COM' | 'OTR';

// ─────────────────────────────────────────────────────────────────────────────
// Lista de empresas
// ─────────────────────────────────────────────────────────────────────────────

export interface EmpresaListItem {
    id:               number;
    nombre:           string;
    nit:              string;
    activa:           boolean;
    email:            string;   // del contacto principal
    telefono:         string;   // del contacto principal
    total_terceros:   number;
    total_contratos:  number;
    contactos_count:  number;
    fecha_creacion:   string;   // ISO 8601
}

export interface EmpresasFilterParams {
    search?:    string;
    page?:      number;
    page_size?: number;
}

export interface PaginatedEmpresasResponse {
    count:     number;
    page:      number;
    page_size: number;
    pages:     number;
    results:   EmpresaListItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Detalle de empresa
// ─────────────────────────────────────────────────────────────────────────────

export interface ContactoEmpresaDetalle {
    id:           number;
    nombre:       string;
    cargo:        string;
    tipo:         TipoContacto;
    tipo_display: string;
    email:        string;
    telefono:     string;
    principal:    boolean;
    activo:       boolean;
}

export interface EmpresaStats {
    total_terceros:      number;
    terceros_aprobados:  number;
    terceros_pendientes: number;
    total_contratos:     number;
    contratos_vigentes:  number;
}

export interface EmpresaDetalle {
    id:             number;
    nombre:         string;
    nit:            string;
    activa:         boolean;
    fecha_creacion: string;
    contactos:      ContactoEmpresaDetalle[];
    stats:          EmpresaStats;
}

// ─────────────────────────────────────────────────────────────────────────────
// Payloads de escritura — empresa
// ─────────────────────────────────────────────────────────────────────────────

export interface EmpresaCreatePayload {
    nombre: string;
    nit:    string;
    activa?: boolean;
}

export interface EmpresaUpdatePayload {
    nombre?: string;
    nit?:    string;
    activa?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Payloads de escritura — contactos
// ─────────────────────────────────────────────────────────────────────────────

export interface ContactoCreatePayload {
    nombre:    string;
    tipo:      TipoContacto;
    cargo?:    string;
    email?:    string;
    telefono?: string;
    principal?: boolean;
}

export interface ContactoUpdatePayload {
    nombre?:   string;
    tipo?:     TipoContacto;
    cargo?:    string;
    email?:    string;
    telefono?: string;
    principal?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Opción simple para selects (backward compat con InvitarTerceroModal)
// ─────────────────────────────────────────────────────────────────────────────

export interface EmpresaOption {
    id:     number;
    nombre: string;
    nit:    string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cliente API
// ─────────────────────────────────────────────────────────────────────────────

export const adminEmpresasAPI = {
    list(params: EmpresasFilterParams = {}): Promise<PaginatedEmpresasResponse> {
        const pageParams = { page: 1, ...params };
        return apiClient
            .get('/api/admin/empresas/', { params: pageParams })
            .then(r => r.data);
    },

    getDetalle(id: number): Promise<EmpresaDetalle> {
        return apiClient
            .get(`/api/admin/empresas/${id}/`)
            .then(r => r.data);
    },

    crear(data: EmpresaCreatePayload): Promise<EmpresaDetalle> {
        return apiClient
            .post('/api/admin/empresas/', data)
            .then(r => r.data);
    },

    editar(id: number, data: EmpresaUpdatePayload): Promise<EmpresaDetalle> {
        return apiClient
            .patch(`/api/admin/empresas/${id}/`, data)
            .then(r => r.data);
    },

    crearContacto(empresaId: number, data: ContactoCreatePayload): Promise<ContactoEmpresaDetalle> {
        return apiClient
            .post(`/api/admin/empresas/${empresaId}/contactos/`, data)
            .then(r => r.data);
    },

    editarContacto(empresaId: number, contactoId: number, data: ContactoUpdatePayload): Promise<ContactoEmpresaDetalle> {
        return apiClient
            .patch(`/api/admin/empresas/${empresaId}/contactos/${contactoId}/`, data)
            .then(r => r.data);
    },

    eliminarContacto(empresaId: number, contactoId: number): Promise<void> {
        return apiClient
            .delete(`/api/admin/empresas/${empresaId}/contactos/${contactoId}/`)
            .then(() => undefined);
    },
};
