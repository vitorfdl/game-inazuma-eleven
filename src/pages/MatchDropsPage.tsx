import { atom, useAtom } from "jotai";
import { Filter, Hash, RotateCcw, Search } from "lucide-react";
import { useMemo } from "react";

import matchPassivesJson from "@/assets/data/match-passives.json?raw";
import { getPassiveBuildLabel, PassiveBadge } from "@/components/passives/PassiveBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createSortedUniqueOptions } from "@/lib/data-helpers";
import { passivesById, passivesDataset } from "@/lib/passives-data";
import { cn } from "@/lib/utils";

// --- Types ---

type MatchDrop = {
	id: number;
	type: "player" | "manager" | "coordinator" | "custom";
};

type MatchRecord = {
	match: string;
	game: string;
	drops: MatchDrop[];
	uniqueId?: string;
};

type MatchDropsPreferences = {
	search: string;
	game: string;
	buildType: string;
	passiveId: string;
	dropType: MatchDrop["type"] | "all";
};

// --- Atom ---

const DEFAULT_PREFERENCES: MatchDropsPreferences = {
	search: "",
	game: "all",
	buildType: "all",
	passiveId: "",
	dropType: "all",
};

export const matchDropsPreferencesAtom = atom<MatchDropsPreferences>(DEFAULT_PREFERENCES);

// --- Data Loading ---

const rawMatchRecords = JSON.parse(matchPassivesJson) as MatchRecord[];

const matchesDataset = rawMatchRecords.map((record, index) => ({
	...record,
	uniqueId: `match-${index}`,
}));

const gameOptions = createSortedUniqueOptions(matchesDataset.map((m) => m.game));

const dropTypeOptions: Array<MatchDrop["type"] | "all"> = ["all", "player", "manager", "coordinator", "custom"];

// Get unique build types from all passives
const buildTypeOptions = createSortedUniqueOptions(
	passivesDataset
		.map((p) => p.buildType)
		.filter((t): t is string => t !== null)
		.map((t) => getPassiveBuildLabel(t)),
).sort();

// Helper to map label back to normalized key if needed, but we can probably just use the label for filtering
// since we can normalize the passive's build type to label for comparison.

// --- Component ---

export default function MatchDropsPage() {
	const [preferences, setPreferences] = useAtom(matchDropsPreferencesAtom);

	const handleUpdate = (patch: Partial<MatchDropsPreferences>) => {
		setPreferences((prev) => ({ ...prev, ...patch }));
	};

	const resetFilters = () => {
		setPreferences(DEFAULT_PREFERENCES);
	};

	const filteredMatches = useMemo(() => {
		const query = preferences.search.trim().toLowerCase();
		const passiveIdQuery = preferences.passiveId.trim();
		const buildTypeFilterActive = preferences.buildType !== "all";
		const passiveIdFilterActive = passiveIdQuery.length > 0;
		const dropTypeFilterActive = preferences.dropType !== "all";

		return matchesDataset
			.map((record) => {
				// quick exclusions
				if (preferences.game !== "all" && record.game !== preferences.game) {
					return null;
				}

				const matchPassives = record.drops.map((drop) => {
					const fullId = `${drop.type}-${drop.id}`;
					return {
						drop,
						fullId,
						passive: passivesById.get(fullId),
					};
				});

				// Step 1: apply drop-level filters (build type, id)
				let dropsAfterDropFilters = matchPassives.filter(({ drop, passive }) => {
					if (!passive) return false;

					if (dropTypeFilterActive && drop.type !== preferences.dropType) {
						return false;
					}

					if (buildTypeFilterActive) {
						const label = getPassiveBuildLabel(passive.buildType);
						if (label !== preferences.buildType) return false;
					}

					if (passiveIdFilterActive) {
						const exactId = `${drop.type}-${drop.id}` === passiveIdQuery;
						const numericId = String(drop.id) === passiveIdQuery;
						if (!exactId && !numericId) return false;
					}

					return true;
				});

				// If no drop filters are active, keep all drops for now
				if (!buildTypeFilterActive && !passiveIdFilterActive) {
					dropsAfterDropFilters = matchPassives.filter(({ drop, passive }) => {
						if (!passive) return false;
						if (dropTypeFilterActive && drop.type !== preferences.dropType) return false;
						return true;
					});
				}

				// Step 2: apply search query (on match name or drop description)
				if (query) {
					const matchNameMatches = record.match.toLowerCase().includes(query);
					const dropsMatchQuery = dropsAfterDropFilters.filter(({ passive }) => passive?.description.toLowerCase().includes(query));

					if (matchNameMatches) {
						// Keep drops filtered by drop filters; if none remain, allow those that match query
						dropsAfterDropFilters = dropsAfterDropFilters.length ? dropsAfterDropFilters : dropsMatchQuery;
					} else {
						dropsAfterDropFilters = dropsMatchQuery;
					}
				}

				// Remove null/undefined passives
				dropsAfterDropFilters = dropsAfterDropFilters.filter(({ passive }) => passive);

				if (!dropsAfterDropFilters.length) {
					return null;
				}

				return {
					...record,
					drops: dropsAfterDropFilters.map(({ drop }) => drop),
				};
			})
			.filter(Boolean) as MatchRecord[];
	}, [preferences.game, preferences.search, preferences.buildType, preferences.passiveId, preferences.dropType]);

	const filtersAreDirty =
		preferences.search !== DEFAULT_PREFERENCES.search ||
		preferences.game !== DEFAULT_PREFERENCES.game ||
		preferences.buildType !== DEFAULT_PREFERENCES.buildType ||
		preferences.passiveId !== DEFAULT_PREFERENCES.passiveId ||
		preferences.dropType !== DEFAULT_PREFERENCES.dropType;

	const highlightControl = (isActive: boolean) => (isActive ? "border-primary/60 bg-primary/10 text-primary" : undefined);

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
							placeholder="Search match name or description..."
							className="flex-1 border-0 bg-transparent px-0 focus-visible:ring-0"
						/>
					</div>
					<div
						className={cn(
							"flex min-w-[120px] items-center gap-2 rounded-md border bg-background/40 px-3 py-1.5",
							highlightControl(preferences.passiveId.trim().length > 0),
						)}
					>
						<Hash className="size-4 text-muted-foreground" aria-hidden="true" />
						<Input
							value={preferences.passiveId}
							onChange={(event) => handleUpdate({ passiveId: event.currentTarget.value })}
							placeholder="Passive ID"
							className="flex-1 border-0 bg-transparent px-0 focus-visible:ring-0"
						/>
					</div>
					<Button size="sm" variant="ghost" className="h-8 text-muted-foreground" onClick={resetFilters} disabled={!filtersAreDirty}>
						<RotateCcw className="size-4" />
						Reset
					</Button>
				</div>

				<div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
					<Select value={preferences.game} onValueChange={(value) => handleUpdate({ game: value })}>
						<SelectTrigger className={cn("h-10 w-full justify-between rounded-md border bg-background/30", highlightControl(preferences.game !== "all"))}>
							<SelectValue placeholder="All Games" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Games</SelectItem>
							{gameOptions.map((option) => (
								<SelectItem key={option} value={option}>
									{option}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Select value={preferences.buildType} onValueChange={(value) => handleUpdate({ buildType: value })}>
						<SelectTrigger className={cn("h-10 w-full justify-between rounded-md border bg-background/30", highlightControl(preferences.buildType !== "all"))}>
							<div className="flex items-center gap-2">
								<Filter className="size-3 opacity-50" />
								<SelectValue placeholder="All Build Types" />
							</div>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Build Types</SelectItem>
							{buildTypeOptions.map((option) => (
								<SelectItem key={option} value={option}>
									{option}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Select value={preferences.dropType} onValueChange={(value: MatchDrop["type"] | "all") => handleUpdate({ dropType: value })}>
						<SelectTrigger className={cn("h-10 w-full justify-between rounded-md border bg-background/30", highlightControl(preferences.dropType !== "all"))}>
							<div className="flex items-center gap-2">
								<Filter className="size-3 opacity-50" />
								<SelectValue placeholder="All Drop Types" />
							</div>
						</SelectTrigger>
						<SelectContent>
							{dropTypeOptions.map((option) => (
								<SelectItem key={option} value={option}>
									{option === "all" ? "All Drop Types" : option.charAt(0).toUpperCase() + option.slice(1)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</section>

			<div className="rounded-md border bg-card">
				<Table>
					<TableHeader>
						<TableRow className="hover:bg-transparent">
							<TableHead className="w-[150px]">Game</TableHead>
							<TableHead className="w-[200px]">Match</TableHead>
							<TableHead>Drops</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filteredMatches.map((record) => (
							<MatchRow key={record.uniqueId} record={record} />
						))}
						{!filteredMatches.length && (
							<TableRow>
								<TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
									No matches found.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}

function MatchRow({ record }: { record: MatchRecord }) {
	return (
		<TableRow className="group">
			<TableCell className="align-top">
				<span className="font-semibold leading-tight text-foreground">{record.game}</span>
			</TableCell>
			<TableCell className="align-top">
				<span className="font-semibold leading-tight text-foreground">{record.match}</span>
			</TableCell>
			<TableCell>
				<div className="flex flex-col gap-1.5">
					{record.drops.map((drop) => {
						const passiveId = `${drop.type}-${drop.id}`;
						const passive = passivesById.get(passiveId);

						if (!passive) {
							return (
								<div key={`unknown-${passiveId}`} className="text-xs text-muted-foreground">
									Unknown ID: {passiveId}
								</div>
							);
						}

						const buildLabel = getPassiveBuildLabel(passive.buildType);
						const typeLabelMap: Record<MatchDrop["type"], string> = {
							custom: "Custom",
							player: "Player",
							manager: "Manager",
							coordinator: "Coordinator",
						};
						const typeColorMap: Record<MatchDrop["type"], string> = {
							custom: "border-amber-500/70 bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-100",
							player: "border-blue-500/70 bg-blue-100 text-blue-900 dark:bg-blue-500/15 dark:text-blue-100",
							manager: "border-pink-500/70 bg-pink-100 text-pink-900 dark:bg-pink-500/15 dark:text-pink-100",
							coordinator: "border-emerald-500/70 bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-100",
						};

						return (
							<div
								key={`drop-${passiveId}`}
								className="flex flex-wrap items-center gap-2 rounded-md border border-border/50 bg-background/40 px-2 py-1 text-xs"
							>
								<Badge variant="outline" className={cn("px-2 py-0.5 uppercase tracking-wide", typeColorMap[drop.type])}>
									{typeLabelMap[drop.type]}
								</Badge>
								<PassiveBadge label={String(drop.id)} variant="number" />
								{passive.buildType && <PassiveBadge label={buildLabel} variant="build" buildType={passive.buildType} />}
								<span className="text-muted-foreground leading-tight">{passive.description}</span>
							</div>
						);
					})}
				</div>
			</TableCell>
		</TableRow>
	);
}
