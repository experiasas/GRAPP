import { useState, useEffect } from 'react';
import { Languages, Plus, Pencil, Trash2, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { terceroAPI } from '@/lib/api';

interface Idioma {
    code: string;
    nombre: string;
}

interface TerceroIdioma {
    id: number;
    idioma: Idioma;
    nivel: string;
    nivel_display: string;
}

interface IdiomasSectionProps {
    terceroId: number;
    onUpdate?: () => void;
}

const NIVELES = [
    { value: 'BASICO', label: 'Básico' },
    { value: 'INTERMEDIO', label: 'Intermedio' },
    { value: 'AVANZADO', label: 'Avanzado' },
    { value: 'NATIVO', label: 'Nativo' },
];

export default function IdiomasSection({ terceroId, onUpdate }: IdiomasSectionProps) {
    const [idiomas, setIdiomas] = useState<TerceroIdioma[]>([]);
    const [idiomasCatalog, setIdiomasCatalog] = useState<Idioma[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState<TerceroIdioma | null>(null);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        idioma_code: '',
        nivel: '',
    });

    useEffect(() => {
        loadData();
    }, [terceroId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [idiomasData, catalogData] = await Promise.all([
                terceroAPI.idiomas.list(terceroId),
                terceroAPI.getIdiomasCatalog(),
            ]);
            setIdiomas(idiomasData);
            setIdiomasCatalog(catalogData);
        } catch (error) {
            console.error('Error loading idiomas:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (item: TerceroIdioma) => {
        setEditItem(item);
        setFormData({
            idioma_code: item.idioma.code,
            nivel: item.nivel,
        });
        setShowForm(true);
    };

    const handleAdd = () => {
        setEditItem(null);
        setFormData({ idioma_code: '', nivel: '' });
        setShowForm(true);
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditItem(null);
        setFormData({ idioma_code: '', nivel: '' });
    };

    const handleSave = async () => {
        if (!formData.idioma_code || !formData.nivel) {
            alert('Complete todos los campos');
            return;
        }

        setSaving(true);
        try {
            if (editItem) {
                await terceroAPI.idiomas.update(terceroId, editItem.id, formData);
            } else {
                await terceroAPI.idiomas.create(terceroId, formData);
            }
            await loadData();
            onUpdate?.();
            handleCancel();
        } catch (error) {
            console.error('Error saving idioma:', error);
            alert('Error al guardar el idioma');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Está seguro de eliminar este idioma?')) return;

        try {
            await terceroAPI.idiomas.delete(terceroId, id);
            await loadData();
            onUpdate?.();
        } catch (error) {
            console.error('Error deleting idioma:', error);
            alert('Error al eliminar el idioma');
        }
    };

    // Filtrar idiomas ya agregados
    const availableIdiomas = idiomasCatalog.filter(
        cat => !idiomas.some(i => i.idioma.code === cat.code) || (editItem && editItem.idioma.code === cat.code)
    );

    return (
        <div className="bg-card border rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Languages className="w-5 h-5" />
                    Idiomas
                </h3>
                {!showForm && (
                    <Button onClick={handleAdd} size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Idioma
                    </Button>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <>
                    {idiomas.length > 0 ? (
                        <div className="space-y-3 mb-4">
                            {idiomas.map((idioma) => (
                                <div
                                    key={idioma.id}
                                    className="flex justify-between items-center p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex-1">
                                        <p className="font-medium">{idioma.idioma.nombre}</p>
                                        <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded mt-1 inline-block">
                                            {idioma.nivel_display}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="sm" onClick={() => handleEdit(idioma)}>
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(idioma.id)}>
                                            <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : !showForm ? (
                        <p className="text-center text-muted-foreground py-8">
                            No hay idiomas registrados. Agregue al menos uno para continuar.
                        </p>
                    ) : null}

                    {showForm && (
                        <div className="border rounded-lg p-4 bg-muted/30">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-medium">{editItem ? 'Editar Idioma' : 'Nuevo Idioma'}</h4>
                                <Button variant="ghost" size="sm" onClick={handleCancel}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <Label>Idioma *</Label>
                                    <Select
                                        value={formData.idioma_code}
                                        onValueChange={(value) => setFormData({ ...formData, idioma_code: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione idioma" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableIdiomas.map((idioma) => (
                                                <SelectItem key={idioma.code} value={idioma.code}>
                                                    {idioma.nombre}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

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
