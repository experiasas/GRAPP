import { useState, useEffect } from 'react';
import { GraduationCap, Plus, Pencil, Trash2, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppAlert } from '@/components/ui/app-alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { terceroAPI } from '@/lib/api';

interface Estudio {
    id: number;
    nivel: string;
    nivel_display: string;
    institucion: string;
    titulo: string;
    fecha_inicio: string | null;
    fecha_fin: string | null;
    soporte: string | null;
}

interface EstudiosSectionProps {
    terceroId: number;
    onUpdate?: () => void;
}

const NIVELES = [
    { value: 'BACHILLER', label: 'Bachiller' },
    { value: 'TECNICO', label: 'Técnico' },
    { value: 'TECNOLOGO', label: 'Tecnólogo' },
    { value: 'PROFESIONAL', label: 'Profesional' },
    { value: 'POSGRADO', label: 'Posgrado' }
];

export default function EstudiosSection({ terceroId, onUpdate }: EstudiosSectionProps) {
    const [estudios, setEstudios] = useState<Estudio[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState<Estudio | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmId, setConfirmId] = useState<number | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        nivel: '',
        institucion: '',
        titulo: '',
        fecha_inicio: '',
        fecha_fin: '',
    });

    useEffect(() => {
        loadEstudios();
    }, [terceroId]);

    const loadEstudios = async () => {
        setLoading(true);
        try {
            const data = await terceroAPI.estudios.list(terceroId);
            setEstudios(data);
        } catch (error) {
            console.error('Error loading estudios:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (item: Estudio) => {
        setEditItem(item);
        setFormData({
            nivel: item.nivel,
            institucion: item.institucion,
            titulo: item.titulo,
            fecha_inicio: item.fecha_inicio || '',
            fecha_fin: item.fecha_fin || '',
        });
        setShowForm(true);
    };

    const handleAdd = () => {
        setEditItem(null);
        setError(null);
        setFormData({
            nivel: '',
            institucion: '',
            titulo: '',
            fecha_inicio: '',
            fecha_fin: '',
        });
        setShowForm(true);
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditItem(null);
        setError(null);
        setFormData({
            nivel: '',
            institucion: '',
            titulo: '',
            fecha_inicio: '',
            fecha_fin: '',
        });
    };

    const handleSave = async () => {
        if (!formData.nivel || !formData.institucion || !formData.titulo) {
            setError('Complete los campos obligatorios');
            return;
        }

        const dataToSave = {
            ...formData,
            fecha_inicio: formData.fecha_inicio || null,
            fecha_fin: formData.fecha_fin || null,
        };

        setSaving(true);
        setError(null);
        try {
            if (editItem) {
                await terceroAPI.estudios.update(terceroId, editItem.id, dataToSave);
            } else {
                await terceroAPI.estudios.create(terceroId, dataToSave);
            }
            await loadEstudios();
            onUpdate?.();
            handleCancel();
        } catch (error) {
            console.error('Error saving estudio:', error);
            setError('Error al guardar el estudio');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        setConfirmId(id);
    };

    const confirmDelete = async () => {
        if (confirmId === null) return;
        const id = confirmId;
        setConfirmId(null);
        try {
            await terceroAPI.estudios.delete(terceroId, id);
            await loadEstudios();
            onUpdate?.();
        } catch (error) {
            console.error('Error deleting estudio:', error);
            setError('Error al eliminar el estudio');
        }
    };

    return (
        <div className="bg-card border rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <GraduationCap className="w-5 h-5" />
                    Estudios
                </h3>
                {!showForm && (
                    <Button onClick={handleAdd} size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Estudio
                    </Button>
                )}
            </div>

            <ConfirmDialog
                open={confirmId !== null}
                description="¿Está seguro de eliminar este estudio? Esta acción no se puede deshacer."
                onConfirm={confirmDelete}
                onCancel={() => setConfirmId(null)}
            />

            {error && !showForm && (
                <AppAlert type="error" description={error} className="mb-4" />
            )}

            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <>
                    {/* Lista de estudios */}
                    {estudios.length > 0 ? (
                        <div className="space-y-3 mb-4">
                            {estudios.map((estudio) => (
                                <div
                                    key={estudio.id}
                                    className="flex justify-between items-start p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex-1">
                                        <p className="font-medium">{estudio.titulo}</p>
                                        <p className="text-sm text-muted-foreground">{estudio.institucion}</p>
                                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                                            <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                                                {estudio.nivel_display}
                                            </span>
                                            {estudio.fecha_inicio && (
                                                <span>
                                                    {new Date(estudio.fecha_inicio).getFullYear()}
                                                    {estudio.fecha_fin && ` - ${new Date(estudio.fecha_fin).getFullYear()}`}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEdit(estudio)}
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(estudio.id)}
                                        >
                                            <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : !showForm ? (
                        <p className="text-center text-muted-foreground py-8">
                            No hay estudios registrados. Haga clic en "Agregar Estudio" para comenzar.
                        </p>
                    ) : null}

                    {/* Formulario */}
                    {showForm && (
                        <div className="border rounded-lg p-4 bg-muted/30">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-medium">
                                    {editItem ? 'Editar Estudio' : 'Nuevo Estudio'}
                                </h4>
                                <Button variant="ghost" size="sm" onClick={handleCancel}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            {error && (
                                <AppAlert type="error" description={error} className="mb-4" />
                            )}

                            <div className="space-y-4">
                                <div>
                                    <Label>Nivel *</Label>
                                    <Select
                                        value={formData.nivel}
                                        onValueChange={(value) => setFormData({ ...formData, nivel: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione nivel" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {NIVELES.map((nivel) => (
                                                <SelectItem key={nivel.value} value={nivel.value}>
                                                    {nivel.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label>Institución *</Label>
                                    <Input
                                        value={formData.institucion}
                                        onChange={(e) => setFormData({ ...formData, institucion: e.target.value })}
                                        placeholder="Nombre de la institución"
                                    />
                                </div>

                                <div>
                                    <Label>Título *</Label>
                                    <Input
                                        value={formData.titulo}
                                        onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                                        placeholder="Título obtenido o en curso"
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
                                        <Label>Fecha Fin</Label>
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
