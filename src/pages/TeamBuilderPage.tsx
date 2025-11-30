import { DndContext, type DragCancelEvent, type DragEndEvent, DragOverlay, type DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { toPng } from "html-to-image";
import { useAtom, useAtomValue } from "jotai";
import { Activity, ClipboardList, ImageDown, Share2, Shield, Sparkles, Target, UserX, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FormationPitch, ReservesRail, SlotCard } from "@/components/team-builder/FormationPitch";
import { PlayerAssignmentModal } from "@/components/team-builder/PlayerAssignmentModal";
import { SlotDetailsDrawer } from "@/components/team-builder/SlotDetailsDrawer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatNumber } from "@/lib/data-helpers";
import { FORMATIONS, type FormationDefinition, formationsMap } from "@/data/formations";
import { EXTRA_SLOT_IDS, EXTRA_TEAM_SLOTS } from "@/data/team-builder-slots";
import { useIsMobile } from "@/hooks/use-mobile";
import { type PlayerRecord, playersById, playersDataset } from "@/lib/players-data";
import { PASSIVE_CONDITION_OPTIONS, type PassiveConditionOption, computePassiveImpacts } from "@/lib/passive-calculations";
import { passivesById } from "@/lib/passives-data";
import { addPowerStats, clonePowerStats } from "@/lib/power-utils";
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
import { favoritePlayersAtom } from "@/store/favorites";
import {
	DEFAULT_PASSIVE_OPTIONS,
	type DisplayMode,
	mergeSlotConfig,
	normalizeSlotConfig,
	type PassiveCalculationOptions,
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

type CombinedPassiveEntry = {
	description: string;
	totalValue: number;
	count: number;
	renderedDescription: string;
};

type PassiveHighlightDescriptor = {
	pattern: RegExp;
	label: string;
	colorClass: string;
	Icon: LucideIcon;
};

const PASSIVE_HIGHLIGHTS: PassiveHighlightDescriptor[] = [
	{
		pattern: /shot|shoot/i,
		label: "Shoot AT",
		colorClass: "text-amber-600 dark:text-amber-200",
		Icon: Target,
	},
	{
		pattern: /focus/i,
		label: "Focus",
		colorClass: "text-sky-600 dark:text-sky-200",
		Icon: Activity,
	},
	{
		pattern: /scramble/i,
		label: "Scramble",
		colorClass: "text-emerald-600 dark:text-emerald-200",
		Icon: Zap,
	},
	{
		pattern: /wall|defense|df/i,
		label: "Defense",
		colorClass: "text-cyan-600 dark:text-cyan-200",
		Icon: Shield,
	},
	{
		pattern: /tension|spirit/i,
		label: "Tension",
		colorClass: "text-purple-600 dark:text-purple-300",
		Icon: Activity,
	},
	{
		pattern: /keeper|goal|kp/i,
		label: "Keeper",
		colorClass: "text-rose-600 dark:text-rose-200",
		Icon: Sparkles,
	},
];

const DEFAULT_PASSIVE_HIGHLIGHT: PassiveHighlightDescriptor = {
	pattern: /.*/,
	label: "Team Buff",
	colorClass: "text-slate-600 dark:text-slate-200",
	Icon: Sparkles,
};

function getPassiveHighlight(description: string): PassiveHighlightDescriptor {
	return PASSIVE_HIGHLIGHTS.find((entry) => entry.pattern.test(description)) ?? DEFAULT_PASSIVE_HIGHLIGHT;
}

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
	const [teamPassivesOpen, setTeamPassivesOpen] = useState(false);
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
	const passiveOptions = effectiveState.passiveOptions ?? DEFAULT_PASSIVE_OPTIONS;

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
		const baseAssignments = allSlots.map((slot) => {
			const config = normalizeSlotConfig(slotConfigs[slot.id]);
			const player = getPlayerById(effectiveState.assignments[slot.id]);
			return {
				slot,
				player,
				config,
				computed: player ? computeSlotComputedStats(player, config) : null,
			};
		});

		if (!passiveOptions.enabled) {
			return baseAssignments;
		}

		const impactMap = computePassiveImpacts(baseAssignments, passiveOptions);
		if (!impactMap.size) {
			return baseAssignments;
		}

		return baseAssignments.map((entry) => {
			if (!entry.player || !entry.computed) {
				return entry;
			}
			const rawBonuses = impactMap.get(entry.slot.id);
			if (!rawBonuses) {
				return entry;
			}
			const passiveBonuses = clonePowerStats(rawBonuses);
			return {
				...entry,
				computed: {
					...entry.computed,
					passiveBonuses,
					finalPower: addPowerStats(entry.computed.power, passiveBonuses),
				},
			};
		});
	}, [
		allSlots,
		effectiveState.assignments,
		effectiveState.slotConfigs,
		passiveOptions,
	]);
	const assignmentsById = useMemo(() => new Map(allAssignments.map((entry) => [entry.slot.id, entry])), [allAssignments]);
	const starterAssignments = allAssignments.filter((entry) => entry.slot.kind === "starter");
	const reserveAssignments = allAssignments.filter((entry) => entry.slot.kind === "reserve");
	const staffAssignments = allAssignments.filter((entry) => entry.slot.kind === "manager" || entry.slot.kind === "coordinator");

	const nonReserveAssignments = useMemo(() => allAssignments.filter((entry) => entry.slot.kind !== "reserve"), [allAssignments]);
	const combinedTeamPassives = useMemo<CombinedPassiveEntry[]>(() => combineTeamPassives(nonReserveAssignments), [nonReserveAssignments]);

	const assignedPlayerIds = useMemo(() => {
		const ids = Object.values(effectiveState.assignments).filter((value): value is number => typeof value === "number");
		return new Set(ids);
	}, [effectiveState.assignments]);

	const filledCount = allAssignments.filter((entry) => entry.player).length;
	const activeSlot = activeSlotId ? (slotMap.get(activeSlotId) ?? null) : null;
	const activeAssignment = activeSlot ? (allAssignments.find((entry) => entry.slot.id === activeSlot.id) ?? null) : null;
	const activeDragEntry = activeDragSlotId ? (assignmentsById.get(activeDragSlotId) ?? null) : null;
	const isDragActive = Boolean(activeDragSlotId);

	const matchesActiveFilters = useCallback(
		(player: PlayerRecord) => {
			if (!activeSlot) return false;
			const query = filters.search.trim().toLowerCase();
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
		},
		[activeSlot, filters.element, filters.position, filters.role, filters.search],
	);

	const filteredPlayers = useMemo(() => {
		return playersDataset
			.filter((player) => matchesActiveFilters(player))
			.slice()
			.sort((a, b) => {
				const byPosition = getPositionSortValue(a.position) - getPositionSortValue(b.position);
				if (byPosition !== 0) return byPosition;
				return b.stats.total - a.stats.total;
			});
	}, [matchesActiveFilters]);

	const favoriteOptions = useMemo(() => {
		if (!activeSlot) return [];
		return playersDataset.filter((player) => favoriteSet.has(player.id) && matchesActiveFilters(player));
	}, [activeSlot, favoriteSet, matchesActiveFilters]);

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

	const handlePassiveEnabledChange = (enabled: boolean) => {
		if (isPreviewingSharedTeam) return;
		setTeamState((prev) => {
			const prevOptions = prev.passiveOptions ?? DEFAULT_PASSIVE_OPTIONS;
			return {
				...prev,
				passiveOptions: {
					enabled,
					activeConditions: [...(prevOptions.activeConditions ?? [])],
				},
			};
		});
	};

	const handlePassiveConditionToggle = (
		condition: PassiveConditionOption["type"],
	) => {
		if (isPreviewingSharedTeam) return;
		setTeamState((prev) => {
			const prevOptions = prev.passiveOptions ?? DEFAULT_PASSIVE_OPTIONS;
			const hasCondition = prevOptions.activeConditions.includes(condition);
			const nextConditions = hasCondition
				? prevOptions.activeConditions.filter((entry) => entry !== condition)
				: [...prevOptions.activeConditions, condition];
			return {
				...prev,
				passiveOptions: {
					...prevOptions,
					activeConditions: nextConditions,
				},
			};
		});
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
			passiveOptions: nextState.passiveOptions ?? DEFAULT_PASSIVE_OPTIONS,
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
				<div className="flex flex-col gap-3">
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
									<Button variant="outline" size="sm" className="gap-1" onClick={() => setTeamPassivesOpen(true)}>
										<ClipboardList className="size-4" />
										Team passives
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
					<PassiveOptionsPanel
						options={passiveOptions}
						disabled={isPreviewingSharedTeam}
						onToggleEnabled={handlePassiveEnabledChange}
						onToggleCondition={handlePassiveConditionToggle}
					/>
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

			<Dialog open={teamPassivesOpen} onOpenChange={setTeamPassivesOpen}>
				<DialogContent className="!max-w-5xl border border-border/60 bg-[color:color-mix(in_oklab,var(--background)_92%,white_8%)] shadow-[0_45px_90px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-popover dark:shadow-[0_35px_75px_rgba(2,6,23,0.65)]">
					<DialogHeader>
						<DialogTitle>Team passives</DialogTitle>
						<DialogDescription>Combined bonuses from every configured passive across the squad.</DialogDescription>
					</DialogHeader>
					<div className="max-h-[60vh] overflow-y-auto pr-1">
						{combinedTeamPassives.length ? (
							<div className="grid gap-4 sm:grid-cols-2">
								{combinedTeamPassives.map((entry) => {
									const highlight = getPassiveHighlight(entry.description);
									const HighlightIcon = highlight.Icon;
									const formattedValue = formatSignedPercent(entry.totalValue);
									const valueColor =
										entry.totalValue >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300";

									return (
										<div
											key={entry.description}
											className="group relative overflow-hidden rounded-2xl border border-border/70 bg-[color:color-mix(in_oklab,var(--card)_88%,white_12%)] p-4 text-left shadow-md dark:border-white/5 dark:bg-gradient-to-br dark:from-background/95 dark:via-background/90 dark:to-background/80 dark:shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
										>
											<div className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100">
												<div className="absolute inset-0 bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--primary)_25%,white_15%),transparent_65%)] dark:bg-[radial-gradient(circle_at_top,var(--primary)/20,transparent_65%)]" />
											</div>
											<div className="relative space-y-3">
												<div className="flex items-start gap-3">
													<div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-border/70 bg-white/80 text-sm font-semibold text-foreground dark:border-white/10 dark:bg-white/5 dark:text-foreground/80">
														<HighlightIcon className={`size-5 ${highlight.colorClass}`} />
													</div>
													<div className="flex-1 space-y-1">
														<div className="flex items-center justify-between gap-3">
															<span className={`text-[10px] font-semibold uppercase tracking-[0.35em] ${highlight.colorClass}`}>
																{highlight.label}
															</span>
															<span className={`text-sm font-semibold ${valueColor}`}>{formattedValue}</span>
														</div>
														<p className="text-sm font-semibold leading-snug text-foreground">{entry.renderedDescription}</p>
													</div>
												</div>
												<div className="flex items-center justify-between text-[10px] uppercase tracking-[0.35em] text-muted-foreground/80">
													<div className="flex items-center gap-1 text-muted-foreground">
														<ClipboardList className="size-3.5 text-muted-foreground/80" />
														<span>Sources</span>
													</div>
													<div className="flex items-center gap-1 font-semibold text-foreground/80">
														<span className={entry.count ? "text-muted-foreground" : "text-muted-foreground/60"}>
															{entry.count} {entry.count === 1 ? "slot" : "slots"}
														</span>
													</div>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						) : (
							<div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
								No passives configured yet. Assign players and set their passives to see combined effects here.
							</div>
						)}
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

type PassiveOptionsPanelProps = {
	options: PassiveCalculationOptions;
	disabled: boolean;
	onToggleEnabled: (enabled: boolean) => void;
	onToggleCondition: (condition: PassiveConditionOption["type"]) => void;
};

function PassiveOptionsPanel(
	{ options, disabled, onToggleEnabled, onToggleCondition }: PassiveOptionsPanelProps,
) {
	const handleSwitchClick = () => {
		if (disabled) return;
		onToggleEnabled(!options.enabled);
	};

	const handleConditionClick = (condition: PassiveConditionOption["type"]) => {
		if (disabled) return;
		onToggleCondition(condition);
	};

	return (
		<div className="space-y-3 rounded-lg border border-border/70 bg-card/60 p-3">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div className="space-y-1">
					<p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
						Passive calculations
					</p>
					<p className="text-xs text-muted-foreground">
						Apply configured passives and optional conditions to slot stats.
					</p>
				</div>
				<button
					type="button"
					role="switch"
					aria-checked={options.enabled}
					aria-disabled={disabled}
					disabled={disabled}
					onClick={handleSwitchClick}
					className={`relative inline-flex h-8 w-16 items-center rounded-full border-2 transition-all ${
						options.enabled
							? "border-emerald-400 bg-emerald-500/90 shadow-[0_0_25px_rgba(16,185,129,0.35)]"
							: "border-slate-500 bg-slate-900/70 text-slate-200"
					} ${disabled ? "cursor-not-allowed opacity-80 ring-1 ring-white/10" : "cursor-pointer ring-1 ring-white/20"}`}
				>
					<span
						className={`inline-flex h-6 w-6 transform items-center justify-center rounded-full bg-background text-[10px] font-bold transition-all ${
							options.enabled
								? "translate-x-7 text-emerald-600"
								: "translate-x-1 text-slate-400"
						}`}
					>
						{options.enabled ? "ON" : "OFF"}
					</span>
				</button>
			</div>
			{options.enabled
				? PASSIVE_CONDITION_OPTIONS.length
					? (
						<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
							{PASSIVE_CONDITION_OPTIONS.map((condition) => {
								const checked = options.activeConditions.includes(condition.type);
								return (
									<label
										key={condition.type}
										className={`flex items-start gap-2 rounded-md border px-2 py-1.5 transition ${
											checked
												? "border-emerald-400 bg-emerald-500/10 shadow-[0_10px_25px_rgba(16,185,129,0.15)]"
												: "border-slate-600/80 bg-slate-900/50"
										} ${disabled ? "opacity-80" : "hover:border-emerald-400/70"}`}
									>
										<input
											type="checkbox"
											className="sr-only"
											checked={checked}
											disabled={disabled}
											onChange={() => handleConditionClick(condition.type)}
										/>
										<span
											aria-hidden
											className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-sm border-2 text-[10px] font-bold transition ${
												checked
													? "border-emerald-400 bg-emerald-400/90 text-emerald-950 dark:text-emerald-100"
													: "border-slate-500 bg-slate-800/70 text-transparent"
											} ${disabled ? "opacity-90" : ""}`}
										>
											✓
										</span>
										<div className="leading-tight">
											<p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-foreground">
												{condition.label}
											</p>
											<p className="text-[11px] text-muted-foreground">
												{condition.helper}
											</p>
										</div>
									</label>
								);
							})}
						</div>
					)
					: (
						<p className="text-xs text-muted-foreground">
							No conditional passives require manual enabling for this dataset.
						</p>
					)
				: (
					null
				)}
		</div>
	);
}

function getPlayerById(id: number | null | undefined): PlayerRecord | null {
	if (typeof id !== "number") return null;
	return playersById.get(id) ?? null;
}

function combineTeamPassives(assignments: SlotAssignment[]): CombinedPassiveEntry[] {
	const map = new Map<
		string,
		{
			description: string;
			totalValue: number;
			count: number;
		}
	>();

	const pushPassive = (passiveId: string | null, value: number) => {
		if (!passiveId) return;
		const passive = passivesById.get(passiveId);
		if (!passive?.description) {
			return;
		}
		const key = passive.description;
		const entry = map.get(key);
		if (entry) {
			entry.totalValue += value;
			entry.count += 1;
		} else {
			map.set(key, {
				description: key,
				totalValue: value,
				count: 1,
			});
		}
	};

	assignments.forEach(({ config }) => {
		const slotPassives = config.passives;
		if (!slotPassives) return;
		slotPassives.presets.forEach((preset) => pushPassive(preset.passiveId, preset.value));
		pushPassive(slotPassives.custom.passiveId, slotPassives.custom.value);
	});

	return Array.from(map.values())
		.map((entry) => ({
			...entry,
			renderedDescription: replacePassivePlaceholders(entry.description, entry.totalValue),
		}))
		.sort((a, b) => {
			const byValue = Math.abs(b.totalValue) - Math.abs(a.totalValue);
			if (byValue !== 0) {
				return byValue;
			}
			return a.description.localeCompare(b.description);
		});
}

function replacePassivePlaceholders(description: string, totalValue: number): string {
	if (!description) return "";
	return description.replace(/\+%|-%/g, (placeholder) => {
		if (placeholder === "+%") {
			return formatSignedPercent(totalValue);
		}
		return formatOppositePercent(totalValue);
	});
}

function formatSignedPercent(value: number): string {
	const absolute = formatNumber(Math.abs(value));
	const prefix = value >= 0 ? "+" : "-";
	return `${prefix}${absolute}%`;
}

function formatOppositePercent(value: number): string {
	const absolute = formatNumber(Math.abs(value));
	const prefix = value >= 0 ? "-" : "+";
	return `${prefix}${absolute}%`;
}
