import coordinatorJson from "@/assets/data/passives/coordinator.json?raw";
import customJson from "@/assets/data/passives/custom.json?raw";
import managerJson from "@/assets/data/passives/manager.json?raw";
import playersJson from "@/assets/data/passives/player.json?raw";

import { sanitizeAttribute } from "@/lib/data-helpers";

export type PassiveType = "player" | "manager" | "coordinator" | "custom";

export type PassiveStat =
	| "shotAT" // Shot Attack
	| "focus" // Focus AT/DF combined value
	| "scramble" // Scramble AT/DF combined value
	| "wallDF" // Wall Defense
	| "AT" // Generic Attack modifier (all AT-related)
	| "DF" // Generic Defense modifier (all DF-related)
	| "KP" // Keeper Power (GK HP)
	| "roughAttack" // Rough Attack AT/DF (Power Charge / Block)
	| "bondGain" // Kizuna/Bond Power gained
	| "bondLoss" // Kizuna/Bond Power lost
	| "tacticCooldown" // Commander special tactics cooldown
	| "breachRate" // Breach trigger rate
	| "breachTensionRequirement" // Required Tension to trigger Breach
	| "wallPierce" // Wall penetration / wall pierce rate
	| "directShotAT" // Direct shot Attack (non-combo, non-counter, etc.)
	| "foulRate" // Foul rate
	| "commonDropRate" // Common item drop rate
	| "rareDropRate" // Rare item drop rate
	| "all" // Generic “all AT/DF” team buff
	| string;

export type PassiveEffect = {
	scope:
		| "alliesSameElement"
		| "alliesDifferentElement"
		| "alliesSamePosition"
		| "alliesDifferentPosition"
		| "nearbyAllies"
		| "self"
		| "team"
		| "alliedMF"
		| "alliedDF"
		| "alliedGK"
		| "subbedOnPlayer";
	stat: PassiveStat;
	mode: "percent" | "flat";
	direction: "increase" | "decrease";
	conditions: PassiveCondition[];
};

export type PassiveCondition = {
	type: // Score / foul state
		| "scoreNotLeading"
		| "noFoulCommittedYet"

		// Position / zone on the pitch
		| "fieldZoneOwnHalf"
		| "fieldZoneOpponentHalf"
		| "outsideZoneArea"
		| "matchTimeHalfFirst"
		| "matchTimeHalfSecond"

		// Proximity / nearby allies
		| "distanceWithinRadius"
		| "sameElementAllyNearby"
		| "differentElementAllyNearby"
		| "nearbyAllySameElement"
		| "nearbyAllyDifferentElement"

		// Breach-related
		| "teamBreachRateAtLeast15"

		// Tension-related
		| "tensionAtLeast50"
		| "tensionAt100"

		// Bond-related
		| "bondPowerAtLeast20"

		// Event triggers (focus/scramble/pass/etc.)
		| "afterBallRecoveryNoDirectCatch"

		// Sprint / dash interactions
		| "whileDashing"
		| "onMarkedOrBlockedWhileDashing"

		// Rough-attack application window
		| "nextRoughAttackOnly"

		// Opponent foul / own foul
		| "onOpponentFoul"

		// Substitutions
		| "afterSubstitution";
	value?: number | "string";
};

type RawPassiveRecord = {
	number: number;
	type: string;
	buildType: string | null;
	description: string | null;
	strongValue: number | null;
	weakValue: number | null;
	effects: PassiveEffect[];
};

export type PassiveRecord = {
	id: string;
	number: number;
	type: PassiveType;
	buildType: string | null;
	description: string;
	strongValue: number | null;
	weakValue: number | null;
	effects: PassiveEffect[];
};

const playersRecords = JSON.parse(playersJson) as RawPassiveRecord[];
const rawManagerRecords = JSON.parse(managerJson) as RawPassiveRecord[];
const rawCoordinatorRecords = JSON.parse(coordinatorJson) as RawPassiveRecord[];
const rawCustomRecords = JSON.parse(customJson) as RawPassiveRecord[];

const rawRecords = [...playersRecords, ...rawManagerRecords, ...rawCoordinatorRecords, ...rawCustomRecords];

const parsedPassives: PassiveRecord[] = rawRecords
	.filter((passive) => passive.description !== null)
	.filter((record) => isPassiveType(record.type) && typeof record.number === "number")
	.map((record) => ({
		id: `${record.type}-${record.number}`,
		number: record.number,
		type: record.type as PassiveType,
		buildType: record.buildType,
		description: sanitizeAttribute(record.description),
		strongValue: normalizeValue(record.strongValue),
		weakValue: normalizeValue(record.weakValue),
		effects: record.effects,
	}));

export const passivesDataset: PassiveRecord[] = parsedPassives.sort((a, b) => {
	const byType = a.type.localeCompare(b.type);

	if (byType !== 0) {
		return byType;
	}
	return a.description.localeCompare(b.description);
});

export const passivesById = new Map<string, PassiveRecord>(passivesDataset.map((passive) => [passive.id, passive]));

export const passivesByType: Record<PassiveType, PassiveRecord[]> = {
	player: passivesDataset.filter((passive) => passive.type === "player"),
	manager: passivesDataset.filter((passive) => passive.type === "manager"),
	coordinator: passivesDataset.filter((passive) => passive.type === "coordinator"),
	custom: passivesDataset.filter((passive) => passive.type === "custom"),
};

export const playerGeneralPassives = passivesByType.player.filter((passive) => passive.buildType === null);

export const playerBuildPassives = passivesByType.player.filter((passive) => passive.buildType !== null);

export const customPassives = passivesByType.custom;

function isPassiveType(value: string): value is PassiveType {
	return value === "player" || value === "manager" || value === "coordinator" || value === "custom";
}

function normalizeValue(value: unknown): number | null {
	const numeric = typeof value === "number" ? value : Number(value);
	if (!Number.isFinite(numeric)) {
		return null;
	}
	return Number(numeric);
}
