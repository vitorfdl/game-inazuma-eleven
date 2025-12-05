type PassiveBadgeVisual = {
	background: string;
	borderColor: string;
	textColor: string;
	shadow: string;
};

type PassiveBadgeVariant = "build" | "number";

type PassiveBadgeProps = {
	label: string;
	variant?: PassiveBadgeVariant;
	buildType?: string | null;
};

type PassiveBuildTypeKey = "roughplay" | "bond" | "justice" | "tension" | "counter" | "breach" | "general" | "unknown";

const PASSIVE_BUILD_BADGE_COLORS: Record<PassiveBuildTypeKey, { from: string; to: string; border: string; shadow: string }> = {
	roughplay: { from: "#7c2d12", to: "#ea580c", border: "#451a03", shadow: "0 3px 0 rgba(69,26,3,0.65)" },
	bond: { from: "#064e3b", to: "#059669", border: "#022c22", shadow: "0 3px 0 rgba(2,44,34,0.6)" },
	justice: { from: "#0f172a", to: "#1d4ed8", border: "#0b1220", shadow: "0 3px 0 rgba(11,18,32,0.65)" },
	tension: { from: "#581c87", to: "#a21caf", border: "#3b0764", shadow: "0 3px 0 rgba(59,7,100,0.6)" },
	counter: { from: "#312e81", to: "#4338ca", border: "#1e1b4b", shadow: "0 3px 0 rgba(30,27,75,0.6)" },
	breach: { from: "#713f12", to: "#b45309", border: "#422006", shadow: "0 3px 0 rgba(66,32,6,0.6)" },
	general: { from: "#0f172a", to: "#334155", border: "rgba(15,23,42,0.7)", shadow: "0 3px 0 rgba(15,23,42,0.65)" },
	unknown: { from: "#52525b", to: "#71717a", border: "#3f3f46", shadow: "0 3px 0 rgba(63,63,70,0.6)" },
};

const PASSIVE_BUILD_LABELS: Record<PassiveBuildTypeKey, string> = {
	roughplay: "Rough Play",
	bond: "Bond",
	justice: "Justice",
	tension: "Tension",
	counter: "Counter",
	breach: "Breach",
	general: "General",
	unknown: "Unknown",
};

const PASSIVE_NUMBER_BADGE_VISUAL: PassiveBadgeVisual = {
	background: "linear-gradient(135deg, #0f172a, #1e293b)",
	borderColor: "rgba(255,255,255,0.35)",
	textColor: "#f8fafc",
	shadow: "0 3px 0 rgba(15,23,42,0.65)",
};

export function PassiveBadge({ label, variant = "build", buildType }: PassiveBadgeProps) {
	const visual = variant === "number" ? PASSIVE_NUMBER_BADGE_VISUAL : getPassiveBuildBadgeVisual(buildType);

	return (
		<span
			className="inline-flex min-w-[38px] items-center justify-center rounded-[5px] border-[1.5px] px-2 py-[1px] text-[9px] font-semibold uppercase tracking-[0.15em]"
			style={{
				background: visual.background,
				borderColor: visual.borderColor,
				color: visual.textColor,
				boxShadow: visual.shadow,
			}}
		>
			{label}
		</span>
	);
}

export function getPassiveBuildBadgeVisual(buildType?: string | null, fallback: PassiveBuildTypeKey = "general"): PassiveBadgeVisual {
	const palette = PASSIVE_BUILD_BADGE_COLORS[normalizeBuildType(buildType, fallback)];
	return {
		background: `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
		borderColor: palette.border,
		textColor: "#ffffff",
		shadow: palette.shadow,
	};
}

export function getPassiveNumberBadgeVisual() {
	return PASSIVE_NUMBER_BADGE_VISUAL;
}

export function getPassiveBuildLabel(buildType?: string | null, fallback: PassiveBuildTypeKey = "general"): string {
	return PASSIVE_BUILD_LABELS[normalizeBuildType(buildType, fallback)];
}

function normalizeBuildType(value?: string | null, fallback: PassiveBuildTypeKey = "general"): PassiveBuildTypeKey {
	if (!value) {
		return fallback;
	}

	const simplified = value.replace(/[\s_-]/g, "").toLowerCase() as PassiveBuildTypeKey;
	return simplified in PASSIVE_BUILD_BADGE_COLORS ? simplified : fallback;
}

export type { PassiveBadgeProps, PassiveBadgeVariant, PassiveBadgeVisual };
