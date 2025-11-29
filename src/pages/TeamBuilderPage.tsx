import { DndContext, type DragCancelEvent, type DragEndEvent, DragOverlay, type DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { toPng } from "html-to-image";
import { useAtom, useAtomValue } from "jotai";
import { ClipboardList, ImageDown, RefreshCcw, Share2, UserX } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PositionChip } from "@/components/team-builder/Chips";
import { FormationPitch, ReservesRail, SlotCard } from "@/components/team-builder/FormationPitch";
import { PlayerAssignmentModal } from "@/components/team-builder/PlayerAssignmentModal";
import { SlotDetailsDrawer } from "@/components/team-builder/SlotDetailsDrawer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FORMATIONS, type FormationDefinition, formationsMap } from "@/data/formations";
import { EXTRA_SLOT_IDS, EXTRA_TEAM_SLOTS } from "@/data/team-builder-slots";
import { useIsMobile } from "@/hooks/use-mobile";
import { type PlayerRecord, playersById, playersDataset } from "@/lib/players-data";
import { computeSlotComputedStats } from "@/lib/team-builder-calculations";
import { DISPLAY_MODE_OPTIONS } from "@/lib/team-builder-display";
import {
	countAssignedPlayers,
	DEFAULT_FILTERS,
	extendFormationSlot,
	getPositionSortValue,
	pickExtraAssignments,
	pickExtraSlotConfigs,
} from "@/lib/team-builder-ui";
import { decodeTeamShareState, encodeTeamShareState, TEAM_SHARE_QUERY_KEY } from "@/lib/team-share";
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
import type { FiltersState, SlotAssignment, SlotConfig, TeamBuilderSlot } from "@/types/team-builder";

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
	const [pageAlert, setPageAlert] = useState<string | null>(null);
	const [sharedCandidate, setSharedCandidate] = useState<SharedTeamCandidate | null>(null);
	const [importDialogOpen, setImportDialogOpen] = useState(false);
	const [clearDialogOpen, setClearDialogOpen] = useState(false);
	const [teamBoardOpen, setTeamBoardOpen] = useState(false);
	const [isExportingImage, setIsExportingImage] = useState(false);
	const [activeDragSlotId, setActiveDragSlotId] = useState<string | null>(null);
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 6,
			},
		}),
	);
	const location = useLocation();
	const navigate = useNavigate();
	const isMobile = useIsMobile();
	const layoutContainerRef = useRef<HTMLDivElement | null>(null);
	const [isStackedLayout, setIsStackedLayout] = useState(true);
	const favoriteSet = useMemo(() => new Set(favoritePlayerIds), [favoritePlayerIds]);

	useEffect(() => {
		const updateLayoutState = () => {
			if (typeof window === "undefined") {
				return;
			}
			const current = layoutContainerRef.current;
			if (!current) {
				return;
			}
			const direction = window.getComputedStyle(current).flexDirection;
			setIsStackedLayout(direction !== "row");
		};

		updateLayoutState();

		if (typeof window === "undefined") {
			return;
		}

		if (typeof ResizeObserver !== "undefined") {
			const observer = new ResizeObserver(() => updateLayoutState());
			if (layoutContainerRef.current) {
				observer.observe(layoutContainerRef.current);
			}
			return () => observer.disconnect();
		}

		window.addEventListener("resize", updateLayoutState);
		return () => window.removeEventListener("resize", updateLayoutState);
	}, []);

	const previewState = sharedCandidate?.state ?? null;
	const effectiveState = previewState ?? teamState;
	const isPreviewingSharedTeam = Boolean(previewState);

	const formation = formationsMap.get(effectiveState.formationId) ?? FORMATIONS[0];
	const displayMode = effectiveState.displayMode ?? "nickname";
	const starterSlots = useMemo(() => formation.slots.map((slot) => extendFormationSlot(slot)), [formation]);
	const allSlots = useMemo(() => [...starterSlots, ...EXTRA_TEAM_SLOTS], [starterSlots]);
	const slotMap = useMemo(() => new Map(allSlots.map((slot) => [slot.id, slot])), [allSlots]);

	useEffect(() => {
		if (!allSlots.length) {
			setActiveSlotId(null);
			setDetailsOpen(false);
			return;
		}
		if (activeSlotId && !allSlots.some((slot) => slot.id === activeSlotId)) {
			setActiveSlotId(null);
			setDetailsOpen(false);
		}
	}, [allSlots, activeSlotId]);

	useEffect(() => {
		const params = new URLSearchParams(location.search);
		const encodedShare = params.get(TEAM_SHARE_QUERY_KEY);
		if (!encodedShare) {
			return;
		}
		params.delete(TEAM_SHARE_QUERY_KEY);
		const nextSearch = params.toString();
		navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ""}`, {
			replace: true,
			state: location.state,
			preventScrollReset: true,
		});
		const decodedState = decodeTeamShareState(encodedShare);
		if (decodedState) {
			setSharedCandidate({
				state: decodedState,
				filledSlots: countAssignedPlayers(decodedState.assignments),
				formationName: formationsMap.get(decodedState.formationId)?.name ?? "Unknown formation",
			});
			setActiveSlotId(null);
			setPickerOpen(false);
			setDetailsOpen(false);
			setClearDialogOpen(false);
			setPageAlert(null);
		} else {
			setPageAlert("We couldn't read the shared team link.");
		}
	}, [location.pathname, location.search, location.state, navigate]);

	const allAssignments: SlotAssignment[] = useMemo(() => {
		const slotConfigs = effectiveState.slotConfigs ?? {};
		return allSlots.map((slot) => {
			const config = normalizeSlotConfig(slotConfigs[slot.id]);
			const player = getPlayerById(effectiveState.assignments[slot.id]);
			return {
				slot,
				player,
				config,
				computed: player ? computeSlotComputedStats(player, config) : null,
			};
		});
	}, [allSlots, effectiveState.assignments, effectiveState.slotConfigs]);
	const assignmentsById = useMemo(() => new Map(allAssignments.map((entry) => [entry.slot.id, entry])), [allAssignments]);
	const starterAssignments = allAssignments.filter((entry) => entry.slot.kind === "starter");
	const reserveAssignments = allAssignments.filter((entry) => entry.slot.kind === "reserve");
	const staffAssignments = allAssignments.filter((entry) => entry.slot.kind === "manager" || entry.slot.kind === "coordinator");

	const assignedPlayerIds = useMemo(() => {
		const ids = Object.values(effectiveState.assignments).filter((value): value is number => typeof value === "number");
		return new Set(ids);
	}, [effectiveState.assignments]);

	const filledCount = allAssignments.filter((entry) => entry.player).length;
	const activeSlot = activeSlotId ? (slotMap.get(activeSlotId) ?? null) : null;
	const activeAssignment = activeSlot ? (allAssignments.find((entry) => entry.slot.id === activeSlot.id) ?? null) : null;
	const activeDragEntry = activeDragSlotId ? (assignmentsById.get(activeDragSlotId) ?? null) : null;
	const isDragActive = Boolean(activeDragSlotId);

	const filteredPlayers = useMemo(() => {
		if (!activeSlot) return [];
		const query = filters.search.trim().toLowerCase();

		return playersDataset
			.filter((player) => {
				if (filters.position !== "all" && player.position !== filters.position) return false;
				if (filters.element !== "all" && player.element !== filters.element) {
					return false;
				}
				if (filters.role !== "all" && player.role !== filters.role) {
					return false;
				}
				if (query && !player.name.toLowerCase().includes(query) && !player.nickname.toLowerCase().includes(query)) {
					return false;
				}
				return true;
			})
			.slice()
			.sort((a, b) => {
				const byPosition = getPositionSortValue(a.position) - getPositionSortValue(b.position);
				if (byPosition !== 0) return byPosition;
				return b.stats.total - a.stats.total;
			});
	}, [activeSlot, filters.element, filters.position, filters.role, filters.search]);

	const favoriteOptions = useMemo(() => {
		if (!activeSlot) return [];
		return playersDataset.filter((player) => favoriteSet.has(player.id));
	}, [activeSlot, favoriteSet]);

	const handleFormationChange = (formationId: FormationDefinition["id"]) => {
		if (isPreviewingSharedTeam) return;
		setTeamState((prev) => {
			const fallbackFormation = formationsMap.get(prev.formationId) ?? FORMATIONS[0];
			const nextFormation = formationsMap.get(formationId) ?? fallbackFormation;
			const prevAssignments = prev.assignments ?? {};
			const prevSlotConfigs = prev.slotConfigs ?? {};
			const extraAssignmentsSnapshot = pickExtraAssignments(prevAssignments);
			const extraSlotConfigsSnapshot = pickExtraSlotConfigs(prevSlotConfigs);

			const nextAssignments: TeamBuilderAssignments = {};
			const nextSlotConfigs: TeamBuilderSlotConfigs = {};

			nextFormation.slots.forEach((slot) => {
				nextAssignments[slot.id] = prevAssignments[slot.id] ?? null;
				if (prevSlotConfigs[slot.id]) {
					nextSlotConfigs[slot.id] = prevSlotConfigs[slot.id];
				}
			});
			EXTRA_SLOT_IDS.forEach((slotId) => {
				nextAssignments[slotId] = extraAssignmentsSnapshot[slotId] ?? null;
				if (extraSlotConfigsSnapshot[slotId]) {
					nextSlotConfigs[slotId] = extraSlotConfigsSnapshot[slotId];
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

	const handleOpenPicker = (slot: TeamBuilderSlot) => {
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

	const handleUpdateSlotConfig = (slotId: string, partialConfig: Partial<SlotConfig>) => {
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

	const handleSelectSlot = (slot: TeamBuilderSlot) => {
		setActiveSlotId(slot.id);
		setDetailsOpen(true);
	};

	const handleSelectEmptySlot = (slot: TeamBuilderSlot) => {
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
			EXTRA_SLOT_IDS.forEach((slotId) => {
				nextAssignments[slotId] = null;
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

	const handleSlotDragStart = (event: DragStartEvent) => {
		if (isPreviewingSharedTeam) return;
		setActiveDragSlotId(String(event.active.id));
	};

	const handleSlotDragEnd = (event: DragEndEvent) => {
		if (isPreviewingSharedTeam) return;
		const { active, over } = event;
		if (!over || active.id === over.id) {
			setActiveDragSlotId(null);
			return;
		}
		const sourceId = String(active.id);
		const targetId = String(over.id);
		setTeamState((prev) => {
			const prevAssignments = prev.assignments ?? {};
			const sourcePlayer = prevAssignments[sourceId];
			if (typeof sourcePlayer !== "number") {
				return prev;
			}
			const targetPlayer = prevAssignments[targetId];
			const nextAssignments: TeamBuilderAssignments = { ...prevAssignments };
			const prevSlotConfigs = prev.slotConfigs ?? {};
			const nextSlotConfigs: TeamBuilderSlotConfigs = { ...prevSlotConfigs };
			const sourceConfig = nextSlotConfigs[sourceId];
			const targetConfig = nextSlotConfigs[targetId];

			if (typeof targetPlayer === "number") {
				nextAssignments[sourceId] = targetPlayer;
				nextAssignments[targetId] = sourcePlayer;
				if (typeof targetConfig === "undefined") {
					delete nextSlotConfigs[sourceId];
				} else {
					nextSlotConfigs[sourceId] = targetConfig;
				}
				if (typeof sourceConfig === "undefined") {
					delete nextSlotConfigs[targetId];
				} else {
					nextSlotConfigs[targetId] = sourceConfig;
				}
			} else {
				nextAssignments[sourceId] = null;
				nextAssignments[targetId] = sourcePlayer;
				delete nextSlotConfigs[sourceId];
				if (typeof sourceConfig === "undefined") {
					delete nextSlotConfigs[targetId];
				} else {
					nextSlotConfigs[targetId] = sourceConfig;
				}
			}

			return {
				...prev,
				assignments: nextAssignments,
				slotConfigs: nextSlotConfigs,
			};
		});
		setActiveDragSlotId(null);
	};

	const handleSlotDragCancel = (_event: DragCancelEvent) => {
		setActiveDragSlotId(null);
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
		setPageAlert(null);
		const encoded = encodeTeamShareState(teamState);
		if (!encoded || typeof window === "undefined") {
			setPageAlert("Unable to generate a share link right now. Please try again.");
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
		setPageAlert(null);
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
		setPageAlert(null);
		setActiveSlotId(null);
		setDetailsOpen(false);
		setPickerOpen(false);
	};

	const handleDownloadTeamImage = async () => {
		if (!layoutContainerRef.current || typeof window === "undefined") {
			return;
		}
		setIsExportingImage(true);
		setPageAlert(null);
		try {
			const dataUrl = await toPng(layoutContainerRef.current, {
				cacheBust: true,
				pixelRatio: Math.min(window.devicePixelRatio || 2, 3),
				backgroundColor: "#020617",
			});
			const link = document.createElement("a");
			link.href = dataUrl;
			link.download = `inazuma-team-${new Date().toISOString().split("T")[0]}.png`;
			link.click();
		} catch (error) {
			console.error("Failed to export team image", error);
			setPageAlert("We couldn't export the team image. Please try again.");
		} finally {
			setIsExportingImage(false);
		}
	};

	return (
		<div className="flex flex-col gap-4">
			{pageAlert ? (
				<div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-sm">{pageAlert}</div>
			) : null}

			{sharedCandidate ? (
				<div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm shadow-sm">
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<p className="font-semibold text-amber-900">Previewing shared team</p>
							<p className="text-xs text-amber-700">Import to edit or dismiss to return to your saved squad.</p>
						</div>
						<div className="flex flex-wrap gap-2">
							<Button size="sm" className="bg-amber-900 text-white hover:bg-amber-800" onClick={() => setImportDialogOpen(true)}>
								Import Team
							</Button>
							<Button variant="ghost" size="sm" className="text-amber-900 hover:bg-amber-100" onClick={handleDismissSharedCandidate}>
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
							<p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Team actions</p>
							<div className="flex flex-wrap gap-2">
								<Button
									variant="destructive"
									size="sm"
									className="gap-1"
									onClick={() => setClearDialogOpen(true)}
									disabled={filledCount === 0 || isPreviewingSharedTeam}
								>
									<UserX className="size-4" />
									Clear team
								</Button>
								<Button size="sm" className="gap-1" onClick={handleShareTeam} disabled={isPreviewingSharedTeam}>
									<Share2 className="size-4" />
									Share team
								</Button>
								<Button variant="outline" size="sm" className="gap-1" onClick={handleDownloadTeamImage} disabled={isExportingImage}>
									<ImageDown className="size-4" />
									{isExportingImage ? "Preparing..." : "Export image"}
								</Button>
								<Button variant="outline" size="sm" className="gap-1" onClick={() => setTeamBoardOpen(true)}>
									<ClipboardList className="size-4" />
									Open board
								</Button>
							</div>
						</div>
						<div className="space-y-1">
							<p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Slot display</p>
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
				</div>
			</section>

			<DndContext sensors={sensors} onDragStart={handleSlotDragStart} onDragEnd={handleSlotDragEnd} onDragCancel={handleSlotDragCancel}>
				<div className="grid gap-4">
					<div className="rounded-xl border bg-card p-3 shadow-sm">
						<div ref={layoutContainerRef} className="mx-auto flex w-full max-w-5xl flex-col gap-4 lg:flex-row lg:items-start lg:justify-center lg:gap-3 ">
							<div className="flex-1">
								<FormationPitch
									assignments={starterAssignments}
									staffEntries={staffAssignments}
									activeSlotId={activeSlotId}
									displayMode={displayMode}
									onSlotSelect={handleSelectSlot}
									onEmptySlotSelect={handleSelectEmptySlot}
									formationId={formation.id}
									onFormationChange={handleFormationChange}
									isFormationDisabled={isPreviewingSharedTeam}
									dragDisabled={isPreviewingSharedTeam}
									isDragActive={isDragActive}
								/>
							</div>
							<div className="self-start">
								<ReservesRail
									entries={reserveAssignments}
									displayMode={displayMode}
									activeSlotId={activeSlotId}
									onSlotSelect={handleSelectSlot}
									onEmptySlotSelect={handleSelectEmptySlot}
									isStackedLayout={isStackedLayout}
									variant="compact"
									dragDisabled={isPreviewingSharedTeam}
									isDragActive={isDragActive}
								/>
							</div>
						</div>
					</div>
				</div>
				<DragOverlay dropAnimation={null}>
					{activeDragEntry ? (
						<div className="pointer-events-none w-[clamp(120px,25vw,180px)] drop-shadow-[0_18px_25px_rgba(0,0,0,0.4)]">
							<SlotCard entry={activeDragEntry} displayMode={displayMode} isActive />
						</div>
					) : null}
				</DragOverlay>
			</DndContext>

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

			<Dialog open={teamBoardOpen} onOpenChange={setTeamBoardOpen}>
				<DialogContent className="!max-w-3xl">
					<DialogHeader>
						<DialogTitle>Team board</DialogTitle>
						<DialogDescription>Overview of every slot and its current assignment.</DialogDescription>
					</DialogHeader>
					<div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
						{allAssignments.map(({ slot, player }) => (
							<div
								key={slot.id}
								className={cn(
									"flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm shadow-sm",
									player ? "border-muted bg-background" : "border-dashed border-muted-foreground/40 bg-transparent text-muted-foreground",
								)}
							>
								<div className="flex items-center gap-2">
									<PositionChip label={slot.displayLabel ?? slot.label} />
									{player ? (
										<span className="text-sm font-semibold">{player.name}</span>
									) : (
										<button
											type="button"
											onClick={() => {
												setTeamBoardOpen(false);
												handleOpenPicker(slot);
											}}
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
										onClick={() => {
											setTeamBoardOpen(false);
											handleOpenPicker(slot);
										}}
									>
										<RefreshCcw className="size-4" />
									</Button>
								) : null}
							</div>
						))}
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Share this team</DialogTitle>
						<DialogDescription>Send this link to load a read-only copy of your setup.</DialogDescription>
					</DialogHeader>
					<div className="space-y-3">
						<div className="flex flex-col gap-2 sm:flex-row">
							<Input readOnly value={shareLink} onFocus={(event) => event.currentTarget.select()} className="font-mono text-xs" />
							<Button onClick={handleCopyShareLink} disabled={!shareLink}>
								{shareCopyState === "copied" ? "Copied" : "Copy link"}
							</Button>
						</div>
						<p className="text-xs text-muted-foreground">Anyone with this URL can import your team into their own builder.</p>
						{shareCopyState === "copied" ? <p className="text-xs text-emerald-600">Link copied to clipboard.</p> : null}
						{shareCopyState === "error" ? <p className="text-xs text-destructive">Your browser blocked auto copy. Please copy the link manually.</p> : null}
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Clear current team?</DialogTitle>
						<DialogDescription>This will remove every assigned player and reset slot customizations. You can't undo this action.</DialogDescription>
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

			<Dialog open={Boolean(sharedCandidate) && importDialogOpen} onOpenChange={setImportDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Import shared team</DialogTitle>
						<DialogDescription>Importing will overwrite your previous formation and assignments.</DialogDescription>
					</DialogHeader>
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

function getPlayerById(id: number | null | undefined): PlayerRecord | null {
	if (typeof id !== "number") return null;
	return playersById.get(id) ?? null;
}
