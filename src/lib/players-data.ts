import jpNamesJson from "@/assets/data/jp_names.json?raw";
import playersJson from "@/assets/data/players.json?raw";
import { normalizeStat, sanitizeAttribute } from "@/lib/data-helpers";
import type { ElementType, TeamPosition } from "@/lib/icon-picker";
import { type BaseStats, computePower, type PowerStats } from "@/lib/inazuma-math";
import type { PlayerNamePreference } from "@/store/name-preference";

export type RawPlayerRecord = {
	id: number;
	Image: string;
	Name: string;
	Nickname: string;
	Game: string;
	Position: string;
	Element: string;
	Kick: number;
	Control: number;
	Technique: number;
	Pressure: number;
	Physical: number;
	Agility: number;
	Intelligence: number;
	Total: number;
	"Age group": string;
	Year: string;
	Gender: string;
	Role: string;
	HowToObtainMarkdown?: string;
	InazugleLink?: string;
	Affinity?: string;
};

const PLAYER_IMAGE_PROXY_ENDPOINT = "https://images.weserv.nl/?url=";
type PassiveBuildTypeKey = "roughplay" | "bond" | "justice" | "tension" | "counter" | "breach" | "unknown";

export type PlayerRecord = {
	id: number;
	image: string;
	safeImage: string;
	name: string;
	nickname: string;
	game: string;
	position: string;
	element: string;
	role: string;
	ageGroup: string;
	year: string;
	gender: string;
	howToObtainMarkdown: string;
	inazugleLink: string;
	stats: BaseStats;
	power: PowerStats;
	affinity: PassiveBuildTypeKey;
};

type PlayerBaseStatKey = Exclude<keyof BaseStats, "total">;

const playerBaseStatKeys: PlayerBaseStatKey[] = ["kick", "control", "technique", "pressure", "physical", "agility", "intelligence"];

const rawPlayers = JSON.parse(playersJson).filter((record: RawPlayerRecord) => record.Name !== "???") as RawPlayerRecord[];

export const playersDataset: PlayerRecord[] = rawPlayers.map((player) => {
	const baseStats: Record<PlayerBaseStatKey, number> = {
		kick: normalizeStat(player.Kick),
		control: normalizeStat(player.Control),
		technique: normalizeStat(player.Technique),
		pressure: normalizeStat(player.Pressure),
		physical: normalizeStat(player.Physical),
		agility: normalizeStat(player.Agility),
		intelligence: normalizeStat(player.Intelligence),
	};
	const stats: BaseStats = {
		...baseStats,
		total: playerBaseStatKeys.reduce((sum, key) => sum + baseStats[key], 0),
	};

	return {
		id: player.id,
		image: player.Image,
		safeImage: getSafePlayerImageUrl(player.Image),
		name: sanitizeAttribute(player.Name),
		nickname: sanitizeAttribute(player.Nickname),
		game: sanitizeAttribute(player.Game),
		position: sanitizeAttribute(player.Position),
		element: sanitizeAttribute(player.Element),
		role: sanitizeAttribute(player.Role),
		ageGroup: sanitizeAttribute(player["Age group"]),
		year: sanitizeAttribute(player.Year),
		gender: sanitizeAttribute(player.Gender),
		affinity: normalizeBuildType(player.Affinity),
		howToObtainMarkdown: typeof player.HowToObtainMarkdown === "string" ? player.HowToObtainMarkdown.trim() : "",
		inazugleLink: typeof player.InazugleLink === "string" ? player.InazugleLink.trim() : "",
		stats,
		power: computePower(stats),
	};
});

export const playersById = new Map<number, PlayerRecord>(playersDataset.map((player) => [player.id, player]));

type JpNameRecord = {
	dub_name: string;
	roma_name: string;
};

type RomajiNameOverride = {
	name: string;
	nickname: string;
};

const romajiNameOverrides = createRomajiNameOverrides();

const romajiPlayersDataset: PlayerRecord[] = playersDataset.map((player) => {
	if (!player.name || player.name === "Unknown") {
		return player;
	}
	const override = romajiNameOverrides.get(player.name.toLowerCase());
	if (!override) {
		return player;
	}
	return {
		...player,
		name: override.name,
		nickname: override.nickname,
	};
});

const romajiPlayersById = new Map<number, PlayerRecord>(romajiPlayersDataset.map((player) => [player.id, player]));

const playersDatasetByPreference: Record<PlayerNamePreference, PlayerRecord[]> = {
	dub: playersDataset,
	romaji: romajiPlayersDataset,
};

const playersByIdByPreference: Record<PlayerNamePreference, Map<number, PlayerRecord>> = {
	dub: playersById,
	romaji: romajiPlayersById,
};

export function getPlayersDataset(preference: PlayerNamePreference = "dub"): PlayerRecord[] {
	return playersDatasetByPreference[preference] ?? playersDataset;
}

export function getPlayersById(preference: PlayerNamePreference = "dub"): Map<number, PlayerRecord> {
	return playersByIdByPreference[preference] ?? playersById;
}

function normalizeBuildType(value?: string | null): PassiveBuildTypeKey {
	if (!value || typeof value !== "string" || value === "unknown") {
		return "unknown";
	}
	return value.toLowerCase().trim() as PassiveBuildTypeKey;
}

export function mapToElementType(element: string): ElementType {
	const normalized = element.trim().toLowerCase();
	switch (normalized) {
		case "fire":
			return "Fire";
		case "wind":
			return "Wind";
		case "mountain":
			return "Mountain";
		case "void":
			return "Void";
		case "forest":
		default:
			return "Forest";
	}
}

function createRomajiNameOverrides(): Map<string, RomajiNameOverride> {
	try {
		const parsed = JSON.parse(jpNamesJson) as JpNameRecord[];
		const overrides = new Map<string, RomajiNameOverride>();
		parsed.forEach((record) => {
			const dubName = sanitizeAttribute(record.dub_name);
			const romajiName = sanitizeAttribute(record.roma_name);
			if (!dubName || !romajiName || dubName === "Unknown" || romajiName === "Unknown") {
				return;
			}
			const key = dubName.toLowerCase();
			if (overrides.has(key)) {
				return;
			}
			overrides.set(key, {
				name: romajiName,
				nickname: extractRomajiLastName(romajiName),
			});
		});
		return overrides;
	} catch (error) {
		console.error("Failed to parse romaji names dataset", error);
		return new Map();
	}
}

function extractRomajiLastName(value: string): string {
	const trimmed = value.trim();
	if (!trimmed) {
		return value;
	}
	const parts = trimmed.split(/\s+/);
	return parts[parts.length - 1] ?? trimmed;
}

export function mapToTeamPosition(position: string): TeamPosition {
	const normalized = position.trim().toUpperCase();
	if (normalized.startsWith("RESERVE")) {
		return "RESERVE";
	}
	if (normalized === "MANAGER") {
		return "MANAGER";
	}
	if (normalized.startsWith("COORDINATOR")) {
		return "COORDINATOR";
	}
	const map: Record<string, TeamPosition> = {
		GK: "GK",
		DF: "DF",
		FW: "FW",
		MF: "MD",
		MD: "MD",
	};
	return map[normalized] ?? "MD";
}

export function getSafePlayerImageUrl(imageUrl: string | null | undefined) {
	if (!imageUrl || typeof imageUrl !== "string") {
		return "";
	}
	if (imageUrl.startsWith(PLAYER_IMAGE_PROXY_ENDPOINT)) {
		return imageUrl;
	}
	try {
		const parsed = new URL(imageUrl);
		const hasSupportedProtocol = parsed.protocol === "https:" || parsed.protocol === "http:";
		if (!hasSupportedProtocol) {
			return imageUrl;
		}
		return `${PLAYER_IMAGE_PROXY_ENDPOINT}${encodeURIComponent(parsed.toString())}`;
	} catch {
		return imageUrl;
	}
}
