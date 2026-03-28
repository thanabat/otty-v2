import { Router } from "express";
import { z } from "zod";
import {
  getUserById,
  getUserByLineUserId,
  listUsersByCurrentSite,
  listUsersByJoiningYear,
  listUsers,
  listUsersByReferrer
} from "./users.service";

const listUsersQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20)
});

const lineUserParamsSchema = z.object({
  lineUserId: z.string().min(1)
});

const userIdParamsSchema = z.object({
  userId: z.string().min(1)
});

const referrerParamsSchema = z.object({
  referrer: z.string().trim().min(1)
});

const joiningYearParamsSchema = z.object({
  year: z.coerce.number().int().min(1900).max(3000)
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

usersRouter.get("/users/referrer/:referrer", async (request, response, next) => {
  try {
    const params = referrerParamsSchema.parse(request.params);
    const query = listUsersQuerySchema.parse(request.query);
    const payload = await listUsersByReferrer(params.referrer, query.limit);

    response.json(payload);
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/users/site/:site", async (request, response, next) => {
  try {
    const params = referrerParamsSchema.parse({
      referrer: request.params.site
    });
    const query = listUsersQuerySchema.parse(request.query);
    const payload = await listUsersByCurrentSite(params.referrer, query.limit);

    response.json(payload);
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/users/joining-year/:year", async (request, response, next) => {
  try {
    const params = joiningYearParamsSchema.parse(request.params);
    const query = listUsersQuerySchema.parse(request.query);
    const payload = await listUsersByJoiningYear(params.year, query.limit);

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
