import type { LucideIcon } from "lucide-react";
import {
	BrickWall,
	HeartPulse,
	Shield,
	ShieldCheck,
	Swords,
	Target,
} from "lucide-react";
import { type KeyboardEvent, useEffect, useMemo, useState } from "react";

import { ElementChip, PositionChip } from "@/components/team-builder/Chips";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { FormationSlot } from "@/data/formations";
import { formatNumber, titleCase } from "@/lib/data-helpers";
import {
	EQUIPMENT_CATEGORIES,
	EQUIPMENT_CATEGORY_LABELS,
	type EquipmentRecord,
	equipmentsByType,
} from "@/lib/equipments-data";
import {
	clampBeanValue,
	createEmptySlotBeans,
	MAX_BEAN_POINTS,
} from "@/lib/slot-beans";
import {
	applyRarityBonus,
	getSlotRarityDefinition,
	SLOT_RARITY_OPTIONS,
} from "@/lib/slot-rarity";
import { createEmptySlotEquipments } from "@/store/team-builder";
import type {
	BaseAttributeKey,
	EquipmentCategory,
	SlotAssignment,
	SlotBean,
	SlotBeans,
	SlotConfig,
	SlotEquipments,
	SlotRarity,
} from "@/types/team-builder";

type StatKey =
	| "shootAT"
	| "focusAT"
	| "focusDF"
	| "wallDF"
	| "scrambleAT"
	| "scrambleDF"
	| "kp";

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

export type SlotDetailsDrawerProps = {
	open: boolean;
	slot: FormationSlot | null;
	assignment: SlotAssignment | null;
	onAssign: (slot: FormationSlot) => void;
	onClearSlot: (slotId: string) => void;
	onUpdateSlotConfig: (
		slotId: string,
		partialConfig: Partial<SlotConfig>,
	) => void;
	onOpenChange: (open: boolean) => void;
};

export function SlotDetailsDrawer({
	open,
	slot,
	assignment,
	onAssign,
	onClearSlot,
	onUpdateSlotConfig,
	onOpenChange,
}: SlotDetailsDrawerProps) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="left"
				className="w-full !max-w-2xl border-l p-0 sm:max-w-md"
			>
				<div className="h-full overflow-y-auto p-3">
					<SlotDetailsPanel
						slot={slot}
						assignment={assignment}
						onAssign={onAssign}
						onClearSlot={onClearSlot}
						onUpdateSlotConfig={onUpdateSlotConfig}
					/>
				</div>
			</SheetContent>
		</Sheet>
	);
}

type SlotDetailsPanelProps = {
	slot: FormationSlot | null;
	assignment: SlotAssignment | null;
	onAssign: (slot: FormationSlot) => void;
	onClearSlot: (slotId: string) => void;
	onUpdateSlotConfig: (
		slotId: string,
		partialConfig: Partial<SlotConfig>,
	) => void;
};

function SlotDetailsPanel({
	slot,
	assignment,
	onAssign,
	onClearSlot,
	onUpdateSlotConfig,
}: SlotDetailsPanelProps) {
	const [clearDialogOpen, setClearDialogOpen] = useState(false);
	const player = assignment?.player ?? null;
	const rarity = assignment?.config.rarity ?? "normal";
	const rarityDefinition = getSlotRarityDefinition(rarity);
	const computedStats = assignment?.computed ?? null;
	const currentEquipments =
		assignment?.config.equipments ?? createEmptySlotEquipments();
	const currentBeans = assignment?.config.beans ?? createEmptySlotBeans();

	useEffect(() => {
		if (!player || !slot) {
			setClearDialogOpen(false);
		}
	}, [player, slot]);

	const handleRarityChange = (value: SlotRarity) => {
		if (!slot) return;
		onUpdateSlotConfig(slot.id, { rarity: value });
	};

	const handleEquipmentChange = (
		category: EquipmentCategory,
		equipmentId: string | null,
	) => {
		if (!slot) return;
		const baseEquipments =
			assignment?.config.equipments ?? createEmptySlotEquipments();
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
		const nextBeans = baseBeans.map((entry, idx) =>
			idx === index ? bean : entry,
		) as SlotBeans;
		onUpdateSlotConfig(slot.id, { beans: nextBeans });
	};

	return (
		<section className="rounded-xl border bg-card p-4 shadow-sm">
			<header className="flex flex-wrap items-center gap-2">
				<div>
					<p className="text-sm font-semibold">Slot details</p>
				</div>
				{slot ? <PositionChip label={slot.label} /> : null}
			</header>
			<div className="mt-4 space-y-4">
				{!slot ? (
					<div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
						No slot selected. Tap a position on the pitch to focus it.
					</div>
				) : !player ? (
					<div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-6 text-center">
						<div className="flex size-32 items-center justify-center rounded-2xl border border-dashed text-xl font-semibold">
							{slot.label}
						</div>
						<p className="text-sm text-muted-foreground">
							This slot is empty. Choose a player to assign.
						</p>
						<Button onClick={() => onAssign(slot)}>Assign player</Button>
					</div>
				) : (
					<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
						<div className="flex flex-col items-center gap-3">
							<img
								src={player.image}
								alt={player.name}
								className="w-full max-w-[220px] rounded-2xl border object-cover shadow-lg"
								loading="lazy"
							/>
							<div className="flex flex-wrap items-center justify-center gap-2 text-xs">
								<ElementChip element={player.element} />
								<PositionChip label={player.position} />
							</div>
							<div className="text-center">
								<p className="text-lg font-semibold">{player.name}</p>
								<p className="text-sm text-muted-foreground">
									{player.nickname}
								</p>
							</div>
							<div className="flex flex-wrap gap-2">
								<Button
									onClick={() => onAssign(slot)}
									className="flex-1 min-w-[140px]"
								>
									Replace player
								</Button>
								<Button
									variant="destructive"
									onClick={() => setClearDialogOpen(true)}
									className="flex-1 min-w-[140px]"
								>
									Remove from slot
								</Button>
							</div>
							<div className="w-full">
								<BeansConfig value={currentBeans} onChange={handleBeanChange} />
							</div>
						</div>
						<div className="space-y-3">
							<RarityConfig
								value={rarity}
								onChange={handleRarityChange}
								accent={rarityDefinition.accent}
							/>
							<div className="space-y-2">
								{BOOSTED_STATS.map((stat) => {
									const rawValue = player.power[stat.key] ?? 0;
									const boostedValue =
										computedStats?.power[stat.key] ??
										applyRarityBonus(
											typeof rawValue === "number"
												? rawValue
												: Number(rawValue),
											rarity,
										);
									const Icon = stat.icon;
									return (
										<div
											key={stat.label}
											className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2"
										>
											<div className="flex items-center gap-2 text-sm font-medium">
												<Icon className="size-4 text-emerald-600" />
												{stat.label}
											</div>
											<span className="text-base font-semibold">
												{formatNumber(boostedValue)}
											</span>
										</div>
									);
								})}
							</div>
							<EquipmentLoadoutConfig
								value={currentEquipments}
								onChange={handleEquipmentChange}
							/>
						</div>
					</div>
				)}
			</div>

			<Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Remove player from slot?</DialogTitle>
						<DialogDescription>
							This will clear the assignment and reset custom settings for this
							slot.
						</DialogDescription>
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
	);
}

type RarityConfigProps = {
	value: SlotRarity;
	onChange: (value: SlotRarity) => void;
	accent: string;
};

function RarityConfig({ value, onChange, accent }: RarityConfigProps) {
	const selectedDefinition = SLOT_RARITY_OPTIONS.find(
		(option) => option.value === value,
	);

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
			<Select
				value={value}
				onValueChange={(next) => onChange(next as SlotRarity)}
			>
				<SelectTrigger className="bg-background/90 w-full">
					<SelectValue placeholder="Select rarity" />
				</SelectTrigger>
				<SelectContent>
					{SLOT_RARITY_OPTIONS.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<span
										className="size-3 rounded-full"
										style={{ background: option.cardBackground }}
									/>
									<span className="text-sm font-semibold">
										{option.label} Player
									</span>
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

function EquipmentLoadoutConfig({
	value,
	onChange,
}: EquipmentLoadoutConfigProps) {
	return (
		<div className="space-y-2 rounded-lg border bg-background/80 p-3">
			<div className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
				Equipments
			</div>
			<div className="space-y-3">
				{EQUIPMENT_CATEGORIES.map((category) => (
					<EquipmentSelectRow
						key={category}
						category={category}
						selectedId={value[category] ?? null}
						onChange={onChange}
					/>
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

function EquipmentSelectRow({
	category,
	selectedId,
	onChange,
}: EquipmentSelectRowProps) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const equipments = equipmentsByType[category] ?? [];
	const selectedEquipment = selectedId
		? equipments.find((item) => item.id === selectedId)
		: null;

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
		return equipments.filter((equipment) =>
			equipment.name.toLowerCase().includes(normalizedQuery),
		);
	}, [equipments, query]);

	return (
		<div className="space-y-1">
			<div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
				<span>{EQUIPMENT_CATEGORY_LABELS[category]}</span>
				{selectedEquipment ? (
					<div className="flex flex-wrap justify-end gap-1">
						{getEquipmentHighlights(selectedEquipment).map((highlight) => (
							<Badge
								key={`${selectedEquipment.id}-${highlight.key}`}
								variant="outline"
								className="text-[10px] uppercase tracking-[0.2em]"
							>
								{ATTRIBUTE_LABELS[highlight.key].slice(0, 4)} +
								{formatNumber(highlight.value)}
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
				onValueChange={(next) =>
					onChange(category, next === "none" ? null : (next as string))
				}
			>
				<SelectTrigger className="bg-background/90 w-full">
					<SelectValue placeholder={`Select ${titleCase(category)}`} />
				</SelectTrigger>
				<SelectContent className="max-h-80 space-y-1">
					<div className="px-3 pt-3">
						<Input
							value={query}
							onChange={(event) => setQuery(event.currentTarget.value)}
							placeholder="Search equipment..."
							className="h-8"
							onKeyDown={handleSearchKeyDown}
						/>
					</div>
					<SelectItem value="none">Empty</SelectItem>
					{filteredEquipments.map((equipment) => (
						<SelectItem key={equipment.id} value={equipment.id}>
							<div className="flex flex-col text-left">
								<span className="text-sm font-semibold">{equipment.name}</span>
							</div>
						</SelectItem>
					))}
					{!filteredEquipments.length && (
						<div className="px-3 pb-3 text-center text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
							No matches
						</div>
					)}
				</SelectContent>
			</Select>
		</div>
	);
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
			<div className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
				Beans
			</div>
			<div className="space-y-2">
				{slots.map(({ slotId, bean, index }) => (
					<BeanRow
						key={slotId}
						index={index}
						bean={bean}
						onChange={(next) => onChange(index, next)}
					/>
				))}
			</div>
		</div>
	);
}

type BeanRowProps = {
	index: number;
	bean: SlotBean;
	onChange: (bean: SlotBean) => void;
};

function BeanRow({ index, bean, onChange }: BeanRowProps) {
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

	return (
		<div className="space-y-2 rounded-lg border bg-card/30 p-2">
			<div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
				<span>Bean {index + 1}</span>
			</div>
			<div className="flex flex-col gap-2 sm:flex-row">
				<Select
					value={bean.attribute ?? "none"}
					onValueChange={handleAttributeChange}
				>
					<SelectTrigger className="bg-background/90 w-full">
						<SelectValue placeholder="Pick attribute" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="none">No attribute</SelectItem>
						{ATTRIBUTE_KEYS.map((key) => (
							<SelectItem key={key} value={key}>
								{ATTRIBUTE_LABELS[key]}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<div className="relative flex items-center w-[150px]">
					<span className="absolute left-2 text-emerald-600 font-bold select-none pointer-events-none">
						+
					</span>
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
