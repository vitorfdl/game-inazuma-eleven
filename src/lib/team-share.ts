import { gunzipSync, gzipSync, strFromU8, strToU8 } from "fflate";

import { FORMATIONS, formationsMap } from "@/data/formations";
import type {
	DisplayMode,
	TeamBuilderAssignments,
	TeamBuilderSlotConfigs,
	TeamBuilderState,
} from "@/store/team-builder";
import { normalizeSlotConfig } from "@/store/team-builder";
import type { SlotConfig } from "@/types/team-builder";

const SHARE_VERSION = 1;
const FALLBACK_FORMATION_ID = FORMATIONS[0]?.id ?? "433-delta";
const FALLBACK_DISPLAY_MODE: DisplayMode = "nickname";
const DISPLAY_MODE_VALUES: DisplayMode[] = [
	"nickname",
	"shootAT",
	"focusAT",
	"focusDF",
	"wallDF",
	"scrambleAT",
	"scrambleDF",
	"kp",
];

export const TEAM_SHARE_QUERY_KEY = "team";

type SharePayload = {
	v: number;
	state: TeamBuilderState;
};

export function encodeTeamShareState(state: TeamBuilderState): string | null {
	try {
		const prepared = sanitizeTeamState(state);
		const payload: SharePayload = {
			v: SHARE_VERSION,
			state: prepared,
		};
		const json = JSON.stringify(payload);
		const compressed = gzipSync(strToU8(json), { level: 6 });
		return toBase64Url(compressed);
	} catch (error) {
		console.error("Failed to encode team share payload", error);
		return null;
	}
}

export function decodeTeamShareState(payload: string): TeamBuilderState | null {
	try {
		const bytes = fromBase64Url(payload);
		if (!bytes) return null;
		const decompressed = gunzipSync(bytes);
		const json = strFromU8(decompressed);
		const parsed: SharePayload = JSON.parse(json);
		if (typeof parsed?.v !== "number" || !parsed.state) {
			return null;
		}
		if (parsed.v > SHARE_VERSION) {
			return null;
		}
		return sanitizeTeamState(parsed.state);
	} catch (error) {
		console.error("Failed to decode team share payload", error);
		return null;
	}
}

function sanitizeTeamState(
	input?: Partial<TeamBuilderState> | null,
): TeamBuilderState {
	const formationId =
		input?.formationId && formationsMap.has(input.formationId)
			? input.formationId
			: FALLBACK_FORMATION_ID;
	const displayMode = DISPLAY_MODE_VALUES.includes(
		(input?.displayMode as DisplayMode) ?? FALLBACK_DISPLAY_MODE,
	)
		? ((input?.displayMode as DisplayMode) ?? FALLBACK_DISPLAY_MODE)
		: FALLBACK_DISPLAY_MODE;

	return {
		formationId,
		displayMode,
		assignments: sanitizeAssignments(input?.assignments),
		slotConfigs: sanitizeSlotConfigs(input?.slotConfigs),
	};
}

function sanitizeAssignments(value: unknown): TeamBuilderAssignments {
	if (!value || typeof value !== "object") {
		return {};
	}

	const entries = Object.entries(value as Record<string, unknown>);
	const result: TeamBuilderAssignments = {};

	entries.forEach(([slotId, playerId]) => {
		if (typeof playerId === "number" && Number.isInteger(playerId)) {
			result[slotId] = playerId;
		}
	});

	return result;
}

function sanitizeSlotConfigs(value: unknown): TeamBuilderSlotConfigs {
	if (!value || typeof value !== "object") {
		return {};
	}

	const entries = Object.entries(
		value as Record<string, SlotConfig | null | undefined>,
	);
	const result: TeamBuilderSlotConfigs = {};

	entries.forEach(([slotId, config]) => {
		if (!config || typeof config !== "object") {
			return;
		}
		result[slotId] = normalizeSlotConfig(config);
	});

	return result;
}

function toBase64Url(bytes: Uint8Array): string {
	let binary = "";
	bytes.forEach((byte) => {
		binary += String.fromCharCode(byte);
	});
	const encoder =
		typeof globalThis.btoa === "function" ? globalThis.btoa : null;
	if (!encoder) {
		throw new Error("Base64 encoding is not supported in this environment");
	}
	const base64 = encoder(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
	return base64;
}

function fromBase64Url(value: string): Uint8Array | null {
	try {
		const decoder =
			typeof globalThis.atob === "function" ? globalThis.atob : null;
		if (!decoder) {
			throw new Error("Base64 decoding is not supported in this environment");
		}
		const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
		const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
		const binary = decoder(padded);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i += 1) {
			bytes[i] = binary.charCodeAt(i);
		}
		return bytes;
	} catch (error) {
		console.error("Failed to decode base64 share payload", error);
		return null;
	}
}
