import type { LucideIcon } from "lucide-react";
import { BrickWall, CircleSlash2, Dribbble, Flame, Hand, Mountain, Tornado, TreePine } from "lucide-react";

import { withBase } from "@/lib/utils";

export type ElementType = "Forest" | "Wind" | "Fire" | "Mountain" | "Void";
export type MoveType = "Shoot" | "Dribble" | "Wall" | "Keep";
export type TeamPosition = "FW" | "MD" | "DF" | "GK" | "RESERVE" | "MANAGER" | "COORDINATOR";

type IconDefinition = {
	icon?: LucideIcon;
	color: string;
	assetPath?: string;
};

type PositionColor = {
	primary: string;
	secondary?: string;
	gradient?: string;
};

const FALLBACK_ICON: IconDefinition = {
	icon: TreePine,
	color: "#94a3b8",
};

const ELEMENT_ICON_MAP: Record<ElementType, IconDefinition> = {
	Forest: {
		icon: TreePine,
		color: "#22c55e",
	},
	Wind: {
		icon: Tornado,
		color: "#38bdf8",
	},
	Fire: {
		icon: Flame,
		color: "#ef4444",
	},
	Mountain: {
		icon: Mountain,
		color: "#b45309",
	},
	Void: {
		color: "#a21caf", // purple
		icon: CircleSlash2,
	},
};

const MOVE_ICON_MAP: Record<MoveType, IconDefinition> = {
	Shoot: {
		assetPath: "icons/meteor.svg",
		color: "#d42525",
	},
	Dribble: {
		icon: Dribbble,
		color: "#16a34a",
	},
	Wall: {
		icon: BrickWall,
		color: "#0ea5e9",
	},
	Keep: {
		icon: Hand,
		color: "#ffd700",
	},
};

const POSITION_COLOR_MAP: Record<TeamPosition, PositionColor> = {
	FW: {
		primary: "#f43f5e",
		secondary: "#be123c",
		gradient: "linear-gradient(135deg, #fb4c66 0%, #e11d48 50%, #be123c 100%)",
	},
	MD: {
		primary: "#4ade80",
		secondary: "#15803d",
		gradient: "linear-gradient(135deg, #34c665 0%, #22c55e 50%, #15803d 100%)",
	},
	DF: {
		primary: "#60a5fa",
		secondary: "#1d4ed8",
		gradient: "linear-gradient(135deg, #4896e5 0%, #3b82f6 50%, #1d4ed8 100%)",
	},
	GK: {
		primary: "#fbbf24",
		secondary: "#b45309",
		gradient: "linear-gradient(135deg, #eab308 0%, #f59e0b 50%, #b45309 100%)",
	},
	RESERVE: {
		primary: "#fb923c",
		secondary: "#c2410c",
		gradient: "linear-gradient(135deg, #f97316 0%, #fb923c 50%, #c2410c 100%)",
	},
	MANAGER: {
		primary: "#c084fc",
		secondary: "#7e22ce",
		gradient: "linear-gradient(135deg, #c084fc 0%, #7e22ce 100%)",
	},
	COORDINATOR: {
		primary: "#67e8f9",
		secondary: "#0e7490",
		gradient: "linear-gradient(135deg, #22d3ee 0%, #0e7490 100%)",
	},
};

function normalizeIcon(definition: IconDefinition): IconDefinition {
	if (!definition.assetPath) return definition;
	return {
		...definition,
		assetPath: withBase(definition.assetPath),
	};
}

export function getElementIcon(element: ElementType): IconDefinition {
	const definition = ELEMENT_ICON_MAP[element] ?? FALLBACK_ICON;
	return normalizeIcon(definition);
}

export function getMoveIcon(move: MoveType): IconDefinition {
	const definition = MOVE_ICON_MAP[move] ?? FALLBACK_ICON;
	return normalizeIcon(definition);
}

export function getPositionColor(position: TeamPosition): PositionColor {
	return (
		POSITION_COLOR_MAP[position] ?? {
			primary: "#94a3b8",
		}
	);
}
