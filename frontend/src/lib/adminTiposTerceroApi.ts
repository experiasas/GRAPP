import { apiClient } from '@/lib/api';

export interface TipoTercero {
    id:                 number;
    code:               string;
    nombre:             string;
    descripcion:        string;
    activo:             boolean;
    total_terceros:     number;
    total_invitaciones: number;
}

export interface TipoTerceroPayload {
    code:        string;
    nombre:      string;
    descripcion?: string;
    activo?:      boolean;
}

export interface TipoTerceroErrors {
    code?:        string;
    nombre?:      string;
    descripcion?: string;
}

export const adminTiposTerceroAPI = {
    list(): Promise<TipoTercero[]> {
        return apiClient.get('/api/admin/tipos-tercero/').then(r => r.data);
    },

    getDetalle(id: number): Promise<TipoTercero> {
        return apiClient.get(`/api/admin/tipos-tercero/${id}/`).then(r => r.data);
    },

    crear(data: TipoTerceroPayload): Promise<TipoTercero> {
        return apiClient.post('/api/admin/tipos-tercero/', data).then(r => r.data);
    },

    editar(id: number, data: Partial<TipoTerceroPayload>): Promise<TipoTercero> {
        return apiClient.patch(`/api/admin/tipos-tercero/${id}/`, data).then(r => r.data);
    },

    eliminar(id: number): Promise<void> {
        return apiClient.delete(`/api/admin/tipos-tercero/${id}/`).then(() => undefined);
    },
};
