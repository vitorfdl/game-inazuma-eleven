import { atomWithStorage, createJSONStorage } from "jotai/utils";
import type { FormationId } from "@/data/formations";
import { FORMATIONS } from "@/data/formations";
import { createEmptySlotBeans, normalizeSlotBeans } from "@/lib/slot-beans";
import type { SlotConfig, SlotEquipments } from "@/types/team-builder";

export type TeamBuilderAssignments = Record<string, number | null>;
export type TeamBuilderSlotConfigs = Record<string, SlotConfig | undefined>;

export type DisplayMode =
	| "nickname"
	| "shootAT"
	| "focusAT"
	| "focusDF"
	| "wallDF"
	| "scrambleAT"
	| "scrambleDF"
	| "kp";

export type TeamBuilderState = {
	formationId: FormationId;
	assignments: TeamBuilderAssignments;
	displayMode: DisplayMode;
	slotConfigs: TeamBuilderSlotConfigs;
};

const TEAM_BUILDER_STORAGE_KEY = "inazuma-guide.team-builder.v2";
const DEFAULT_FORMATION_ID = FORMATIONS[0]?.id ?? "433-delta";
const DEFAULT_SLOT_EQUIPMENTS: SlotEquipments = Object.freeze({
	boots: null,
	bracelets: null,
	pendants: null,
	misc: null,
});

export const DEFAULT_SLOT_CONFIG: SlotConfig = Object.freeze({
	rarity: "normal",
	equipments: DEFAULT_SLOT_EQUIPMENTS,
	beans: createEmptySlotBeans(),
});

export function createEmptySlotEquipments(): SlotEquipments {
	return {
		boots: null,
		bracelets: null,
		pendants: null,
		misc: null,
	};
}

export function normalizeSlotConfig(config?: SlotConfig | null): SlotConfig {
	return {
		rarity: config?.rarity ?? DEFAULT_SLOT_CONFIG.rarity,
		equipments: {
			...createEmptySlotEquipments(),
			...(config?.equipments ?? {}),
		},
		beans: normalizeSlotBeans(config?.beans),
	};
}

export function mergeSlotConfig(
	base: SlotConfig,
	patch: Partial<SlotConfig>,
): SlotConfig {
	return {
		rarity: patch.rarity ?? base.rarity,
		equipments: {
			...createEmptySlotEquipments(),
			...base.equipments,
			...(patch.equipments ?? {}),
		},
		beans: normalizeSlotBeans(patch.beans ?? base.beans),
	};
}

const defaultState: TeamBuilderState = {
	formationId: DEFAULT_FORMATION_ID,
	assignments: {},
	displayMode: "nickname",
	slotConfigs: {},
};

const storage =
	typeof window === "undefined"
		? undefined
		: createJSONStorage<TeamBuilderState>(() => window.localStorage);

export const teamBuilderAtom = atomWithStorage<TeamBuilderState>(
	TEAM_BUILDER_STORAGE_KEY,
	defaultState,
	storage,
);
