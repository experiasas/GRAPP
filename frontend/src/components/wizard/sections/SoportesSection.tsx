import { useState, useEffect } from 'react';
import { FileText, Plus, Trash2, Loader2, X, Upload, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { vinculacionAPI, terceroAPI } from '@/lib/api';

interface Soporte {
    id: number;
    documento_tipo_code: string;
    documento_tipo_nombre: string;
    archivo_url: string;
    estado: string;
    fecha_carga: string;
}

interface TipoDocumento {
    documento_tipo_code: string;
    documento_tipo_nombre: string;
}

interface SoportesSectionProps {
    terceroId: number;
    token?: string; // Usado para buscar los tipos de documento si es necesario
    onUpdate?: () => void;
}

export default function SoportesSection({ terceroId, token, onUpdate }: SoportesSectionProps) {
    const [soportes, setSoportes] = useState<Soporte[]>([]);
    const [tiposSoporte, setTiposSoporte] = useState<TipoDocumento[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selectedTipo, setSelectedTipo] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    useEffect(() => {
        loadData();
    }, [terceroId]);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Obtener los soportes ya cargados por el tercero
            const statusData = await terceroAPI.getStatus(terceroId);
            if (statusData && statusData.documentos && statusData.documentos.items) {
                // Adaptar los items del status a nuestro formato de Soporte
                const cargados = statusData.documentos.items
                    .filter((item: any) => item.cargado)
                    .map((item: any) => ({
                        id: item.code, // Usamos code como ID temporal si no hay ID numérico real
                        documento_tipo_code: item.code,
                        documento_tipo_nombre: item.nombre,
                        archivo_url: '',
                        estado: item.estado,
                        fecha_carga: new Date().toISOString(), // Fallback
                    }));
                setSoportes(cargados);
            }

            // 2. Obtener lista de tipos de soporte permitidos
            // Idealmente deberíamos consultar los documentos según el tipoPersona del tercero
            // Si el backend provee los catálogos en getDocumentosRequeridosFiltrados, lo usamos.
            // Para Contratistas/Aspirantes, el tipo persona es NATURAL
            if (token) {
                const reqDocs = await vinculacionAPI.getDocumentosRequeridosFiltrados(token, 'NATURAL');
                setTiposSoporte(reqDocs);
            } else {
                // Si no hay token, obtener desde la API de terceros (opcional, requiere ajuste en lib/api.ts)
                // Como fallback simulamos si falla
                console.warn("No token provided to load tipos soporte");
                // ... fallback code si no hay ruta en API
            }

        } catch (error) {
            console.error('Error loading soportes data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setSelectedTipo('');
        setSelectedFile(null);
        setShowForm(true);
    };

    const handleCancel = () => {
        setShowForm(false);
        setSelectedTipo('');
        setSelectedFile(null);
    };

    const handleSave = async () => {
        if (!selectedTipo) {
            alert('Seleccione un tipo de soporte');
            return;
        }

        if (!selectedFile) {
            alert('Seleccione un archivo para adjuntar');
            return;
        }

        setSaving(true);
        try {
            await vinculacionAPI.uploadDocumento(terceroId, selectedTipo, selectedFile);
            await loadData();
            onUpdate?.();
            handleCancel();
        } catch (error) {
            console.error('Error uploading soporte:', error);
            alert('Error al adjuntar el soporte');
        } finally {
            setSaving(false);
        }
    };

    // handleDelete se maneja de forma dummy ya que el API de documentos a menudo no soporta borrado suelto
    // a menos que se defina la ruta (ej Delete en la API principal).

    // Opción temporal: eliminar archivo si el backend tiene un endpoint, si no, lo dejamos pendiente
    const handleDelete = async (_code: string) => {
        if (!confirm('Esta opción no está soportada aún en la API básica. Por favor, sobrescriba adjuntando de nuevo.')) {
            return;
        }
    };


    return (
        <div className="bg-card border rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    <div>
                        <h3 className="text-lg font-semibold">Administración de Soportes</h3>
                        <p className="text-sm text-muted-foreground">
                            Subir información referente a reportes y/o informes médicos importantes
                        </p>
                    </div>
                </div>
                {!showForm && (
                    <Button onClick={handleAdd} size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Soporte
                    </Button>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <>
                    {/* Lista de Soportes */}
                    {soportes.length > 0 ? (
                        <div className="space-y-3 mb-4">
                            {soportes.map((soporte, idx) => (
                                <div
                                    key={idx}
                                    className="flex justify-between items-center p-4 border rounded-lg bg-background"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <FileText className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{soporte.documento_tipo_nombre}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                {soporte.estado === 'CARGADO' && (
                                                    <span className="flex items-center text-xs text-green-600 font-medium">
                                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                                        Cargado
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(soporte.documento_tipo_code)}
                                    >
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>

                                </div>
                            ))}
                        </div>
                    ) : !showForm ? (
                        <p className="text-center text-muted-foreground py-8">
                            No hay soportes adjuntos. Haga clic en "Agregar Soporte" para comenzar.
                        </p>
                    ) : null}

                    {/* Formulario */}
                    {showForm && (
                        <div className="border rounded-lg p-6 bg-muted/20">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-medium text-foreground">
                                    Nuevo Soporte
                                </h4>
                                <Button variant="ghost" size="sm" onClick={handleCancel}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="space-y-5">
                                <div>
                                    <Label className="mb-2 block text-muted-foreground">Tipo de Soporte</Label>
                                    <Select
                                        value={selectedTipo}
                                        onValueChange={setSelectedTipo}
                                    >
                                        <SelectTrigger className="w-full bg-background">
                                            <SelectValue placeholder="Seleccione el tipo de soporte" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {tiposSoporte.length > 0 ? tiposSoporte.map((tipo) => (
                                                <SelectItem key={tipo.documento_tipo_code} value={tipo.documento_tipo_code}>
                                                    {tipo.documento_tipo_nombre}
                                                </SelectItem>
                                            )) : (
                                                <SelectItem value="none" disabled>No se cargaron tipos de soporte</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label className="mb-2 block text-muted-foreground">
                                        Extensiones (Seleccione un archivo para adjuntar)
                                    </Label>
                                    <div className="border border-input rounded-md p-1 bg-background">
                                        <Input
                                            type="file"
                                            className="border-0 shadow-none hover:bg-transparent file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Formatos permitidos: .pdf, .jpg, .jpeg, .png
                                    </p>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                                        {saving ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Subiendo...
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-4 h-4 mr-2" />
                                                Adjuntar
                                            </>
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
