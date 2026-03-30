import { apiClient } from '@/lib/api';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de estado
// ─────────────────────────────────────────────────────────────────────────────

export type EstadoTercero = 'BORRADOR' | 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
export type TipoPersona   = 'NATURAL' | 'JURIDICA';
export type EstadoDoc     = 'PENDIENTE' | 'CARGADO' | 'APROBADO' | 'RECHAZADO';

// ─────────────────────────────────────────────────────────────────────────────
// Lista de terceros
// ─────────────────────────────────────────────────────────────────────────────

export interface TerceroListItem {
    id:                    number;
    nombre_completo:       string;
    tipo_persona:          TipoPersona;
    tipo_documento:        string;
    numero_documento:      string;
    email:                 string;
    telefono:              string;
    empresa:               string;
    tipos_tercero:         string[];          // códigos: ['CONTRATISTA']
    estado:                EstadoTercero;
    fecha_registro:        string;            // ISO 8601
    documentos_completos:  number;
    documentos_total:      number;
    tiene_perfil_completo: boolean;
}

export interface TercerosFilterParams {
    estado?:       string;
    tipo_tercero?: string;
    tipo_persona?: string;
    search?:       string;
    ordering?:     string;
    page?:         number;
    page_size?:    number;
}

export interface PaginatedResponse<T> {
    count:     number;
    page:      number;
    page_size: number;
    pages:     number;
    results:   T[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Detalle de tercero
// ─────────────────────────────────────────────────────────────────────────────

export interface DocumentoDetalle {
    tipo:        string;
    nombre:      string;
    estado:      EstadoDoc;
    obligatorio: boolean;
    archivo_url: string | null;
}

export interface EstudioDetalle {
    id:          number;
    nivel:       string;
    institucion: string;
    titulo:      string;
    fecha_inicio: string | null;
    fecha_fin:    string | null;
    soporte_url:  string | null;
}

export interface CursoDetalle {
    id:          number;
    nombre:      string;
    entidad:     string;
    horas:       number | null;
    soporte_url: string | null;
}

export interface CertificacionDetalle {
    id:          number;
    nombre:      string;
    fabricante:  string;
    fecha:       string | null;
    soporte_url: string | null;
}

export interface ExperienciaDetalle {
    id:          number;
    empresa:     string;
    cargo:       string;
    fecha_inicio: string | null;
    fecha_fin:    string | null;
    soporte_url:  string | null;
}

export interface IdiomaDetalle {
    id:     number;
    idioma: string;
    nivel:  'BASICO' | 'INTERMEDIO' | 'AVANZADO' | 'NATIVO';
}

export interface SeguridadSocialDetalle {
    eps:         string;
    arl:         string;
    afp:         string;
    soporte_url: string | null;
}

export interface PerfilCompleto {
    estudios:        EstudioDetalle[];
    cursos:          CursoDetalle[];
    certificaciones: CertificacionDetalle[];
    experiencias:    ExperienciaDetalle[];
    idiomas:         IdiomaDetalle[];
    seguridad_social: SeguridadSocialDetalle | null;
}

export interface TerceroDetalle {
    id:               number;
    nombre_completo:  string;
    tipo_persona:     TipoPersona;
    tipo_documento:   string;
    numero_documento: string;
    email:            string;
    telefono:         string;
    celular:          string;
    direccion:        string;
    ciudad:           string;
    departamento:     string;
    pais:             string;
    empresa: {
        id:     number;
        nombre: string;
        nit:    string;
    };
    tipos_tercero: Array<{ code: string; nombre: string }>;
    estado:          EstadoTercero;
    fecha_registro:  string;
    aprobado_por:    string | null;
    aprobado_at:     string | null;
    observaciones:   string;
    informacion_adicional: {
        responsable_iva:    boolean | null;
        agente_retenedor:   boolean | null;
        regimen_tributario: string | null;
        tipo_regimen:       string | null;
        rl_nombre:    string | null;
        rl_tipo_doc:  string | null;
        rl_documento: string | null;
        tes_contacto: string | null;
        tes_cargo:    string | null;
        tes_email:    string | null;
    };
    documentos: DocumentoDetalle[];
    perfil:     PerfilCompleto;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cambio de estado
// ─────────────────────────────────────────────────────────────────────────────

export interface CambioEstadoPayload {
    estado: 'APROBADO' | 'RECHAZADO';
    motivo?: string;
}

export interface CambioEstadoResponse {
    id:          number;
    estado:      EstadoTercero;
    aprobado_por: string | null;
    aprobado_at:  string | null;
    observaciones: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Invitaciones
// ─────────────────────────────────────────────────────────────────────────────

export interface InvitacionPayload {
    email:        string;
    tipo_tercero: string;
    empresa_id:   number;
}

export interface InvitacionResponse {
    id:           number;
    token:        string;
    email:        string;
    tipo_tercero: string;
    empresa:      string;
    link:         string;
    created_at:   string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Empresas (para select del modal)
// ─────────────────────────────────────────────────────────────────────────────

export interface EmpresaOption {
    id:     number;
    nombre: string;
    nit:    string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Historial de descargas
// ─────────────────────────────────────────────────────────────────────────────

export interface DescargaHistorial {
    id:               number;
    usuario:          string;
    motivo:           string;
    fecha:            string;   // ISO 8601
    cantidad_archivos: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cliente API
// ─────────────────────────────────────────────────────────────────────────────

export const adminTercerosAPI = {
    list(params: TercerosFilterParams = {}): Promise<PaginatedResponse<TerceroListItem>> {
        return apiClient
            .get('/api/admin/terceros/', { params })
            .then(r => r.data);
    },

    getDetalle(id: number): Promise<TerceroDetalle> {
        return apiClient
            .get(`/api/admin/terceros/${id}/detalle/`)
            .then(r => r.data);
    },

    cambiarEstado(id: number, data: CambioEstadoPayload): Promise<CambioEstadoResponse> {
        return apiClient
            .patch(`/api/admin/terceros/${id}/estado/`, data)
            .then(r => r.data);
    },

    crearInvitacion(data: InvitacionPayload): Promise<InvitacionResponse> {
        return apiClient
            .post('/api/admin/invitaciones/', data)
            .then(r => r.data);
    },

    getEmpresas(): Promise<EmpresaOption[]> {
        return apiClient
            .get('/api/admin/empresas/')
            .then(r => r.data);
    },

    async getHistorialDescargas(terceroId: number): Promise<DescargaHistorial[]> {
        const { data } = await apiClient.get(`/api/admin/terceros/${terceroId}/descargas/`);
        return data;
    },

    async descargarDocumentos(terceroId: number, nombreArchivo: string, motivo: string): Promise<void> {
        const response = await apiClient.post(
            `/api/admin/terceros/${terceroId}/descargar-documentos/`,
            { motivo },
            { responseType: 'blob' },
        );
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `documentos_${nombreArchivo}.zip`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },
};
