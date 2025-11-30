import { useAtom, useAtomValue } from "jotai";
import { ArrowDown, ArrowUp, ArrowUpDown, RotateCcw, Search, Star } from "lucide-react";
import type { MouseEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ElementBadge, PlayerDetailsButton, PlayerDetailsDialog, type PlayerMetric, PositionBadge } from "@/components/player/PlayerDetailsDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createSortedUniqueOptions, formatNumber, titleCase } from "@/lib/data-helpers";
import type { BaseStats, PowerStats } from "@/lib/inazuma-math";
import { playersDataset as basePlayersDataset, getPlayersDataset, type PlayerRecord } from "@/lib/players-data";
import { cn } from "@/lib/utils";
import { favoritePlayersAtom } from "@/store/favorites";
import { playerNamePreferenceAtom } from "@/store/name-preference";
import { DEFAULT_PLAYERS_PREFERENCES, type PlayersPreferences, type PlayersSortKey, type PlayerTableSortKey, playersPreferencesAtom } from "@/store/players";

type Player = PlayerRecord;

type TableColumn = {
	key: string;
	header: string;
	className?: string;
	align?: "left" | "right" | "center";
	sortKey?: PlayerTableSortKey;
	render: (player: Player) => React.ReactNode;
};

const INITIAL_VISIBLE_COUNT = 20;
const LOAD_MORE_BATCH_SIZE = 20;

const metricAccessors: Record<PlayersSortKey, (player: Player) => number> = {
	total: (player) => player.stats.total,
	kick: (player) => player.stats.kick,
	control: (player) => player.stats.control,
	technique: (player) => player.stats.technique,
	pressure: (player) => player.stats.pressure,
	physical: (player) => player.stats.physical,
	agility: (player) => player.stats.agility,
	intelligence: (player) => player.stats.intelligence,
	shootAT: (player) => player.power.shootAT,
	focusAT: (player) => player.power.focusAT,
	focusDF: (player) => player.power.focusDF,
	wallDF: (player) => player.power.wallDF,
	scrambleAT: (player) => player.power.scrambleAT,
	scrambleDF: (player) => player.power.scrambleDF,
	kp: (player) => player.power.kp,
};

const sortAccessors: Record<PlayerTableSortKey, (player: Player) => number | string> = {
	name: (player) => player.name,
	...metricAccessors,
};

const elementOptions = createSortedUniqueOptions(basePlayersDataset.map((player) => player.element));
const genderOptions = createSortedUniqueOptions(basePlayersDataset.map((player) => player.gender).filter((value) => value));
const positionOptions = createSortedUniqueOptions(basePlayersDataset.map((player) => player.position));
const roleOptions = createSortedUniqueOptions(basePlayersDataset.map((player) => player.role));

const statsMetricColumns: TableColumn[] = [
	...["kick", "control", "technique", "pressure", "physical", "agility", "intelligence", "total"].map((key) => ({
		key,
		header: titleCase(key),
		align: "center" as const,
		sortKey: key as PlayerTableSortKey,
		render: (player: Player) => formatNumber(player.stats[key as keyof BaseStats]),
	})),
];

const powerMetricColumns: TableColumn[] = [
	...[
		["shootAT", "Shoot AT"],
		["focusAT", "Focus AT"],
		["focusDF", "Focus DF"],
		["wallDF", "Walls DF"],
		["scrambleAT", "Scramble AT"],
		["scrambleDF", "Scramble DF"],
		["kp", "KP"],
	].map(([key, label]) => ({
		key,
		header: label,
		align: "center" as const,
		sortKey: key as PlayerTableSortKey,
		render: (player: Player) => formatNumber(player.power[key as keyof PowerStats]),
	})),
];

export default function PlayersPage() {
	const [preferences, setPreferences] = useAtom(playersPreferencesAtom);
	const [favoritePlayers, setFavoritePlayers] = useAtom(favoritePlayersAtom);
	const namePreference = useAtomValue(playerNamePreferenceAtom);
	const playersDataset = useMemo(() => getPlayersDataset(namePreference), [namePreference]);
	const favoriteSet = useMemo(() => new Set(favoritePlayers), [favoritePlayers]);
	const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
	const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
	const selectedPlayer = useMemo(() => {
		if (selectedPlayerId == null) return null;
		return playersDataset.find((player) => player.id === selectedPlayerId) ?? null;
	}, [playersDataset, selectedPlayerId]);
	const statMetrics = useMemo<PlayerMetric[]>(() => {
		if (!selectedPlayer) return [];
		return statsMetricColumns.map((column) => ({
			label: column.header,
			value: formatNumber(selectedPlayer.stats[column.key as keyof BaseStats]),
		}));
	}, [selectedPlayer]);
	const powerMetrics = useMemo<PlayerMetric[]>(() => {
		if (!selectedPlayer) return [];
		return powerMetricColumns.map((column) => ({
			label: column.header,
			value: formatNumber(selectedPlayer.power[column.key as keyof PowerStats]),
		}));
	}, [selectedPlayer]);
	const loadMoreRef = useRef<HTMLDivElement | null>(null);
	const highlightControl = (isActive: boolean) => (isActive ? "border-primary/60 bg-primary/10 text-primary" : undefined);

	const filteredPlayers = useMemo(() => {
		const query = preferences.search.trim().toLowerCase();
		return playersDataset.filter((player) => {
			if (preferences.element !== "all" && player.element !== preferences.element) {
				return false;
			}
			if (preferences.gender !== "all" && player.gender !== preferences.gender) {
				return false;
			}
			if (preferences.position !== "all" && player.position !== preferences.position) {
				return false;
			}
			if (preferences.role !== "all" && player.role !== preferences.role) {
				return false;
			}
			if (preferences.favoritesOnly && !favoriteSet.has(player.id)) {
				return false;
			}
			if (!query) return true;
			return player.name.toLowerCase().includes(query) || player.nickname.toLowerCase().includes(query);
		});
	}, [
		playersDataset,
		favoriteSet,
		preferences.element,
		preferences.gender,
		preferences.favoritesOnly,
		preferences.position,
		preferences.role,
		preferences.search,
	]);

	const sortedPlayers = useMemo(() => {
		const { sortDirection, sortKey } = preferences;
		const fallbackKey = DEFAULT_PLAYERS_PREFERENCES.sortKey;
		const accessor = sortAccessors[sortKey] ?? sortAccessors[fallbackKey];

		return [...filteredPlayers].sort((a, b) => {
			const valueA = accessor(a);
			const valueB = accessor(b);

			if (typeof valueA === "number" && typeof valueB === "number") {
				return sortDirection === "desc" ? valueB - valueA : valueA - valueB;
			}

			const comparison = String(valueA).localeCompare(String(valueB), undefined, {
				sensitivity: "base",
			});

			return sortDirection === "desc" ? -comparison : comparison;
		});
	}, [filteredPlayers, preferences.sortDirection, preferences.sortKey]);

	const handleToggleFavorite = useCallback(
		(playerId: number) => {
			setFavoritePlayers((prev) => {
				const exists = prev.includes(playerId);
				if (exists) {
					return prev.filter((id) => id !== playerId);
				}
				return [...prev, playerId];
			});
		},
		[setFavoritePlayers],
	);

	const handleSortByColumn = useCallback(
		(sortKey: PlayerTableSortKey) => {
			setPreferences((prev) => {
				const isSameColumn = prev.sortKey === sortKey;
				const nextDirection = isSameColumn ? (prev.sortDirection === "asc" ? "desc" : "asc") : "desc";

				return {
					...prev,
					sortKey,
					sortDirection: nextDirection,
				};
			});
		},
		[setPreferences],
	);

	const handleOpenDetails = useCallback((player: Player) => {
		setSelectedPlayerId(player.id);
	}, []);

	const handleCloseDetails = useCallback(() => {
		setSelectedPlayerId(null);
	}, []);

	const tableColumns = useMemo(() => {
		const metricColumns = preferences.viewMode === "stats" ? statsMetricColumns : powerMetricColumns;
		const favoriteColumn: TableColumn = {
			key: "favorite",
			header: "",
			className: "w-12",
			align: "center",
			render: (player: Player) => <FavoriteToggle isFavorite={favoriteSet.has(player.id)} onToggle={() => handleToggleFavorite(player.id)} />,
		};
		const detailsColumn: TableColumn = {
			key: "details",
			header: "",
			className: "w-12",
			align: "center",
			render: (player: Player) => <PlayerDetailsButton onClick={() => handleOpenDetails(player)} />,
		};
		const identityColumn: TableColumn = {
			key: "identity",
			header: "Player",
			className: "min-w-[240px]",
			sortKey: "name",
			render: (player: Player) => <PlayerIdentity player={player} />,
		};
		return [favoriteColumn, detailsColumn, identityColumn, ...metricColumns];
	}, [favoriteSet, handleOpenDetails, handleToggleFavorite, preferences.viewMode]);

	const visiblePlayers = sortedPlayers.slice(0, visibleCount);
	const hasMore = visibleCount < sortedPlayers.length;

	const filtersAreDirty =
		preferences.search !== DEFAULT_PLAYERS_PREFERENCES.search ||
		preferences.element !== DEFAULT_PLAYERS_PREFERENCES.element ||
		preferences.gender !== DEFAULT_PLAYERS_PREFERENCES.gender ||
		preferences.position !== DEFAULT_PLAYERS_PREFERENCES.position ||
		preferences.role !== DEFAULT_PLAYERS_PREFERENCES.role ||
		preferences.favoritesOnly !== DEFAULT_PLAYERS_PREFERENCES.favoritesOnly;

	const handleUpdate = (patch: Partial<PlayersPreferences>) => {
		setPreferences((prev) => ({ ...prev, ...patch }));
	};

	const handleResetFilters = () => {
		handleUpdate({
			search: DEFAULT_PLAYERS_PREFERENCES.search,
			element: DEFAULT_PLAYERS_PREFERENCES.element,
			gender: DEFAULT_PLAYERS_PREFERENCES.gender,
			position: DEFAULT_PLAYERS_PREFERENCES.position,
			role: DEFAULT_PLAYERS_PREFERENCES.role,
			favoritesOnly: DEFAULT_PLAYERS_PREFERENCES.favoritesOnly,
		});
	};

	const traitFilters = [
		{
			key: "element",
			label: "Element",
			value: preferences.element,
			defaultLabel: "All elements",
			options: elementOptions,
			isActive: preferences.element !== DEFAULT_PLAYERS_PREFERENCES.element,
			onValueChange: (value: string) => handleUpdate({ element: value }),
		},
		{
			key: "gender",
			label: "Gender",
			value: preferences.gender,
			defaultLabel: "All genders",
			options: genderOptions,
			isActive: preferences.gender !== DEFAULT_PLAYERS_PREFERENCES.gender,
			onValueChange: (value: string) => handleUpdate({ gender: value }),
		},
		{
			key: "position",
			label: "Position",
			value: preferences.position,
			defaultLabel: "All positions",
			options: positionOptions,
			isActive: preferences.position !== DEFAULT_PLAYERS_PREFERENCES.position,
			onValueChange: (value: string) => handleUpdate({ position: value }),
		},
		{
			key: "role",
			label: "Role",
			value: preferences.role,
			defaultLabel: "All roles",
			options: roleOptions,
			isActive: preferences.role !== DEFAULT_PLAYERS_PREFERENCES.role,
			onValueChange: (value: string) => handleUpdate({ role: value }),
		},
	] as const;

	useEffect(() => {
		setVisibleCount(INITIAL_VISIBLE_COUNT);
	}, [
		preferences.search,
		preferences.element,
		preferences.gender,
		preferences.position,
		preferences.role,
		preferences.favoritesOnly,
		preferences.viewMode,
		preferences.sortDirection,
		preferences.sortKey,
		preferences.favoritesOnly ? favoritePlayers.join(",") : null,
	]);

	useEffect(() => {
		if (selectedPlayerId == null) {
			return;
		}
		const exists = playersDataset.some((playerRecord) => playerRecord.id === selectedPlayerId);
		if (!exists) {
			setSelectedPlayerId(null);
		}
	}, [playersDataset, selectedPlayerId]);

	useEffect(() => {
		if (!hasMore) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					setVisibleCount((prev) => Math.min(prev + LOAD_MORE_BATCH_SIZE, sortedPlayers.length));
				}
			},
			{
				rootMargin: "200px",
			},
		);
		const node = loadMoreRef.current;
		if (node) observer.observe(node);

		return () => observer.disconnect();
	}, [hasMore, sortedPlayers.length]);

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
							placeholder="Search players"
							className="flex-1 border-0 bg-transparent px-0 focus-visible:ring-0"
							aria-label="Filter players by name"
						/>
					</div>
					<div className="flex rounded-md border bg-background/30 p-1 text-xs font-semibold uppercase text-muted-foreground">
						<Button
							size="sm"
							className="h-8 rounded-[6px] px-3"
							variant={preferences.viewMode === "stats" ? "default" : "ghost"}
							onClick={() => handleUpdate({ viewMode: "stats" })}
						>
							Stats
						</Button>
						<Button
							size="sm"
							className="h-8 rounded-[6px] px-3"
							variant={preferences.viewMode === "power" ? "default" : "ghost"}
							onClick={() => handleUpdate({ viewMode: "power" })}
						>
							AT/DF
						</Button>
					</div>
					<Button
						size="sm"
						variant={preferences.favoritesOnly ? "default" : "outline"}
						onClick={() => handleUpdate({ favoritesOnly: !preferences.favoritesOnly })}
						aria-pressed={preferences.favoritesOnly}
						className="h-8"
					>
						<Star className={cn("size-4", preferences.favoritesOnly ? "fill-current" : "fill-transparent")} />
						Favorites
					</Button>
					<Button size="sm" variant="ghost" className="h-8 text-muted-foreground" onClick={handleResetFilters} disabled={!filtersAreDirty}>
						<RotateCcw className="size-4" />
						Reset
					</Button>
				</div>
				<div className="mt-3 grid gap-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4">
					{traitFilters.map((filter) => (
						<Select key={filter.key} value={filter.value} onValueChange={filter.onValueChange}>
							<SelectTrigger
								size="sm"
								className={cn("h-10 w-full justify-between rounded-md border bg-background/30", highlightControl(filter.isActive))}
								aria-label={filter.label}
							>
								<SelectValue placeholder={filter.defaultLabel} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">{filter.defaultLabel}</SelectItem>
								{filter.options.map((option) => (
									<SelectItem key={option} value={option}>
										{option}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					))}
				</div>
			</section>

			<section className="rounded-lg border bg-card/60">
				<div className="flex items-center justify-between gap-2 p-3 text-xs text-muted-foreground">
					<span>
						Showing {visiblePlayers.length.toLocaleString()} of {sortedPlayers.length.toLocaleString()} players
					</span>
					<span>Player data is shown at level 50 and Normal rarity</span>
				</div>
				<Table>
					<TableHeader>
						<TableRow>
							{tableColumns.map((column) => (
								<TableHead
									key={column.key}
									className={cn(column.className, column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : undefined)}
								>
									{column.sortKey ? (
										<button
											type="button"
											onClick={() => handleSortByColumn(column.sortKey as PlayerTableSortKey)}
											className={cn(
												"flex w-full items-center gap-1 text-left text-xs font-semibold uppercase tracking-wide text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
												column.align === "right" ? "justify-end" : column.align === "center" ? "justify-center" : "justify-start",
											)}
											aria-label={`Sort by ${column.header}`}
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
						{visiblePlayers.map((player) => (
							<TableRow key={`${player.id}-${player.name}`}>
								{tableColumns.map((column) => (
									<TableCell
										key={column.key}
										className={cn(
											column.className,
											column.align === "right"
												? "text-right font-mono"
												: column.align === "center"
													? column.key === "favorite"
														? "text-center"
														: "text-center font-mono"
													: undefined,
										)}
									>
										{column.render(player)}
									</TableCell>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>
				{hasMore && (
					<div ref={loadMoreRef} className="flex h-16 items-center justify-center text-sm text-muted-foreground">
						Loading more players…
					</div>
				)}
				{!visiblePlayers.length && <div className="border-t p-6 text-center text-sm text-muted-foreground">No players match the selected filters.</div>}
			</section>

			<PlayerDetailsDialog
				player={selectedPlayer}
				open={Boolean(selectedPlayer)}
				onOpenChange={(isOpen) => {
					if (!isOpen) {
						handleCloseDetails();
					}
				}}
				statMetrics={statMetrics}
				powerMetrics={powerMetrics}
			/>
		</div>
	);
}

type PlayerIdentityProps = {
	player: Player;
};

function PlayerIdentity({ player }: PlayerIdentityProps) {
	return (
		<div className="flex items-center gap-3">
			<img
				src={player.safeImage}
				alt={player.name}
				className="size-16 rounded-md border object-cover"
				loading="lazy"
				crossOrigin="anonymous"
				referrerPolicy="no-referrer"
			/>
			<div className="flex flex-1 flex-col">
				<span className="font-semibold leading-tight">{player.name}</span>
				<div className="mt-1 flex flex-wrap gap-1 text-xs">
					<PositionBadge position={player.position} />
					<ElementBadge element={player.element} />
					<Badge variant="outline" className="px-2 py-0.5">
						{player.role}
					</Badge>
				</div>
			</div>
		</div>
	);
}

type FavoriteToggleProps = {
	isFavorite: boolean;
	onToggle: () => void;
};

function FavoriteToggle({ isFavorite, onToggle }: FavoriteToggleProps) {
	const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
		event.stopPropagation();
		onToggle();
	};

	return (
		<button
			type="button"
			onClick={handleClick}
			aria-pressed={isFavorite}
			aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
			className={cn(
				"rounded-full border p-1 transition-colors",
				isFavorite ? "border-amber-400 bg-amber-50 text-amber-500" : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
			)}
		>
			<Star className={cn("size-4", isFavorite ? "fill-current" : "fill-transparent")} aria-hidden="true" />
		</button>
	);
}
