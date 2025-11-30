import { atomWithStorage, createJSONStorage } from "jotai/utils";
import type { FormationId } from "@/data/formations";
import { FORMATIONS } from "@/data/formations";
import { EXTRA_SLOT_IDS } from "@/data/team-builder-slots";
import type { PassiveCondition } from "@/lib/passives-data";
import { createEmptySlotBeans, normalizeSlotBeans } from "@/lib/slot-beans";
import { createEmptySlotPassives, normalizeSlotPassives } from "@/lib/slot-passives";
import type { SlotConfig, SlotEquipments } from "@/types/team-builder";

export type TeamBuilderAssignments = Record<string, number | null>;
export type TeamBuilderSlotConfigs = Record<string, SlotConfig | undefined>;

export type DisplayMode = "nickname" | "shootAT" | "focusAT" | "focusDF" | "wallDF" | "scrambleAT" | "scrambleDF" | "kp";

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

export const TEAM_BUILDER_TEAM_IDS = [1, 2, 3, 4, 5, 6] as const;
export type TeamBuilderTeamId = (typeof TEAM_BUILDER_TEAM_IDS)[number];

export const DEFAULT_PASSIVE_OPTIONS: PassiveCalculationOptions = Object.freeze({
	enabled: false,
	activeConditions: [],
});

const LEGACY_TEAM_STORAGE_KEY = "inazuma-guide.team-builder.v2";
const TEAM_STORAGE_KEY_PREFIX = `${LEGACY_TEAM_STORAGE_KEY}.team-`;
const TEAM_BUILDER_TEAM_STORAGE_KEYS: Record<TeamBuilderTeamId, string> = {
	1: LEGACY_TEAM_STORAGE_KEY,
	2: `${TEAM_STORAGE_KEY_PREFIX}2`,
	3: `${TEAM_STORAGE_KEY_PREFIX}3`,
	4: `${TEAM_STORAGE_KEY_PREFIX}4`,
	5: `${TEAM_STORAGE_KEY_PREFIX}5`,
	6: `${TEAM_STORAGE_KEY_PREFIX}6`,
};
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

export function mergeSlotConfig(base: SlotConfig, patch: Partial<SlotConfig>): SlotConfig {
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

const defaultAssignments: TeamBuilderAssignments = EXTRA_SLOT_IDS.reduce((acc, slotId) => {
	acc[slotId] = null;
	return acc;
}, {} as TeamBuilderAssignments);

const defaultState: TeamBuilderState = {
	formationId: DEFAULT_FORMATION_ID,
	assignments: defaultAssignments,
	displayMode: "nickname",
	slotConfigs: {},
	passiveOptions: DEFAULT_PASSIVE_OPTIONS,
};

const storage = typeof window === "undefined" ? undefined : createJSONStorage<TeamBuilderState>(() => window.localStorage);

function createTeamBuilderAtom(storageKey: string) {
	return atomWithStorage<TeamBuilderState>(storageKey, defaultState, storage);
}

type TeamBuilderAtom = ReturnType<typeof createTeamBuilderAtom>;

export const teamBuilderTeamAtoms = TEAM_BUILDER_TEAM_IDS.reduce<Record<TeamBuilderTeamId, TeamBuilderAtom>>(
	(acc, teamId) => {
		acc[teamId] = createTeamBuilderAtom(TEAM_BUILDER_TEAM_STORAGE_KEYS[teamId]);
		return acc;
	},
	{} as Record<TeamBuilderTeamId, TeamBuilderAtom>,
);

export const teamBuilderAtom = teamBuilderTeamAtoms[1];

const ACTIVE_TEAM_STORAGE_KEY = "inazuma-guide.team-builder.active-team";
const activeTeamStorage = typeof window === "undefined" ? undefined : createJSONStorage<TeamBuilderTeamId>(() => window.localStorage);

export const teamBuilderActiveTeamAtom = atomWithStorage<TeamBuilderTeamId>(ACTIVE_TEAM_STORAGE_KEY, TEAM_BUILDER_TEAM_IDS[0], activeTeamStorage);
