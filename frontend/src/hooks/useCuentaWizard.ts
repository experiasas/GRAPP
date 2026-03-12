import { useState, useEffect, useCallback } from 'react';
import { wizardApi, WizardEstado, Anexo, TipoAnexo } from '@/api/wizardApi';

export const useCuentaWizard = (wizardId: number | null) => {
    const [estado, setEstado] = useState<WizardEstado | null>(null);
    const [anexos, setAnexos] = useState<Anexo[]>([]);
    const [tiposAnexo, setTiposAnexo] = useState<TipoAnexo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const refreshEstado = useCallback(async () => {
        if (!wizardId) return;
        try {
            const [estRes, anexosRes] = await Promise.all([
                wizardApi.getEstado(wizardId),
                wizardApi.listAnexos(wizardId)
            ]);
            setEstado(estRes);
            setAnexos(anexosRes);

            // Recargar tipos de anexo filtrados (pueden cambiar si cambia el acumulado mensual)
            const tipos = await wizardApi.getTiposAnexoFiltrados(wizardId);
            setTiposAnexo(tipos);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Error actualizando estado');
        }
    }, [wizardId]);

    // Carga inicial
    useEffect(() => {
        const init = async () => {
            if (!wizardId) return;
            setLoading(true);
            try {
                // Cargar tipos de anexo filtrados por tipo de persona
                const tipos = await wizardApi.getTiposAnexoFiltrados(wizardId);
                setTiposAnexo(tipos);

                await refreshEstado();
            } catch (err: any) {
                setError(err.message || 'Error inicializando wizard');
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [wizardId, refreshEstado]);

    // Propiedades derivadas del estado
    const tipoDocumento = estado?.tipo_documento || 'CUENTA_COBRO';
    const tipoPersona = estado?.tipo_persona || 'NATURAL';
    const reglasSegSocial = estado?.reglas_seguridad_social || null;
    const requiereSeguridadSocial = reglasSegSocial?.requiere_ss || false;

    const canSubmit = estado?.step1_ok && estado?.step2_ok && estado?.anexos_ok && estado?.estado === 'BORRADOR';

    // Acciones
    const saveStep1 = async (data: Partial<WizardEstado['datos_generales']>) => {
        if (!wizardId) return;
        setSaving(true);
        try {
            await wizardApi.updateStep1(wizardId, data);
            await refreshEstado();
        } catch (err: any) {
            throw err;
        } finally {
            setSaving(false);
        }
    };

    const saveStep2 = async (data: Partial<WizardEstado['datos_financieros']>) => {
        if (!wizardId) return;
        setSaving(true);
        try {
            await wizardApi.updateStep2(wizardId, data);
            await refreshEstado();
        } catch (err: any) {
            throw err;
        } finally {
            setSaving(false);
        }
    };

    const uploadAnexo = async (tipoAnexoId: number, file: File) => {
        if (!wizardId) return;
        setSaving(true);
        try {
            await wizardApi.uploadAnexo(wizardId, tipoAnexoId, file);
            await refreshEstado();
        } catch (err: any) {
            throw err;
        } finally {
            setSaving(false);
        }
    };

    const deleteAnexo = async (anexoId: number) => {
        if (!wizardId) return;
        setSaving(true);
        try {
            await wizardApi.deleteAnexo(wizardId, anexoId);
            await refreshEstado();
        } catch (err: any) {
            throw err;
        } finally {
            setSaving(false);
        }
    };

    const submit = async () => {
        if (!wizardId) return;
        setSaving(true);
        try {
            await wizardApi.submit(wizardId);
            await refreshEstado();
        } catch (err: any) {
            throw err;
        } finally {
            setSaving(false);
        }
    };

    return {
        estado,
        anexos,
        tiposAnexo,
        loading,
        saving,
        error,
        tipoDocumento,
        tipoPersona,
        reglasSegSocial,
        requiereSeguridadSocial,
        actions: {
            refreshEstado,
            saveStep1,
            saveStep2,
            uploadAnexo,
            deleteAnexo,
            submit
        },
        canSubmit
    };
};
