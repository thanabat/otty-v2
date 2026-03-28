import { Router } from "express";
import { z } from "zod";
import type { LiffProfileUpdateRequest, LineProfileRequest } from "@otty/shared";
import {
  getVerifiedLineProfile,
  loginWithLiff,
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
    joiningYear: z.coerce.number().int().min(1900).max(3000).optional().nullable()
  })
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
