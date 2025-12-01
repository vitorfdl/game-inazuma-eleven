import type { LucideIcon } from "lucide-react";
import { BadgeInfo, Bean, BrickWall, HeartPulse, Shield, ShieldCheck, Sparkles, Swords, Target } from "lucide-react";
import { type KeyboardEvent, useEffect, useMemo, useState } from "react";

import { ElementBadge, PlayerDetailsButton, PlayerDetailsDialog, type PlayerMetric, PositionBadge } from "@/components/player/PlayerDetailsDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatNumber, titleCase } from "@/lib/data-helpers";
import { EQUIPMENT_CATEGORIES, EQUIPMENT_CATEGORY_LABELS, type EquipmentRecord, equipmentsByType } from "@/lib/equipments-data";
import type { BaseStats } from "@/lib/inazuma-math";
import { customPassives, type PassiveRecord, passivesById, passivesByType, playerBuildPassives, playerGeneralPassives } from "@/lib/passives-data";
import { BEAN_COLORS, clampBeanValue, createEmptySlotBeans, MAX_BEAN_POINTS } from "@/lib/slot-beans";
import { clampPassiveValue, createEmptySlotPassives, PASSIVE_PRESET_SLOTS } from "@/lib/slot-passives";
import { applyRarityBonus, getSlotRarityDefinition, SLOT_RARITY_OPTIONS } from "@/lib/slot-rarity";
import { createEmptySlotEquipments } from "@/store/team-builder";
import type {
	BaseAttributeKey,
	EquipmentCategory,
	SlotAssignment,
	SlotBean,
	SlotBeans,
	SlotConfig,
	SlotEquipments,
	SlotPassives,
	SlotRarity,
	TeamBuilderSlot,
} from "@/types/team-builder";

type StatKey = "shootAT" | "focusAT" | "focusDF" | "wallDF" | "scrambleAT" | "scrambleDF" | "kp";

type StatDefinition = {
	label: string;
	key: StatKey;
	icon: LucideIcon;
};

const BOOSTED_STATS: StatDefinition[] = [
	{ label: "Shoot AT", key: "shootAT", icon: Target },
	{ label: "Focus AT", key: "focusAT", icon: Swords },
	{ label: "Focus DF", key: "focusDF", icon: Shield },
	{ label: "Wall DF", key: "wallDF", icon: BrickWall },
	{ label: "Scramble AT", key: "scrambleAT", icon: Target },
	{ label: "Scramble DF", key: "scrambleDF", icon: ShieldCheck },
	{ label: "KP", key: "kp", icon: HeartPulse },
];

const ATTRIBUTE_LABELS: Record<BaseAttributeKey, string> = {
	kick: "Kick",
	control: "Control",
	technique: "Technique",
	pressure: "Pressure",
	physical: "Physical",
	agility: "Agility",
	intelligence: "Intelligence",
};

const ATTRIBUTE_KEYS = Object.keys(ATTRIBUTE_LABELS) as BaseAttributeKey[];
const BEAN_SLOT_KEYS = ["bean-1", "bean-2", "bean-3"] as const;
const STAT_METRIC_DEFINITIONS: Array<{ key: keyof BaseStats; label: string }> = [
	...ATTRIBUTE_KEYS.map((key) => ({
		key,
		label: ATTRIBUTE_LABELS[key],
	})),
	{ key: "total", label: "Total" },
];

export type SlotDetailsDrawerProps = {
	open: boolean;
	slot: TeamBuilderSlot | null;
	assignment: SlotAssignment | null;
	onAssign: (slot: TeamBuilderSlot) => void;
	onClearSlot: (slotId: string) => void;
	onUpdateSlotConfig: (slotId: string, partialConfig: Partial<SlotConfig>) => void;
	onOpenChange: (open: boolean) => void;
};

export function SlotDetailsDrawer({ open, slot, assignment, onAssign, onClearSlot, onUpdateSlotConfig, onOpenChange }: SlotDetailsDrawerProps) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="left" className="w-full !max-w-2xl border-l p-0 sm:max-w-md hm-scrollbar">
				<div className="h-full overflow-y-auto p-3">
					<SlotDetailsPanel slot={slot} assignment={assignment} onAssign={onAssign} onClearSlot={onClearSlot} onUpdateSlotConfig={onUpdateSlotConfig} />
				</div>
			</SheetContent>
		</Sheet>
	);
}

type SlotDetailsPanelProps = {
	slot: TeamBuilderSlot | null;
	assignment: SlotAssignment | null;
	onAssign: (slot: TeamBuilderSlot) => void;
	onClearSlot: (slotId: string) => void;
	onUpdateSlotConfig: (slotId: string, partialConfig: Partial<SlotConfig>) => void;
};

function SlotDetailsPanel({ slot, assignment, onAssign, onClearSlot, onUpdateSlotConfig }: SlotDetailsPanelProps) {
	const [clearDialogOpen, setClearDialogOpen] = useState(false);
	const [detailsOpen, setDetailsOpen] = useState(false);
	const player = assignment?.player ?? null;
	const rarity = assignment?.config.rarity ?? "normal";
	const rarityDefinition = getSlotRarityDefinition(rarity);
	const computedStats = assignment?.computed ?? null;
	const currentEquipments = assignment?.config.equipments ?? createEmptySlotEquipments();
	const currentBeans = assignment?.config.beans ?? createEmptySlotBeans();
	const currentPassives = assignment?.config.passives ?? createEmptySlotPassives();
	const allowsEquipmentConfig = slot?.configScope !== "rarity-only";
	const allowsBeanConfig = slot?.configScope !== "rarity-only";
	const allowsPassiveConfig = Boolean(slot && player);

	useEffect(() => {
		if (!player || !slot) {
			setClearDialogOpen(false);
		}
	}, [player, slot]);

	useEffect(() => {
		if (!player) {
			setDetailsOpen(false);
		}
	}, [player]);

	const playerStatMetrics = useMemo<PlayerMetric[]>(() => {
		if (!player) {
			return [];
		}
		return STAT_METRIC_DEFINITIONS.map((definition) => ({
			label: definition.label,
			value: formatNumber(player.stats[definition.key]),
		}));
	}, [player]);

	const playerPowerMetrics = useMemo<PlayerMetric[]>(() => {
		if (!player) {
			return [];
		}
		return BOOSTED_STATS.map((stat) => ({
			label: stat.label,
			value: formatNumber(player.power[stat.key]),
		}));
	}, [player]);

	const handleRarityChange = (value: SlotRarity) => {
		if (!slot) return;
		onUpdateSlotConfig(slot.id, { rarity: value });
	};

	const handleEquipmentChange = (category: EquipmentCategory, equipmentId: string | null) => {
		if (!slot) return;
		const baseEquipments = assignment?.config.equipments ?? createEmptySlotEquipments();
		onUpdateSlotConfig(slot.id, {
			equipments: {
				...baseEquipments,
				[category]: equipmentId,
			},
		});
	};

	const handleBeanChange = (index: number, bean: SlotBean) => {
		if (!slot) return;
		const baseBeans = assignment?.config.beans ?? createEmptySlotBeans();
		const nextBeans = baseBeans.map((entry, idx) => (idx === index ? bean : entry)) as SlotBeans;
		onUpdateSlotConfig(slot.id, { beans: nextBeans });
	};

	const showEquipableBoosts = Boolean(slot && player) && (allowsBeanConfig || allowsEquipmentConfig);
	const showPassivesConfig = Boolean(slot && player) && allowsPassiveConfig;

	return (
		<div className="flex flex-col gap-4">
			<section className="rounded-xl border bg-card p-4 shadow-sm">
				<header className="flex flex-wrap items-center gap-2">
					<div>
						<p className="text-sm font-semibold">Slot details</p>
					</div>
					{slot ? <PositionBadge position={slot.displayLabel ?? slot.label} /> : null}
				</header>
				<div className="mt-4 space-y-4">
					{!slot ? (
						<div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No slot selected. Tap a position on the pitch to focus it.</div>
					) : !player ? (
						<div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-6 text-center">
							<div className="flex size-32 items-center justify-center rounded-2xl border border-dashed text-xl font-semibold">
								{slot.displayLabel ?? slot.label}
							</div>
							<p className="text-sm text-muted-foreground">This slot is empty. Choose a player to assign.</p>
							<Button onClick={() => onAssign(slot)}>Assign player</Button>
						</div>
					) : (
						<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
							<div className="flex flex-col items-center gap-4 rounded-2xl bg-muted/10 p-4 text-center">
								<img
									src={player.safeImage}
									alt={player.name}
									className="w-full max-w-[220px] rounded-2xl object-cover"
									loading="lazy"
									crossOrigin="anonymous"
									referrerPolicy="no-referrer"
								/>
								<div className="flex flex-wrap items-center justify-center gap-2 text-xs">
									<ElementBadge element={player.element} />
									<PositionBadge position={player.position} />
									<PlayerDetailsButton onClick={() => setDetailsOpen(true)} />
								</div>
								<div>
									<p className="text-lg font-semibold">{player.name}</p>
									<p className="text-sm text-muted-foreground">{player.nickname}</p>
								</div>
								<div className="flex w-full flex-col gap-2">
									<Button onClick={() => onAssign(slot)} className="w-full">
										Replace player
									</Button>
									<Button variant="destructive" onClick={() => setClearDialogOpen(true)} className="w-full">
										Remove from slot
									</Button>
								</div>
							</div>
							<div className="space-y-3">
								<RarityConfig value={rarity} onChange={handleRarityChange} accent={rarityDefinition.accent} />
								<div className="space-y-2">
									{BOOSTED_STATS.map((stat) => {
										const rawValue = player.power[stat.key] ?? 0;
										const boostedValue =
											computedStats?.finalPower?.[stat.key] ??
											computedStats?.power[stat.key] ??
											applyRarityBonus(typeof rawValue === "number" ? rawValue : Number(rawValue), rarity);
										const Icon = stat.icon;
										return (
											<div key={stat.label} className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
												<div className="flex items-center gap-2 text-sm font-medium">
													<Icon className="size-4 text-emerald-600" />
													{stat.label}
												</div>
												<span className="text-base font-semibold">{formatNumber(boostedValue)}</span>
											</div>
										);
									})}
								</div>
							</div>
						</div>
					)}
				</div>

				<Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Remove player from slot?</DialogTitle>
							<DialogDescription>This will clear the assignment and reset custom settings for this slot.</DialogDescription>
						</DialogHeader>
						<DialogFooter>
							<Button variant="outline" onClick={() => setClearDialogOpen(false)}>
								Keep player
							</Button>
							<Button
								variant="destructive"
								onClick={() => {
									if (slot) {
										onClearSlot(slot.id);
									}
									setClearDialogOpen(false);
								}}
							>
								Remove anyway
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</section>

			{showEquipableBoosts ? (
				<section className="rounded-xl border bg-card p-4 shadow-sm">
					<header className="flex items-center justify-between">
						<p className="text-sm font-semibold">Equipable Boosts</p>
					</header>
					<div className="mt-4">
						<div className="flex flex-col gap-3 lg:grid lg:grid-cols-2">
							{allowsBeanConfig ? <BeansConfig value={currentBeans} onChange={handleBeanChange} /> : null}
							{allowsEquipmentConfig ? <EquipmentLoadoutConfig value={currentEquipments} onChange={handleEquipmentChange} /> : null}
						</div>
					</div>
				</section>
			) : null}
			{showPassivesConfig && slot ? (
				<section className="rounded-xl border bg-card p-4 shadow-sm">
					<header className="flex items-center justify-between">
						<p className="text-sm font-semibold">Passives</p>
					</header>
					<PassivesConfig
						className="mt-4"
						slot={slot}
						value={currentPassives}
						onChange={(next) => {
							if (!slot) return;
							onUpdateSlotConfig(slot.id, { passives: next });
						}}
					/>
				</section>
			) : null}
			<PlayerDetailsDialog player={player} open={detailsOpen} onOpenChange={setDetailsOpen} statMetrics={playerStatMetrics} powerMetrics={playerPowerMetrics} />
		</div>
	);
}

type RarityConfigProps = {
	value: SlotRarity;
	onChange: (value: SlotRarity) => void;
	accent: string;
};

function RarityConfig({ value, onChange, accent }: RarityConfigProps) {
	const selectedDefinition = SLOT_RARITY_OPTIONS.find((option) => option.value === value);

	return (
		<div className="space-y-2 rounded-lg border bg-background/80 p-3">
			<div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
				<span>Rarity</span>
				<Badge
					variant="outline"
					className="border-emerald-200/40 bg-emerald-500/10 text-[10px] font-semibold uppercase tracking-[0.25em]"
					style={{ color: accent }}
				>
					{selectedDefinition?.boostLabel}
				</Badge>
			</div>
			<Select value={value} onValueChange={(next) => onChange(next as SlotRarity)}>
				<SelectTrigger className="bg-background/90 w-full">
					<SelectValue placeholder="Select rarity" />
				</SelectTrigger>
				<SelectContent>
					{SLOT_RARITY_OPTIONS.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<span className="size-3 rounded-full" style={{ background: option.cardBackground }} />
									<span className="text-sm font-semibold">{option.label} Player</span>
								</div>
							</div>
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

type EquipmentLoadoutConfigProps = {
	value: SlotEquipments;
	onChange: (category: EquipmentCategory, equipmentId: string | null) => void;
};

function EquipmentLoadoutConfig({ value, onChange }: EquipmentLoadoutConfigProps) {
	return (
		<div className="space-y-2 rounded-lg border bg-background/80 p-3">
			<div className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Equipments</div>
			<div className="space-y-3">
				{EQUIPMENT_CATEGORIES.map((category) => (
					<EquipmentSelectRow key={category} category={category} selectedId={value[category] ?? null} onChange={onChange} />
				))}
			</div>
		</div>
	);
}

type EquipmentSelectRowProps = {
	category: EquipmentCategory;
	selectedId: string | null;
	onChange: (category: EquipmentCategory, equipmentId: string | null) => void;
};

function EquipmentSelectRow({ category, selectedId, onChange }: EquipmentSelectRowProps) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const equipments = equipmentsByType[category] ?? [];
	const selectedEquipment = selectedId ? equipments.find((item) => item.id === selectedId) : null;

	const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Escape" || event.key === "Tab") {
			return;
		}
		event.stopPropagation();
		event.nativeEvent.stopImmediatePropagation();
	};

	const filteredEquipments = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();
		if (!normalizedQuery) return equipments;
		return equipments.filter((equipment) => equipment.name.toLowerCase().includes(normalizedQuery));
	}, [equipments, query]);

	const isEmptySelection = !selectedEquipment;

	return (
		<div className="space-y-1">
			<div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
				<span>{EQUIPMENT_CATEGORY_LABELS[category]}</span>
				{selectedEquipment ? (
					<div className="flex flex-wrap justify-end gap-1">
						{getEquipmentHighlights(selectedEquipment).map((highlight) => (
							<Badge key={`${selectedEquipment.id}-${highlight.key}`} variant="outline" className="text-[10px] uppercase tracking-[0.2em]">
								{ATTRIBUTE_LABELS[highlight.key].slice(0, 4)} +{formatNumber(highlight.value)}
							</Badge>
						))}
					</div>
				) : (
					<span className="text-muted-foreground/70">None</span>
				)}
			</div>
			<Select
				value={selectedId ?? "none"}
				open={open}
				onOpenChange={(next) => {
					setOpen(next);
					if (!next) {
						setQuery("");
					}
				}}
				onValueChange={(next) => onChange(category, next === "none" ? null : (next as string))}
			>
				<SelectTrigger className={`bg-background/90 w-full ${isEmptySelection ? "text-muted-foreground/70" : ""}`}>
					<SelectValue placeholder={`Select ${titleCase(category)}`} />
				</SelectTrigger>
				<SelectContent
					className="max-h-[30rem] space-y-1"
					searchValue={query}
					onSearchValueChange={setQuery}
					searchPlaceholder="Search equipment..."
					onSearchKeyDown={handleSearchKeyDown}
				>
					<SelectItem value="none">Empty</SelectItem>
					{filteredEquipments.map((equipment) => (
						<SelectItem key={equipment.id} value={equipment.id}>
							<div className="flex flex-col text-left">
								<span className="text-sm font-semibold">{equipment.name}</span>
							</div>
						</SelectItem>
					))}
					{!filteredEquipments.length && <div className="px-3 pb-3 text-center text-[11px] uppercase tracking-[0.2em] text-muted-foreground">No matches</div>}
				</SelectContent>
			</Select>
		</div>
	);
}

type PassivesConfigProps = {
	slot: TeamBuilderSlot;
	value: SlotPassives;
	onChange: (value: SlotPassives) => void;
	className?: string;
};

type PassivePresetRule = {
	id: string;
	label: string;
	helper?: string;
	options: PassiveRecord[];
};

function PassivesConfig({ slot, value, onChange, className }: PassivesConfigProps) {
	const presetRules = useMemo(() => getPassivePresetRules(slot.kind), [slot.kind]);
	const customRule = useMemo(() => getCustomPassiveRule(), []);

	const handlePresetChange = (index: number, nextPreset: SlotPassives["presets"][number]) => {
		const nextPresets = value.presets.map((entry, idx) => (idx === index ? nextPreset : entry)) as SlotPassives["presets"];
		onChange({ ...value, presets: nextPresets });
	};

	const handleCustomChange = (nextPreset: SlotPassives["custom"]) => {
		onChange({
			...value,
			custom: nextPreset,
		});
	};

	return (
		<div className={`space-y-3 ${className ?? ""}`}>
			{presetRules.map((rule, index) => (
				<PassiveSelectRow key={rule.id} rule={rule} preset={value.presets[index]} onChange={(nextPreset) => handlePresetChange(index, nextPreset)} />
			))}
			<PassiveSelectRow rule={customRule} preset={value.custom} onChange={handleCustomChange} />
		</div>
	);
}

type PassiveSelectRowProps = {
	rule: PassivePresetRule;
	preset: SlotPassives["presets"][number] | SlotPassives["custom"];
	onChange: (next: SlotPassives["presets"][number] | SlotPassives["custom"]) => void;
};

function PassiveSelectRow({ rule, preset, onChange }: PassiveSelectRowProps) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [draftValue, setDraftValue] = useState(() => (preset.passiveId ? formatPassiveInputValue(preset.value ?? 0) : ""));
	const selectedPassive = preset.passiveId ? (passivesById.get(preset.passiveId) ?? null) : null;
	const filteredOptions = useMemo(() => {
		const normalized = query.trim().toLowerCase();
		if (!normalized) {
			return rule.options;
		}

		const matches = rule.options.filter((option) => {
			return option.description.toLowerCase().includes(normalized) || String(option.id).includes(normalized);
		});

		if (selectedPassive && !matches.some((option) => option.id === selectedPassive.id)) {
			// Keep the currently selected passive in the list so Radix Select
			// doesn't lose track of the active item and blur the search input.
			return [selectedPassive, ...matches];
		}

		return matches;
	}, [query, rule.options, selectedPassive]);

	useEffect(() => {
		if (!preset.passiveId) {
			setDraftValue("");
			return;
		}
		const normalizedValue = formatPassiveInputValue(preset.value ?? 0);
		setDraftValue((current) => (current === normalizedValue ? current : normalizedValue));
	}, [preset.passiveId, preset.value]);

	const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Escape" || event.key === "Tab") {
			return;
		}
		event.stopPropagation();
		event.nativeEvent.stopImmediatePropagation();
	};

	const handleSelectChange = (nextValue: string) => {
		if (nextValue === "none") {
			onChange({ passiveId: null, value: 0 });
			return;
		}
		const passiveId = String(nextValue);
		const passive = passivesById.get(passiveId);
		onChange({
			passiveId,
			value: clampPassiveValue(passive?.strongValue ?? 0),
		});
	};

	const handleValueChange = (eventValue: string) => {
		setDraftValue(eventValue);
		if (!selectedPassive) {
			return;
		}
		if (eventValue.trim() === "" || eventValue === "-" || eventValue === "." || eventValue === "-.") {
			return;
		}
		const normalizedValue = normalizeNumericInput(eventValue);
		const nextValue = Number(normalizedValue);
		if (Number.isNaN(nextValue)) {
			return;
		}
		const clampedValue = clampPassiveValue(nextValue);
		const displayValue = formatPassiveInputValue(clampedValue);
		setDraftValue(displayValue);
		onChange({
			...preset,
			value: clampedValue,
		});
	};

	const handleValueBlur = () => {
		if (!selectedPassive) {
			setDraftValue("");
			return;
		}
		const normalizedValue = normalizeNumericInput(draftValue);
		const parsed = Number(normalizedValue);
		const clamped = clampPassiveValue(Number.isNaN(parsed) ? 0 : parsed);
		setDraftValue(formatPassiveInputValue(clamped));
		onChange({
			...preset,
			value: clamped,
		});
	};

	const indicator = getPassiveSlotIndicator(rule.id);
	const IndicatorIcon = indicator?.icon;
	const isEmptySelection = !selectedPassive;
	const isPercentagePassive = Boolean(selectedPassive?.description?.includes("%"));

	return (
		<div className="space-y-2">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
				<div className="flex-1 space-y-1">
					<Select
						value={preset.passiveId ? String(preset.passiveId) : "none"}
						open={open}
						onOpenChange={(next) => {
							setOpen(next);
							if (!next) {
								setQuery("");
							}
						}}
						onValueChange={handleSelectChange}
					>
						{(() => {
							const tooltipContent = selectedPassive ? getPassiveTooltipContent(selectedPassive) : null;
							const shouldShowTooltip = Boolean(tooltipContent && !open);
							const trigger = (
								<div className="relative">
									{indicator && IndicatorIcon ? (
										<span
											className={`pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 flex size-7 items-center justify-center rounded-lg border ${indicator.border} ${indicator.background} ${indicator.text}`}
										>
											<IndicatorIcon className="size-4" />
										</span>
									) : null}
									<SelectTrigger
										className={`bg-background/90 w-full !h-full whitespace-normal *:data-[slot=select-value]:line-clamp-none *:data-[slot=select-value]:whitespace-normal *:data-[slot=select-value]:break-words ${isEmptySelection ? "text-muted-foreground/70" : ""} ${indicator ? "pl-12" : ""}`}
									>
										{selectedPassive ? <PassiveSelectValue passive={selectedPassive} /> : <SelectValue placeholder="Select passive" />}
									</SelectTrigger>
								</div>
							);

							if (!shouldShowTooltip) {
								return trigger;
							}

							return (
								<Tooltip>
									<TooltipTrigger asChild>{trigger}</TooltipTrigger>
									<TooltipContent side="top" variant="ghost" hideArrow className="p-0">
										{tooltipContent}
									</TooltipContent>
								</Tooltip>
							);
						})()}
						<SelectContent
							className="max-h-[40rem] space-y-1"
							searchValue={query}
							onSearchValueChange={setQuery}
							searchPlaceholder="Search by name or ID"
							onSearchKeyDown={handleSearchKeyDown}
						>
							<SelectItem value="none">Empty</SelectItem>
							{filteredOptions
								.sort((a, b) => a.buildType?.localeCompare(b.buildType ?? "") ?? 0)
								.map((passive) => (
									<SelectItem key={passive.id} value={String(passive.id)}>
										<PassiveSelectValue passive={passive} />
									</SelectItem>
								))}
							{!filteredOptions.length && <div className="px-3 pb-3 text-center text-[11px] uppercase tracking-[0.2em] text-muted-foreground">No matches</div>}
						</SelectContent>
					</Select>
				</div>

				<div className="relative">
					<Input
						type="number"
						step={0.1}
						min={-999}
						max={999}
						value={draftValue}
						disabled={!selectedPassive}
						hideSpinButtons
						className={`max-w-16 bg-background/90 sm:self-center ${isPercentagePassive ? "pr-6" : ""}`}
						onChange={(event) => handleValueChange(event.currentTarget.value)}
						onBlur={handleValueBlur}
					/>
					{isPercentagePassive ? (
						<span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">%</span>
					) : null}
				</div>
			</div>
		</div>
	);
}

function PassiveSelectValue({ passive }: { passive: PassiveRecord }) {
	const buildLabel = passive.buildType ? titleCase(passive.buildType) : "General";

	return (
		<div className="flex flex-col break-words text-left leading-tight">
			<div className="mb-1 flex flex-wrap items-center gap-1.5">
				<PassiveMetaBadge visual={getPassiveBuildBadgeVisual(buildLabel)} label={buildLabel} />
				<PassiveMetaBadge visual={getPassiveNumberBadgeVisual()} label={`#${passive.number}`} />
			</div>
			<span className="text-xs text-foreground">{passive.description}</span>
		</div>
	);
}

type PassiveBadgeVisual = {
	background: string;
	borderColor: string;
	textColor: string;
	shadow: string;
};

function PassiveMetaBadge({ visual, label }: { visual: PassiveBadgeVisual; label: string }) {
	return (
		<span
			className="inline-flex min-w-[38px] items-center justify-center rounded-[5px] border-[1.5px] px-2 py-[1px] text-[9px] font-semibold uppercase tracking-[0.15em]"
			style={{
				background: visual.background,
				borderColor: visual.borderColor,
				color: visual.textColor,
				boxShadow: visual.shadow,
			}}
		>
			{label}
		</span>
	);
}

const PASSIVE_BADGE_PALETTE: Array<{ from: string; to: string; border: string; shadow: string }> = [
	{ from: "#7c2d12", to: "#ea580c", border: "#451a03", shadow: "0 3px 0 rgba(69,26,3,0.65)" },
	{ from: "#312e81", to: "#4338ca", border: "#1e1b4b", shadow: "0 3px 0 rgba(30,27,75,0.6)" },
	{ from: "#0f172a", to: "#1d4ed8", border: "#0b1220", shadow: "0 3px 0 rgba(11,18,32,0.65)" },
	{ from: "#581c87", to: "#a21caf", border: "#3b0764", shadow: "0 3px 0 rgba(59,7,100,0.6)" },
	{ from: "#064e3b", to: "#059669", border: "#022c22", shadow: "0 3px 0 rgba(2,44,34,0.6)" },
	{ from: "#713f12", to: "#b45309", border: "#422006", shadow: "0 3px 0 rgba(66,32,6,0.6)" },
];

function getPassiveBuildBadgeVisual(label: string): PassiveBadgeVisual {
	const palette = PASSIVE_BADGE_PALETTE[Math.abs(hashString(label)) % PASSIVE_BADGE_PALETTE.length];
	return {
		background: `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
		borderColor: palette.border,
		textColor: "#ffffff",
		shadow: palette.shadow,
	};
}

function getPassiveNumberBadgeVisual(): PassiveBadgeVisual {
	return {
		background: "linear-gradient(135deg, #0f172a, #1e293b)",
		borderColor: "rgba(255,255,255,0.35)",
		textColor: "#f8fafc",
		shadow: "0 3px 0 rgba(15,23,42,0.65)",
	};
}

function hashString(value: string): number {
	let hash = 0;
	for (let i = 0; i < value.length; i += 1) {
		hash = (hash << 5) - hash + value.charCodeAt(i);
		hash |= 0;
	}
	return hash;
}

function getPassiveTooltipContent(passive: PassiveRecord) {
	const strong = formatPassiveTooltipValue(passive.strongValue);
	const weak = formatPassiveTooltipValue(passive.weakValue);
	const badgeVisual = getPassiveBuildBadgeVisual(passive.buildType ? titleCase(passive.buildType) : "General");

	if (!strong && !weak) {
		return null;
	}

	return (
		<div
			className="relative min-w-[190px] space-y-1 rounded-lg border px-3 py-2 text-[11px] shadow-xl"
			style={{
				background: badgeVisual.background,
				borderColor: badgeVisual.borderColor,
				boxShadow: badgeVisual.shadow,
				color: badgeVisual.textColor,
			}}
		>
			<div className="text-[9px] font-semibold uppercase tracking-[0.25em] text-white/80">Power Preview</div>
			{weak ? (
				<div className="space-y-0.5 font-semibold">
					<div className="flex items-center justify-between text-white/90">
						<span>Strong</span>
						<span>{strong ?? "—"}</span>
					</div>
					<div className="flex items-center justify-between text-white/80">
						<span>Weak</span>
						<span>{weak}</span>
					</div>
				</div>
			) : (
				<div className="flex items-center justify-between font-semibold text-white">
					<span>Default</span>
					<span>{strong ?? "—"}</span>
				</div>
			)}
			<span
				className="absolute left-1/2 top-full block h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px]"
				style={{
					background: badgeVisual.background,
					boxShadow: `${badgeVisual.shadow}, 0 0 0 1.5px ${badgeVisual.borderColor}`,
				}}
			/>
		</div>
	);
}

function formatPassiveTooltipValue(value: number | null) {
	if (value === null) {
		return null;
	}
	const formatted = formatNumber(value);
	const sign = value > 0 ? "+" : "";
	return `${sign}${formatted}`;
}

function formatPassiveInputValue(value: number) {
	const safeValue = Number.isFinite(value) ? value : 0;
	return normalizeNumericInput(String(safeValue));
}

function normalizeNumericInput(value: string) {
	const trimmed = value.trim();
	if (!trimmed) {
		return "";
	}

	const hasNegativeSign = trimmed.startsWith("-");
	const unsignedValue = hasNegativeSign ? trimmed.slice(1) : trimmed;

	if (!unsignedValue) {
		return hasNegativeSign ? "" : "";
	}

	const [rawInteger, rawFraction] = unsignedValue.split(".", 2);
	const integerPart = rawInteger.replace(/^0+(?=\d)/, "") || "0";
	const fractionPart = rawFraction ?? null;

	if (!fractionPart) {
		if (hasNegativeSign && integerPart === "0") {
			return "0";
		}
		return `${hasNegativeSign ? "-" : ""}${integerPart}`;
	}

	if (hasNegativeSign && integerPart === "0" && /^0*$/.test(fractionPart)) {
		return "0";
	}

	return `${hasNegativeSign ? "-" : ""}${integerPart}.${fractionPart}`;
}

type BeansConfigProps = {
	value: SlotBeans;
	onChange: (index: number, bean: SlotBean) => void;
};

function BeansConfig({ value, onChange }: BeansConfigProps) {
	const slots = BEAN_SLOT_KEYS.map((slotId, index) => ({
		slotId,
		index,
		bean: value[index],
	}));

	return (
		<div className="space-y-2 rounded-lg border bg-background/80 p-3">
			<div className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Beans</div>
			<div className="space-y-2">
				{slots.map(({ slotId, bean, index }) => (
					<BeanRow key={slotId} bean={bean} onChange={(next) => onChange(index, next)} />
				))}
			</div>
		</div>
	);
}

type BeanRowProps = {
	bean: SlotBean;
	onChange: (bean: SlotBean) => void;
};

function BeanRow({ bean, onChange }: BeanRowProps) {
	const handleAttributeChange = (value: string) => {
		onChange({
			attribute: value === "none" ? null : (value as BaseAttributeKey),
			value: value === "none" ? 0 : bean.value,
		});
	};

	const handleValueChange = (eventValue: string) => {
		onChange({
			attribute: bean.attribute,
			value: clampBeanValue(Number(eventValue)),
		});
	};

	const beanColor = bean.attribute ? BEAN_COLORS[bean.attribute] : "#9ca3af";

	const isEmptyBean = !bean.attribute;

	return (
		<div className="space-y-2 rounded-lg border bg-card/30 p-2">
			<div className="flex flex-col gap-2 sm:flex-row">
				<Select value={bean.attribute ?? "none"} onValueChange={handleAttributeChange}>
					<SelectTrigger className={`bg-background/90 w-full ${isEmptyBean ? "text-muted-foreground/70" : ""}`}>
						<SelectValue placeholder="Pick attribute">
							{bean.attribute ? (
								<div className="flex items-center gap-2">
									<Bean className="size-4" style={{ color: beanColor }} />
									<span>{ATTRIBUTE_LABELS[bean.attribute]}</span>
								</div>
							) : (
								"Pick attribute"
							)}
						</SelectValue>
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="none">
							<div className="flex items-center gap-2">
								<Bean className="size-4 text-muted-foreground" />
								<span>No attribute</span>
							</div>
						</SelectItem>
						{ATTRIBUTE_KEYS.map((key) => (
							<SelectItem key={key} value={key}>
								<div className="flex items-center gap-2">
									<Bean className="size-4" style={{ color: BEAN_COLORS[key] }} />
									<span>{ATTRIBUTE_LABELS[key]}</span>
								</div>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<div className="relative flex items-center w-[150px]">
					<span className="absolute left-2 text-emerald-600 font-bold select-none pointer-events-none">+</span>
					<Input
						type="number"
						min={0}
						max={MAX_BEAN_POINTS}
						step={1}
						value={bean.value}
						disabled={!bean.attribute}
						onChange={(event) => handleValueChange(event.currentTarget.value)}
						className="pl-6"
						placeholder="0"
					/>
				</div>
			</div>
		</div>
	);
}

function getEquipmentHighlights(equipment: EquipmentRecord) {
	return ATTRIBUTE_KEYS.map((key) => ({
		key,
		value: equipment.stats[key] ?? 0,
	}))
		.filter((entry) => entry.value > 0)
		.sort((a, b) => {
			if (b.value !== a.value) {
				return b.value - a.value;
			}
			return a.key.localeCompare(b.key);
		})
		.slice(0, 2);
}

function getPassivePresetRules(slotKind: TeamBuilderSlot["kind"]): PassivePresetRule[] {
	if (slotKind === "manager") {
		return createUniformPassiveRules("Manager Passive", passivesByType.manager);
	}
	if (slotKind === "coordinator") {
		return createUniformPassiveRules("Support Passive", passivesByType.coordinator);
	}
	return [
		{
			id: "general-1",
			label: "General Passive 1",
			helper: "Player Passive",
			options: playerGeneralPassives,
		},
		{
			id: "general-2",
			label: "General Passive 2",
			options: playerGeneralPassives,
		},
		{
			id: "general-3",
			label: "General Passive 3",
			options: playerGeneralPassives,
		},
		{
			id: "build-1",
			label: "Build Passive 1",
			options: playerBuildPassives,
		},
		{
			id: "build-2",
			label: "Build Passive 2",
			options: playerBuildPassives,
		},
	];
}

function getCustomPassiveRule(): PassivePresetRule {
	return {
		id: "custom-passive",
		label: "Custom Passive",
		helper: "Custom Passive",
		options: customPassives,
	};
}

function createUniformPassiveRules(label: string, options: PassiveRecord[]): PassivePresetRule[] {
	return Array.from({ length: PASSIVE_PRESET_SLOTS }, (_, index) => ({
		id: `${label}-${index + 1}`,
		label: `${label} ${index + 1}`,
		options,
	}));
}

type PassiveSlotIndicator = {
	icon: LucideIcon;
	background: string;
	border: string;
	text: string;
};

function getPassiveSlotIndicator(ruleId: string): PassiveSlotIndicator | null {
	if (ruleId.startsWith("build-")) {
		return {
			icon: Sparkles,
			background: "bg-emerald-500/10",
			border: "border-emerald-500/30",
			text: "text-emerald-500",
		};
	}
	if (ruleId === "custom-passive") {
		return {
			icon: BadgeInfo,
			background: "bg-amber-500/10",
			border: "border-amber-500/30",
			text: "text-amber-500",
		};
	}
	return null;
}
