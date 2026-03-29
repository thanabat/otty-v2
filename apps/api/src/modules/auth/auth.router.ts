import { Router } from "express";
import { z } from "zod";
import type {
  LiffProfileUpdateRequest,
  LiffWorkingExperienceCreateRequest,
  LiffWorkingExperienceDeleteRequest,
  LiffWorkingExperienceUpdateRequest,
  LineProfileRequest
} from "@otty/shared";
import {
  createWorkingExperienceWithLiff,
  deleteWorkingExperienceWithLiff,
  getVerifiedLineProfile,
  loginWithLiff,
  updateWorkingExperienceWithLiff,
  updateProfileWithLiff
} from "./auth.service";

const lineProfileRequestSchema = z.object({
  accessToken: z.string().min(1)
});

const liffProfileUpdateRequestSchema = z.object({
  accessToken: z.string().min(1),
  profile: z.object({
    fullname: z.string().trim().min(1).max(120).optional().nullable(),
    nickname: z.string().trim().min(1).max(120).optional().nullable(),
    email: z.string().trim().email().max(160).optional().nullable(),
    phone: z.string().trim().min(1).max(40).optional().nullable(),
    bio: z.string().trim().min(1).max(500).optional().nullable(),
    title: z.string().trim().min(1).max(120).optional().nullable(),
    referrer: z.string().trim().min(1).max(120).optional().nullable(),
    referrerUserId: z.string().trim().min(1).optional().nullable(),
    emergencyContactUserIds: z.array(z.string().trim().min(1)).max(8).optional().nullable(),
    joiningYear: z.coerce.number().int().min(1900).max(3000).optional().nullable()
  })
});

const liffWorkingExperienceSchema = z
  .object({
    site: z.string().trim().min(1).max(120),
    project: z.string().trim().min(1).max(160),
    startYear: z.coerce.number().int().min(1900).max(3000),
    endYear: z.coerce.number().int().min(1900).max(3000).optional().nullable(),
    isCurrent: z.boolean().default(false)
  })
  .superRefine((value, context) => {
    if (value.endYear != null && value.endYear < value.startYear) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End year must be greater than or equal to start year",
        path: ["endYear"]
      });
    }
  });

const liffWorkingExperienceCreateRequestSchema = z.object({
  accessToken: z.string().min(1),
  experience: liffWorkingExperienceSchema
});

const liffWorkingExperienceUpdateRequestSchema = z.object({
  accessToken: z.string().min(1),
  experienceId: z.string().min(1),
  experience: liffWorkingExperienceSchema
});

const liffWorkingExperienceDeleteRequestSchema = z.object({
  accessToken: z.string().min(1),
  experienceId: z.string().min(1)
});

export const authRouter = Router();

authRouter.post("/auth/liff/login", async (request, response, next) => {
  try {
    const body = lineProfileRequestSchema.parse(
      request.body
    ) as LineProfileRequest;
    const payload = await loginWithLiff(body.accessToken);

    response.json(payload);
  } catch (error) {
    next(error);
  }
});

authRouter.patch("/auth/liff/profile", async (request, response, next) => {
  try {
    const body = liffProfileUpdateRequestSchema.parse(
      request.body
    ) as LiffProfileUpdateRequest;
    const payload = await updateProfileWithLiff(body.accessToken, body.profile);

    response.json(payload);
  } catch (error) {
    next(error);
  }
});

authRouter.post("/auth/liff/working-experiences", async (request, response, next) => {
  try {
    const body = liffWorkingExperienceCreateRequestSchema.parse(
      request.body
    ) as LiffWorkingExperienceCreateRequest;
    const payload = await createWorkingExperienceWithLiff(
      body.accessToken,
      body.experience
    );

    response.json(payload);
  } catch (error) {
    next(error);
  }
});

authRouter.patch(
  "/auth/liff/working-experiences",
  async (request, response, next) => {
    try {
      const body = liffWorkingExperienceUpdateRequestSchema.parse(
        request.body
      ) as LiffWorkingExperienceUpdateRequest;
      const payload = await updateWorkingExperienceWithLiff(
        body.accessToken,
        body.experienceId,
        body.experience
      );

      response.json(payload);
    } catch (error) {
      next(error);
    }
  }
);

authRouter.delete(
  "/auth/liff/working-experiences",
  async (request, response, next) => {
    try {
      const body = liffWorkingExperienceDeleteRequestSchema.parse(
        request.body
      ) as LiffWorkingExperienceDeleteRequest;
      const payload = await deleteWorkingExperienceWithLiff(
        body.accessToken,
        body.experienceId
      );

      response.json(payload);
    } catch (error) {
      next(error);
    }
  }
);

authRouter.post("/auth/line/profile", async (request, response, next) => {
  try {
    const body = lineProfileRequestSchema.parse(
      request.body
    ) as LineProfileRequest;
    const profile = await getVerifiedLineProfile(body.accessToken);

    response.json(profile);
  } catch (error) {
    next(error);
  }
});
