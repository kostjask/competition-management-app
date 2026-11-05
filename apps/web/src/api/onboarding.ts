import { OnboardingReadSchema, OnboardingWriteSchema, OnboardingCancelSchema, OnboardingContextSchema } from "@dance/schemas";
import type { z } from "zod";
import { apiClient, decode } from "./client";
export const readOnboarding = async (body: z.infer<typeof OnboardingReadSchema>) => decode(OnboardingContextSchema, await apiClient.post("/auth/onboarding/read", OnboardingReadSchema.parse(body)));
export const saveOnboarding = async (body: z.infer<typeof OnboardingWriteSchema>) => decode(OnboardingContextSchema, await apiClient.post("/auth/onboarding/save", OnboardingWriteSchema.parse(body)));
export const cancelOnboarding = async (body: z.infer<typeof OnboardingCancelSchema>) => decode(OnboardingContextSchema, await apiClient.post("/auth/onboarding/cancel", OnboardingCancelSchema.parse(body)));
