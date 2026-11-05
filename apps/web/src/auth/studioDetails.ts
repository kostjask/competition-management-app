import type { z } from "zod";
import type { OnboardingDetailsSchema } from "@dance/schemas";
export type StudioDetails = z.infer<typeof OnboardingDetailsSchema>;
export const emptyStudioDetails: StudioDetails = { studioName:"",country:"",city:"",directorName:"",directorPhone:"" };
export const studioFields = ["studioName","country","city","directorName","directorPhone"] as const;
