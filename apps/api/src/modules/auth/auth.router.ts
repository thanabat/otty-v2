import { Router } from "express";
import { z } from "zod";
import type { LineProfileRequest } from "@otty/shared";
import { getVerifiedLineProfile } from "./auth.service";

const lineProfileRequestSchema = z.object({
  accessToken: z.string().min(1)
});

export const authRouter = Router();

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
