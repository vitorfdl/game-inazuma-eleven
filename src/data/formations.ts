export type PlayerPositionCode = "FW" | "MF" | "DF" | "GK";

export type FormationSlot = {
	id: string;
	label: PlayerPositionCode;
	column: number; // 1 = Left, 5 = Right
	row: number; // 1 = Attack, 6 = Goalkeeper
	allowedPositions?: PlayerPositionCode[];
};

export type FormationDefinition = {
	id: string;
	name: string;
	summary: string;
	slots: FormationSlot[];
};

const slot = (
	id: string,
	label: PlayerPositionCode,
	column: number,
	row: number,
	allowedPositions?: PlayerPositionCode[],
): FormationSlot => ({
	id,
	label,
	column,
	row,
	allowedPositions: allowedPositions ?? [label],
});

const FORMATION_DATA: FormationDefinition[] = [
	{
		id: "433-delta",
		name: "4-3-3 Delta",
		summary: "Aggressive trident up front with staggered mids supporting.",
		slots: [
			slot("player-1", "FW", 1, 1), // fw-left
			slot("player-2", "FW", 3, 1), // fw-center
			slot("player-3", "FW", 5, 1), // fw-right
			slot("player-4", "MF", 2, 2), // mf-left-half
			slot("player-5", "MF", 4, 2), // mf-right-half
			slot("player-6", "MF", 3, 3), // mf-center
			slot("player-7", "DF", 1, 3), // df-left
			slot("player-8", "DF", 5, 3), // df-right
			slot("player-9", "DF", 2, 4), // df-leftmid
			slot("player-10", "DF", 4, 4), // df-rightmid
			slot("player-11", "GK", 3, 6), // gk
		],
	},
	{
		id: "451-balanced",
		name: "4-5-1 Balanced",
		summary: "Crowded midfield for possession with lone striker.",
		slots: [
			slot("player-1", "FW", 3, 1), // fw-center
			slot("player-2", "MF", 1, 2), // mf-left
			slot("player-3", "MF", 3, 2), // mf-center
			slot("player-4", "MF", 5, 2), // mf-right
			slot("player-5", "MF", 2, 3), // mf-half-left
			slot("player-6", "MF", 4, 3), // mf-half-right
			slot("player-7", "DF", 1, 3), // df-left
			slot("player-8", "DF", 5, 3), // df-right
			slot("player-9", "DF", 2, 4), // df-half-left
			slot("player-10", "DF", 4, 4), // df-half-right
			slot("player-11", "GK", 3, 6), // gk
		],
	},
	{
		id: "541-double-volante",
		name: "5-4-1 Double Volante",
		summary: "Double holding mids shielding a five-back wall.",
		slots: [
			slot("player-1", "FW", 3, 1), // fw-center
			slot("player-2", "MF", 1, 2), // mf-left
			slot("player-3", "MF", 5, 2), // mf-right (was player-4)
			slot("player-4", "MF", 2, 3), // mf-double-1 (was player-5)
			slot("player-5", "MF", 4, 3), // mf-double-2 (was player-6)
			slot("player-6", "DF", 1, 4), // df-left (was player-7)
			slot("player-7", "DF", 5, 4), // df-right (was player-8)
			slot("player-8", "DF", 2, 5), // df-half-left (was player-9)
			slot("player-9", "DF", 3, 5), // df-center (was player-10)
			slot("player-10", "DF", 4, 5), // df-half-right (was player-9 duplicated)
			slot("player-11", "GK", 3, 6), // gk
		],
	},
	{
		id: "361-hexa",
		name: "3-6-1 Hexa",
		summary: "Six mids swarm the center while a trio defends.",
		slots: [
			slot("player-1", "FW", 3, 1), // fw-center
			slot("player-2", "MF", 1, 2), // mf-left
			slot("player-3", "MF", 2, 2), // mf-leftmid
			slot("player-4", "MF", 4, 2), // mf-rightmid (was player-6)
			slot("player-5", "MF", 5, 2), // mf-right (was player-4)
			slot("player-6", "MF", 2, 3), // mf-trail-left
			slot("player-7", "MF", 4, 3), // mf-trail-right (was player-6 duplicated)
			slot("player-8", "DF", 2, 4), // df-left (was player-7)
			slot("player-9", "DF", 3, 4), // df-center (was player-8)
			slot("player-10", "DF", 4, 4), // df-right (was player-9)
			slot("player-11", "GK", 3, 6), // gk
		],
	},
	{
		id: "352-freedom",
		name: "3-5-2 Freedom",
		summary: "Twin forwards with flexible five-player midfield.",
		slots: [
			slot("player-1", "FW", 2, 1), // fw-half-left
			slot("player-2", "FW", 4, 1), // fw-half-right
			slot("player-3", "MF", 1, 2), // mf-left (was player-4)
			slot("player-4", "MF", 3, 2), // mf-center (was player-3)
			slot("player-5", "MF", 5, 2), // mf-right
			slot("player-6", "MF", 2, 3), // mf-half-left
			slot("player-7", "MF", 4, 3), // mf-half-right (was player-6 duplicated)
			slot("player-8", "DF", 2, 4), // df-half-left (was player-7)
			slot("player-9", "DF", 3, 4), // df-center (was player-8)
			slot("player-10", "DF", 4, 4), // df-half-right (was player-9)
			slot("player-11", "GK", 3, 6), // gk
		],
	},
	{
		id: "433-triangle",
		name: "4-3-3 Triangle",
		summary: "Classic front triangle with a compact midfield.",
		slots: [
			slot("player-1", "FW", 1, 1), // fw-left
			slot("player-2", "FW", 3, 1), // fw-center
			slot("player-3", "FW", 5, 1), // fw-right
			slot("player-4", "MF", 3, 2), // mf-advanced
			slot("player-5", "MF", 2, 3), // mf-left
			slot("player-6", "MF", 4, 3), // mf-right
			slot("player-7", "DF", 1, 4), // df-wide-left
			slot("player-8", "DF", 5, 4), // df-wide-right
			slot("player-9", "DF", 2, 5), // df-inner-left
			slot("player-10", "DF", 4, 5), // df-inner-right
			slot("player-11", "GK", 3, 6), // gk
		],
	},
	{
		id: "442-diamond",
		name: "4-4-2 Diamond",
		summary: "Diamond midfield feeding dual forwards.",
		slots: [
			slot("player-1", "FW", 1, 1), // fw-left
			slot("player-2", "MF", 3, 1), // mf-cam
			slot("player-3", "FW", 5, 1), // fw-right
			slot("player-4", "MF", 2, 2), // mf-half-left
			slot("player-5", "MF", 4, 2), // mf-half-right
			slot("player-6", "MF", 3, 3), // mf-dm
			slot("player-7", "DF", 1, 4), // df-left
			slot("player-8", "DF", 5, 4), // df-right
			slot("player-9", "DF", 2, 5), // df-half-left
			slot("player-10", "DF", 4, 5), // df-half-right
			slot("player-11", "GK", 3, 6), // gk
		],
	},
	{
		id: "442-box",
		name: "4-4-2 Box",
		summary: "Box-shaped mids controlling central channels.",
		slots: [
			slot("player-1", "FW", 2, 1), // fw-half-left
			slot("player-2", "FW", 4, 1), // fw-half-right
			slot("player-3", "MF", 1, 2), // mf-left (was player-4)
			slot("player-4", "MF", 5, 2), // mf-right (was player-5)
			slot("player-5", "MF", 2, 3), // mf-half-left (was player-6)
			slot("player-6", "MF", 4, 3), // mf-half-right (was player-7)
			slot("player-7", "DF", 1, 4), // df-left (was player-8)
			slot("player-8", "DF", 5, 4), // df-right (was player-9)
			slot("player-9", "DF", 2, 5), // df-half-left (was player-10)
			slot("player-11", "GK", 3, 6), // gk (was player-11)
			slot("player-10", "DF", 4, 5), // Extra slot for 11th player (if required, else use GK as slot-10)
		].slice(0, 11), // Always 11, ensures consistency
	},
];

export const FORMATIONS = FORMATION_DATA;
export type FormationId = (typeof FORMATIONS)[number]["id"];
export const formationsMap = new Map<string, FormationDefinition>(
	FORMATIONS.map((formation) => [formation.id, formation]),
);
