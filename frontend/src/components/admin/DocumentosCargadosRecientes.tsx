import { CheckCircle, Clock, XCircle, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export interface DocumentoRecienteItem {
    id: number;
    documento_tipo_code: string;
    documento_tipo_nombre: string;
    tercero_id: number;
    tercero_nombre: string;
    estado: string;
    created_at: string;
    relativo: string;
}

interface Props {
    items: DocumentoRecienteItem[];
    loading: boolean;
}

function EstadoIcon({ estado }: { estado: string }) {
    switch (estado.toUpperCase()) {
        case "CARGADO":
        case "APROBADO":
            return <CheckCircle size={16} className="text-success flex-shrink-0" />;
        case "PENDIENTE":
            return <Clock size={16} className="text-warning flex-shrink-0" />;
        case "RECHAZADO":
            return <XCircle size={16} className="text-destructive flex-shrink-0" />;
        default:
            return <FileText size={16} className="text-muted-foreground flex-shrink-0" />;
    }
}

function EstadoBadge({ estado }: { estado: string }) {
    switch (estado.toUpperCase()) {
        case "RECHAZADO":
            return <span className="text-[11px] font-medium text-destructive">Rechazado</span>;
        case "PENDIENTE":
            return <span className="text-[11px] font-medium text-warning">En revisión</span>;
        case "APROBADO":
            return <span className="text-[11px] font-medium text-success">Aprobado</span>;
        default:
            return null;
    }
}

export function DocumentosCargadosRecientes({ items, loading }: Props) {
    return (
        <Card className="p-6 rounded-xl border-border shadow-sm bg-card">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-[14px] font-semibold text-foreground">
                        Documentos cargados hoy
                    </h3>
                    <p className="text-[12px] text-muted-foreground">Últimas 48 horas</p>
                </div>
                <Link
                    to="/admin-panel/terceros"
                    className="text-[12px] text-primary font-medium hover:underline"
                >
                    Ver más →
                </Link>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex items-start gap-3 py-2">
                            <Skeleton className="w-4 h-4 rounded-full mt-0.5 flex-shrink-0" />
                            <div className="flex-1 space-y-1.5">
                                <Skeleton className="h-3.5 w-1/3" />
                                <Skeleton className="h-3 w-2/3" />
                            </div>
                            <Skeleton className="h-3 w-16 flex-shrink-0" />
                        </div>
                    ))}
                </div>
            ) : items.length === 0 ? (
                <div className="py-8 text-center">
                    <FileText size={36} className="text-muted-foreground mx-auto mb-2" />
                    <p className="text-[13px] text-muted-foreground">
                        No hay documentos cargados hoy
                    </p>
                </div>
            ) : (
                <ul>
                    {items.slice(0, 4).map((doc) => (
                        <li
                            key={doc.id}
                            className="py-3 border-b border-border last:border-b-0"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                    <div className="pt-0.5">
                                        <EstadoIcon estado={doc.estado} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-medium text-foreground">
                                            {doc.documento_tipo_nombre || doc.documento_tipo_code}
                                        </p>
                                        <p
                                            className="text-[12px] text-muted-foreground truncate"
                                            title={doc.tercero_nombre}
                                        >
                                            {doc.tercero_nombre}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-[12px] text-muted-foreground">{doc.relativo}</p>
                                    <EstadoBadge estado={doc.estado} />
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}
