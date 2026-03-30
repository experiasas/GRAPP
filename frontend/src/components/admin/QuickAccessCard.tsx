import type { ElementType } from "react";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";

export interface QuickLink {
    label: string;
    to: string;
    icon: ElementType;
    external?: boolean;
}

interface QuickAccessCardProps {
    heading: string;
    headingIcon: ElementType;
    headingColor: string;
    /** React Router route for the module landing page */
    to: string;
    links: QuickLink[];
}

export function QuickAccessCard({
    heading,
    headingIcon: HeadingIcon,
    headingColor,
    to,
    links,
}: QuickAccessCardProps) {
    return (
        <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
                <HeadingIcon size={20} className={headingColor} />
                <Link
                    to={to}
                    className="text-[14px] font-semibold text-foreground hover:text-primary transition-colors"
                >
                    {heading}
                </Link>
            </div>

            <ul className="space-y-0.5">
                {links.map((link) => {
                    const LinkIcon = link.icon;

                    if (link.external) {
                        return (
                            <li key={link.to}>
                                <a
                                    href={link.to}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors group"
                                >
                                    <LinkIcon size={16} className="shrink-0" />
                                    <span className="flex-1 truncate">{link.label}</span>
                                    <ExternalLink
                                        size={12}
                                        className="opacity-0 group-hover:opacity-60 transition-opacity"
                                    />
                                </a>
                            </li>
                        );
                    }

                    return (
                        <li key={link.to}>
                            <Link
                                to={link.to}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            >
                                <LinkIcon size={16} className="shrink-0" />
                                <span>{link.label}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </Card>
    );
}
