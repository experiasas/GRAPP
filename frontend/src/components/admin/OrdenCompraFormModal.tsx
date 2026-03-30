import { useState, useEffect } from "react";
import { X, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api";
import {
    adminOrdenesCompraAPI,
    type EstadoOC,
    ESTADO_OC_LABELS,
} from "@/lib/adminOrdenesCompraApi";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

interface SelectOption { id: number; label: string }

async function loadOptions(url: string, labelFn: (item: any) => string): Promise<SelectOption[]> {
    const res = await apiClient.get(url).then(r => r.data);
    const items = res.results ?? res;
    return items.map((item: any) => ({ id: item.id, label: labelFn(item) }));
}

interface ItemRow { descripcion: string; cantidad: string; valor_unitario: string }

interface Props {
    open: boolean;
    ocId: number | null;   // null = crear
    onClose: () => void;
    onSaved: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────────

export function OrdenCompraFormModal({ open, ocId, onClose, onSaved }: Props) {
    // Catálogos
    const [terceros,  setTerceros]  = useState<SelectOption[]>([]);
    const [empresas,  setEmpresas]  = useState<SelectOption[]>([]);
    const [contratos, setContratos] = useState<SelectOption[]>([]);
    const [loadingCat, setLoadingCat] = useState(false);

    // Campos del formulario
    const [terceroId,      setTerceroId]      = useState("");
    const [empresaId,      setEmpresaId]      = useState("");
    const [contratoId,     setContratoId]     = useState("");
    const [numeroOc,       setNumeroOc]       = useState("");
    const [objeto,         setObjeto]         = useState("");
    const [valorSinIva,    setValorSinIva]    = useState("");
    const [ivaPorcentaje,  setIvaPorcentaje]  = useState("0");
    const [fechaEmision,   setFechaEmision]   = useState("");
    const [fechaEntrega,   setFechaEntrega]   = useState("");
    const [estadoOc,       setEstadoOc]       = useState<EstadoOC>("BORRADOR");
    const [items,          setItems]          = useState<ItemRow[]>([]);

    // UI
    const [saving,  setSaving]  = useState(false);
    const [error,   setError]   = useState<string | null>(null);
    const [loadingOC, setLoadingOC] = useState(false);

    const valorSinIvaNum = parseFloat(valorSinIva) || 0;
    const ivaPct         = parseFloat(ivaPorcentaje) || 0;
    const ivaEnPesos     = valorSinIvaNum * ivaPct / 100;
    const valorTotal     = valorSinIvaNum + ivaEnPesos;

    const IVA_RAPIDOS = [0, 5, 10, 19];

    // Cargar catálogos al abrir
    useEffect(() => {
        if (!open) return;
        setLoadingCat(true);
        Promise.all([
            loadOptions("/api/admin/terceros/?page_size=300&estado=APROBADO", t =>
                `${t.nombre_completo} — ${t.numero_documento}`
            ),
            loadOptions("/api/admin/empresas/?page_size=100", e => `${e.nombre} (${e.nit})`),
            loadOptions("/api/admin/contratos/?page_size=300", c => `${c.numero} — ${(c.objeto ?? "").slice(0, 60)}`),
        ]).then(([t, e, c]) => {
            setTerceros(t);
            setEmpresas(e);
            setContratos(c);
        }).finally(() => setLoadingCat(false));
    }, [open]);

    // Cargar OC en modo edición
    useEffect(() => {
        if (!open || !ocId) {
            resetForm();
            return;
        }
        setLoadingOC(true);
        adminOrdenesCompraAPI.get(ocId).then(oc => {
            setTerceroId(String(oc.tercero.id));
            setEmpresaId(String(oc.empresa.id));
            setContratoId(oc.contrato ? String(oc.contrato.id) : "");
            setNumeroOc(oc.numero_oc);
            setObjeto(oc.objeto);
            setValorSinIva(oc.valor_sin_iva);
            // Retrocomputar porcentaje desde el valor en pesos guardado
            const sinIva = parseFloat(oc.valor_sin_iva) || 0;
            const ivaPesos = parseFloat(oc.iva) || 0;
            const pct = sinIva > 0 ? Math.round((ivaPesos / sinIva) * 100) : 0;
            setIvaPorcentaje(String(pct));
            setFechaEmision(oc.fecha_emision);
            setFechaEntrega(oc.fecha_entrega ?? "");
            setEstadoOc(oc.estado);
            setItems(oc.items.map(i => ({
                descripcion: i.descripcion,
                cantidad: i.cantidad,
                valor_unitario: i.valor_unitario,
            })));
            setError(null);
        }).finally(() => setLoadingOC(false));
    }, [open, ocId]);

    function resetForm() {
        setTerceroId(""); setEmpresaId(""); setContratoId("");
        setNumeroOc(""); setObjeto(""); setValorSinIva(""); setIvaPorcentaje("0");
        setFechaEmision(""); setFechaEntrega(""); setEstadoOc("BORRADOR");
        setItems([]); setError(null);
    }

    // Items
    function addItem() {
        setItems(prev => [...prev, { descripcion: "", cantidad: "1", valor_unitario: "0" }]);
    }
    function removeItem(idx: number) {
        setItems(prev => prev.filter((_, i) => i !== idx));
    }
    function updateItem(idx: number, field: keyof ItemRow, val: string) {
        setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!terceroId || !empresaId || !objeto || !valorSinIva || !fechaEmision) {
            setError("Tercero, empresa, objeto, valor sin IVA y fecha de emisión son obligatorios.");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const payload = {
                tercero:      Number(terceroId),
                empresa:      Number(empresaId),
                contrato:     contratoId ? Number(contratoId) : null,
                numero_oc:    numeroOc,
                objeto,
                valor_sin_iva: parseFloat(valorSinIva),
                iva:          ivaEnPesos,
                valor_total:  valorTotal,
                fecha_emision: fechaEmision,
                fecha_entrega: fechaEntrega || null,
                estado:       estadoOc,
                items: items.filter(i => i.descripcion).map(i => ({
                    descripcion:    i.descripcion,
                    cantidad:       parseFloat(i.cantidad) || 1,
                    valor_unitario: parseFloat(i.valor_unitario) || 0,
                })),
            };
            if (ocId) {
                await adminOrdenesCompraAPI.update(ocId, payload);
            } else {
                await adminOrdenesCompraAPI.create(payload);
            }
            onSaved();
            onClose();
        } catch (err: unknown) {
            const data = (err as { response?: { data?: any } })?.response?.data;
            if (typeof data === "string") setError(data);
            else if (data?.error) setError(data.error);
            else if (data?.detail) setError(data.detail);
            else setError("No se pudo guardar la órden de compra.");
        } finally {
            setSaving(false);
        }
    }

    if (!open) return null;

    return (
        <>
            {/* Overlay */}
            <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40" onClick={onClose} />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
                <div className="relative w-full max-w-2xl bg-background rounded-xl border border-border shadow-2xl">

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                        <h2 className="text-[16px] font-semibold text-foreground">
                            {ocId ? "Editar Orden de Compra" : "Nueva Órden de Compra"}
                        </h2>
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                            <X size={16} />
                        </button>
                    </div>

                    {loadingOC || loadingCat ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 size={24} className="animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <div className="px-6 py-5 space-y-6 max-h-[75vh] overflow-y-auto">

                                {error && (
                                    <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-[13px] text-destructive">
                                        {error}
                                    </div>
                                )}

                                {/* ── Partes ── */}
                                <fieldset className="space-y-4">
                                    <legend className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                                        Partes
                                    </legend>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-[12px]">Tercero *</Label>
                                            <select
                                                value={terceroId}
                                                onChange={e => setTerceroId(e.target.value)}
                                                required
                                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                                            >
                                                <option value="">Seleccionar proveedor…</option>
                                                {terceros.map(t => (
                                                    <option key={t.id} value={t.id}>{t.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[12px]">Empresa *</Label>
                                            <select
                                                value={empresaId}
                                                onChange={e => setEmpresaId(e.target.value)}
                                                required
                                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                                            >
                                                <option value="">Seleccionar empresa…</option>
                                                {empresas.map(e => (
                                                    <option key={e.id} value={e.id}>{e.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[12px]">Contrato vinculado (opcional)</Label>
                                        <select
                                            value={contratoId}
                                            onChange={e => setContratoId(e.target.value)}
                                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                                        >
                                            <option value="">Sin contrato</option>
                                            {contratos.map(c => (
                                                <option key={c.id} value={c.id}>{c.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </fieldset>

                                <div className="h-px bg-border" />

                                {/* ── Identificación ── */}
                                <fieldset className="space-y-4">
                                    <legend className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                                        Identificación
                                    </legend>
                                    <div className="space-y-1.5">
                                        <Label className="text-[12px]">Número OC</Label>
                                        <Input
                                            value={numeroOc}
                                            onChange={e => setNumeroOc(e.target.value)}
                                            placeholder="Auto-generado si se deja vacío"
                                            className="text-[13px]"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[12px]">Objeto *</Label>
                                        <textarea
                                            value={objeto}
                                            onChange={e => setObjeto(e.target.value)}
                                            placeholder="Descripción de los bienes o servicios a adquirir"
                                            rows={3}
                                            required
                                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                                        />
                                    </div>
                                </fieldset>

                                <div className="h-px bg-border" />

                                {/* ── Valores ── */}
                                <fieldset className="space-y-4">
                                    <legend className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                                        Valores financieros
                                    </legend>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-[12px]">Valor sin IVA *</Label>
                                            <Input
                                                type="number" min="0" step="1"
                                                value={valorSinIva}
                                                onChange={e => setValorSinIva(e.target.value)}
                                                placeholder="0"
                                                required
                                                className="text-[13px]"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[12px]">IVA</Label>
                                            {/* Botones de acceso rápido */}
                                            <div className="flex gap-1 mb-1">
                                                {IVA_RAPIDOS.map(pct => (
                                                    <button
                                                        key={pct}
                                                        type="button"
                                                        onClick={() => setIvaPorcentaje(String(pct))}
                                                        className={`flex-1 rounded border px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
                                                            ivaPorcentaje === String(pct)
                                                                ? "bg-primary text-primary-foreground border-primary"
                                                                : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
                                                        }`}
                                                    >
                                                        {pct}%
                                                    </button>
                                                ))}
                                            </div>
                                            {/* Input con sufijo % */}
                                            <div className="relative">
                                                <Input
                                                    type="number" min="0" step="0.01"
                                                    value={ivaPorcentaje}
                                                    onChange={e => setIvaPorcentaje(e.target.value)}
                                                    placeholder="0"
                                                    className="text-[13px] pr-8"
                                                />
                                                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground">%</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[12px]">Valor total</Label>
                                            <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-[13px] font-semibold text-foreground tabular-nums">
                                                {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(valorTotal)}
                                            </div>
                                            {ivaPct > 0 && valorSinIvaNum > 0 && (
                                                <p className="text-[11px] text-muted-foreground tabular-nums">
                                                    IVA: {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(ivaEnPesos)} ({ivaPct}% de {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(valorSinIvaNum)})
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </fieldset>

                                <div className="h-px bg-border" />

                                {/* ── Fechas + Estado ── */}
                                <fieldset className="space-y-4">
                                    <legend className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                                        Fechas y estado
                                    </legend>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-[12px]">Fecha de emisión *</Label>
                                            <Input
                                                type="date"
                                                value={fechaEmision}
                                                onChange={e => setFechaEmision(e.target.value)}
                                                required
                                                className="text-[13px]"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[12px]">Fecha de entrega</Label>
                                            <Input
                                                type="date"
                                                value={fechaEntrega}
                                                onChange={e => setFechaEntrega(e.target.value)}
                                                className="text-[13px]"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[12px]">Estado</Label>
                                            <select
                                                value={estadoOc}
                                                onChange={e => setEstadoOc(e.target.value as EstadoOC)}
                                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                                            >
                                                {(Object.keys(ESTADO_OC_LABELS) as EstadoOC[]).map(e => (
                                                    <option key={e} value={e}>{ESTADO_OC_LABELS[e]}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </fieldset>

                                <div className="h-px bg-border" />

                                {/* ── Ítems ── */}
                                <fieldset className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <legend className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                                            Ítems (opcional)
                                        </legend>
                                        <button
                                            type="button"
                                            onClick={addItem}
                                            className="inline-flex items-center gap-1 text-[12px] text-primary hover:underline"
                                        >
                                            <Plus size={13} /> Agregar ítem
                                        </button>
                                    </div>

                                    {items.length > 0 && (
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                                                <span className="col-span-5">Descripción</span>
                                                <span className="col-span-2 text-right">Cant.</span>
                                                <span className="col-span-3 text-right">V. Unitario</span>
                                                <span className="col-span-2" />
                                            </div>
                                            {items.map((item, idx) => (
                                                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                                                    <Input
                                                        value={item.descripcion}
                                                        onChange={e => updateItem(idx, "descripcion", e.target.value)}
                                                        placeholder="Descripción"
                                                        className="col-span-5 text-[12px] h-8"
                                                    />
                                                    <Input
                                                        type="number" min="0" step="0.01"
                                                        value={item.cantidad}
                                                        onChange={e => updateItem(idx, "cantidad", e.target.value)}
                                                        className="col-span-2 text-[12px] h-8 text-right"
                                                    />
                                                    <Input
                                                        type="number" min="0" step="1"
                                                        value={item.valor_unitario}
                                                        onChange={e => updateItem(idx, "valor_unitario", e.target.value)}
                                                        className="col-span-3 text-[12px] h-8 text-right"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(idx)}
                                                        className="col-span-2 flex justify-center text-muted-foreground hover:text-destructive transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </fieldset>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
                                <Button type="button" variant="outline" onClick={onClose}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {saving && <Loader2 size={14} className="animate-spin mr-2" />}
                                    {ocId ? "Guardar cambios" : "Crear OC"}
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </>
    );
}
