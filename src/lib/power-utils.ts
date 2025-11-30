import type { PowerStats } from "@/lib/inazuma-math";

export function createEmptyPowerStats(): PowerStats {
	return {
		shootAT: 0,
		focusAT: 0,
		focusDF: 0,
		wallDF: 0,
		scrambleAT: 0,
		scrambleDF: 0,
		kp: 0,
	};
}

export function clonePowerStats(source: PowerStats): PowerStats {
	return {
		shootAT: source.shootAT,
		focusAT: source.focusAT,
		focusDF: source.focusDF,
		wallDF: source.wallDF,
		scrambleAT: source.scrambleAT,
		scrambleDF: source.scrambleDF,
		kp: source.kp,
	};
}

export function addPowerStats(
	a: PowerStats,
	b: PowerStats,
): PowerStats {
	return {
		shootAT: a.shootAT + b.shootAT,
		focusAT: a.focusAT + b.focusAT,
		focusDF: a.focusDF + b.focusDF,
		wallDF: a.wallDF + b.wallDF,
		scrambleAT: a.scrambleAT + b.scrambleAT,
		scrambleDF: a.scrambleDF + b.scrambleDF,
		kp: a.kp + b.kp,
	};
}
