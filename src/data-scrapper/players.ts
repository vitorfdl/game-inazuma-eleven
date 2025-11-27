// Scrapes all player data from the Inazugle character parameter page
// and saves the result to the local players.json asset file.
//
// Usage (from project root, after compiling or with a TS runner):
//   npx tsx src/data-scrapper/players.ts
import fs from "node:fs";
import path from "node:path";
import { type Cheerio, type CheerioAPI, load } from "cheerio";

const BASE_URL = "https://zukan.inazuma.jp";

const STAT_KEYS = [
	"Kick",
	"Control",
	"Technique",
	"Pressure",
	"Physical",
	"Agility",
	"Intelligence",
] as const;

type StatKey = (typeof STAT_KEYS)[number];

type PlayerRecord = {
	Nº: number;
	Image: string;
	InazugleLink: string;
	Description: string;
	Name: string;
	Nickname: string;
	Game: string;
	Position: string;
	any: string;
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

type PlayerRecordWithoutIndex = Omit<PlayerRecord, "Nº">;

async function fetchHtml(url: string): Promise<string> {
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`Request failed with ${res.status} ${res.statusText}`);
	}
	return await res.text();
}

function cleanText(value: string): string {
	return value.replace(/\s+/g, " ").trim();
}

function cleanRubyText($el: Cheerio<any>): string {
	if ($el.length === 0) return "";
	const cloned = $el.clone();
	cloned.find("rt").remove();
	return cleanText(cloned.text());
}

function isStatKey(label: string): label is StatKey {
	return STAT_KEYS.includes(label as StatKey);
}

function parseNumeric(value: string): number {
	const numeric = Number.parseInt(value.replace(/[^\d-]/g, ""), 10);
	return Number.isFinite(numeric) ? numeric : 0;
}

function extractDescription($description: Cheerio<any>): string {
	if ($description.length === 0) return "";
	const html = $description.html();
	if (!html) return cleanText($description.text());

	const normalizedHtml = html.replace(/<br\s*\/?>/gi, "\n");
	const temp = load(`<div>${normalizedHtml}</div>`);
	const text = temp("div").text();

	return text
		.split("\n")
		.map((line) => cleanText(line))
		.filter(Boolean)
		.join("\n");
}

function extractBasicInfo(
	$: CheerioAPI,
	$item: Cheerio<any>,
): Record<string, string> {
	const info: Record<string, string> = {};
	$item.find("li").each((_, li) => {
		const $li = $(li);
		const label = cleanText($li.find("dt").text());
		const value = cleanText($li.find("dd").text());
		if (label) info[label] = value;
	});
	return info;
}

function extractStats(
	$: CheerioAPI,
	$player: Cheerio<any>,
): Record<StatKey, number> {
	const stats: Record<StatKey, number> = Object.fromEntries(
		STAT_KEYS.map((key) => [key, 0]),
	) as Record<StatKey, number>;

	$player.find("ul.param > li dl").each((_, dl) => {
		const $dl = $(dl);
		const label = cleanText($dl.find("dt").text());
		if (!isStatKey(label)) return;

		const valueText = cleanText($dl.find("td").first().text());
		stats[label] = parseNumeric(valueText);
	});

	return stats;
}

function extractPlayers(html: string): PlayerRecordWithoutIndex[] {
	const $ = load(html);
	const players: PlayerRecordWithoutIndex[] = [];

	$("ul.charaListBox > li").each((_index, node) => {
		const $player = $(node);
		const name = cleanRubyText($player.find(".nameBox span.name").first());

		if (!name) {
			return;
		}

		const nickname = cleanRubyText(
			$player.find(".lBox .name span.nickname").first(),
		);
		const image = $player.find("figure img").attr("src") ?? "";
		const game = cleanText($player.find("dl.appearedWorks dd").first().text());
		const description = extractDescription(
			$player.find("p.description").first(),
		);
		const position = cleanText(
			$player
				.find("ul.param > li")
				.first()
				.find("dl")
				.first()
				.find("dd")
				.text(),
		);
		const anyType = cleanText(
			$player.find("ul.param > li").first().find("dl.box dd").first().text(),
		);
		const stats = extractStats($, $player);
		const total = STAT_KEYS.reduce((sum, key) => sum + stats[key], 0);
		const basicInfo = extractBasicInfo($, $player.find("ul.basic"));
		const viewerHref = $player.find("a.verLink").attr("href") ?? "";
		const inazugleLink = viewerHref
			? new URL(viewerHref, BASE_URL).toString()
			: "";

		players.push({
			Image: image,
			InazugleLink: inazugleLink,
			Description: description,
			Name: name,
			Nickname: nickname,
			Game: game,
			Position: position,
			any: anyType,
			Kick: stats.Kick,
			Control: stats.Control,
			Technique: stats.Technique,
			Pressure: stats.Pressure,
			Physical: stats.Physical,
			Agility: stats.Agility,
			Intelligence: stats.Intelligence,
			Total: total,
			"Age group": basicInfo["Age Group"] ?? "",
			Year: basicInfo["School Year"] ?? "",
			Gender: basicInfo.Gender ?? "",
			Role: basicInfo["Character Role"] ?? "",
		});
	});

	return players;
}

async function fetchAllPlayers(perPage = 1000): Promise<PlayerRecord[]> {
	const aggregated: PlayerRecordWithoutIndex[] = [];
	let page = 1;

	while (true) {
		const pageUrl = `${BASE_URL}/en/chara_param/?page=${page}&per_page=${perPage}`;
		console.log(`Fetching page ${page} (${perPage} per page)...`);
		const html = await fetchHtml(pageUrl);
		const players = extractPlayers(html);

		if (players.length === 0) {
			break;
		}

		aggregated.push(...players);

		if (players.length < perPage) {
			break;
		}

		page += 1;
	}

	return aggregated.map((player, index) => ({
		Nº: index + 1,
		...player,
	}));
}

function ensureDir(filePath: string): void {
	const dir = path.dirname(filePath);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

async function main(): Promise<void> {
	try {
		const players = await fetchAllPlayers();
		console.log(`Found ${players.length} players. Writing JSON file...`);

		const outPath = path.resolve(
			process.cwd(),
			"src",
			"assets",
			"data",
			"players.json",
		);

		ensureDir(outPath);
		fs.writeFileSync(outPath, JSON.stringify(players, null, 2), "utf8");
		console.log(`Done. Saved to ${outPath}`);
	} catch (err) {
		console.error("Error while scraping players:", err);
		process.exitCode = 1;
	}
}

main();
