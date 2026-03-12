import { useState, useEffect } from 'react';
import { BookOpen, Plus, Pencil, Trash2, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppAlert } from '@/components/ui/app-alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { terceroAPI } from '@/lib/api';

interface Curso {
    id: number;
    nombre: string;
    entidad: string;
    horas: number | null;
    soporte: string | null;
}

interface CursosSectionProps {
    terceroId: number;
    onUpdate?: () => void;
}

export default function CursosSection({ terceroId, onUpdate }: CursosSectionProps) {
    const [cursos, setCursos] = useState<Curso[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState<Curso | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmId, setConfirmId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        nombre: '',
        entidad: '',
        horas: '',
    });

    useEffect(() => {
        loadCursos();
    }, [terceroId]);

    const loadCursos = async () => {
        setLoading(true);
        try {
            const data = await terceroAPI.cursos.list(terceroId);
            setCursos(data);
        } catch (error) {
            console.error('Error loading cursos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (item: Curso) => {
        setEditItem(item);
        setFormData({
            nombre: item.nombre,
            entidad: item.entidad,
            horas: item.horas?.toString() || '',
        });
        setShowForm(true);
    };

    const handleAdd = () => {
        setEditItem(null);
        setError(null);
        setFormData({ nombre: '', entidad: '', horas: '' });
        setShowForm(true);
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditItem(null);
        setError(null);
        setFormData({ nombre: '', entidad: '', horas: '' });
    };

    const handleSave = async () => {
        if (!formData.nombre || !formData.entidad) {
            setError('Complete los campos obligatorios');
            return;
        }

        setSaving(true);
        setError(null);
        try {
            const payload = {
                nombre: formData.nombre,
                entidad: formData.entidad,
                horas: formData.horas ? parseInt(formData.horas) : null,
            };

            if (editItem) {
                await terceroAPI.cursos.update(terceroId, editItem.id, payload);
            } else {
                await terceroAPI.cursos.create(terceroId, payload);
            }
            await loadCursos();
            onUpdate?.();
            handleCancel();
        } catch (error) {
            console.error('Error saving curso:', error);
            setError('Error al guardar el curso');
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
            await terceroAPI.cursos.delete(terceroId, id);
            await loadCursos();
            onUpdate?.();
        } catch (error) {
            console.error('Error deleting curso:', error);
            setError('Error al eliminar el curso');
        }
    };

    return (
        <div className="bg-card border rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Cursos y Capacitaciones
                </h3>
                {!showForm && (
                    <Button onClick={handleAdd} size="sm" variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Curso
                    </Button>
                )}
            </div>

            <ConfirmDialog
                open={confirmId !== null}
                description="¿Está seguro de eliminar este curso? Esta acción no se puede deshacer."
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
                    {cursos.length > 0 ? (
                        <div className="space-y-3 mb-4">
                            {cursos.map((curso) => (
                                <div
                                    key={curso.id}
                                    className="flex justify-between items-start p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex-1">
                                        <p className="font-medium">{curso.nombre}</p>
                                        <p className="text-sm text-muted-foreground">{curso.entidad}</p>
                                        {curso.horas && (
                                            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded mt-2 inline-block">
                                                {curso.horas} horas
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                        <Button variant="ghost" size="sm" onClick={() => handleEdit(curso)}>
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(curso.id)}>
                                            <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : !showForm ? (
                        <p className="text-center text-muted-foreground py-8 text-sm">
                            No hay cursos registrados (Opcional)
                        </p>
                    ) : null}

                    {showForm && (
                        <div className="border rounded-lg p-4 bg-muted/30">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-medium">{editItem ? 'Editar Curso' : 'Nuevo Curso'}</h4>
                                <Button variant="ghost" size="sm" onClick={handleCancel}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            {error && (
                                <AppAlert type="error" description={error} className="mb-4" />
                            )}

                            <div className="space-y-4">
                                <div>
                                    <Label>Nombre del Curso *</Label>
                                    <Input
                                        value={formData.nombre}
                                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                        placeholder="Ej: Seguridad y Salud en el Trabajo"
                                    />
                                </div>

                                <div>
                                    <Label>Entidad/Institución *</Label>
                                    <Input
                                        value={formData.entidad}
                                        onChange={(e) => setFormData({ ...formData, entidad: e.target.value })}
                                        placeholder="Ej: SENA, Universidad del Valle, Instituto Gran Colombia..."
                                    />
                                </div>

                                <div>
                                    <Label>Horas de Duración</Label>
                                    <Input
                                        type="number"
                                        value={formData.horas}
                                        onChange={(e) => setFormData({ ...formData, horas: e.target.value })}
                                        placeholder="Ej: 40"
                                    />
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
