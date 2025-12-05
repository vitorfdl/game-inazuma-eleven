import { atomWithStorage, createJSONStorage } from "jotai/utils";

export type PlayersViewMode = "stats" | "power";
export type PlayersSortDirection = "asc" | "desc";
export type PlayersSortKey =
	| "total"
	| "kick"
	| "control"
	| "technique"
	| "pressure"
	| "physical"
	| "agility"
	| "intelligence"
	| "shootAT"
	| "focusAT"
	| "focusDF"
	| "wallDF"
	| "scrambleAT"
	| "scrambleDF"
	| "kp";

export type PlayerTableSortKey = PlayersSortKey | "name";

export type PlayersPreferences = {
	search: string;
	element: string;
	gender: string;
	position: string;
	role: string;
	affinity: string;
	favoritesOnly: boolean;
	viewMode: PlayersViewMode;
	sortKey: PlayerTableSortKey;
	sortDirection: PlayersSortDirection;
};

export const PLAYERS_PREFERENCES_KEY = "inazuma-guide.players.v3";

export const DEFAULT_PLAYERS_PREFERENCES: PlayersPreferences = {
	search: "",
	element: "all",
	gender: "all",
	position: "all",
	role: "all",
	affinity: "all",
	favoritesOnly: false,
	viewMode: "stats",
	sortKey: "total",
	sortDirection: "desc",
};

const storage = typeof window === "undefined" ? undefined : createJSONStorage<PlayersPreferences>(() => window.sessionStorage);

export const playersPreferencesAtom = atomWithStorage<PlayersPreferences>(PLAYERS_PREFERENCES_KEY, DEFAULT_PLAYERS_PREFERENCES, storage);
