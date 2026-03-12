import { useState, useEffect } from 'react';
import { Shield, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppAlert } from '@/components/ui/app-alert';
import { terceroAPI } from '@/lib/api';

interface SeguridadSocial {
    eps: string | null;
    arl: string | null;
    afp: string | null;
    soporte: string | null;
    updated_at: string | null;
}

interface SeguridadSocialSectionProps {
    terceroId: number;
    onUpdate?: () => void;
}

export default function SeguridadSocialSection({ terceroId, onUpdate }: SeguridadSocialSectionProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        eps: '',
        arl: '',
        afp: '',
    });

    useEffect(() => {
        loadData();
    }, [terceroId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await terceroAPI.seguridadSocial.get(terceroId);
            setFormData({
                eps: data.eps || '',
                arl: data.arl || '',
                afp: data.afp || '',
            });
        } catch (error) {
            console.error('Error loading seguridad social:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            await terceroAPI.seguridadSocial.save(terceroId, formData);
            onUpdate?.();
            setSuccess('Información de seguridad social guardada exitosamente');
        } catch (error) {
            console.error('Error saving seguridad social:', error);
            setError('Error al guardar la información');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-card border rounded-lg p-6">
                <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card border rounded-lg p-6">
            <div className="mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Seguridad Social
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Información de afiliación a entidades de seguridad social
                </p>
            </div>

            {error && (
                <AppAlert type="error" description={error} className="mb-6" />
            )}

            {success && (
                <AppAlert type="success" title="Guardado" description={success} className="mb-6" />
            )}

            <div className="space-y-4">
                <div>
                    <Label>EPS (Entidad Promotora de Salud)</Label>
                    <Input
                        value={formData.eps}
                        onChange={(e) => setFormData({ ...formData, eps: e.target.value })}
                        placeholder="Ej: SURA, Compensar, Sanitas..."
                    />
                </div>

                <div>
                    <Label>ARL (Administradora de Riesgos Laborales)</Label>
                    <Input
                        value={formData.arl}
                        onChange={(e) => setFormData({ ...formData, arl: e.target.value })}
                        placeholder="Ej: Positiva, Bolívar, SURA..."
                    />
                </div>

                <div>
                    <Label>AFP (Administradora de Fondo de Pensiones)</Label>
                    <Input
                        value={formData.afp}
                        onChange={(e) => setFormData({ ...formData, afp: e.target.value })}
                        placeholder="Ej: Porvenir, Protección, Colfondos..."
                    />
                </div>

                <div className="pt-4">
                    <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Guardar Información
                            </>
                        )}
                    </Button>
                </div>

                <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-900/10 p-3 rounded border border-blue-200 dark:border-blue-800">
                    💡 <strong>Nota:</strong> Esta información es requerida para cumplir con la normativa laboral colombiana.
                </div>
            </div>
        </div>
    );
}
