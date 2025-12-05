import fs from "node:fs";
import path from "node:path";

type PlayerRecord = {
	Name: string;
	Affinity?: string;
	[key: string]: unknown;
};

type AffinityRecord = {
	name: string;
	affinity: string;
};

function readJsonFile<T>(filePath: string): T {
	const absolutePath = path.resolve(process.cwd(), filePath);
	const contents = fs.readFileSync(absolutePath, "utf8");
	return JSON.parse(contents) as T;
}

function writeJsonFile<T>(filePath: string, data: T): void {
	const absolutePath = path.resolve(process.cwd(), filePath);
	fs.writeFileSync(absolutePath, JSON.stringify(data, null, 2));
}

function normalizeName(value: string): string {
	return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function buildAffinityBuckets(records: AffinityRecord[]): Map<string, string[]> {
	const buckets = new Map<string, string[]>();

	records.forEach((entry) => {
		const key = normalizeName(entry.name);
		if (!key) return;
		const value = entry.affinity?.trim();
		if (!value) return;

		const list = buckets.get(key) ?? [];
		list.push(value);
		buckets.set(key, list);
	});

	return buckets;
}

function main(): void {
	const playersPath = "src/assets/data/players.json";
	const affinityPath = "src/data-scrapper/dumps/player-affinity.json";

	const players = readJsonFile<PlayerRecord[]>(playersPath);
	const affinityDump = readJsonFile<AffinityRecord[]>(affinityPath);

	const affinityBuckets = buildAffinityBuckets(affinityDump);
	const usageByName = new Map<string, number>();

	let updated = 0;
	const missing: string[] = [];

	const nextPlayers = players.map((player) => {
		const key = normalizeName(player.Name);
		const bucket = affinityBuckets.get(key);

		if (!bucket || bucket.length === 0) {
			missing.push(player.Name);
			return player;
		}

		const usageIndex = usageByName.get(key) ?? 0;
		const affinity = bucket[usageIndex];

		usageByName.set(key, usageIndex + 1);

		if (!affinity) {
			missing.push(`${player.Name} (index ${usageIndex + 1})`);
			return player;
		}

		if (player.Affinity === affinity) {
			return player;
		}

		updated += 1;
		return {
			...player,
			Affinity: affinity,
		};
	});

	writeJsonFile(playersPath, nextPlayers);

	console.log(`Updated affinity for ${updated} players.`);
	if (missing.length > 0) {
		console.warn(`Missing affinity for ${missing.length} players.`);
	}
}

main();
