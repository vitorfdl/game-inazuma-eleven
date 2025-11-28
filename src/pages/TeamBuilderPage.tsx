import { useAtom, useAtomValue } from "jotai";
import { CheckCircle2, CirclePlus, RefreshCcw, Share2, UserX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PositionChip } from "@/components/team-builder/Chips";
import { PlayerAssignmentModal } from "@/components/team-builder/PlayerAssignmentModal";
import { SlotDetailsDrawer } from "@/components/team-builder/SlotDetailsDrawer";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	FORMATIONS,
	type FormationDefinition,
	type FormationSlot,
	formationsMap,
} from "@/data/formations";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatNumber } from "@/lib/data-helpers";
import { getElementIcon, getPositionColor } from "@/lib/icon-picker";
import {
	TEAM_SHARE_QUERY_KEY,
	decodeTeamShareState,
	encodeTeamShareState,
} from "@/lib/team-share";
import {
	mapToElementType,
	mapToTeamPosition,
	type PlayerRecord,
	playersById,
	playersDataset,
} from "@/lib/players-data";
import { getSlotRarityDefinition } from "@/lib/slot-rarity";
import { computeSlotComputedStats } from "@/lib/team-builder-calculations";
import { cn } from "@/lib/utils";
import { favoritePlayersAtom } from "@/store/favorites";
import {
	type DisplayMode,
	mergeSlotConfig,
	normalizeSlotConfig,
	type TeamBuilderAssignments,
	type TeamBuilderSlotConfigs,
	type TeamBuilderState,
	teamBuilderAtom,
} from "@/store/team-builder";
import type {
	FiltersState,
	SlotAssignment,
	SlotConfig,
} from "@/types/team-builder";

const DISPLAY_MODE_OPTIONS: { value: DisplayMode; label: string }[] = [
	{ value: "nickname", label: "Nickname" },
	{ value: "shootAT", label: "Shoot AT" },
	{ value: "focusAT", label: "Focus AT" },
	{ value: "focusDF", label: "Focus DF" },
	{ value: "wallDF", label: "Wall DF" },
	{ value: "scrambleAT", label: "Scramble AT" },
	{ value: "scrambleDF", label: "Scramble DF" },
	{ value: "kp", label: "KP" },
];

const FIELD_COLUMNS = 5;
const FIELD_ROWS = 6;
const COLUMN_STOPS = [8, 30, 50, 70, 92];
const ROW_STOPS = [14, 30, 48, 65, 78, 94];
const DEFAULT_FILTERS: FiltersState = {
	search: "",
	element: "all",
	position: "all",
	role: "all",
};

const POSITION_DISPLAY_ORDER: Record<string, number> = {
	GK: 0,
	DF: 1,
	MF: 2,
	FW: 3,
};

type ShareCopyState = "idle" | "copied" | "error";

type SharedTeamCandidate = {
	state: TeamBuilderState;
	filledSlots: number;
	formationName: string;
};

export default function TeamBuilderPage() {
	const [teamState, setTeamState] = useAtom(teamBuilderAtom);
	const favoritePlayerIds = useAtomValue(favoritePlayersAtom);
	const [filters, setFilters] = useState<FiltersState>(DEFAULT_FILTERS);
	const [pickerOpen, setPickerOpen] = useState(false);
	const [detailsOpen, setDetailsOpen] = useState(false);
	const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
	const [shareDialogOpen, setShareDialogOpen] = useState(false);
	const [shareLink, setShareLink] = useState("");
	const [shareCopyState, setShareCopyState] = useState<ShareCopyState>("idle");
	const [shareAlert, setShareAlert] = useState<string | null>(null);
	const [sharedCandidate, setSharedCandidate] =
		useState<SharedTeamCandidate | null>(null);
	const [importDialogOpen, setImportDialogOpen] = useState(false);
	const [clearDialogOpen, setClearDialogOpen] = useState(false);
	const location = useLocation();
	const navigate = useNavigate();
	const isMobile = useIsMobile();
	const favoriteSet = useMemo(
		() => new Set(favoritePlayerIds),
		[favoritePlayerIds],
	);

	const previewState = sharedCandidate?.state ?? null;
	const effectiveState = previewState ?? teamState;
	const isPreviewingSharedTeam = Boolean(previewState);

	const formation =
		formationsMap.get(effectiveState.formationId) ?? FORMATIONS[0];
	const displayMode = effectiveState.displayMode ?? "nickname";

	useEffect(() => {
		if (!formation.slots.length) {
			setActiveSlotId(null);
			setDetailsOpen(false);
			return;
		}
		if (
			activeSlotId &&
			!formation.slots.some((slot) => slot.id === activeSlotId)
		) {
			setActiveSlotId(null);
			setDetailsOpen(false);
		}
	}, [formation, activeSlotId]);

	useEffect(() => {
		const params = new URLSearchParams(location.search);
		const encodedShare = params.get(TEAM_SHARE_QUERY_KEY);
		if (!encodedShare) {
			return;
		}
		params.delete(TEAM_SHARE_QUERY_KEY);
		const nextSearch = params.toString();
		navigate(
			`${location.pathname}${nextSearch ? `?${nextSearch}` : ""}`,
			{
				replace: true,
				state: location.state,
				preventScrollReset: true,
			},
		);
		const decodedState = decodeTeamShareState(encodedShare);
		if (decodedState) {
			setSharedCandidate({
				state: decodedState,
				filledSlots: countAssignedPlayers(decodedState.assignments),
				formationName:
					formationsMap.get(decodedState.formationId)?.name ??
					"Unknown formation",
			});
			setImportDialogOpen(true);
			setActiveSlotId(null);
			setPickerOpen(false);
			setDetailsOpen(false);
			setClearDialogOpen(false);
			setShareAlert(null);
		} else {
			setShareAlert("We couldn't read the shared team link.");
		}
	}, [location.pathname, location.search, location.state, navigate]);

	const slotAssignments: SlotAssignment[] = useMemo(() => {
		const slotConfigs = effectiveState.slotConfigs ?? {};
		return formation.slots.map((slot) => {
			const config = normalizeSlotConfig(slotConfigs[slot.id]);
			const player = getPlayerById(effectiveState.assignments[slot.id]);
			return {
				slot,
				player,
				config,
				computed: player ? computeSlotComputedStats(player, config) : null,
			};
		});
	}, [effectiveState.assignments, effectiveState.slotConfigs, formation.slots]);

	const assignedPlayerIds = useMemo(() => {
		const ids = Object.values(effectiveState.assignments).filter(
			(value): value is number => typeof value === "number",
		);
		return new Set(ids);
	}, [effectiveState.assignments]);

	const filledCount = slotAssignments.filter((entry) => entry.player).length;
	const activeSlot = activeSlotId
		? (formation.slots.find((slot) => slot.id === activeSlotId) ?? null)
		: null;
	const activeAssignment = activeSlot
		? (slotAssignments.find((entry) => entry.slot.id === activeSlot.id) ?? null)
		: null;

	const filteredPlayers = useMemo(() => {
		if (!activeSlot) return [];
		const query = filters.search.trim().toLowerCase();

		return playersDataset
			.filter((player) => {
				if (filters.position !== "all" && player.position !== filters.position)
					return false;
				if (filters.element !== "all" && player.element !== filters.element) {
					return false;
				}
				if (filters.role !== "all" && player.role !== filters.role) {
					return false;
				}
				if (
					query &&
					!player.name.toLowerCase().includes(query) &&
					!player.nickname.toLowerCase().includes(query)
				) {
					return false;
				}
				return true;
			})
			.slice()
			.sort((a, b) => {
				const byPosition =
					POSITION_DISPLAY_ORDER[normalizePosition(a.position)] -
					POSITION_DISPLAY_ORDER[normalizePosition(b.position)];
				if (byPosition !== 0) return byPosition;
				return b.stats.total - a.stats.total;
			});
	}, [
		activeSlot,
		filters.element,
		filters.position,
		filters.role,
		filters.search,
	]);

	const favoriteOptions = useMemo(() => {
		if (!activeSlot) return [];
		return playersDataset.filter((player) => favoriteSet.has(player.id));
	}, [activeSlot, favoriteSet]);

	const handleFormationChange = (formationId: FormationDefinition["id"]) => {
		if (isPreviewingSharedTeam) return;
		setTeamState((prev) => {
			const fallbackFormation =
				formationsMap.get(prev.formationId) ?? FORMATIONS[0];
			const nextFormation = formationsMap.get(formationId) ?? fallbackFormation;
			const prevAssignments = prev.assignments ?? {};
			const prevSlotConfigs = prev.slotConfigs ?? {};

			const nextAssignments: TeamBuilderAssignments = {};
			const nextSlotConfigs: TeamBuilderSlotConfigs = {};

			nextFormation.slots.forEach((slot) => {
				nextAssignments[slot.id] = prevAssignments[slot.id] ?? null;
				if (prevSlotConfigs[slot.id]) {
					nextSlotConfigs[slot.id] = prevSlotConfigs[slot.id];
				}
			});

			return {
				...prev,
				formationId,
				assignments: nextAssignments,
				slotConfigs: nextSlotConfigs,
			};
		});
		setActiveSlotId(null);
		setDetailsOpen(false);
	};

	const handleDisplayModeChange = (mode: DisplayMode) => {
		if (isPreviewingSharedTeam) return;
		setTeamState((prev) => ({
			...prev,
			displayMode: mode,
		}));
	};

	const handleOpenPicker = (slot: FormationSlot) => {
		if (isPreviewingSharedTeam) return;
		setActiveSlotId(slot.id);
		setPickerOpen(true);
	};

	const handleAssignPlayer = (playerId: number) => {
		if (!activeSlot || isPreviewingSharedTeam) return;
		setTeamState((prev) => {
			const nextAssignments: TeamBuilderAssignments = {
				...prev.assignments,
				[activeSlot.id]: playerId,
			};
			return {
				...prev,
				assignments: nextAssignments,
			};
		});
		setPickerOpen(false);
	};

	const handleUpdateSlotConfig = (
		slotId: string,
		partialConfig: Partial<SlotConfig>,
	) => {
		if (isPreviewingSharedTeam) return;
		setTeamState((prev) => {
			const prevConfigs = prev.slotConfigs ?? {};
			const baseConfig = normalizeSlotConfig(prevConfigs[slotId]);
			const nextConfig = mergeSlotConfig(baseConfig, partialConfig);
			return {
				...prev,
				slotConfigs: {
					...prevConfigs,
					[slotId]: nextConfig,
				},
			};
		});
	};

	const handleSelectSlot = (slot: FormationSlot) => {
		setActiveSlotId(slot.id);
		setDetailsOpen(true);
	};

	const handleSelectEmptySlot = (slot: FormationSlot) => {
		if (isPreviewingSharedTeam) return;
		setActiveSlotId(slot.id);
		setDetailsOpen(false);
		setPickerOpen(true);
	};

	const handleDetailsOpenChange = (open: boolean) => {
		setDetailsOpen(open);
		if (!open) {
			setActiveSlotId(null);
		}
	};

	const handleClearSlot = (slotId: string) => {
		if (isPreviewingSharedTeam) return;
		setTeamState((prev) => ({
			...prev,
			assignments: { ...prev.assignments, [slotId]: null },
		}));
	};

	const handleClearTeam = () => {
		if (isPreviewingSharedTeam) return;
		setTeamState((prev) => {
			const nextAssignments: TeamBuilderAssignments = {};
			formation.slots.forEach((slot) => {
				nextAssignments[slot.id] = null;
			});
			return {
				...prev,
				assignments: nextAssignments,
				slotConfigs: {},
			};
		});
		setActiveSlotId(null);
		setDetailsOpen(false);
	};

	const handleResetFilters = () => {
		setFilters(DEFAULT_FILTERS);
	};

	const attemptClipboardCopy = async (value: string) => {
		if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
			setShareCopyState("error");
			return;
		}
		try {
			await navigator.clipboard.writeText(value);
			setShareCopyState("copied");
		} catch (error) {
			console.error("Failed to copy share link", error);
			setShareCopyState("error");
		}
	};

	const handleShareTeam = () => {
		if (isPreviewingSharedTeam) return;
		setShareCopyState("idle");
		setShareAlert(null);
		const encoded = encodeTeamShareState(teamState);
		if (!encoded || typeof window === "undefined") {
			setShareAlert("Unable to generate a share link right now. Please try again.");
			return;
		}
		const shareUrl = new URL(window.location.href);
		shareUrl.searchParams.set(TEAM_SHARE_QUERY_KEY, encoded);
		const link = shareUrl.toString();
		setShareLink(link);
		setShareDialogOpen(true);
		void attemptClipboardCopy(link);
	};

	const handleCopyShareLink = () => {
		if (!shareLink) return;
		setShareCopyState("idle");
		void attemptClipboardCopy(shareLink);
	};

	const handleDismissSharedCandidate = () => {
		setSharedCandidate(null);
		setImportDialogOpen(false);
		setShareAlert(null);
	};

	const handleImportSharedTeam = () => {
		if (!sharedCandidate) return;
		const nextState = sharedCandidate.state;
		setTeamState((prev) => ({
			...prev,
			formationId: nextState.formationId,
			assignments: nextState.assignments,
			slotConfigs: nextState.slotConfigs,
			displayMode: nextState.displayMode,
		}));
		setSharedCandidate(null);
		setImportDialogOpen(false);
		setShareAlert(null);
		setActiveSlotId(null);
		setDetailsOpen(false);
		setPickerOpen(false);
	};

	return (
		<div className="flex flex-col gap-4">
			{shareAlert ? (
				<div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-sm">
					{shareAlert}
				</div>
			) : null}

			{sharedCandidate ? (
				<div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm shadow-sm">
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<p className="font-semibold text-amber-900">Previewing shared team</p>
							<p className="text-xs text-amber-800">
								{sharedCandidate.filledSlots}/11 slots ·{" "}
								{sharedCandidate.formationName}
							</p>
							<p className="text-xs text-amber-700">
								Import to edit or dismiss to return to your saved squad.
							</p>
						</div>
						<div className="flex flex-wrap gap-2">
							<Button
								size="sm"
								className="bg-amber-900 text-white hover:bg-amber-800"
								onClick={() => setImportDialogOpen(true)}
							>
								Review & import
							</Button>
							<Button
								variant="ghost"
								size="sm"
								className="text-amber-900 hover:bg-amber-100"
								onClick={handleDismissSharedCandidate}
							>
								Dismiss
							</Button>
						</div>
					</div>
				</div>
			) : null}

			<section className="rounded-xl border bg-card p-4 shadow-sm">
				<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
					<div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-6">
						<div className="space-y-1">
							<p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
								Formation
							</p>
							<div className="flex flex-wrap gap-2">
								<Select
									disabled={isPreviewingSharedTeam}
									value={formation.id}
									onValueChange={(value) => handleFormationChange(value)}
								>
									<SelectTrigger className="w-full min-w-[220px] bg-background/80 sm:w-[260px]">
										<SelectValue placeholder="Choose formation" />
									</SelectTrigger>
									<SelectContent>
										{FORMATIONS.map((item) => (
											<SelectItem key={item.id} value={item.id}>
												<span className="flex flex-col text-left">
													<span className="font-semibold">{item.name}</span>
												</span>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Button
									variant="outline"
									size="sm"
									className="gap-1"
									onClick={() => setClearDialogOpen(true)}
									disabled={filledCount === 0 || isPreviewingSharedTeam}
								>
									<UserX className="size-4" />
									Clear team
								</Button>
								<Button
									size="sm"
									className="gap-1"
									onClick={handleShareTeam}
									disabled={isPreviewingSharedTeam}
								>
									<Share2 className="size-4" />
									Share team
								</Button>
							</div>
						</div>
						<div className="space-y-1">
							<p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
								Slot display
							</p>
							<div className="flex flex-wrap gap-1.5">
								{DISPLAY_MODE_OPTIONS.map((option) => {
									const isActive = displayMode === option.value;
									return (
										<Button
											key={option.value}
											size="sm"
											variant={isActive ? "default" : "outline"}
											className="px-2 text-[11px]"
											aria-pressed={isActive}
											disabled={isPreviewingSharedTeam}
											onClick={() => handleDisplayModeChange(option.value)}
										>
											{option.label}
										</Button>
									);
								})}
							</div>
						</div>
					</div>
					<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
						<span>{filledCount}/11 slots filled</span>
						{filledCount === 11 ? (
							<CheckCircle2
								className="size-4 text-emerald-500"
								aria-hidden="true"
							/>
						) : (
							<CirclePlus
								className="size-4 text-amber-500"
								aria-hidden="true"
							/>
						)}
					</div>
				</div>
			</section>

			<section className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
				<div className="space-y-3 rounded-xl border bg-card p-3 shadow-sm">
					<FormationPitch
						assignments={slotAssignments}
						activeSlotId={activeSlotId}
						displayMode={displayMode}
						onSlotSelect={handleSelectSlot}
						onEmptySlotSelect={handleSelectEmptySlot}
					/>
				</div>

				<div className="space-y-3">
					<div className="space-y-3 rounded-xl border bg-card p-3 shadow-sm">
						<header className="flex flex-wrap items-center justify-between gap-2">
							<div>
								<p className="text-sm font-semibold">Team board</p>
								<p className="text-xs text-muted-foreground">
									Overview of every slot and the chosen player.
								</p>
							</div>
						</header>
						<div className="space-y-2">
							{slotAssignments.map(({ slot, player }) => (
								<div
									key={slot.id}
									className={cn(
										"flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm shadow-sm",
										player
											? "border-muted bg-background"
											: "border-dashed border-muted-foreground/40 bg-transparent text-muted-foreground",
									)}
								>
									<div className="flex items-center gap-2">
										<PositionChip label={slot.label} />
										{player ? (
											<span className="text-sm font-semibold">
												{player.name}
											</span>
										) : (
											<button
												type="button"
												onClick={() => handleOpenPicker(slot)}
												disabled={isPreviewingSharedTeam}
												className="text-[10px] font-semibold uppercase tracking-[0.35em] text-primary underline-offset-2 hover:underline disabled:opacity-60"
											>
												Assign player
											</button>
										)}
									</div>
									{player ? (
										<Button
											variant="ghost"
											size="sm"
											className="h-7 px-2"
											disabled={isPreviewingSharedTeam}
											onClick={() => handleOpenPicker(slot)}
										>
											<RefreshCcw className="size-4" />
										</Button>
									) : null}
								</div>
							))}
						</div>
					</div>
				</div>
			</section>

			<SlotDetailsDrawer
				open={detailsOpen && Boolean(activeSlot)}
				slot={activeSlot}
				assignment={activeAssignment}
				onAssign={handleOpenPicker}
				onClearSlot={handleClearSlot}
				onUpdateSlotConfig={handleUpdateSlotConfig}
				onOpenChange={handleDetailsOpenChange}
			/>

			<PlayerAssignmentModal
				isMobile={isMobile}
				open={pickerOpen && !isPreviewingSharedTeam}
				activeSlot={activeSlot}
				favoriteSet={favoriteSet}
				favoritePlayers={favoriteOptions}
				onOpenChange={(open) => {
					setPickerOpen(open);
				}}
				assignedIds={assignedPlayerIds}
				filteredPlayers={filteredPlayers}
				filters={filters}
				onFiltersChange={setFilters}
				onResetFilters={handleResetFilters}
				onSelectPlayer={handleAssignPlayer}
				onClearSlot={() => {
					if (activeSlot) {
						handleClearSlot(activeSlot.id);
						setPickerOpen(false);
					}
				}}
			/>

			<Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Share this team</DialogTitle>
						<DialogDescription>
							Send this link to load a read-only copy of your setup.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-3">
						<div className="flex flex-col gap-2 sm:flex-row">
							<Input
								readOnly
								value={shareLink}
								onFocus={(event) => event.currentTarget.select()}
								className="font-mono text-xs"
							/>
							<Button onClick={handleCopyShareLink} disabled={!shareLink}>
								{shareCopyState === "copied" ? "Copied" : "Copy link"}
							</Button>
						</div>
						<p className="text-xs text-muted-foreground">
							Anyone with this URL can import your team into their own builder.
						</p>
						{shareCopyState === "copied" ? (
							<p className="text-xs text-emerald-600">Link copied to clipboard.</p>
						) : null}
						{shareCopyState === "error" ? (
							<p className="text-xs text-destructive">
								Your browser blocked auto copy. Please copy the link manually.
							</p>
						) : null}
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Clear current team?</DialogTitle>
						<DialogDescription>
							This will remove every assigned player and reset slot customizations.
							You can't undo this action.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setClearDialogOpen(false)}>
							Keep team
						</Button>
						<Button
							variant="destructive"
							onClick={() => {
								handleClearTeam();
								setClearDialogOpen(false);
							}}
						>
							Clear anyway
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={Boolean(sharedCandidate) && importDialogOpen}
				onOpenChange={setImportDialogOpen}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Import shared team</DialogTitle>
						<DialogDescription>
							Importing will overwrite your current formation and assignments.
						</DialogDescription>
					</DialogHeader>
					<div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
						<p className="font-semibold">
							{sharedCandidate?.formationName ?? "Unknown formation"}
						</p>
						<p className="text-xs text-muted-foreground">
							{sharedCandidate?.filledSlots ?? 0}/11 slots filled
						</p>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setImportDialogOpen(false)}>
							Maybe later
						</Button>
						<Button onClick={handleImportSharedTeam}>Import team</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

type FormationPitchProps = {
	assignments: SlotAssignment[];
	activeSlotId: string | null;
	displayMode: DisplayMode;
	onSlotSelect: (slot: FormationSlot) => void;
	onEmptySlotSelect: (slot: FormationSlot) => void;
};

function FormationPitch({
	assignments,
	activeSlotId,
	displayMode,
	onSlotSelect,
	onEmptySlotSelect,
}: FormationPitchProps) {
	return (
		<div className="mx-auto w-full">
			<div className="relative mx-auto w-full max-w-5xl">
				<div className="relative aspect-[3/4] w-full rounded-[36px] border border-emerald-800 bg-gradient-to-b from-emerald-700/70 via-emerald-800/80 to-emerald-900/95 p-4 shadow-[inset_0_0_50px_rgba(0,0,0,0.35)] sm:aspect-[5/6] lg:aspect-[6/5]">
					<div className="absolute inset-4 rounded-[30px] border border-white/25" />
					<div className="absolute inset-x-8 top-1/2 h-px -translate-y-1/2 bg-white/15" />
					<div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15 sm:h-56 sm:w-56" />
					<div className="absolute left-1/2 top-8 h-28 w-[55%] -translate-x-1/2 rounded-xl border-2 border-white/20 sm:h-32" />
					<div className="absolute left-1/2 bottom-8 h-28 w-[55%] -translate-x-1/2 rounded-xl border-2 border-white/20 sm:h-32" />
					<div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_55%)]" />
					<div className="relative h-full w-full">
						{assignments.map((entry) => (
							<PlayerSlotMarker
								key={entry.slot.id}
								entry={entry}
								isActive={entry.slot.id === activeSlotId}
								displayMode={displayMode}
								onSelect={() => onSlotSelect(entry.slot)}
								onEmptySelect={() => onEmptySlotSelect(entry.slot)}
							/>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

type PlayerSlotMarkerProps = {
	entry: SlotAssignment;
	isActive: boolean;
	displayMode: DisplayMode;
	onSelect: () => void;
	onEmptySelect: () => void;
};

function PlayerSlotMarker({
	entry,
	isActive,
	displayMode,
	onSelect,
	onEmptySelect,
}: PlayerSlotMarkerProps) {
	const { slot, player, config } = entry;
	const positionColor = getPositionColor(mapToTeamPosition(slot.label));
	const positionStyle = getSlotPositionStyle(slot);
	const rarityDefinition = getSlotRarityDefinition(config?.rarity ?? "normal");
	const handleClick = player ? onSelect : onEmptySelect;
	const hasPlayer = Boolean(player);

	return (
		<button
			type="button"
			onClick={handleClick}
			style={positionStyle}
			className={cn(
				"absolute flex w-[clamp(92px,12vw,128px)] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 text-white outline-none transition",
				isActive
					? "scale-105 drop-shadow-[0_12px_20px_rgba(0,0,0,0.35)]"
					: "hover:scale-105",
			)}
		>
			<div
				className={cn(
					"relative w-full rounded-lg border-2 bg-black/40 p-0.5 backdrop-blur-sm transition",
					hasPlayer
						? "border-white/60 shadow-xl"
						: "border-dashed border-white/40",
					isActive && "ring-2 ring-emerald-200",
				)}
			>
				<div
					className={cn(
						"relative w-full rounded-md",
						hasPlayer
							? "p-[2px]"
							: "overflow-hidden border border-dashed border-white/30 bg-black/20",
					)}
					style={
						hasPlayer
							? { background: rarityDefinition.cardBackground }
							: undefined
					}
				>
					<div className="relative w-full overflow-hidden rounded-[10px]">
						{player ? (
							<img
								src={player.image}
								alt={player.name}
								className="aspect-[4/4] w-full object-cover shadow-inner"
								loading="lazy"
							/>
						) : (
							<div className="flex aspect-[4/4] flex-col items-center justify-center gap-2 px-3 text-center">
								<span className="text-xs font-semibold uppercase tracking-[0.35em] text-white/80">
									{slot.label}
								</span>
								<span className="text-[10px] uppercase tracking-[0.3em] text-white/50">
									Tap to assign
								</span>
							</div>
						)}

						{player && (
							<>
								<div className="pointer-events-none absolute inset-x-0 bottom-0 rounded-xs bg-black/80 text-center shadow-2xl backdrop-blur">
									<span className="m-0 block text-xs font-semibold uppercase  text-white/95">
										{player ? getSlotDisplayValue(entry, displayMode) : null}
									</span>
								</div>
								<span
									className="absolute left-0 top-0 items-center justify-center px-2 py-[2px] text-xs font-semibold uppercase "
									style={{
										background:
											positionColor.gradient ?? `${positionColor.primary}22`,
										color: positionColor.gradient
											? "#fff"
											: positionColor.primary,
									}}
								>
									{slot.label}
								</span>
								<span className="absolute right-0 top-0 drop-shadow-[0_6px_12px_rgba(0,0,0,0.4)]">
									<ElementIcon element={player.element} />
								</span>
							</>
						)}
					</div>
				</div>
			</div>
		</button>
	);
}

function getSlotPositionStyle(slot: FormationSlot) {
	const columnIndex = slot.column - 1;
	const rowIndex = slot.row - 1;
	const left =
		COLUMN_STOPS[columnIndex] ??
		(columnIndex / Math.max(FIELD_COLUMNS - 1, 1)) * 100;
	const top =
		ROW_STOPS[rowIndex] ?? (rowIndex / Math.max(FIELD_ROWS - 1, 1)) * 100;
	return {
		left: `${left}%`,
		top: `${top}%`,
	};
}

function getSlotDisplayValue(entry: SlotAssignment, mode: DisplayMode) {
	const player = entry.player;
	const fallback = player?.nickname || player?.name || entry.slot.label;
	if (!player) {
		return entry.slot.label;
	}
	if (mode === "nickname") {
		return fallback;
	}
	const statValue = entry.computed?.power[mode];
	if (typeof statValue === "number" && !Number.isNaN(statValue)) {
		return formatNumber(statValue);
	}
	return fallback;
}

function countAssignedPlayers(assignments: TeamBuilderAssignments): number {
	return Object.values(assignments ?? {}).filter(
		(value): value is number => typeof value === "number",
	).length;
}

function ElementIcon({ element }: { element: string }) {
	const elementType = mapToElementType(element);
	const definition = getElementIcon(elementType);
	const Icon = definition.icon;

	if (!Icon) return null;

	return (
		<span
			className="inline-flex items-center justify-center rounded-full border border-white/20 p-1.5 shadow-sm shadow-black/30"
			style={{
				backgroundColor: definition.color,
			}}
		>
			<Icon className="size-3 text-white" aria-hidden="true" />
		</span>
	);
}

function getPlayerById(id: number | null | undefined): PlayerRecord | null {
	if (typeof id !== "number") return null;
	return playersById.get(id) ?? null;
}

function normalizePosition(position: string) {
	const normalized = position.trim().toUpperCase();
	if (normalized === "MF" || normalized === "MD") return "MF";
	if (normalized === "FW") return "FW";
	if (normalized === "DF") return "DF";
	if (normalized === "GK") return "GK";
	return "MF";
}
