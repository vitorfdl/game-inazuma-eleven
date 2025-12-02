// Generates a jp_names.json asset by pairing dub, romaji, and JP names
// dumped from the game files.
//
// Usage (from project root):
//   npx tsx src/data-scrapper/jp-names.ts
import fs from "node:fs";
import path from "node:path";

type DumpValue = {
	Type: number;
	Value: string | number | null;
};

type DumpEntry = {
	Name: string;
	Values: DumpValue[];
};

type NameTriple = {
	dub_name: string;
	roma_name: string;
	jp_name: string;
};

const DUMPS_DIR = path.resolve(process.cwd(), "dumps");
const OUTPUT_PATH = path.resolve(
	process.cwd(),
	"src",
	"assets",
	"data",
	"jp_names.json",
);

function readDumpEntries(fileName: string): DumpEntry[] {
	const targetPath = path.join(DUMPS_DIR, fileName);
	const raw = fs.readFileSync(targetPath, "utf8");
	return JSON.parse(raw) as DumpEntry[];
}

function extractNames(entries: DumpEntry[]): string[] {
	return entries
		.filter((entry) => entry.Name === "NOUN_INFO")
		.map((entry) => {
			const nameValue = entry.Values?.find(
				(item) => typeof item.Value === "string" && item.Value.trim() !== "",
			);
			return typeof nameValue?.Value === "string" ? nameValue.Value : null;
		})
		.filter((name): name is string => Boolean(name));
}

function ensureDir(filePath: string): void {
	const dir = path.dirname(filePath);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

function zipNames(
	dubNames: string[],
	romaNames: string[],
	jpNames: string[],
): NameTriple[] {
	const maxLength = Math.max(dubNames.length, romaNames.length, jpNames.length);
	const triples: NameTriple[] = [];

	for (let index = 0; index < maxLength; index += 1) {
		const dubName = dubNames[index];
		const romaName = romaNames[index];
		const jpName = jpNames[index];

		if (!dubName || !romaName || !jpName) {
			continue;
		}

		triples.push({
			dub_name: dubName,
			roma_name: romaName,
			jp_name: jpName,
		});
	}

	return triples;
}

function main(): void {
	try {
		const dubEntries = readDumpEntries("chara_text_dub.json");
		const romaEntries = readDumpEntries("chara_text_roma.json");
		const japEntries = readDumpEntries("chara_text_japanese.json");

		const dubNames = extractNames(dubEntries);
		const romaNames = extractNames(romaEntries);
		const jpNames = extractNames(japEntries);

		const triples = zipNames(dubNames, romaNames, jpNames);

		ensureDir(OUTPUT_PATH);
		fs.writeFileSync(OUTPUT_PATH, JSON.stringify(triples, null, 2), "utf8");

		console.log(
			`Created ${triples.length} entries at ${OUTPUT_PATH.replace(process.cwd(), ".")}`,
		);
	} catch (error) {
		console.error("Failed to build jp_names.json:", error);
		process.exitCode = 1;
	}
}

main();
