import { EventStage } from "../../generated/prisma";

type AllowedAction =
  | "studio.register"
  | "studio.edit"
  | "dancer.manage"
  | "performance.manage";

export function isActionAllowed(
  stage: EventStage,
  action: AllowedAction,
  canEditDuringReview = false,
): boolean {
  switch (stage) {
    case "PRE_REGISTRATION":
      return ["studio.register", "studio.edit"].includes(action);

    case "REGISTRATION_OPEN":
      return true; // All actions allowed

    case "DATA_REVIEW":
      if (!canEditDuringReview) return false;
      return ["dancer.manage", "performance.manage"].includes(action);

    case "FINALIZED":
      return false; // No edits allowed

    default:
      return false;
  }
}