// Scrapes all player data from the Inazugle character parameter page
// and saves the result to the local players.json asset file.
//
// Usage (from project root, after compiling or with a TS runner):
//   npx tsx src/data-scrapper/players.ts
import fs from "node:fs";
import path from "node:path";
import { type Cheerio, type CheerioAPI, load } from "cheerio";

const BASE_URL = "https://zukan.inazuma.jp";

const STAT_KEYS = ["Kick", "Control", "Technique", "Pressure", "Physical", "Agility", "Intelligence"] as const;

type StatKey = (typeof STAT_KEYS)[number];

type PlayerRecord = {
	id: number;
	Image: string;
	InazugleLink: string;
	Description: string;
	HowToObtainMarkdown: string;
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

type PlayerRecordWithoutIndex = Omit<PlayerRecord, "Nº">;

type HowToObtainEntry = {
	title?: string;
	items: string[];
};

type HowToObtainSection = {
	title: string;
	entries: HowToObtainEntry[];
};

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

function extractBasicInfo($: CheerioAPI, $item: Cheerio<any>): Record<string, string> {
	const info: Record<string, string> = {};
	$item.find("li").each((_, li) => {
		const $li = $(li);
		const label = cleanText($li.find("dt").text());
		const value = cleanText($li.find("dd").text());
		if (label) info[label] = value;
	});
	return info;
}

function extractStats($: CheerioAPI, $player: Cheerio<any>): Record<StatKey, number> {
	const stats: Record<StatKey, number> = Object.fromEntries(STAT_KEYS.map((key) => [key, 0])) as Record<StatKey, number>;

	$player.find("ul.param > li dl").each((_, dl) => {
		const $dl = $(dl);
		const label = cleanText($dl.find("dt").text());
		if (!isStatKey(label)) return;

		const valueText = cleanText($dl.find("td").first().text());
		stats[label] = parseNumeric(valueText);
	});

	return stats;
}

function extractListItems($: CheerioAPI, $root: Cheerio<any>): string[] {
	const items: string[] = [];
	$root.find("li").each((_, li) => {
		const text = cleanText($(li).text());
		if (text) {
			items.push(text);
		}
	});
	return items;
}

function extractParagraphItems(_$: CheerioAPI, $root: Cheerio<any>): string[] {
	const clone = $root.clone();
	clone.find("ul,ol").remove();
	const text = cleanText(clone.text());
	if (!text) return [];
	return text
		.split(/[\r\n]+/)
		.map((line) => cleanText(line))
		.filter(Boolean);
}

function extractHowToObtainEntries($: CheerioAPI, $section: Cheerio<any>): HowToObtainEntry[] {
	const entries: HowToObtainEntry[] = [];
	const $dds = $section.children("dd");

	if ($dds.length === 0) {
		const items = extractListItems($, $section);
		if (items.length > 0) {
			entries.push({ items });
		}
		return entries;
	}

	$dds.each((_, dd) => {
		const $dd = $(dd);
		const title = cleanText($dd.children("p").first().text());
		const items = extractListItems($, $dd);
		const fallbackItems = items.length > 0 ? [] : extractParagraphItems($, $dd);
		const collected = items.length > 0 ? items : fallbackItems;
		if (collected.length === 0 && !title) {
			return;
		}
		entries.push({
			title: title || undefined,
			items: collected,
		});
	});

	return entries;
}

function formatHowToObtainSection(section: HowToObtainSection): string {
	const lines: string[] = [];
	if (section.title) {
		lines.push(`### ${section.title}`);
	}

	section.entries.forEach((entry, index) => {
		if (entry.title) {
			lines.push(`#### ${entry.title}`);
		}
		entry.items.forEach((item) => {
			lines.push(`- ${item}`);
		});
		if (index < section.entries.length - 1) {
			lines.push("");
		}
	});

	return lines.join("\n").trim();
}

function extractHowToObtainMarkdown($: CheerioAPI, $player: Cheerio<any>): string {
	const $howToObtain = $player.find("dl.getTxt");
	if ($howToObtain.length === 0) return "";

	const $sections = $howToObtain.find("> dd.question > dl");
	if ($sections.length === 0) return "";

	const sections: string[] = [];
	$sections.each((_, dl) => {
		const $section = $(dl);
		const title = cleanText($section.children("dt").first().text());
		const entries = extractHowToObtainEntries($, $section);
		if (!entries.length) {
			return;
		}
		const formatted = formatHowToObtainSection({
			title,
			entries,
		});
		if (formatted) {
			sections.push(formatted);
		}
	});

	return sections.join("\n\n").trim();
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

		const nickname = cleanRubyText($player.find(".lBox .name span.nickname").first());
		const image = $player.find("figure img").attr("src") ?? "";
		const game = cleanText($player.find("dl.appearedWorks dd").first().text());
		const description = extractDescription($player.find("p.description").first());
		const position = cleanText($player.find("ul.param > li").first().find("dl").first().find("dd").text());
		const elementType = cleanText($player.find("ul.param > li").first().find("dl.box dd").first().text());
		const howToObtainMarkdown = extractHowToObtainMarkdown($, $player);
		const stats = extractStats($, $player);
		const total = STAT_KEYS.reduce((sum, key) => sum + stats[key], 0);
		const basicInfo = extractBasicInfo($, $player.find("ul.basic"));
		const viewerHref = $player.find("a.verLink").attr("href") ?? "";
		const inazugleLink = viewerHref ? new URL(viewerHref, BASE_URL).toString() : "";

		players.push({
			id: players.length + 1,
			Image: image,
			InazugleLink: inazugleLink,
			Description: description,
			HowToObtainMarkdown: howToObtainMarkdown,
			Name: name,
			Nickname: nickname,
			Game: game,
			Position: position,
			Element: elementType,
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
		...player,
		id: index + 1,
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

		const outPath = path.resolve(process.cwd(), "src", "assets", "data", "players.json");

		ensureDir(outPath);
		fs.writeFileSync(outPath, JSON.stringify(players, null, 2), "utf8");
		console.log(`Done. Saved to ${outPath}`);
	} catch (err) {
		console.error("Error while scraping players:", err);
		process.exitCode = 1;
	}
}

main();
