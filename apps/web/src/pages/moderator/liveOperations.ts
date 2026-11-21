import type { LiveScheduleAcknowledgement, LiveScheduleCommand, LiveScheduleWorkspace, ScoringCommand } from "@dance/schemas";

type SheetReopen = Extract<ScoringCommand, { action: "REOPEN" }>;
export type LiveOperation = { kind: "schedule"; command: LiveScheduleCommand } | { kind: "sheet"; command: SheetReopen };
export type LiveSession = NonNullable<LiveScheduleWorkspace["session"]>;
export type ExceptionAction = "SKIP" | "REOPEN" | "REQUEUE" | "ADVANCE_OVERRIDE" | "REOPEN_SHEET";
export const exceptionActions: readonly ExceptionAction[] = ["SKIP", "ADVANCE_OVERRIDE", "REOPEN", "REQUEUE", "REOPEN_SHEET"];

export function liveActions(workspace: LiveScheduleWorkspace) {
  const { session } = workspace;
  const running = workspace.eventStage === "LIVE" && session?.state === "RUNNING";
  const paused = workspace.eventStage === "LIVE" && session?.state === "PAUSED";
  const completion = session?.current?.completion;
  const complete = !!completion && completion.required > 0 && completion.locked === completion.required;
  const ready = workspace.scoringReady;
  return {
    START: !!paused && !!session.hasQueue && ready,
    PAUSE: !!running,
    ADVANCE: !!running && complete && ready,
    SKIP: !!running && !!session.current,
    ADVANCE_OVERRIDE: workspace.organizer && !!running && !!session.current && !complete && ready,
    REOPEN: workspace.organizer && workspace.eventStage === "LIVE" && session?.state === "FINISHED",
    REQUEUE: workspace.organizer && !!paused && !session.current && session.skipped.length > 0,
    REOPEN_SHEET: workspace.organizer && !!paused && session.correctionSheets.length > 0,
  };
}

export function canRun(workspace: LiveScheduleWorkspace | undefined, operation: LiveOperation) {
  const session = workspace?.session;
  if (!workspace || !session) return false;
  const { command } = operation;
  const actions = liveActions(workspace);
  if (operation.kind === "sheet") {
    return actions.REOPEN_SHEET && session.correctionSheets.some(sheet => sheet.id === operation.command.sheetId &&
      sheet.revision === command.expectedRevision);
  }
  const schedule = operation.command;
  return actions[schedule.action] && schedule.sessionId === session.id && schedule.expectedRevision === workspace.revision &&
    schedule.expectedSlotId === (session.current?.slotId ?? null) &&
    (schedule.action !== "REQUEUE" || session.skipped.some(slot => slot.slotId === schedule.targetSlotId));
}

export function matchesAcknowledgement(operation: LiveOperation, sessionId: string, receipt: LiveScheduleAcknowledgement) {
  const { command } = operation;
  if (receipt.operationId !== command.operationId || receipt.action !== command.action ||
    receipt.sessionId !== sessionId || receipt.revision !== command.expectedRevision + 1) return false;
  if (operation.kind === "sheet" && receipt.kind === "sheet") return receipt.sheetId === operation.command.sheetId;
  return operation.kind === "schedule" && receipt.kind === "schedule" &&
    receipt.expectedSlotId === operation.command.expectedSlotId &&
    receipt.targetSlotId === ("targetSlotId" in operation.command ? operation.command.targetSlotId : undefined);
}

export function scheduleTarget(workspace: LiveScheduleWorkspace, session: LiveSession) {
  return { sessionId: session.id, expectedRevision: workspace.revision, expectedSlotId: session.current?.slotId ?? null };
}
