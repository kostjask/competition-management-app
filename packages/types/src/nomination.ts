import type { ID, NamedEntity } from "./common.js";

export interface DanceCategory extends NamedEntity {}

export interface AgeGroup extends NamedEntity {
  minAge: number;
  maxAge: number;
}

export interface DanceFormat extends NamedEntity {
  minParticipants: number;
  maxParticipants: number;
  maxDurationSeconds: number;
}