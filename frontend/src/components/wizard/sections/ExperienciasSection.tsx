import { useState, useEffect } from 'react';
import { Briefcase, Plus, Pencil, Trash2, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { terceroAPI } from '@/lib/api';

interface ExperienciaLaboral {
    id: number;
    empresa: string;
    cargo: string;
    fecha_inicio: string | null;
    fecha_fin: string | null;
    soporte: string | null;
}

interface ExperienciasSectionProps {
    terceroId: number;
    onUpdate?: () => void;
}

export default function ExperienciasSection({ terceroId, onUpdate }: ExperienciasSectionProps) {
    const [experiencias, setExperiencias] = useState<ExperienciaLaboral[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState<ExperienciaLaboral | null>(null);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        empresa: '',
        cargo: '',
        fecha_inicio: '',
        fecha_fin: '',
    });

    useEffect(() => {
        loadExperiencias();
    }, [terceroId]);

    const loadExperiencias = async () => {
        setLoading(true);
        try {
            const data = await terceroAPI.experiencias.list(terceroId);
            setExperiencias(data);
        } catch (error) {
            console.error('Error loading experiencias:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (item: ExperienciaLaboral) => {
        setEditItem(item);
        setFormData({
            empresa: item.empresa,
            cargo: item.cargo,
            fecha_inicio: item.fecha_inicio || '',
            fecha_fin: item.fecha_fin || '',
        });
        setShowForm(true);
    };

    const handleAdd = () => {
        setEditItem(null);
        setFormData({ empresa: '', cargo: '', fecha_inicio: '', fecha_fin: '' });
        setShowForm(true);
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditItem(null);
        setFormData({ empresa: '', cargo: '', fecha_inicio: '', fecha_fin: '' });
    };

    const handleSave = async () => {
        if (!formData.empresa || !formData.cargo) {
            alert('Complete los campos obligatorios');
            return;
        }

        setSaving(true);
        try {
            if (editItem) {
                await terceroAPI.experiencias.update(terceroId, editItem.id, formData);
            } else {
                await terceroAPI.experiencias.create(terceroId, formData);
            }
            await loadExperiencias();
            onUpdate?.();
            handleCancel();
        } catch (error) {
            console.error('Error saving experiencia:', error);
            alert('Error al guardar la experiencia');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Está seguro de eliminar esta experiencia?')) return;

        try {
            await terceroAPI.experiencias.delete(terceroId, id);
            await loadExperiencias();
            onUpdate?.();
        } catch (error) {
            console.error('Error deleting experiencia:', error);
            alert('Error al eliminar la experiencia');
        }
    };

    return (
        <div className="bg-card border rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    Experiencia Laboral
                </h3>
                {!showForm && (
                    <Button onClick={handleAdd} size="sm" variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Experiencia
                    </Button>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <>
                    {experiencias.length > 0 ? (
                        <div className="space-y-3 mb-4">
                            {experiencias.map((exp) => (
                                <div
                                    key={exp.id}
                                    className="flex justify-between items-start p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex-1">
                                        <p className="font-medium">{exp.cargo}</p>
                                        <p className="text-sm text-muted-foreground">{exp.empresa}</p>
                                        {exp.fecha_inicio && (
                                            <span className="text-xs text-muted-foreground mt-2 inline-block">
                                                {new Date(exp.fecha_inicio).getFullYear()}
                                                {exp.fecha_fin
                                                    ? ` - ${new Date(exp.fecha_fin).getFullYear()}`
                                                    : ' - Presente'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                        <Button variant="ghost" size="sm" onClick={() => handleEdit(exp)}>
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(exp.id)}>
                                            <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : !showForm ? (
                        <p className="text-center text-muted-foreground py-8 text-sm">
                            No hay experiencia laboral registrada (Opcional)
                        </p>
                    ) : null}

                    {showForm && (
                        <div className="border rounded-lg p-4 bg-muted/30">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-medium">
                                    {editItem ? 'Editar Experiencia' : 'Nueva Experiencia'}
                                </h4>
                                <Button variant="ghost" size="sm" onClick={handleCancel}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <Label>Empresa *</Label>
                                    <Input
                                        value={formData.empresa}
                                        onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                                        placeholder="Nombre de la empresa"
                                    />
                                </div>

                                <div>
                                    <Label>Cargo *</Label>
                                    <Input
                                        value={formData.cargo}
                                        onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                                        placeholder="Ej: Desarrollador Senior, Gerente de Proyectos..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Fecha Inicio</Label>
                                        <Input
                                            type="date"
                                            value={formData.fecha_inicio}
                                            onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <Label>Fecha Fin (deje vacío si es actual)</Label>
                                        <Input
                                            type="date"
                                            value={formData.fecha_fin}
                                            onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-4">
                                    <Button variant="outline" onClick={handleCancel}>
                                        Cancelar
                                    </Button>
                                    <Button onClick={handleSave} disabled={saving}>
                                        {saving ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Guardando...
                                            </>
                                        ) : (
                                            editItem ? 'Actualizar' : 'Guardar'
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
