import { DndContext } from "@dnd-kit/core";
import type { FormationDefinition } from "@/data/formations";
import { FORMATIONS, formationsMap } from "@/data/formations";
import type { DisplayMode } from "@/store/team-builder";
import type { SlotAssignment } from "@/types/team-builder";
import { FormationPitch, ReservesRail } from "./FormationPitch";

type TeamExportSnapshotProps = {
	starterAssignments: SlotAssignment[];
	reserveAssignments: SlotAssignment[];
	staffAssignments: SlotAssignment[];
	displayMode: DisplayMode;
	formationId: FormationDefinition["id"];
	isStackedLayout: boolean;
};

const noop = () => {};

export function TeamExportSnapshot({
	starterAssignments,
	reserveAssignments,
	staffAssignments,
	displayMode,
	formationId,
	isStackedLayout,
}: TeamExportSnapshotProps) {
	const formation = formationsMap.get(formationId) ?? FORMATIONS[0];

	return (
		<DndContext sensors={[]}>
			<div className="rounded-xl border bg-card p-3 shadow-sm">
				<div className="mx-auto flex w-full max-w-5xl flex-col gap-4 lg:flex-row lg:items-start lg:justify-center lg:gap-3">
					<div className="flex-1">
						<FormationPitch
							assignments={starterAssignments}
							staffEntries={staffAssignments}
							activeSlotId={null}
							displayMode={displayMode}
							onSlotSelect={noop}
							onEmptySlotSelect={noop}
							formationId={formation.id}
							onFormationChange={noop}
							isFormationDisabled
							dragDisabled
							isDragActive={false}
						/>
					</div>
					{reserveAssignments.length ? (
						<div className="self-start">
							<ReservesRail
								entries={reserveAssignments}
								displayMode={displayMode}
								activeSlotId={null}
								onSlotSelect={noop}
								onEmptySlotSelect={noop}
								variant="compact"
								isStackedLayout={isStackedLayout}
								dragDisabled
								isDragActive={false}
							/>
						</div>
					) : null}
				</div>
			</div>
		</DndContext>
	);
}
