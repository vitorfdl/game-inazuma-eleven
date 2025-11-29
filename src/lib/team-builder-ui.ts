import type { FormationSlot } from "@/data/formations";
import { EXTRA_SLOT_IDS } from "@/data/team-builder-slots";
import { formatNumber } from "@/lib/data-helpers";
import type { TeamPosition } from "@/lib/icon-picker";
import { mapToTeamPosition } from "@/lib/players-data";
import type { DisplayMode, TeamBuilderAssignments, TeamBuilderSlotConfigs } from "@/store/team-builder";
import type { FiltersState, SlotAssignment, TeamBuilderSlot } from "@/types/team-builder";

export const FIELD_COLUMNS = 5;
export const FIELD_ROWS = 6;
export const COLUMN_STOPS = [8, 30, 50, 70, 92];
export const ROW_STOPS = [14, 30, 48, 65, 78, 94];
export const SLOT_CARD_WIDTH_CLASS = "w-[clamp(92px,12vw,128px)]";

export const DEFAULT_FILTERS: FiltersState = {
	search: "",
	element: "all",
	position: "all",
	role: "all",
};

export const POSITION_DISPLAY_ORDER: Record<TeamPosition, number> = {
	GK: 0,
	DF: 1,
	MD: 2,
	FW: 3,
	RESERVE: 4,
	MANAGER: 5,
	COORDINATOR: 6,
};

export function getPositionSortValue(position: string): number {
	const normalized = mapToTeamPosition(position);
	return POSITION_DISPLAY_ORDER[normalized] ?? Number.MAX_SAFE_INTEGER;
}

export function getSlotPositionStyle(slot: TeamBuilderSlot) {
	const columnIndex = slot.column - 1;
	const rowIndex = slot.row - 1;
	const left = COLUMN_STOPS[columnIndex] ?? (columnIndex / Math.max(FIELD_COLUMNS - 1, 1)) * 100;
	const top = ROW_STOPS[rowIndex] ?? (rowIndex / Math.max(FIELD_ROWS - 1, 1)) * 100;
	return {
		left: `${left}%`,
		top: `${top}%`,
	};
}

export function getSlotDisplayValue(entry: SlotAssignment, mode: DisplayMode) {
	const player = entry.player;
	const slotLabel = entry.slot.displayLabel ?? entry.slot.label;
	const fallback = player?.nickname || player?.name || slotLabel;
	if (!player) {
		return slotLabel;
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

export function extendFormationSlot(slot: FormationSlot): TeamBuilderSlot {
	return {
		...slot,
		kind: "starter",
		displayLabel: slot.label,
		configScope: "full",
	};
}

export function pickExtraAssignments(assignments: TeamBuilderAssignments = {}): TeamBuilderAssignments {
	const snapshot: TeamBuilderAssignments = {};
	EXTRA_SLOT_IDS.forEach((slotId) => {
		snapshot[slotId] = assignments?.[slotId] ?? null;
	});
	return snapshot;
}

export function pickExtraSlotConfigs(configs: TeamBuilderSlotConfigs = {}): TeamBuilderSlotConfigs {
	const snapshot: TeamBuilderSlotConfigs = {};
	EXTRA_SLOT_IDS.forEach((slotId) => {
		if (configs?.[slotId]) {
			snapshot[slotId] = configs[slotId];
		}
	});
	return snapshot;
}

export function countAssignedPlayers(assignments: TeamBuilderAssignments): number {
	return Object.values(assignments ?? {}).filter((value): value is number => typeof value === "number").length;
}
