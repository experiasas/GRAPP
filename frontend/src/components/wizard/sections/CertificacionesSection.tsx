import { useState, useEffect } from 'react';
import { Award, Plus, Pencil, Trash2, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { terceroAPI } from '@/lib/api';

interface Certificacion {
    id: number;
    nombre: string;
    fabricante: string;
    fecha: string | null;
    soporte: string | null;
}

interface CertificacionesSectionProps {
    terceroId: number;
    onUpdate?: () => void;
}

export default function CertificacionesSection({ terceroId, onUpdate }: CertificacionesSectionProps) {
    const [certificaciones, setCertificaciones] = useState<Certificacion[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState<Certificacion | null>(null);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        nombre: '',
        fabricante: '',
        fecha: '',
    });

    useEffect(() => {
        loadCertificaciones();
    }, [terceroId]);

    const loadCertificaciones = async () => {
        setLoading(true);
        try {
            const data = await terceroAPI.certificaciones.list(terceroId);
            setCertificaciones(data);
        } catch (error) {
            console.error('Error loading certificaciones:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (item: Certificacion) => {
        setEditItem(item);
        setFormData({
            nombre: item.nombre,
            fabricante: item.fabricante,
            fecha: item.fecha || '',
        });
        setShowForm(true);
    };

    const handleAdd = () => {
        setEditItem(null);
        setFormData({ nombre: '', fabricante: '', fecha: '' });
        setShowForm(true);
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditItem(null);
        setFormData({ nombre: '', fabricante: '', fecha: '' });
    };

    const handleSave = async () => {
        if (!formData.nombre || !formData.fabricante) {
            alert('Complete los campos obligatorios');
            return;
        }

        setSaving(true);
        try {
            if (editItem) {
                await terceroAPI.certificaciones.update(terceroId, editItem.id, formData);
            } else {
                await terceroAPI.certificaciones.create(terceroId, formData);
            }
            await loadCertificaciones();
            onUpdate?.();
            handleCancel();
        } catch (error) {
            console.error('Error saving certificacion:', error);
            alert('Error al guardar la certificación');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Está seguro de eliminar esta certificación?')) return;

        try {
            await terceroAPI.certificaciones.delete(terceroId, id);
            await loadCertificaciones();
            onUpdate?.();
        } catch (error) {
            console.error('Error deleting certificacion:', error);
            alert('Error al eliminar la certificación');
        }
    };

    return (
        <div className="bg-card border rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Certificaciones
                </h3>
                {!showForm && (
                    <Button onClick={handleAdd} size="sm" variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Certificación
                    </Button>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <>
                    {certificaciones.length > 0 ? (
                        <div className="space-y-3 mb-4">
                            {certificaciones.map((cert) => (
                                <div
                                    key={cert.id}
                                    className="flex justify-between items-start p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex-1">
                                        <p className="font-medium">{cert.nombre}</p>
                                        <p className="text-sm text-muted-foreground">{cert.fabricante}</p>
                                        {cert.fecha && (
                                            <span className="text-xs text-muted-foreground mt-1 inline-block">
                                                {new Date(cert.fecha).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                        <Button variant="ghost" size="sm" onClick={() => handleEdit(cert)}>
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(cert.id)}>
                                            <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : !showForm ? (
                        <p className="text-center text-muted-foreground py-8 text-sm">
                            No hay certificaciones registradas (Opcional)
                        </p>
                    ) : null}

                    {showForm && (
                        <div className="border rounded-lg p-4 bg-muted/30">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-medium">
                                    {editItem ? 'Editar Certificación' : 'Nueva Certificación'}
                                </h4>
                                <Button variant="ghost" size="sm" onClick={handleCancel}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <Label>Nombre de la Certificación *</Label>
                                    <Input
                                        value={formData.nombre}
                                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                        placeholder="Ej: AWS Certified Solutions Architect"
                                    />
                                </div>

                                <div>
                                    <Label>Fabricante/Emisor *</Label>
                                    <Input
                                        value={formData.fabricante}
                                        onChange={(e) => setFormData({ ...formData, fabricante: e.target.value })}
                                        placeholder="Ej: Amazon Web Services, Microsoft, Google..."
                                    />
                                </div>

                                <div>
                                    <Label>Fecha de Emisión</Label>
                                    <Input
                                        type="date"
                                        value={formData.fecha}
                                        onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
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
