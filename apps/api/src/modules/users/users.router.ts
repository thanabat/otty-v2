import { Router } from "express";
import { z } from "zod";
import { getUserById, getUserByLineUserId, listUsers } from "./users.service";

const listUsersQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20)
});

const lineUserParamsSchema = z.object({
  lineUserId: z.string().min(1)
});

const userIdParamsSchema = z.object({
  userId: z.string().min(1)
});

export const usersRouter = Router();

usersRouter.get("/users", async (request, response, next) => {
  try {
    const query = listUsersQuerySchema.parse(request.query);
    const payload = await listUsers(query.limit);

    response.json(payload);
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/users/line/:lineUserId", async (request, response, next) => {
  try {
    const params = lineUserParamsSchema.parse(request.params);
    const payload = await getUserByLineUserId(params.lineUserId);

    response.json(payload);
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/users/:userId", async (request, response, next) => {
  try {
    const params = userIdParamsSchema.parse(request.params);
    const payload = await getUserById(params.userId);

    response.json(payload);
  } catch (error) {
    next(error);
  }
});
