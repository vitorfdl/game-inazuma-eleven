import playersJson from "@/assets/data/players.json?raw";
import { normalizeStat, sanitizeAttribute } from "@/lib/data-helpers";
import type { ElementType, TeamPosition } from "@/lib/icon-picker";
import {
	type BaseStats,
	computePower,
	type PowerStats,
} from "@/lib/inazuma-math";

export type RawPlayerRecord = {
	Nº: number;
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
};

export type PlayerRecord = {
	id: number;
	image: string;
	name: string;
	nickname: string;
	game: string;
	position: string;
	element: string;
	role: string;
	ageGroup: string;
	year: string;
	gender: string;
	stats: BaseStats;
	power: PowerStats;
};

type PlayerBaseStatKey = Exclude<keyof BaseStats, "total">;

const playerBaseStatKeys: PlayerBaseStatKey[] = [
	"kick",
	"control",
	"technique",
	"pressure",
	"physical",
	"agility",
	"intelligence",
];

const rawPlayers = JSON.parse(playersJson).filter(
	(record: RawPlayerRecord) => record.Name !== "???",
) as RawPlayerRecord[];

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
		id: player["Nº"],
		image: player.Image,
		name: sanitizeAttribute(player.Name),
		nickname: sanitizeAttribute(player.Nickname),
		game: sanitizeAttribute(player.Game),
		position: sanitizeAttribute(player.Position),
		element: sanitizeAttribute(player.Element),
		role: sanitizeAttribute(player.Role),
		ageGroup: sanitizeAttribute(player["Age group"]),
		year: sanitizeAttribute(player.Year),
		gender: sanitizeAttribute(player.Gender),
		stats,
		power: computePower(stats),
	};
});

export const playersById = new Map<number, PlayerRecord>(
	playersDataset.map((player) => [player.id, player]),
);

export function mapToElementType(element: string): ElementType {
	const normalized = element.trim().toLowerCase();
	switch (normalized) {
		case "fire":
			return "Fire";
		case "wind":
			return "Wind";
		case "mountain":
			return "Mountain";
		case "forest":
		default:
			return "Forest";
	}
}

export function mapToTeamPosition(position: string): TeamPosition {
	const normalized = position.trim().toUpperCase();
	const map: Record<string, TeamPosition> = {
		GK: "GK",
		DF: "DF",
		FW: "FW",
		MF: "MD",
		MD: "MD",
	};
	return map[normalized] ?? "MD";
}
