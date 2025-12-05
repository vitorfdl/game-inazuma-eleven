import { ExternalLink, Info } from "lucide-react";
import type { MouseEvent } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { getPassiveBuildLabel, PassiveBadge } from "@/components/passives/PassiveBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getElementIcon, getPositionColor } from "@/lib/icon-picker";
import { mapToElementType, mapToTeamPosition, type PlayerRecord } from "@/lib/players-data";
import { cn } from "@/lib/utils";

export type PlayerMetric = {
	label: string;
	value: string | number;
};

export type PlayerDetailsDialogProps = {
	player: PlayerRecord | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	statMetrics: PlayerMetric[];
	powerMetrics: PlayerMetric[];
};

export function PlayerDetailsDialog({ player, open, onOpenChange, statMetrics, powerMetrics }: PlayerDetailsDialogProps) {
	if (!player) {
		return null;
	}

	const howToObtain = player.howToObtainMarkdown?.trim() || "_Acquisition info coming soon._";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="!max-w-4xl max-h-[90vh] gap-6 overflow-y-auto hm-scrollbar">
				<DialogHeader className="space-y-1">
					<DialogTitle className="text-xl font-semibold">{player.name}</DialogTitle>
				</DialogHeader>
				<div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
					<div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/20 p-3">
						<img src={player.safeImage} alt={player.name} className="h-48 w-48 rounded-xl border object-cover" />
						<div className="flex flex-wrap justify-center gap-1 text-xs">
							<PositionBadge position={player.position} />
							<ElementBadge element={player.element} />
							<Badge variant="outline" className="px-2 py-0.5">
								{player.role}
							</Badge>
							<PassiveBadge label={getPassiveBuildLabel(player.affinity)} buildType={player.affinity} />
						</div>

						<div className="text-center text-xs text-muted-foreground">Game: {player.game}</div>

						<div className="text-center text-xs text-muted-foreground">
							<span className="font-semibold">{player.ageGroup}</span> · {player.year} · {player.gender || "Unknown"}
						</div>

						{player.inazugleLink ? (
							<Button asChild variant="outline" size="sm" className="w-full justify-center text-xs">
								<a href={player.inazugleLink} target="_blank" rel="noreferrer noopener">
									<ExternalLink className="size-3.5" aria-hidden="true" />
									View 3D model
								</a>
							</Button>
						) : null}
					</div>
					<div className="space-y-4">
						<MetricSection title="Base stats" metrics={statMetrics} />
						<MetricSection title="AT / DF" metrics={powerMetrics} />
					</div>
				</div>
				<div className="space-y-2">
					<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">How to obtain</h3>
					<div className="rounded-lg border bg-background/70 p-4 text-sm">
						<div className="space-y-3 leading-relaxed">
							<ReactMarkdown components={markdownComponents}>{howToObtain}</ReactMarkdown>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

export function PlayerDetailsButton({ onClick }: { onClick: () => void }) {
	const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
		event.stopPropagation();
		onClick();
	};

	return (
		<Button
			type="button"
			size="icon"
			variant="ghost"
			className="size-8 text-muted-foreground hover:text-primary"
			onClick={handleClick}
			aria-label="View player acquisition details"
		>
			<Info className="size-4" aria-hidden="true" />
			<span className="sr-only">View acquisition details</span>
		</Button>
	);
}

export function PositionBadge({ position }: { position: string }) {
	const teamPosition = mapToTeamPosition(position);
	const colors = getPositionColor(teamPosition);

	return (
		<span
			className="inline-flex min-w-[44px] items-center justify-center rounded-sm border-[2px] border-black/70 px-2.5 py-[2px] text-[10px] font-semibold uppercase tracking-wide text-white shadow-[0_4px_0_rgba(0,0,0,0.35)] dark:border-white/60"
			style={{
				background: colors.gradient ?? colors.primary,
			}}
		>
			{position}
		</span>
	);
}

export function ElementBadge({ element }: { element: string }) {
	const elementType = mapToElementType(element);
	const definition = getElementIcon(elementType);
	const Icon = definition.icon;

	return (
		<span
			className="inline-flex items-center justify-center rounded-full border-[2px] border-black/70 p-1.5 shadow-[0_6px_0_rgba(0,0,0,0.35)] dark:border-white/60"
			style={{
				backgroundColor: definition.color,
			}}
		>
			{Icon ? (
				<Icon className="size-3 text-white" aria-hidden="true" />
			) : definition.assetPath ? (
				<img src={definition.assetPath} alt="" className="size-3" aria-hidden="true" />
			) : null}
			<span className="sr-only">{element}</span>
		</span>
	);
}

type MetricSectionProps = {
	title: string;
	metrics: PlayerMetric[];
};

function MetricSection({ title, metrics }: MetricSectionProps) {
	return (
		<div className="space-y-2">
			<div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
			<div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
				{metrics.map((metric) => (
					<div key={metric.label} className="rounded-md border bg-card/70 p-2 shadow-sm">
						<div className="text-[10px] font-semibold uppercase text-muted-foreground">{metric.label}</div>
						<div className="font-mono text-base font-semibold">{metric.value}</div>
					</div>
				))}
			</div>
		</div>
	);
}

const markdownComponents: Components = {
	h1: ({ className, children, ...props }) => (
		<div className="space-y-1">
			<div className={cn("border-l-4 border-primary pl-3 text-lg font-semibold text-foreground", className)} {...props}>
				{children}
			</div>
		</div>
	),
	h2: ({ className, children, ...props }) => (
		<div className={cn("border-l-4 border-primary/60 pl-2 text-base font-semibold text-foreground", className)} {...props}>
			{children}
		</div>
	),
	h3: ({ className, children, ...props }) => (
		<div className={cn("text-sm font-semibold uppercase tracking-wide text-primary", className)} {...props}>
			{children}
		</div>
	),
	h4: ({ className, children, ...props }) => (
		<div className={cn("text-sm font-semibold text-foreground", className)} {...props}>
			{children}
		</div>
	),
	p: ({ className, ...props }) => <p className={cn("leading-relaxed text-sm text-muted-foreground", className)} {...props} />,
	ul: ({ className, ...props }) => <ul className={cn("flex flex-wrap gap-2 rounded-lg bg-muted/40 p-2 text-sm", className)} {...props} />,
	ol: ({ className, ...props }) => <ol className={cn("flex flex-wrap gap-2 rounded-lg bg-muted/40 p-2 text-sm", className)} {...props} />,
	li: ({ className, children, ...props }) => (
		<li className={cn("list-none", className)} {...props}>
			<span className="rounded-full border bg-card/80 px-3 py-1 text-sm font-medium text-foreground shadow-sm">{children}</span>
		</li>
	),
	a: ({ className, ...props }) => <a className={cn("text-primary underline decoration-primary/40 underline-offset-2", className)} {...props} />,
};
