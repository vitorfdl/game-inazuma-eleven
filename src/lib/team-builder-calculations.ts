import { equipmentsById } from "@/lib/equipments-data";
import { type BaseStats, computePower } from "@/lib/inazuma-math";
import { clonePowerStats, createEmptyPowerStats } from "@/lib/power-utils";
import type { PlayerRecord } from "@/lib/players-data";
import { clampBeanValue } from "@/lib/slot-beans";
import { applyRarityBonus } from "@/lib/slot-rarity";
import type {
	BaseAttributeKey,
	SlotComputedStats,
	SlotConfig,
} from "@/types/team-builder";

export const BASE_ATTRIBUTE_KEYS: BaseAttributeKey[] = [
	"kick",
	"control",
	"technique",
	"pressure",
	"physical",
	"agility",
	"intelligence",
] as const;

export function computeSlotComputedStats(
	player: PlayerRecord,
	config: SlotConfig,
): SlotComputedStats {
	const rarity = config.rarity ?? "normal";

	const baseWithRarity = BASE_ATTRIBUTE_KEYS.reduce(
		(acc, key) => {
			acc[key] = applyRarityBonus(player.stats[key], rarity);
			return acc;
		},
		{} as Record<BaseAttributeKey, number>,
	);

	const equipmentBonuses = BASE_ATTRIBUTE_KEYS.reduce(
		(acc, key) => {
			acc[key] = 0;
			return acc;
		},
		{} as Record<BaseAttributeKey, number>,
	);

	const beanBonuses = BASE_ATTRIBUTE_KEYS.reduce(
		(acc, key) => {
			acc[key] = 0;
			return acc;
		},
		{} as Record<BaseAttributeKey, number>,
	);

	Object.values(config.equipments ?? {}).forEach((equipmentId) => {
		if (!equipmentId) return;
		const equipment = equipmentsById.get(equipmentId);
		if (!equipment) return;
		BASE_ATTRIBUTE_KEYS.forEach((key) => {
			equipmentBonuses[key] += equipment.stats[key];
		});
	});

	(config.beans ?? []).forEach((bean) => {
		if (!bean || !bean.attribute) return;
		beanBonuses[bean.attribute] += clampBeanValue(bean.value ?? 0);
	});

	const finalBase: BaseStats = {
		kick: 0,
		control: 0,
		technique: 0,
		pressure: 0,
		physical: 0,
		agility: 0,
		intelligence: 0,
		total: 0,
	};

	BASE_ATTRIBUTE_KEYS.forEach((key) => {
		finalBase[key] =
			baseWithRarity[key] + equipmentBonuses[key] + beanBonuses[key];
		finalBase.total += finalBase[key];
	});

	const powerStats = computePower(finalBase);

	return {
		base: finalBase,
		power: powerStats,
		finalPower: clonePowerStats(powerStats),
		equipmentBonuses,
		beanBonuses,
		passiveBonuses: createEmptyPowerStats(),
	};
}
