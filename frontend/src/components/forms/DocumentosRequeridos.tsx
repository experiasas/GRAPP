import { useState } from 'react';
import { FileText, Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export interface DocumentoRequerido {
    documento_tipo_code: string;
    documento_tipo_nombre: string;
    obligatorio: boolean;
    aplica_a_persona: "NATURAL" | "JURIDICA" | "AMBAS";
}

export interface DocumentoUploadStatus {
    file?: File;
    status: 'pending' | 'uploading' | 'success' | 'error';
    error?: string;
}

interface DocumentosRequeridosProps {
    documentos: DocumentoRequerido[];
    onChange: (files: Record<string, File>) => void;
    uploadStatus?: Record<string, DocumentoUploadStatus>;
}

export function DocumentosRequeridos({
    documentos,
    onChange,
    uploadStatus
}: DocumentosRequeridosProps) {
    const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});

    const handleFileChange = (code: string, file: File | null) => {
        const newFiles = { ...selectedFiles };

        if (file) {
            newFiles[code] = file;
        } else {
            delete newFiles[code];
        }

        setSelectedFiles(newFiles);
        onChange(newFiles);
    };

    const getStatusIcon = (code: string) => {
        const status = uploadStatus?.[code];

        if (!status) return null;

        switch (status.status) {
            case 'uploading':
                return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
            case 'success':
                return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case 'error':
                return <AlertCircle className="w-5 h-5 text-destructive" />;
            default:
                return null;
        }
    };

    const obligatorios = documentos.filter(d => d.obligatorio);
    const opcionales = documentos.filter(d => !d.obligatorio);

    const renderDocumento = (doc: DocumentoRequerido) => {
        const status = uploadStatus?.[doc.documento_tipo_code];
        const isDisabled = status?.status === 'uploading' || status?.status === 'success';

        return (
            <div
                key={doc.documento_tipo_code}
                className="p-4 border border-border rounded-lg hover:border-primary/50 transition-colors"
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <Label
                                htmlFor={doc.documento_tipo_code}
                                className="font-medium text-foreground"
                            >
                                {doc.documento_tipo_nombre}
                            </Label>
                            {doc.obligatorio && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-destructive/10 text-destructive rounded">
                                    Obligatorio
                                </span>
                            )}
                        </div>

                        <Input
                            id={doc.documento_tipo_code}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            disabled={isDisabled}
                            onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                handleFileChange(doc.documento_tipo_code, file);
                            }}
                            className="cursor-pointer file:cursor-pointer"
                        />

                        {status?.error && (
                            <p className="text-sm text-destructive mt-2">
                                {status.error}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center justify-center w-8 h-8">
                        {getStatusIcon(doc.documento_tipo_code)}
                    </div>
                </div>
            </div>
        );
    };

    if (documentos.length === 0) {
        return null;
    }

    return (
        <div className="form-section">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h3 className="font-semibold text-foreground">Documentos Requeridos</h3>
                    <p className="text-sm text-muted-foreground">
                        Adjunte los documentos necesarios según el tipo de vinculación
                    </p>
                </div>
            </div>

            {/* Documentos obligatorios */}
            {obligatorios.length > 0 && (
                <div className="space-y-4 mb-6">
                    <h4 className="text-sm font-medium text-foreground">
                        Documentos Obligatorios
                    </h4>
                    <div className="space-y-3">
                        {obligatorios.map(renderDocumento)}
                    </div>
                </div>
            )}

            {/* Documentos opcionales */}
            {opcionales.length > 0 && (
                <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">
                        Documentos Opcionales
                    </h4>
                    <div className="space-y-3">
                        {opcionales.map(renderDocumento)}
                    </div>
                </div>
            )}
        </div>
    );
}
