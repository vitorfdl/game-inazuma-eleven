import { Filter, RotateCcw, Search } from "lucide-react";
import { ElementChip, PositionChip, StatChip } from "@/components/team-builder/Chips";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createSortedUniqueOptions } from "@/lib/data-helpers";
import { type PlayerRecord, playersDataset } from "@/lib/players-data";
import { cn } from "@/lib/utils";
import type { FiltersState, TeamBuilderSlot } from "@/types/team-builder";

const elementOptions = createSortedUniqueOptions(playersDataset.map((player) => player.element));
const positionOptions = createSortedUniqueOptions(playersDataset.map((player) => player.position));
const roleOptions = createSortedUniqueOptions(playersDataset.map((player) => player.role));

type PlayerAssignmentModalProps = {
	isMobile: boolean;
	open: boolean;
	activeSlot: TeamBuilderSlot | null;
	favoriteSet: Set<number>;
	favoritePlayers: PlayerRecord[];
	assignedIds: Set<number>;
	filteredPlayers: PlayerRecord[];
	filters: FiltersState;
	onFiltersChange: (next: FiltersState) => void;
	onResetFilters: () => void;
	onSelectPlayer: (playerId: number) => void;
	onClearSlot: () => void;
	onOpenChange: (open: boolean) => void;
};

export function PlayerAssignmentModal({
	isMobile,
	open,
	activeSlot,
	favoriteSet,
	favoritePlayers,
	assignedIds,
	filteredPlayers,
	filters,
	onFiltersChange,
	onResetFilters,
	onSelectPlayer,
	onOpenChange,
}: PlayerAssignmentModalProps) {
	const filtersSection = (
		<div className="space-y-2">
			<div className="relative">
				<Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
				<Input
					value={filters.search}
					onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
					placeholder="Search by name or nickname"
					className="pl-9"
					type="search"
					autoFocus={!isMobile}
				/>
			</div>
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
				<Select value={filters.element} onValueChange={(value) => onFiltersChange({ ...filters, element: value })}>
					<SelectTrigger>
						<SelectValue placeholder="Element" />
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
				<Select value={filters.position} onValueChange={(value) => onFiltersChange({ ...filters, position: value })}>
					<SelectTrigger>
						<SelectValue placeholder="Position" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All positions</SelectItem>
						{positionOptions.map((option) => (
							<SelectItem key={option} value={option}>
								{option}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select value={filters.role} onValueChange={(value) => onFiltersChange({ ...filters, role: value })}>
					<SelectTrigger>
						<SelectValue placeholder="Role" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All roles</SelectItem>
						{roleOptions.map((option) => (
							<SelectItem key={option} value={option}>
								{option}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Button variant="outline" size="sm" className="w-full gap-1" onClick={onResetFilters}>
					<RotateCcw className="size-4" />
					Reset
				</Button>
			</div>
		</div>
	);

	const limitedFilteredPlayers = activeSlot && filteredPlayers.length > 0 ? filteredPlayers.filter((player) => !favoriteSet.has(player.id)).slice(0, 20) : [];

	const playerList = (
		<div
			className={cn(
				"mt-3 max-h-[60vh] space-y-4 overflow-y-auto pr-1",
				"[scrollbar-width:thin] [scrollbar-color:theme(colors.emerald.400)_transparent]",
				"[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:rounded-full",
				"[&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-emerald-400/50",
			)}
		>
			{!activeSlot ? (
				<div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Select a slot on the pitch first.</div>
			) : (
				<>
					{favoritePlayers.length > 0 && (
						<div className="space-y-2">
							<p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Favorites</p>
							<div className="space-y-2">
								{favoritePlayers.map((player) => (
									<PlayerOptionCard
										key={`favorite-${player.id}`}
										player={player}
										alreadyAssigned={assignedIds.has(player.id)}
										onSelect={() => onSelectPlayer(player.id)}
									/>
								))}
							</div>
						</div>
					)}
					<div className="space-y-2">
						<div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
							<span>Filtered results</span>
							{activeSlot && (
								<span>
									{limitedFilteredPlayers.length}/{Math.min(filteredPlayers.length, 20)}
								</span>
							)}
						</div>
						{filteredPlayers.length === 0 ? (
							<div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
								<Filter className="size-5" />
								<p>No players match your filters.</p>
							</div>
						) : limitedFilteredPlayers.length === 0 ? (
							<div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
								All matching players are already in your favorites.
							</div>
						) : (
							<div className="space-y-2">
								{limitedFilteredPlayers.map((player) => (
									<PlayerOptionCard key={player.id} player={player} alreadyAssigned={assignedIds.has(player.id)} onSelect={() => onSelectPlayer(player.id)} />
								))}
							</div>
						)}
					</div>
				</>
			)}
		</div>
	);

	if (isMobile) {
		return (
			<Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
				<DrawerContent>
					<DrawerHeader>
						<DrawerTitle>{activeSlot ? (activeSlot.displayLabel ?? activeSlot.label) : "Pick a slot"}</DrawerTitle>
						<DrawerDescription>Assign players to complete your team. Use filters to narrow the list.</DrawerDescription>
					</DrawerHeader>
					<div className="flex flex-col gap-3 px-4 pb-6">
						{filtersSection}
						{playerList}
					</div>
				</DrawerContent>
			</Drawer>
		);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="!max-w-4xl">
				<DialogHeader>
					<DialogTitle>{activeSlot ? `Choose a scout for ${activeSlot.displayLabel ?? activeSlot.label}` : "Pick a slot"}</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col gap-4">
					{filtersSection}
					{playerList}
				</div>
			</DialogContent>
		</Dialog>
	);
}

type PlayerOptionCardProps = {
	player: PlayerRecord;
	isFavorite?: boolean;
	alreadyAssigned: boolean;
	onSelect: () => void;
};

function PlayerOptionCard({ player, alreadyAssigned, onSelect }: PlayerOptionCardProps) {
	return (
		<button
			type="button"
			onClick={onSelect}
			className={cn(
				"w-full rounded-lg border bg-background/80 p-3 text-left text-sm shadow-sm transition hover:border-primary",
				alreadyAssigned ? "border-emerald-200" : "border-muted",
			)}
		>
			<div className="flex items-center gap-3">
				<img
					src={player.safeImage}
					alt={player.name}
					className="size-12 rounded-full border border-muted object-cover"
					loading="lazy"
					crossOrigin="anonymous"
					referrerPolicy="no-referrer"
				/>
				<div className="flex min-w-0 flex-1 flex-col">
					<p className="truncate font-semibold leading-tight">{player.name}</p>
					<p className="text-xs text-muted-foreground">{player.nickname}</p>
					<div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
						<ElementChip element={player.element} />
						<PositionChip label={player.position} />
					</div>
				</div>
				<div className="flex flex-col items-end gap-1">
					{alreadyAssigned && (
						<Badge variant="outline" className="border-emerald-200 text-emerald-600">
							In team
						</Badge>
					)}
				</div>
			</div>
			<div className="mt-2 flex flex-wrap gap-1 text-[11px] text-muted-foreground">
				<StatChip label="Shoot AT" value={player.power.shootAT} />
				<StatChip label="Focus AT" value={player.power.focusAT} />
				<StatChip label="Focus DF" value={player.power.focusDF} />
				<StatChip label="Wall DF" value={player.power.wallDF} />
				<StatChip label="Scramble AT" value={player.power.scrambleAT} />
				<StatChip label="Scramble DF" value={player.power.scrambleDF} />
				<StatChip label="KP" value={player.power.kp} />
			</div>
		</button>
	);
}
