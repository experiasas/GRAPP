import { useState, useEffect, useCallback } from 'react';
import { wizardApi, WizardEstado, Anexo, TipoAnexo } from '@/api/wizardApi';

export const useCuentaWizard = (wizardId: number | null) => {
    const [estado, setEstado] = useState<WizardEstado | null>(null);
    const [anexos, setAnexos] = useState<Anexo[]>([]);
    const [tiposAnexo, setTiposAnexo] = useState<TipoAnexo[]>([]); // Catalog
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Separate loading states for specific actions if needed, 
    // but for now a global loading for refresh is fine, 
    // and specific loadings for actions can be returned.
    const [saving, setSaving] = useState(false);

    const refreshEstado = useCallback(async () => {
        if (!wizardId) return;
        try {
            // Fetch state and anexos in parallel
            const [estRes, anexosRes] = await Promise.all([
                wizardApi.getEstado(wizardId),
                wizardApi.listAnexos(wizardId)
            ]);
            setEstado(estRes);
            setAnexos(anexosRes);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Error actualizando estado');
        }
    }, [wizardId]);

    // Initial Load
    useEffect(() => {
        const init = async () => {
            if (!wizardId) return;
            setLoading(true);
            try {
                // Load Types catalog once
                const tipos = await wizardApi.getTiposAnexo();
                setTiposAnexo(tipos);

                // Load operational data
                await refreshEstado();
            } catch (err: any) {
                setError(err.message || 'Error inicializando wizard');
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [wizardId, refreshEstado]);

    // Validations helper (frontend trusting backend flags, but maybe we need local checks? 
    // No, prompt says "trust blindly in flags: step1_ok, step2_ok, anexos_ok")
    const canSubmit = estado?.step1_ok && estado?.step2_ok && estado?.anexos_ok && estado?.estado === 'BORRADOR';

    // Actions
    const saveStep1 = async (data: Partial<WizardEstado['datos_generales']>) => {
        if (!wizardId) return;
        setSaving(true);
        try {
            await wizardApi.updateStep1(wizardId, data);
            await refreshEstado();
        } catch (err: any) {
            throw err; // Let component handle specific validation errors
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
        setSaving(true); // Maybe use a separate uploading state, but keeping it simple
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
