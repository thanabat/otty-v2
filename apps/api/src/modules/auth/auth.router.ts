import { Router } from "express";
import { z } from "zod";
import type { LineProfileRequest } from "@otty/shared";
import { getVerifiedLineProfile, loginWithLiff } from "./auth.service";

const lineProfileRequestSchema = z.object({
  accessToken: z.string().min(1)
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
