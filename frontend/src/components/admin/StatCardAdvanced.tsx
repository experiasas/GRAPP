import type { ElementType } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface TrendProps {
    value: number;   // percentage, e.g. 12.5 or -8.0
    label?: string;  // e.g. "vs mes anterior"
}

interface StatCardAdvancedProps {
    icon: ElementType;
    iconBg: string;
    iconColor: string;
    value: string | number;
    label: string;
    secondary?: string;
    trend?: TrendProps;
    loading?: boolean;
    className?: string;
}

export function StatCardAdvanced({
    icon: Icon,
    iconBg,
    iconColor,
    value,
    label,
    secondary,
    trend,
    loading,
    className,
}: StatCardAdvancedProps) {
    const trendDir = trend
        ? trend.value > 0 ? "up" : trend.value < 0 ? "down" : "neutral"
        : "neutral";

    const TREND_STYLES = {
        up:      { cls: "bg-success/10 text-success",         symbol: "▲" },
        down:    { cls: "bg-destructive/10 text-destructive", symbol: "▼" },
        neutral: { cls: "bg-muted text-muted-foreground",     symbol: "=" },
    };

    return (
        <Card className={`p-5 border border-border bg-card rounded-xl shadow-sm ${className ?? ""}`}>
            <div className="flex items-start justify-between mb-4">
                <div className={`${iconBg} w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <Icon size={18} className={iconColor} />
                </div>

                {trend !== undefined && (
                    <span
                        className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded ${TREND_STYLES[trendDir].cls}`}
                    >
                        {TREND_STYLES[trendDir].symbol} {Math.abs(trend.value).toFixed(0)}%
                        {trend.label && (
                            <span className="font-normal opacity-70 ml-0.5">{trend.label}</span>
                        )}
                    </span>
                )}
            </div>

            {loading ? (
                <div className="space-y-1.5">
                    <Skeleton className="h-8 w-28" />
                    <Skeleton className="h-4 w-20" />
                    {secondary && <Skeleton className="h-3 w-16" />}
                </div>
            ) : (
                <>
                    <p className="text-[26px] font-bold text-foreground tabular-nums leading-tight">
                        {value}
                    </p>
                    <p className="text-[12px] text-muted-foreground mt-1">{label}</p>
                    {secondary && (
                        <p className="text-[11px] text-muted-foreground/70 mt-0.5">{secondary}</p>
                    )}
                </>
            )}
        </Card>
    );
}
