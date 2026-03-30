import type { ElementType } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export interface PendingItem {
    id: number;
    primary: string;
    secondary?: string;
}

interface PendingItemsListProps {
    title: string;
    icon: ElementType;
    iconBg: string;
    iconColor: string;
    count: number;
    countColor: string;
    items: PendingItem[];
    viewAllTo: string;
    viewAllLabel?: string;
    /** When provided, each item becomes a clickeable Link */
    itemLinkTo?: (id: number) => string;
    loading: boolean;
    className?: string;
}

export function PendingItemsList({
    title,
    icon: Icon,
    iconBg,
    iconColor,
    count,
    countColor,
    items,
    viewAllTo,
    viewAllLabel = "Ver todos",
    itemLinkTo,
    loading,
    className,
}: PendingItemsListProps) {
    return (
        <Card className={`p-5 flex-1 ${className ?? ""}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className={`${iconBg} p-1.5 rounded-lg`}>
                        <Icon size={16} className={iconColor} />
                    </div>
                    <span className="text-[13px] font-semibold text-foreground">{title}</span>
                </div>
                <Link
                    to={viewAllTo}
                    className="text-[11px] text-primary font-medium hover:underline flex items-center gap-1"
                >
                    {viewAllLabel} <ArrowUpRight size={11} />
                </Link>
            </div>

            {loading ? (
                <Skeleton className="h-5 w-16 mb-2" />
            ) : (
                <p className={`text-[28px] font-bold tabular-nums leading-none mb-3 ${countColor}`}>
                    {count}
                </p>
            )}

            {!loading && items.length > 0 && (
                <ul className="space-y-1.5">
                    {items.map((item) => {
                        const inner = (
                            <>
                                <span className="text-[12px] text-foreground truncate flex-1">
                                    {item.primary}
                                </span>
                                {item.secondary && (
                                    <span className="text-[11px] text-muted-foreground shrink-0">
                                        {item.secondary}
                                    </span>
                                )}
                            </>
                        );

                        if (itemLinkTo) {
                            return (
                                <li key={item.id}>
                                    <Link
                                        to={itemLinkTo(item.id)}
                                        className="flex items-center justify-between gap-2 rounded px-1 -mx-1 py-0.5 hover:bg-muted/50 transition-colors"
                                    >
                                        {inner}
                                    </Link>
                                </li>
                            );
                        }

                        return (
                            <li key={item.id} className="flex items-center justify-between gap-2">
                                {inner}
                            </li>
                        );
                    })}
                </ul>
            )}
        </Card>
    );
}
