import type { ID } from "./common.js";

export interface Performance {
  id: ID;
  nominationId: ID;
  formatId: ID;
  ageGroupId: ID;
  participantCount: number;
  durationSeconds: number;
}