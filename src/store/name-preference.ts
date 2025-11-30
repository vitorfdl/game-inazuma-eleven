import { atomWithStorage, createJSONStorage } from "jotai/utils";

export type PlayerNamePreference = "dub" | "romaji";

const PLAYER_NAME_PREFERENCE_KEY = "inazuma-guide.player-names.v1";

const storage =
	typeof window === "undefined"
		? undefined
		: createJSONStorage<PlayerNamePreference>(() => window.localStorage);

export const playerNamePreferenceAtom = atomWithStorage<PlayerNamePreference>(
	PLAYER_NAME_PREFERENCE_KEY,
	"dub",
	storage,
);
