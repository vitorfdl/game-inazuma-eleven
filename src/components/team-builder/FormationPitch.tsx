import { type FormationDefinition, FORMATIONS } from "@/data/formations";
import { getPositionColor, getElementIcon } from "@/lib/icon-picker";
import { mapToElementType, mapToTeamPosition } from "@/lib/players-data";
import { getSlotRarityDefinition } from "@/lib/slot-rarity";
import {
	SLOT_CARD_WIDTH_CLASS,
	getSlotDisplayValue,
	getSlotPositionStyle,
} from "@/lib/team-builder-ui";
import { cn } from "@/lib/utils";
import type { DisplayMode } from "@/store/team-builder";
import type { SlotAssignment, TeamBuilderSlot } from "@/types/team-builder";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export type FormationPitchProps = {
	assignments: SlotAssignment[];
	staffEntries: SlotAssignment[];
	activeSlotId: string | null;
	displayMode: DisplayMode;
	onSlotSelect: (slot: TeamBuilderSlot) => void;
	onEmptySlotSelect: (slot: TeamBuilderSlot) => void;
	formationId: FormationDefinition["id"];
	onFormationChange: (formationId: FormationDefinition["id"]) => void;
	isFormationDisabled: boolean;
};

export function FormationPitch({
	assignments,
	staffEntries,
	activeSlotId,
	displayMode,
	onSlotSelect,
	onEmptySlotSelect,
	formationId,
	onFormationChange,
	isFormationDisabled,
}: FormationPitchProps) {
	const managerEntry = staffEntries.find((entry) => entry.slot.kind === "manager");
	const coordinatorEntries = staffEntries.filter(
		(entry) => entry.slot.kind === "coordinator",
	);
	const hasStaffFooter = managerEntry || coordinatorEntries.length > 0;

	return (
		<div className="w-full">
			<div className="relative w-full">
				<div className="pointer-events-none absolute inset-x-0 -top-2 z-20 flex justify-center sm:-top-3">
					<div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-black/40 bg-black/70 px-3 py-1.5 shadow-lg shadow-emerald-900/60">
						<p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-emerald-100/90">
							Formation
						</p>
						<Select
							disabled={isFormationDisabled}
							value={formationId}
							onValueChange={(value) => onFormationChange(value)}
						>
							<SelectTrigger className="h-8 min-w-[180px] border-white/20 bg-emerald-950/80 text-xs text-emerald-50 shadow-sm sm:min-w-[220px]">
								<SelectValue placeholder="Choose formation" />
							</SelectTrigger>
							<SelectContent>
								{FORMATIONS.map((item) => (
									<SelectItem key={item.id} value={item.id}>
										<span className="flex flex-col text-left">
											<span className="text-xs font-semibold">{item.name}</span>
										</span>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
				<div className="relative aspect-[3/4] w-full rounded-[36px] border border-emerald-800 bg-gradient-to-b from-emerald-700/70 via-emerald-800/80 to-emerald-900/95 p-4 shadow-[inset_0_0_50px_rgba(0,0,0,0.35)] sm:aspect-[5/6] lg:aspect-[5/5]">
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
			{hasStaffFooter && (
				<div className="mt-4 flex w-full flex-wrap items-center gap-2 rounded-3xl border border-emerald-900/50 bg-gradient-to-r from-emerald-900/40 via-emerald-950/30 to-emerald-900/40 p-3 text-white shadow-[inset_0_0_30px_rgba(0,0,0,0.35)] sm:gap-3 sm:justify-between">
					<div className="flex flex-1 justify-start">
						{managerEntry ? (
							<SlotEntryButton
								entry={managerEntry}
								displayMode={displayMode}
								activeSlotId={activeSlotId}
								onSlotSelect={onSlotSelect}
								onEmptySlotSelect={onEmptySlotSelect}
								buttonClassName="justify-start"
								variant="compact"
							/>
						) : null}
					</div>
					<div className="flex flex-1 justify-end gap-1.5">
						{coordinatorEntries.map((entry) => (
							<SlotEntryButton
								key={entry.slot.id}
								entry={entry}
								displayMode={displayMode}
								activeSlotId={activeSlotId}
								onSlotSelect={onSlotSelect}
								onEmptySlotSelect={onEmptySlotSelect}
								buttonClassName="justify-start"
								variant="compact"
							/>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

export type ReservesRailProps = {
	entries: SlotAssignment[];
	displayMode: DisplayMode;
	activeSlotId: string | null;
	onSlotSelect: (slot: TeamBuilderSlot) => void;
	onEmptySlotSelect: (slot: TeamBuilderSlot) => void;
	variant?: "default" | "compact";
	isStackedLayout?: boolean;
};

export function ReservesRail({
	entries,
	displayMode,
	activeSlotId,
	onSlotSelect,
	onEmptySlotSelect,
	variant = "default",
	isStackedLayout = false,
}: ReservesRailProps) {
	if (!entries.length) return null;

	return (
		<div className="rounded-2xl border border-white/15 bg-gradient-to-b from-emerald-950/20 via-emerald-900/10 to-emerald-950/30 p-3 text-white shadow-inner xl:max-w-[280px]">
			<p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-100/90">
				Reserves
			</p>
			<div
				className={cn(
					"mt-3 flex gap-2",
					isStackedLayout
						? "flex-row overflow-x-auto pb-1"
						: "flex-col overflow-visible pb-0",
				)}
			>
				{entries.map((entry) => (
					<SlotEntryButton
						key={entry.slot.id}
						entry={entry}
						displayMode={displayMode}
						activeSlotId={activeSlotId}
						onSlotSelect={onSlotSelect}
						onEmptySlotSelect={onEmptySlotSelect}
						buttonClassName="justify-start"
						cardWrapperClassName={variant === "compact" ? undefined : "w-full"}
						variant={variant}
					/>
				))}
			</div>
		</div>
	);
}

type SlotEntryButtonProps = {
	entry: SlotAssignment;
	displayMode: DisplayMode;
	activeSlotId: string | null;
	onSlotSelect: (slot: TeamBuilderSlot) => void;
	onEmptySlotSelect: (slot: TeamBuilderSlot) => void;
	buttonClassName?: string;
	cardWrapperClassName?: string;
	variant?: "default" | "compact";
};

function SlotEntryButton({
	entry,
	displayMode,
	activeSlotId,
	onSlotSelect,
	onEmptySlotSelect,
	buttonClassName,
	cardWrapperClassName,
	variant = "default",
}: SlotEntryButtonProps) {
	const isActive = entry.slot.id === activeSlotId;
	const hasPlayer = Boolean(entry.player);
	const handleClick = hasPlayer
		? () => onSlotSelect(entry.slot)
		: () => onEmptySlotSelect(entry.slot);

	return (
		<button
			type="button"
			onClick={handleClick}
			className={cn(
				"transition",
				variant === "compact"
					? "inline-flex w-auto hover:-translate-y-1 hover:scale-[1.02]"
					: "flex w-full justify-center",
				buttonClassName,
			)}
		>
			<div
				className={cn(
					variant === "compact"
						? SLOT_CARD_WIDTH_CLASS
						: "w-[clamp(120px,25vw,180px)]",
					cardWrapperClassName,
				)}
			>
				<SlotCard
					entry={entry}
					displayMode={displayMode}
					isActive={isActive}
					variant={variant}
				/>
			</div>
		</button>
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
	const { slot, player } = entry;
	const positionStyle = getSlotPositionStyle(slot);
	const handleClick = player ? onSelect : onEmptySelect;

	return (
		<button
			type="button"
			onClick={handleClick}
			style={positionStyle}
			className={cn(
				"absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 text-white outline-none transition",
				SLOT_CARD_WIDTH_CLASS,
				isActive
					? "scale-105 drop-shadow-[0_12px_20px_rgba(0,0,0,0.35)]"
					: "hover:scale-105",
			)}
		>
			<SlotCard entry={entry} displayMode={displayMode} isActive={isActive} />
		</button>
	);
}

type SlotCardProps = {
	entry: SlotAssignment;
	displayMode: DisplayMode;
	isActive: boolean;
	variant?: "default" | "compact";
};

function SlotCard({
	entry,
	displayMode,
	isActive,
	variant = "default",
}: SlotCardProps) {
	const { slot, player, config } = entry;
	const positionColor = getPositionColor(mapToTeamPosition(slot.label));
	const rarityDefinition = getSlotRarityDefinition(config?.rarity ?? "normal");
	const hasPlayer = Boolean(player);
	const label = slot.displayLabel ?? slot.label;
	const isCompact = variant === "compact";

	return (
		<div
			className={cn(
				"relative w-full rounded-lg border-2 bg-black/40 p-0.5 text-white backdrop-blur-sm transition",
				hasPlayer
					? "border-white/60 shadow-xl"
					: "border-dashed border-white/40",
				isActive && "ring-2 ring-emerald-200",
				isCompact && "rounded-md border-white/50 text-[11px]",
			)}
		>
			<div
				className={cn(
					"relative w-full rounded-md",
					hasPlayer
						? "p-[2px]"
						: "overflow-hidden border border-dashed border-white/30 bg-black/20",
					isCompact && "rounded-[8px]",
				)}
				style={
					hasPlayer ? { background: rarityDefinition.cardBackground } : undefined
				}
			>
				<div className="relative w-full overflow-hidden rounded-[10px]">
					{player ? (
						<img
							src={player.safeImage}
							alt={player.name}
							className="aspect-[4/4] w-full object-cover shadow-inner"
							loading="lazy"
							crossOrigin="anonymous"
							referrerPolicy="no-referrer"
						/>
					) : (
						<div className="flex aspect-[4/4] flex-col items-center justify-center gap-2 px-2 text-center">
							<span className="text-xs font-semibold uppercase tracking-[0.35em] text-white/80">
								{label}
							</span>
							<span className="text-[9px] uppercase tracking-[0.3em] text-white/50">
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
								{label}
							</span>
							<span className="absolute right-0 top-0 drop-shadow-[0_6px_12px_rgba(0,0,0,0.4)]">
								<ElementIcon element={player.element} />
							</span>
						</>
					)}
				</div>
			</div>
		</div>
	);
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
