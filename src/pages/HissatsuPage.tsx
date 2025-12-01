import { useAtom } from "jotai";
import { ArrowDown, ArrowUp, ArrowUpDown, RotateCcw, Search } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import abilitiesJson from "@/assets/data/abilities.json?raw";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createSortedUniqueOptions, formatNumber, normalizeStat, sanitizeAttribute } from "@/lib/data-helpers";
import { type ElementType, getElementIcon, getMoveIcon, type MoveType } from "@/lib/icon-picker";
import { cn } from "@/lib/utils";
import { DEFAULT_HISSATSU_PREFERENCES, type HissatsuPreferences, type HissatsuSortKey, hissatsuPreferencesAtom } from "@/store/hissatsu";

type RawHissatsuRecord = {
	Shop: string;
	Name: string;
	Type: string;
	Element: string;
	Extra: string;
	Power: number;
	Tension: number;
};

type HissatsuMove = {
	id: string;
	order: number;
	name: string;
	type: string;
	element: string;
	shop: string;
	extras: string[];
	power: number;
	tension: number;
};

type TableColumn = {
	key: string;
	header: ReactNode;
	align?: "left" | "center" | "right";
	className?: string;
	headerClassName?: string;
	sortKey?: HissatsuSortKey;
	render: (item: HissatsuMove) => ReactNode;
};

const rawRecords = JSON.parse(abilitiesJson) as RawHissatsuRecord[];

const hissatsuDataset: HissatsuMove[] = rawRecords.map((record, index) => {
	const extras = extractExtras(record.Extra);
	return {
		id: `hissatsu-${index + 1}`,
		order: index + 1,
		name: sanitizeAttribute(record.Name),
		type: sanitizeAttribute(record.Type),
		element: sanitizeAttribute(record.Element),
		shop: sanitizeAttribute(record.Shop),
		extras,
		power: normalizeStat(record.Power),
		tension: normalizeStat(record.Tension),
	};
});

const typeOptions = createSortedUniqueOptions(hissatsuDataset.map((item) => item.type));
const elementOptions = createSortedUniqueOptions(hissatsuDataset.map((item) => item.element));
const shopOptions = createSortedUniqueOptions(hissatsuDataset.map((item) => item.shop));
const extraOptions = Array.from(new Set(hissatsuDataset.flatMap((item) => item.extras))).sort((a, b) => a.localeCompare(b));

const metricAccessors: Record<HissatsuSortKey, (item: HissatsuMove) => string | number> = {
	order: (item) => item.order,
	name: (item) => item.name,
	type: (item) => item.type,
	element: (item) => item.element,
	shop: (item) => item.shop,
	power: (item) => item.power,
	tension: (item) => item.tension,
};

const typeBadgeClasses: Record<string, string> = {
	Shoot: "border-orange-500/40 bg-orange-500/10 text-orange-500",
	Dribble: "border-emerald-500/40 bg-emerald-500/10 text-emerald-500",
	Wall: "border-sky-500/40 bg-sky-500/10 text-sky-500",
	Keep: "border-amber-400/60 bg-amber-200/10 text-amber-500 dark:text-yellow-300",
};

const elementBadgeClasses: Record<string, string> = {
	Fire: "border-red-500/40 bg-red-500/10 text-red-500",
	Air: "border-cyan-500/40 bg-cyan-500/10 text-cyan-500",
	Forest: "border-green-500/40 bg-green-500/10 text-green-500",
	Mountain: "border-amber-500/40 bg-amber-500/10 text-amber-500",
	Void: "border-purple-500/40 bg-purple-500/10 text-purple-500",
};

const elementIconAliases: Partial<Record<string, ElementType>> = {
	Air: "Wind",
};

type IconDefinition = ReturnType<typeof getMoveIcon>;

const tableColumns: TableColumn[] = [
	{
		key: "shop",
		header: "Shop",
		align: "center",
		className: "w-[140px]",
		sortKey: "shop",
		render: (item) => <Badge className="w-full justify-center bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{item.shop}</Badge>,
	},
	{
		key: "type",
		header: "Type",
		align: "center",
		className: "w-[100px]",
		sortKey: "type",
		render: (item) => {
			const iconDefinition = getMoveIconForType(item.type);
			return (
				<Badge
					variant="outline"
					className={cn("w-full items-center justify-center gap-1.5 border px-2 py-0.5 text-[11px] font-semibold uppercase", typeBadgeClasses[item.type])}
				>
					<BadgeIconContent iconDef={iconDefinition} label={item.type} />
				</Badge>
			);
		},
	},
	{
		key: "element",
		header: "Element",
		align: "center",
		className: "w-[100px]",
		sortKey: "element",
		render: (item) => {
			const iconDefinition = getElementIconForValue(item.element);
			return (
				<Badge
					variant="outline"
					className={cn("w-full items-center justify-center gap-1.5 border px-2 py-0.5 text-[11px] font-semibold uppercase", elementBadgeClasses[item.element])}
				>
					<BadgeIconContent iconDef={iconDefinition} label={item.element} />
				</Badge>
			);
		},
	},
	{
		key: "name",
		header: "Hissatsu",
		className: "min-w-[220px]",
		sortKey: "name",
		render: (item) => <HissatsuIdentity move={item} />,
	},
	{
		key: "power",
		header: "Power",
		align: "center",
		className: "font-mono",
		sortKey: "power",
		render: (item) => formatNumber(item.power),
	},
	{
		key: "tension",
		header: "Tension",
		align: "center",
		className: "font-mono",
		sortKey: "tension",
		render: (item) => formatNumber(item.tension),
	},
];

const INITIAL_VISIBLE_COUNT = 20;
const LOAD_MORE_BATCH_SIZE = 20;

function getMoveIconForType(moveType: string): IconDefinition {
	return getMoveIcon(moveType as MoveType);
}

function getElementIconForValue(element: string): IconDefinition {
	const normalized = elementIconAliases[element] ?? element;
	return getElementIcon(normalized as ElementType);
}

function BadgeIconContent({ iconDef, label }: { iconDef: IconDefinition; label: string }) {
	const { icon: IconComponent, assetPath, color } = iconDef;

	return (
		<>
			{assetPath ? (
				<img src={assetPath} alt="" className="size-3.5 shrink-0" aria-hidden="true" />
			) : IconComponent ? (
				<IconComponent className="size-3.5 shrink-0" style={{ color }} aria-hidden="true" />
			) : null}
			<span className="truncate">{label}</span>
		</>
	);
}

export default function HissatsuPage() {
	const [preferences, setPreferences] = useAtom(hissatsuPreferencesAtom);
	const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
	const loadMoreRef = useRef<HTMLDivElement | null>(null);
	const highlightControl = (isActive: boolean) => (isActive ? "border-primary/60 bg-primary/10 text-primary" : undefined);

	const handleSortByColumn = useCallback(
		(sortKey: HissatsuSortKey) => {
			setPreferences((prev) => {
				const isSameColumn = prev.sortKey === sortKey;
				const nextDirection = isSameColumn && prev.sortDirection === "desc" ? "asc" : "desc";

				return {
					...prev,
					sortKey,
					sortDirection: nextDirection,
				};
			});
		},
		[setPreferences],
	);

	const filteredMoves = useMemo(() => {
		const query = preferences.search.trim().toLowerCase();
		return hissatsuDataset.filter((move) => {
			if (preferences.type !== "all" && move.type !== preferences.type) {
				return false;
			}
			if (preferences.element !== "all" && move.element !== preferences.element) {
				return false;
			}
			if (preferences.shop !== "all" && move.shop !== preferences.shop) {
				return false;
			}
			if (preferences.extra === "none" && move.extras.length > 0) {
				return false;
			}
			if (preferences.extra !== "all" && preferences.extra !== "none" && !move.extras.includes(preferences.extra)) {
				return false;
			}
			if (query) {
				const haystack = `${move.name} ${move.shop} ${move.extras.join(" ")}`.toLowerCase();
				if (!haystack.includes(query)) {
					return false;
				}
			}
			return true;
		});
	}, [preferences.element, preferences.extra, preferences.search, preferences.shop, preferences.type]);

	const sortedMoves = useMemo(() => {
		const accessor = metricAccessors[preferences.sortKey];
		return [...filteredMoves].sort((a, b) => compareValues(accessor(a), accessor(b), preferences.sortDirection));
	}, [filteredMoves, preferences.sortDirection, preferences.sortKey]);

	const visibleMoves = sortedMoves.slice(0, visibleCount);
	const hasMore = visibleCount < sortedMoves.length;

	useEffect(() => {
		setVisibleCount(INITIAL_VISIBLE_COUNT);
	}, [preferences.search, preferences.type, preferences.element, preferences.shop, preferences.extra, preferences.sortDirection, preferences.sortKey]);

	useEffect(() => {
		if (!hasMore) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					setVisibleCount((prev) => Math.min(prev + LOAD_MORE_BATCH_SIZE, sortedMoves.length));
				}
			},
			{ rootMargin: "200px" },
		);
		const node = loadMoreRef.current;
		if (node) observer.observe(node);

		return () => observer.disconnect();
	}, [hasMore, sortedMoves.length]);

	const filtersAreDirty =
		preferences.search !== DEFAULT_HISSATSU_PREFERENCES.search ||
		preferences.type !== DEFAULT_HISSATSU_PREFERENCES.type ||
		preferences.element !== DEFAULT_HISSATSU_PREFERENCES.element ||
		preferences.shop !== DEFAULT_HISSATSU_PREFERENCES.shop ||
		preferences.extra !== DEFAULT_HISSATSU_PREFERENCES.extra;

	const handleUpdate = (patch: Partial<HissatsuPreferences>) => {
		setPreferences((prev) => ({ ...prev, ...patch }));
	};

	const resetFilters = () => {
		handleUpdate({
			search: DEFAULT_HISSATSU_PREFERENCES.search,
			type: DEFAULT_HISSATSU_PREFERENCES.type,
			element: DEFAULT_HISSATSU_PREFERENCES.element,
			shop: DEFAULT_HISSATSU_PREFERENCES.shop,
			extra: DEFAULT_HISSATSU_PREFERENCES.extra,
		});
	};

	return (
		<div className="flex flex-col gap-4">
			<section className="rounded-lg border bg-card/50 p-3">
				<div className="flex flex-wrap items-center gap-2">
					<div
						className={cn(
							"flex min-w-[220px] flex-1 items-center gap-2 rounded-md border bg-background/40 px-3 py-1.5",
							highlightControl(preferences.search.trim().length > 0),
						)}
					>
						<Search className="size-4 text-muted-foreground" aria-hidden="true" />
						<Input
							value={preferences.search}
							onChange={(event) => handleUpdate({ search: event.currentTarget.value })}
							placeholder="Search Hissatsu names, shops or effects"
							className="flex-1 border-0 bg-transparent px-0 focus-visible:ring-0"
							aria-label="Filter Hissatsu techniques"
						/>
					</div>
					<Button size="sm" variant="ghost" className="h-8 text-muted-foreground" onClick={resetFilters} disabled={!filtersAreDirty}>
						<RotateCcw className="size-4" />
						Reset filters
					</Button>
				</div>
				<div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
					<Select value={preferences.type} onValueChange={(value) => handleUpdate({ type: value as HissatsuPreferences["type"] })}>
						<SelectTrigger
							size="sm"
							className={cn(
								"h-10 w-full justify-between rounded-md border bg-background/30",
								highlightControl(preferences.type !== DEFAULT_HISSATSU_PREFERENCES.type),
							)}
						>
							<SelectValue placeholder="All types" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All types</SelectItem>
							{typeOptions.map((option) => (
								<SelectItem key={option} value={option}>
									{option}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select value={preferences.element} onValueChange={(value) => handleUpdate({ element: value })}>
						<SelectTrigger
							size="sm"
							className={cn(
								"h-10 w-full justify-between rounded-md border bg-background/30",
								highlightControl(preferences.element !== DEFAULT_HISSATSU_PREFERENCES.element),
							)}
						>
							<SelectValue placeholder="All elements" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All elements</SelectItem>
							{elementOptions.map((option) => (
								<SelectItem key={option} value={option}>
									{option}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select value={preferences.shop} onValueChange={(value) => handleUpdate({ shop: value })}>
						<SelectTrigger
							size="sm"
							className={cn(
								"h-10 w-full justify-between rounded-md border bg-background/30",
								highlightControl(preferences.shop !== DEFAULT_HISSATSU_PREFERENCES.shop),
							)}
						>
							<SelectValue placeholder="All shops" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All shops</SelectItem>
							{shopOptions.map((shop) => (
								<SelectItem key={shop} value={shop}>
									{shop}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select value={preferences.extra} onValueChange={(value) => handleUpdate({ extra: value })}>
						<SelectTrigger
							size="sm"
							className={cn(
								"h-10 w-full justify-between rounded-md border bg-background/30",
								highlightControl(preferences.extra !== DEFAULT_HISSATSU_PREFERENCES.extra),
							)}
						>
							<SelectValue placeholder="All extra effects" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All extra effects</SelectItem>
							<SelectItem value="none">No extra effect</SelectItem>
							{extraOptions.map((extra) => (
								<SelectItem key={extra} value={extra}>
									{extra}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</section>

			<section className="rounded-lg border bg-card/60">
				<div className="flex items-center justify-between gap-2 p-3 text-xs text-muted-foreground">
					<span>
						Showing {visibleMoves.length.toLocaleString()} of {sortedMoves.length.toLocaleString()} Hissatsu
					</span>
				</div>
				<Table>
					<TableHeader>
						<TableRow>
							{tableColumns.map((column) => (
								<TableHead
									key={column.key}
									className={cn(column.headerClassName, column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : undefined)}
								>
									{column.sortKey ? (
										<button
											type="button"
											onClick={() => handleSortByColumn(column.sortKey as HissatsuSortKey)}
											className={cn(
												"flex w-full items-center gap-1 text-left text-xs font-semibold uppercase tracking-wide text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
												column.align === "right" ? "justify-end" : column.align === "center" ? "justify-center" : "justify-start",
											)}
											aria-label={`Sort by ${typeof column.header === "string" ? column.header : "column"}`}
											aria-pressed={preferences.sortKey === column.sortKey}
										>
											<span>{column.header}</span>
											{(() => {
												const isActive = preferences.sortKey === column.sortKey;
												const Icon = !isActive ? ArrowUpDown : preferences.sortDirection === "asc" ? ArrowUp : ArrowDown;
												return <Icon className={cn("size-3.5", isActive ? "text-primary" : "text-muted-foreground/60")} aria-hidden="true" />;
											})()}
										</button>
									) : (
										column.header
									)}
								</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{visibleMoves.map((move) => (
							<TableRow key={move.id}>
								{tableColumns.map((column) => (
									<TableCell
										key={column.key}
										className={cn(column.className, column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : undefined)}
									>
										{column.render(move)}
									</TableCell>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>
				{hasMore && (
					<div ref={loadMoreRef} className="flex h-16 items-center justify-center text-sm text-muted-foreground">
						Loading more techniques…
					</div>
				)}
				{!sortedMoves.length && <div className="border-t p-6 text-center text-sm text-muted-foreground">No Hissatsu match the selected filters.</div>}
			</section>
		</div>
	);
}

function extractExtras(value: string | null | undefined): string[] {
	if (!value) return [];
	return value
		.split(/[/,;|·]+/)
		.map((chunk) => chunk.trim())
		.filter((chunk) => chunk.length > 0);
}

function compareValues(valueA: string | number, valueB: string | number, direction: HissatsuPreferences["sortDirection"]) {
	if (typeof valueA === "number" && typeof valueB === "number") {
		return direction === "desc" ? valueB - valueA : valueA - valueB;
	}
	const textA = String(valueA).toLowerCase();
	const textB = String(valueB).toLowerCase();
	return direction === "desc" ? textB.localeCompare(textA) : textA.localeCompare(textB);
}

function HissatsuIdentity({ move }: { move: HissatsuMove }) {
	return (
		<div className="flex flex-col gap-1 text-left">
			<div className="flex flex-wrap items-center gap-1">
				<span className="font-semibold leading-tight">{move.name}</span>
				{move.extras.length > 0 && (
					<div className="flex flex-wrap gap-1">
						{move.extras.map((extra) => (
							<Badge
								key={extra}
								variant="outline"
								className="border-amber-500/30 bg-amber-500/5 px-1.5 py-0 text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-300"
							>
								{extra}
							</Badge>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
