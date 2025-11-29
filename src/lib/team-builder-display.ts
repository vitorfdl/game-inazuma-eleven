import type { DisplayMode } from "@/store/team-builder";

export const DISPLAY_MODE_VALUES: DisplayMode[] = [
	"nickname",
	"shootAT",
	"focusAT",
	"focusDF",
	"wallDF",
	"scrambleAT",
	"scrambleDF",
	"kp",
];

export const DISPLAY_MODE_OPTIONS: { value: DisplayMode; label: string }[] = [
	{ value: "nickname", label: "Nickname" },
	{ value: "shootAT", label: "Shoot AT" },
	{ value: "focusAT", label: "Focus AT" },
	{ value: "focusDF", label: "Focus DF" },
	{ value: "wallDF", label: "Wall DF" },
	{ value: "scrambleAT", label: "Scramble AT" },
	{ value: "scrambleDF", label: "Scramble DF" },
	{ value: "kp", label: "KP" },
];
