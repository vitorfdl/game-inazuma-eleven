import { atomWithStorage, createJSONStorage } from "jotai/utils";

export type EquipmentViewMode = "stats" | "power";
export type EquipmentSortDirection = "asc" | "desc";
export type EquipmentSortKey =
	| "kick"
	| "control"
	| "technique"
	| "pressure"
	| "physical"
	| "agility"
	| "intelligence"
	| "total"
	| "shootAT"
	| "focusAT"
	| "focusDF"
	| "wallDF"
	| "scrambleAT"
	| "scrambleDF"
	| "kp";

export type EquipmentTableSortKey = EquipmentSortKey | "name" | "type" | "shop";

export type EquipmentsPreferences = {
	search: string;
	type: "all" | "boots" | "bracelets" | "pendants" | "misc";
	shop: string;
	attribute: "any" | "kick" | "control" | "technique" | "pressure" | "physical" | "agility" | "intelligence";
	viewMode: EquipmentViewMode;
	sortKey: EquipmentTableSortKey;
	sortDirection: EquipmentSortDirection;
};

export const EQUIPMENTS_PREFERENCES_KEY = "inazuma-guide.equipments.v2";

export const DEFAULT_EQUIPMENTS_PREFERENCES: EquipmentsPreferences = {
	search: "",
	type: "all",
	shop: "all",
	attribute: "any",
	viewMode: "stats",
	sortKey: "total",
	sortDirection: "desc",
};

const storage = typeof window === "undefined" ? undefined : createJSONStorage<EquipmentsPreferences>(() => window.sessionStorage);

export const equipmentsPreferencesAtom = atomWithStorage<EquipmentsPreferences>(EQUIPMENTS_PREFERENCES_KEY, DEFAULT_EQUIPMENTS_PREFERENCES, storage);
