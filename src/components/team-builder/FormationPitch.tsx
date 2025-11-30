import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FORMATIONS, type FormationDefinition } from "@/data/formations";
import { getElementIcon, getPositionColor } from "@/lib/icon-picker";
import { mapToElementType, mapToTeamPosition } from "@/lib/players-data";
import { getSlotRarityDefinition } from "@/lib/slot-rarity";
import { getSlotDisplayValue, getSlotPositionStyle, SLOT_CARD_WIDTH_CLASS } from "@/lib/team-builder-ui";
import { cn } from "@/lib/utils";
import type { DisplayMode } from "@/store/team-builder";
import type { SlotAssignment, TeamBuilderSlot } from "@/types/team-builder";

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
	dragDisabled?: boolean;
	isDragActive?: boolean;
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
	dragDisabled = false,
	isDragActive = false,
}: FormationPitchProps) {
	const managerEntry = staffEntries.find((entry) => entry.slot.kind === "manager");
	const coordinatorEntries = staffEntries.filter((entry) => entry.slot.kind === "coordinator");
	const hasStaffFooter = managerEntry || coordinatorEntries.length > 0;

	return (
		<div className="w-full">
			<div className="relative w-full">
				<div className="pointer-events-none absolute inset-x-0 -top-3 z-20 flex justify-center sm:-top-4">
					<div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border-[3px] border-black/80 bg-[#fff59f] px-4 py-1.5 text-slate-900 shadow-[0_10px_0_rgba(0,0,0,0.35)]">
						<p className="text-[10px] font-black uppercase tracking-[0.45em] text-slate-900">Formation</p>
						<Select disabled={isFormationDisabled} value={formationId} onValueChange={(value) => onFormationChange(value)}>
							<SelectTrigger className="h-9 min-w-[200px] border-[3px] border-black/80 bg-white/95 text-xs font-semibold uppercase tracking-[0.15em] text-slate-900 shadow-[0_6px_0_rgba(0,0,0,0.35)] sm:min-w-[240px] dark:bg-slate-900/80 dark:text-white">
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
				<div className="relative aspect-[3/4] w-full overflow-hidden rounded-[46px] border-[6px] border-black/80 bg-[#042a20] p-4 shadow-[0_35px_70px_rgba(0,0,0,0.65)] sm:aspect-[5/6] lg:aspect-[5/5]">
					<div className="pointer-events-none absolute inset-1 rounded-[40px] border-[3px] border-black/70 bg-[radial-gradient(circle_at_top,#e9ff7a_0%,#6eda6f_45%,#0a7b58_85%)] shadow-[inset_0_-40px_80px_rgba(0,0,0,0.35)]" />
					<div className="pointer-events-none absolute inset-4 rounded-[32px] border-[3px] border-black/50 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.08)_0,rgba(255,255,255,0.08)_8%,transparent_8%,transparent_16%)] opacity-80" />
					<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.45),transparent_60%)]" />
					<div className="pointer-events-none absolute inset-x-10 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-[#fffbc4] shadow-[0_0_18px_rgba(255,255,255,0.6)]" />
					<div className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[#fffbc4] shadow-[0_0_18px_rgba(255,255,255,0.45)] sm:h-56 sm:w-56" />
					<div className="pointer-events-none absolute left-1/2 top-8 h-28 w-[60%] -translate-x-1/2 rounded-[28px] border-[3px] border-[#fffbc4] shadow-[0_0_18px_rgba(255,255,255,0.45)] sm:h-32" />
					<div className="pointer-events-none absolute left-1/2 bottom-8 h-28 w-[60%] -translate-x-1/2 rounded-[28px] border-[3px] border-[#fffbc4] shadow-[0_0_18px_rgba(255,255,255,0.45)] sm:h-32" />
					<div className="relative z-10 h-full w-full">
						{assignments.map((entry) => (
							<PlayerSlotMarker
								key={entry.slot.id}
								entry={entry}
								isActive={entry.slot.id === activeSlotId}
								displayMode={displayMode}
								onSelect={() => onSlotSelect(entry.slot)}
								onEmptySelect={() => onEmptySlotSelect(entry.slot)}
								dragDisabled={dragDisabled}
								isDragActive={isDragActive}
							/>
						))}
					</div>
				</div>
			</div>
			{hasStaffFooter && (
				<div className="mt-4 flex w-full flex-wrap items-center gap-2 rounded-[30px] border-[4px] border-black/80 bg-gradient-to-r from-[#fff48a] via-[#ffd35d] to-[#fff48a] p-3 text-slate-900 shadow-[0_12px_0_rgba(0,0,0,0.35)] dark:border-white/20 dark:from-[#3c2a00] dark:via-[#4b1e00] dark:to-[#3c2a00] dark:text-white sm:gap-3 sm:justify-between">
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
								dragDisabled={dragDisabled}
								isDragActive={isDragActive}
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
								dragDisabled={dragDisabled}
								isDragActive={isDragActive}
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
	dragDisabled?: boolean;
	isDragActive?: boolean;
};

export function ReservesRail({
	entries,
	displayMode,
	activeSlotId,
	onSlotSelect,
	onEmptySlotSelect,
	variant = "default",
	isStackedLayout = false,
	dragDisabled = false,
	isDragActive = false,
}: ReservesRailProps) {
	if (!entries.length) return null;

	return (
		<div className="rounded-[28px] border-[4px] border-black/80 bg-gradient-to-b from-[#fff288] via-[#ffcf54] to-[#ffd95b] p-3 text-slate-900 shadow-[0_12px_0_rgba(0,0,0,0.35)] dark:border-white/20 dark:from-[#3a2200] dark:via-[#431100] dark:to-[#3a2200] dark:text-white xl:max-w-[280px]">
			<div className={cn("mt-3 flex gap-2", isStackedLayout ? "flex-row overflow-x-auto pb-1" : "flex-col overflow-visible pb-0")}>
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
						dragDisabled={dragDisabled}
						isDragActive={isDragActive}
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
	dragDisabled?: boolean;
	isDragActive?: boolean;
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
	dragDisabled = false,
	isDragActive = false,
}: SlotEntryButtonProps) {
	const isActive = entry.slot.id === activeSlotId;
	const hasPlayer = Boolean(entry.player);
	const handleClick = hasPlayer ? () => onSlotSelect(entry.slot) : () => onEmptySlotSelect(entry.slot);
	const { setNodeRef: setDroppableNode, isOver } = useDroppable({
		id: entry.slot.id,
	});
	const {
		attributes,
		listeners,
		setNodeRef: setDraggableNode,
		isDragging,
	} = useDraggable({
		id: entry.slot.id,
		data: { slotId: entry.slot.id },
		disabled: dragDisabled || !hasPlayer,
	});
	const setNodeRef = (node: HTMLButtonElement | null) => {
		setDroppableNode(node);
		setDraggableNode(node);
	};

	const cursorClass = isDragActive ? "cursor-grabbing" : hasPlayer ? "cursor-grab" : "cursor-pointer";

	return (
		<button
			type="button"
			ref={setNodeRef}
			onClick={handleClick}
			className={cn(
				"transition",
				variant === "compact" ? "inline-flex w-auto hover:-translate-y-1 hover:scale-[1.02]" : "flex w-full justify-center",
				buttonClassName,
				isDragging && "scale-105 opacity-80 drop-shadow-[0_10px_20px_rgba(16,185,129,0.35)]",
				isOver && "ring-2 ring-emerald-300/70 drop-shadow-[0_0_25px_rgba(16,185,129,0.4)]",
				cursorClass,
			)}
			{...listeners}
			{...attributes}
		>
			<div className={cn(variant === "compact" ? SLOT_CARD_WIDTH_CLASS : "w-[clamp(120px,25vw,180px)]", cardWrapperClassName)}>
				<SlotCard entry={entry} displayMode={displayMode} isActive={isActive} variant={variant} />
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
	dragDisabled?: boolean;
	isDragActive?: boolean;
};

function PlayerSlotMarker({ entry, isActive, displayMode, onSelect, onEmptySelect, dragDisabled = false, isDragActive = false }: PlayerSlotMarkerProps) {
	const { slot, player } = entry;
	const positionStyle = getSlotPositionStyle(slot);
	const handleClick = player ? onSelect : onEmptySelect;
	const { setNodeRef: setDroppableNode, isOver } = useDroppable({
		id: slot.id,
	});
	const {
		attributes,
		listeners,
		setNodeRef: setDraggableNode,
		isDragging,
	} = useDraggable({
		id: slot.id,
		data: { slotId: slot.id },
		disabled: dragDisabled || !player,
	});
	const setNodeRef = (node: HTMLButtonElement | null) => {
		setDroppableNode(node);
		setDraggableNode(node);
	};

	const cursorClass = isDragActive ? "cursor-grabbing" : player ? "cursor-grab" : "cursor-pointer";

	return (
		<button
			type="button"
			ref={setNodeRef}
			onClick={handleClick}
			style={positionStyle}
			className={cn(
				"absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 text-emerald-950 outline-none transition dark:text-white",
				SLOT_CARD_WIDTH_CLASS,
				isActive ? "scale-105 drop-shadow-[0_12px_20px_rgba(15,118,110,0.3)] dark:drop-shadow-[0_12px_20px_rgba(0,0,0,0.35)]" : "hover:scale-105",
				isDragging && "scale-110 opacity-80 drop-shadow-[0_12px_25px_rgba(16,185,129,0.35)] cursor-grabbing",
				isOver && "ring-2 ring-emerald-200/80 drop-shadow-[0_0_30px_rgba(16,185,129,0.45)]",
				cursorClass,
			)}
			{...listeners}
			{...attributes}
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

export function SlotCard({ entry, displayMode, isActive, variant = "default" }: SlotCardProps) {
	const { slot, player, config } = entry;
	const positionColor = getPositionColor(mapToTeamPosition(slot.label));
	const rarityDefinition = getSlotRarityDefinition(config?.rarity ?? "normal");
	const hasPlayer = Boolean(player);
	const label = slot.displayLabel ?? slot.label;
	const isCompact = variant === "compact";

	return (
		<div
			className={cn(
				"relative w-full rounded-lg border-2 bg-white/80 p-0.5 text-emerald-950 backdrop-blur-sm transition dark:bg-black/40 dark:text-white",
				hasPlayer ? "border-emerald-300 shadow-xl dark:border-white/60" : "border-dashed border-emerald-200 dark:border-white/40",
				isActive && "ring-2 ring-emerald-300 dark:ring-emerald-200",
				isCompact && "rounded-md border-emerald-200 dark:border-white/50 text-[11px]",
			)}
		>
			<div
				className={cn(
					"relative w-full rounded-md",
					hasPlayer ? "p-[2px]" : "overflow-hidden border border-dashed border-emerald-200 bg-emerald-50/80 dark:border-white/30 dark:bg-black/20",
					isCompact && "rounded-[8px]",
				)}
				style={hasPlayer ? { background: rarityDefinition.cardBackground } : undefined}
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
							<span className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-700 dark:text-white/80">{label}</span>
							<span className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground">Tap to assign</span>
						</div>
					)}

					{player && (
						<>
							<div className="pointer-events-none absolute inset-x-0 bottom-0 rounded-xs bg-black/75 text-center shadow-2xl backdrop-blur">
								<span className="m-0 block text-xs font-semibold uppercase  text-white">{player ? getSlotDisplayValue(entry, displayMode) : null}</span>
							</div>
							<span
								className="absolute left-0 top-0 items-center justify-center px-2 py-[2px] text-xs font-semibold uppercase "
								style={{
									background: positionColor.gradient ?? `${positionColor.primary}22`,
									color: positionColor.gradient ? "#fff" : positionColor.primary,
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
			className="inline-flex items-center justify-center rounded-full border-[2px] border-black/70 p-1.5 shadow-[0_6px_0_rgba(0,0,0,0.35)] dark:border-white/60"
			style={{
				backgroundColor: definition.color,
			}}
		>
			<Icon className="size-3 text-white" aria-hidden="true" />
		</span>
	);
}
