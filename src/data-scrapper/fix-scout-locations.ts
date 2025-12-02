import fs from "node:fs";
import path from "node:path";

type Player = {
	Name: string;
	HowToObtainMarkdown?: string;
};

type StoryScoutEntry = {
	name: string;
	location: string;
	day: string;
	time: string;
	desired_gift: string;
	gift_location: string;
};

type StoryTeamEntry = {
	name: string;
	location: string;
	day_time: string;
	day: string;
};

type ScoutHint =
	| {
			kind: "gift";
			location: string;
			day?: string;
			time?: string;
			desiredGift: string;
			giftLocation?: string;
	  }
	| {
			kind: "simple";
			location: string;
			day?: string;
			time?: string;
	  };

type HintEntry = {
	key: string;
	sourceName: string;
	hint: ScoutHint;
};

const ROOT_DIR = process.cwd();
const SCOUT_DUMP_PATH = path.resolve(ROOT_DIR, "src", "data-scrapper", "dumps", "story_scout_players.json");
const TEAM_DUMP_PATH = path.resolve(ROOT_DIR, "src", "data-scrapper", "dumps", "story_team_players.json");
const PLAYERS_PATH = path.resolve(ROOT_DIR, "src", "assets", "data", "players.json");
const STORY_MARKDOWN_PATTERN = /### Story Mode\r?\n- Scout/;

function readJsonFile<T>(targetPath: string): T {
	const raw = fs.readFileSync(targetPath, "utf8");
	return JSON.parse(raw) as T;
}

function normalizeName(value: string): string {
	return value
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "");
}

function formatDayTime(day?: string, time?: string): string {
	const normalizedDay = day?.trim();
	const normalizedTime = time?.trim();

	if (normalizedDay && normalizedTime) {
		return `${normalizedDay} (${normalizedTime})`;
	}

	if (normalizedDay) {
		return normalizedDay;
	}

	if (normalizedTime) {
		return normalizedTime;
	}

	return "Anytime";
}

function buildScoutLine(hint: ScoutHint): string {
	const schedule = formatDayTime(hint.day && hint.day.length > 0 ? hint.day : undefined, hint.time && hint.time.length > 0 ? hint.time : undefined);

	if (hint.kind === "gift") {
		const locationPart = `Scout at ${hint.location} on ${schedule}.`;
		const followUpPart = hint.giftLocation
			? `Gift them with a ${hint.desiredGift} which can be bought at ${hint.giftLocation}.`
			: `Gift them with a ${hint.desiredGift} to complete the recruitment.`;
		return `${locationPart} ${followUpPart}`;
	}

	return `Scout at ${hint.location} on ${schedule}. No gift required.`;
}

function buildStorySection(hint: ScoutHint): string {
	return [`### Story Mode`, `- ${buildScoutLine(hint)}`].join("\n");
}

function createScoutHints(): { byKey: Map<string, HintEntry>; entries: HintEntry[] } {
	const scoutEntries = readJsonFile<StoryScoutEntry[]>(SCOUT_DUMP_PATH);
	const teamEntries = readJsonFile<StoryTeamEntry[]>(TEAM_DUMP_PATH);
	const byKey = new Map<string, HintEntry>();
	const entries: HintEntry[] = [];

	function registerHint(name: string, hint: ScoutHint) {
		const key = normalizeName(name);
		if (byKey.has(key)) {
			return;
		}

		const entry: HintEntry = {
			key,
			sourceName: name,
			hint,
		};

		byKey.set(key, entry);
		entries.push(entry);
	}

	scoutEntries.forEach((entry) => {
		registerHint(entry.name, {
			kind: "gift",
			location: entry.location,
			day: entry.day,
			time: entry.time,
			desiredGift: entry.desired_gift,
			giftLocation: entry.gift_location,
		});
	});

	teamEntries.forEach((entry) => {
		registerHint(entry.name, {
			kind: "simple",
			location: entry.location,
			day: entry.day,
			time: entry.day_time,
		});
	});

	return { byKey, entries };
}

function levenshteinDistance(source: string, target: string): number {
	if (source === target) {
		return 0;
	}

	if (source.length === 0) {
		return target.length;
	}

	if (target.length === 0) {
		return source.length;
	}

	const distances: number[] = [];
	for (let column = 0; column <= target.length; column += 1) {
		distances[column] = column;
	}

	for (let row = 1; row <= source.length; row += 1) {
		let previous = row;
		for (let column = 1; column <= target.length; column += 1) {
			const temp = distances[column];
			if (source[row - 1] === target[column - 1]) {
				distances[column] = previous;
			} else {
				distances[column] = Math.min(previous, distances[column - 1], distances[column]) + 1;
			}
			previous = temp;
		}
	}

	return distances[target.length];
}

function findApproximateHint(key: string, entries: HintEntry[]): HintEntry | undefined {
	let bestMatch: HintEntry | undefined;
	let bestDistance = Number.POSITIVE_INFINITY;

	for (const entry of entries) {
		if (entry.key[0] !== key[0]) {
			continue;
		}

		const lengthGap = Math.abs(entry.key.length - key.length);
		if (lengthGap > 2) {
			continue;
		}

		const distance = levenshteinDistance(key, entry.key);
		if (distance < bestDistance) {
			bestDistance = distance;
			bestMatch = entry;
		}
	}

	return bestDistance <= 2 ? bestMatch : undefined;
}

function updatePlayers(): void {
	const players = readJsonFile<Player[]>(PLAYERS_PATH);
	const hints = createScoutHints();
	let updatedCount = 0;
	const missingNames: string[] = [];
	const fuzzyMatches: string[] = [];

	const updatedPlayers = players.map((player) => {
		const normalizedName = normalizeName(player.Name);
		const directHint = hints.byKey.get(normalizedName);
		let hintEntry = directHint;

		if (!hintEntry) {
			const approximate = findApproximateHint(normalizedName, hints.entries);
			if (approximate) {
				hintEntry = approximate;
				fuzzyMatches.push(`${player.Name} -> ${approximate.sourceName}`);
			}
		}

		const hint = hintEntry?.hint;
		if (!hint) {
			return player;
		}

		if (!player.HowToObtainMarkdown) {
			missingNames.push(player.Name);
			return player;
		}

		if (!STORY_MARKDOWN_PATTERN.test(player.HowToObtainMarkdown)) {
			return player;
		}

		const newSection = buildStorySection(hint);
		const nextMarkdown = player.HowToObtainMarkdown.replace(STORY_MARKDOWN_PATTERN, newSection);

		if (nextMarkdown !== player.HowToObtainMarkdown) {
			updatedCount += 1;
			return { ...player, HowToObtainMarkdown: nextMarkdown };
		}

		return player;
	});

	fs.writeFileSync(PLAYERS_PATH, JSON.stringify(updatedPlayers, null, 2));

	console.log(`Updated ${updatedCount} player entries.`);
	if (missingNames.length > 0) {
		console.warn(`Skipped ${missingNames.length} players missing HowToObtainMarkdown: ${missingNames.join(", ")}`);
	}
	if (fuzzyMatches.length > 0) {
		console.warn(`Applied fuzzy matches for: ${fuzzyMatches.join(", ")}`);
	}
}

updatePlayers();
