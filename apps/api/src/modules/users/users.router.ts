import { Router } from "express";
import { z } from "zod";
import {
  getReferrerSummary,
  getUserById,
  getUserByLineUserId,
  listCurrentSiteOptions,
  listReferrerCandidates,
  listReferrerOptions,
  listUsersByCurrentSite,
  listUsersByJoiningYear,
  listUsers,
  listUsersByReferrer,
  listUsersByReferrerUserId
} from "./users.service";

const listUsersQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  page: z.coerce.number().int().positive().default(1)
});

const referrerListQuerySchema = listUsersQuerySchema.extend({
  referrerUserId: z.string().trim().min(1).optional()
});

const referrerSummaryQuerySchema = z.object({
  referrerUserId: z.string().trim().min(1).optional()
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

usersRouter.get("/users/current-sites", async (_request, response, next) => {
  try {
    const payload = await listCurrentSiteOptions();

    response.json(payload);
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/users/referrers", async (_request, response, next) => {
  try {
    const payload = await listReferrerOptions();

    response.json(payload);
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/users/referrer-candidates", async (_request, response, next) => {
  try {
    const payload = await listReferrerCandidates();

    response.json(payload);
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/users/referrer-profile/:referrer", async (request, response, next) => {
  try {
    const params = referrerParamsSchema.parse(request.params);
    const query = referrerSummaryQuerySchema.parse(request.query);
    const payload = await getReferrerSummary(
      params.referrer,
      query.referrerUserId
    );

    if (!payload) {
      response.status(404).json({
        code: "ReferrerProfileNotFound",
        message: "Referrer profile was not found"
      });
      return;
    }

    response.json(payload);
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/users/referrer/:referrer", async (request, response, next) => {
  try {
    const params = referrerParamsSchema.parse(request.params);
    const query = referrerListQuerySchema.parse(request.query);
    const payload = await listUsersByReferrer(
      params.referrer,
      query.limit,
      query.page,
      query.referrerUserId
    );

    response.json(payload);
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/users/referrer-user/:userId", async (request, response, next) => {
  try {
    const params = userIdParamsSchema.parse(request.params);
    const query = listUsersQuerySchema.parse(request.query);
    const payload = await listUsersByReferrerUserId(
      params.userId,
      query.limit,
      query.page
    );

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
    const payload = await listUsersByCurrentSite(
      params.referrer,
      query.limit,
      query.page
    );

    response.json(payload);
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/users/joining-year/:year", async (request, response, next) => {
  try {
    const params = joiningYearParamsSchema.parse(request.params);
    const query = listUsersQuerySchema.parse(request.query);
    const payload = await listUsersByJoiningYear(
      params.year,
      query.limit,
      query.page
    );

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
