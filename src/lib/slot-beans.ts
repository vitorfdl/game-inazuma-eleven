import type { BaseAttributeKey, SlotBean, SlotBeans } from "@/types/team-builder";

export const MAX_BEAN_POINTS = 198;
export const BEAN_SLOTS_COUNT = 3;

export const BEAN_COLORS: Record<BaseAttributeKey, string> = {
	physical: "#1e3a8a", // Dark Blue (Toughness)
	kick: "#dc2626", // Red (Kick Strength)
	control: "#ec4899", // Pink (Acuity)
	pressure: "#16a34a", // Green (Steadfast)
	intelligence: "#0ea5e9", // Light Blue (Intellect)
	technique: "#eab308", // Yellow (Finesse)
	agility: "#f97316", // Orange (Velocity)
};

export function clampBeanValue(value: number): number {
	if (!Number.isFinite(value)) {
		return 0;
	}
	const rounded = Math.round(value);
	return Math.min(MAX_BEAN_POINTS, Math.max(0, rounded));
}

export function createEmptySlotBeans(): SlotBeans {
	return Array.from({ length: BEAN_SLOTS_COUNT }, () => ({
		attribute: null,
		value: 80,
	})) as SlotBeans;
}

export function normalizeSlotBeans(beans?: SlotBean[] | null): SlotBeans {
	const base = createEmptySlotBeans();
	if (!beans?.length) {
		return base;
	}
	return base.map((bean, index) => {
		const source = beans[index];
		if (!source) return bean;
		return {
			attribute: (source.attribute as BaseAttributeKey | null) ?? null,
			value: clampBeanValue(source.value ?? 0),
		};
	}) as SlotBeans;
}
