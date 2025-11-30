import type { TeamPosition } from "@/lib/icon-picker";
import type { PowerStats } from "@/lib/inazuma-math";
import { mapToTeamPosition, type PlayerRecord } from "@/lib/players-data";
import {
	passivesById,
	type PassiveCondition,
	type PassiveEffect,
	type PassiveStat,
} from "@/lib/passives-data";
import { createEmptyPowerStats } from "@/lib/power-utils";
import type { PassiveCalculationOptions } from "@/store/team-builder";
import type { SlotAssignment, SlotComputedStats } from "@/types/team-builder";

type SupportedPassiveStat =
	| "shotAT"
	| "focus"
	| "scramble"
	| "wallDF"
	| "AT"
	| "DF"
	| "KP"
	| "all";

type PowerStatKey = keyof PowerStats;

type ActiveAssignment = SlotAssignment & {
	player: PlayerRecord;
	computed: SlotComputedStats;
	meta: {
		element: string;
		position: TeamPosition;
	};
};

type PassiveImpactMap = Map<string, PowerStats>;

const ATTACK_POWER_KEYS: PowerStatKey[] = ["shootAT", "focusAT", "scrambleAT"];
const DEFENSE_POWER_KEYS: PowerStatKey[] = ["focusDF", "scrambleDF", "wallDF"];
const ALL_POWER_KEYS: PowerStatKey[] = [
	...ATTACK_POWER_KEYS,
	...DEFENSE_POWER_KEYS,
];

const PASSIVE_STAT_KEY_MAP: Record<SupportedPassiveStat, PowerStatKey[]> = {
	shotAT: ["shootAT"],
	focus: ["focusAT", "focusDF"],
	scramble: ["scrambleAT", "scrambleDF"],
	wallDF: ["wallDF"],
	AT: ATTACK_POWER_KEYS,
	DF: DEFENSE_POWER_KEYS,
	KP: ["kp"],
	all: ALL_POWER_KEYS,
};

const PASSIVE_CONDITION_LABELS: Record<
	PassiveCondition["type"],
	{ label: string; helper: string }
> = {
	scoreNotLeading: {
		label: "Not Leading",
		helper: "Team is trailing or tied",
	},
	noFoulCommittedYet: {
		label: "Clean Match",
		helper: "No fouls committed yet",
	},
	fieldZoneOwnHalf: {
		label: "Own Half",
		helper: "Player positioned on our half",
	},
	fieldZoneOpponentHalf: {
		label: "Opponent Half",
		helper: "Player positioned on opponent half",
	},
	outsideZoneArea: {
		label: "Outside Area",
		helper: "Player outside the area",
	},
	matchTimeHalfFirst: {
		label: "First Half",
		helper: "Effect active in first half",
	},
	matchTimeHalfSecond: {
		label: "Second Half",
		helper: "Effect active in second half",
	},
	distanceWithinRadius: {
		label: "Within Radius",
		helper: "Nearby allies within range",
	},
	sameElementAllyNearby: {
		label: "Same Element Nearby",
		helper: "Needs an ally of same element nearby",
	},
	differentElementAllyNearby: {
		label: "Different Element Nearby",
		helper: "Needs an ally of different element nearby",
	},
	nearbyAllySameElement: {
		label: "Same Element Close",
		helper: "Close ally shares element",
	},
	nearbyAllyDifferentElement: {
		label: "Different Element Close",
		helper: "Close ally with different element",
	},
	teamBreachRateAtLeast15: {
		label: "Breach ≥ 15%",
		helper: "Team breach rate boosted",
	},
	tensionAtLeast50: {
		label: "Tension ≥ 50",
		helper: "Tension meter at least 50",
	},
	tensionAt100: {
		label: "Tension Max",
		helper: "Tension meter full",
	},
	bondPowerAtLeast20: {
		label: "Bond ≥ 20",
		helper: "Bond power at least 20",
	},
	afterBallRecoveryNoDirectCatch: {
		label: "After Recovery",
		helper: "Immediately after recovering the ball",
	},
	whileDashing: {
		label: "While Dashing",
		helper: "Player currently dashing",
	},
	onMarkedOrBlockedWhileDashing: {
		label: "Blocked While Dashing",
		helper: "Marked or blocked mid dash",
	},
	nextRoughAttackOnly: {
		label: "Next Rough Attack",
		helper: "Applies to the next rough attack",
	},
	onOpponentFoul: {
		label: "After Opponent Foul",
		helper: "Triggered by an opponent foul",
	},
	afterSubstitution: {
		label: "After Substitution",
		helper: "Player just entered the pitch",
	},
};

export type PassiveConditionOption = {
	type: PassiveCondition["type"];
	label: string;
	helper: string;
};

export const PASSIVE_CONDITION_OPTIONS: PassiveConditionOption[] =
	Object.entries(PASSIVE_CONDITION_LABELS).map(([type, meta]) => ({
		type: type as PassiveCondition["type"],
		label: meta.label,
		helper: meta.helper,
	}));

export function computePassiveImpacts(
	assignments: SlotAssignment[],
	options: PassiveCalculationOptions,
): PassiveImpactMap {
	if (!options.enabled) {
		return new Map();
	}

	const activeAssignments = assignments
		.filter(
			(entry): entry is ActiveAssignment =>
				entry.slot.kind !== "reserve" &&
				Boolean(entry.player) &&
				Boolean(entry.computed),
		)
		.map((entry) => ({
			...entry,
			player: entry.player as PlayerRecord,
			computed: entry.computed as SlotComputedStats,
			meta: {
				element: normalizeElement(entry.player?.element),
				position: mapToTeamPosition(entry.player?.position ?? ""),
			},
		}));

	if (!activeAssignments.length) {
		return new Map();
	}

	const conditionSet = new Set(options.activeConditions);
	const impactMap: PassiveImpactMap = new Map();

	activeAssignments.forEach((source) => {
		const slotPassives = source.config.passives;
		if (!slotPassives) {
			return;
		}

		const presets = [...slotPassives.presets, slotPassives.custom];

		presets.forEach((preset) => {
			if (!preset.passiveId || preset.value === 0) {
				return;
			}
			const passive = passivesById.get(preset.passiveId);
			if (!passive || !passive.effects?.length) {
				return;
			}

			passive.effects.forEach((effect) => {
				if (!isSupportedStat(effect.stat)) {
					return;
				}
				if (!areConditionsSatisfied(effect.conditions, conditionSet)) {
					return;
				}

				const targets = resolveTargets(effect.scope, source, activeAssignments);
				if (!targets.length) {
					return;
				}

				targets.forEach((target) => {
					const delta = computeEffectDelta(
						effect,
						preset.value,
						target.computed.power,
					);
					if (!delta) {
						return;
					}
					const entry = getOrCreateImpact(impactMap, target.slot.id);
					applyPowerDelta(entry, delta);
				});
			});
		});
	});

	return impactMap;
}

function resolveTargets(
	scope: PassiveEffect["scope"],
	source: ActiveAssignment,
	assignments: ActiveAssignment[],
): ActiveAssignment[] {
	switch (scope) {
		case "self":
			return [source];
		case "team":
			return assignments;
		case "nearbyAllies":
			return assignments.filter((entry) => entry.slot.id !== source.slot.id);
		case "alliesSameElement":
			return assignments.filter(
				(entry) =>
					entry.slot.id !== source.slot.id &&
					entry.meta.element &&
					entry.meta.element === source.meta.element,
			);
		case "alliesDifferentElement":
			return assignments.filter(
				(entry) =>
					entry.slot.id !== source.slot.id &&
					entry.meta.element !== source.meta.element,
			);
		case "alliesSamePosition":
			return assignments.filter(
				(entry) =>
					entry.slot.id !== source.slot.id &&
					entry.meta.position === source.meta.position,
			);
		case "alliesDifferentPosition":
			return assignments.filter(
				(entry) =>
					entry.slot.id !== source.slot.id &&
					entry.meta.position !== source.meta.position,
			);
		case "alliedMF":
		return assignments.filter((entry) => entry.meta.position === "MD");
		case "alliedDF":
			return assignments.filter((entry) => entry.meta.position === "DF");
		case "alliedGK":
			return assignments.filter((entry) => entry.meta.position === "GK");
		case "subbedOnPlayer":
			return [];
		default:
			return assignments.filter((entry) => entry.slot.id !== source.slot.id);
	}
}

function computeEffectDelta(
	effect: PassiveEffect,
	value: number,
	targetPower: PowerStats,
): PowerStats | null {
	const statKeys = PASSIVE_STAT_KEY_MAP[effect.stat as SupportedPassiveStat];
	if (!statKeys || !statKeys.length) {
		return null;
	}
	const signedValue = value * (effect.direction === "decrease" ? -1 : 1);
	if (signedValue === 0) {
		return null;
	}

	const delta = createEmptyPowerStats();
	statKeys.forEach((key) => {
		const baseValue = targetPower[key] ?? 0;
		const increment =
			effect.mode === "percent" ? (baseValue * signedValue) / 100 : signedValue;
		delta[key] += increment;
	});

	return delta;
}

function areConditionsSatisfied(
	conditions: PassiveEffect["conditions"],
	activeConditions: Set<PassiveCondition["type"]>,
): boolean {
	if (!conditions?.length) {
		return true;
	}
	return conditions.every((condition) => activeConditions.has(condition.type));
}

function isSupportedStat(stat: PassiveStat): stat is SupportedPassiveStat {
	return (
		stat === "shotAT" ||
		stat === "focus" ||
		stat === "scramble" ||
		stat === "wallDF" ||
		stat === "AT" ||
		stat === "DF" ||
		stat === "KP" ||
		stat === "all"
	);
}

function getOrCreateImpact(map: PassiveImpactMap, slotId: string): PowerStats {
	const existing = map.get(slotId);
	if (existing) {
		return existing;
	}
	const impact = createEmptyPowerStats();
	map.set(slotId, impact);
	return impact;
}

function applyPowerDelta(target: PowerStats, delta: PowerStats) {
	target.shootAT += delta.shootAT;
	target.focusAT += delta.focusAT;
	target.focusDF += delta.focusDF;
	target.wallDF += delta.wallDF;
	target.scrambleAT += delta.scrambleAT;
	target.scrambleDF += delta.scrambleDF;
	target.kp += delta.kp;
}

function normalizeElement(value: string | null | undefined): string {
	return (value ?? "").trim().toLowerCase();
}
