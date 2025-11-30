import { atomWithStorage, createJSONStorage } from "jotai/utils";

export type HissatsuSortDirection = "asc" | "desc";
export type HissatsuSortKey = "order" | "name" | "type" | "element" | "shop" | "power" | "tension";

export type HissatsuPreferences = {
	search: string;
	type: string;
	element: string;
	shop: string;
	extra: string;
	sortKey: HissatsuSortKey;
	sortDirection: HissatsuSortDirection;
};

export const HISSATSU_PREFERENCES_KEY = "inazuma-guide.hissatsu.v1";

export const DEFAULT_HISSATSU_PREFERENCES: HissatsuPreferences = {
	search: "",
	type: "all",
	element: "all",
	shop: "all",
	extra: "all",
	sortKey: "power",
	sortDirection: "desc",
};

const storage = typeof window === "undefined" ? undefined : createJSONStorage<HissatsuPreferences>(() => window.sessionStorage);

export const hissatsuPreferencesAtom = atomWithStorage<HissatsuPreferences>(HISSATSU_PREFERENCES_KEY, DEFAULT_HISSATSU_PREFERENCES, storage);
