import { atomWithStorage, createJSONStorage } from "jotai/utils";
import type { FormationId } from "@/data/formations";
import { FORMATIONS } from "@/data/formations";
import { EXTRA_SLOT_IDS } from "@/data/team-builder-slots";
import type { PassiveCondition } from "@/lib/passives-data";
import { createEmptySlotBeans, normalizeSlotBeans } from "@/lib/slot-beans";
import {
	createEmptySlotPassives,
	normalizeSlotPassives,
} from "@/lib/slot-passives";
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
	passiveOptions: PassiveCalculationOptions;
};

export type PassiveCalculationOptions = {
	enabled: boolean;
	activeConditions: PassiveCondition["type"][];
};

export const DEFAULT_PASSIVE_OPTIONS: PassiveCalculationOptions = Object.freeze({
	enabled: false,
	activeConditions: [],
});

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
	passives: createEmptySlotPassives(),
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
		passives: normalizeSlotPassives(config?.passives),
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
		passives: normalizeSlotPassives(patch.passives ?? base.passives),
	};
}

const defaultAssignments: TeamBuilderAssignments = EXTRA_SLOT_IDS.reduce(
	(acc, slotId) => {
		acc[slotId] = null;
		return acc;
	},
	{} as TeamBuilderAssignments,
);

const defaultState: TeamBuilderState = {
	formationId: DEFAULT_FORMATION_ID,
	assignments: defaultAssignments,
	displayMode: "nickname",
	slotConfigs: {},
	passiveOptions: DEFAULT_PASSIVE_OPTIONS,
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
