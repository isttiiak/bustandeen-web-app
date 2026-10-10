import { Request, Response, NextFunction } from 'express';
import * as socialService from '../services/social.service.js';
import { DEFAULT_TIMEZONE_OFFSET } from '../utils/timezone-flexible.js';

export const getSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const today = req.query['today'] as string | undefined;
    const rawOffset = req.query['timezoneOffset'];
    const offset = rawOffset !== undefined ? Number(rawOffset) : DEFAULT_TIMEZONE_OFFSET;
    const summary = await socialService.getSummary(req.user.uid, today, offset);
    res.json({ ok: true, ...summary });
  } catch (err) {
    next(err);
  }
};

export const getNoor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const today = req.query['today'] as string | undefined;
    const rawOffset = req.query['timezoneOffset'];
    const offset = rawOffset !== undefined ? Number(rawOffset) : DEFAULT_TIMEZONE_OFFSET;
    const noor = await socialService.getNoor(req.user.uid, today, offset);
    res.json({ ok: true, ...noor });
  } catch (err) {
    next(err);
  }
};

export const getAllTime = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const today = req.query['today'] as string | undefined;
    const rawOffset = req.query['timezoneOffset'];
    const offset = rawOffset !== undefined ? Number(rawOffset) : DEFAULT_TIMEZONE_OFFSET;
    const allTime = await socialService.getCircleAllTime(req.user.uid, today, offset);
    res.json({ ok: true, allTime });
  } catch (err) {
    next(err);
  }
};

export const connect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code } = req.body as { code: string };
    const result = await socialService.connectByCode(req.user.uid, code);
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    next(err);
  }
};

export const unfriend = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const friendUid = req.params['friendUid'] as string;
    const result = await socialService.unfriend(req.user.uid, friendUid);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getFriendsList = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const friends = await socialService.getFriendsList(req.user.uid);
    res.json({ ok: true, friends });
  } catch (err) {
    next(err);
  }
};

export const getPendingIncoming = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const requests = await socialService.getPendingIncoming(req.user.uid);
    res.json({ ok: true, requests });
  } catch (err) {
    next(err);
  }
};

export const acceptRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const requesterUid = req.params['requesterUid'] as string;
    const result = await socialService.acceptRequest(req.user.uid, requesterUid);
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    next(err);
  }
};

export const rejectRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const requesterUid = req.params['requesterUid'] as string;
    const result = await socialService.rejectRequest(req.user.uid, requesterUid);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const blockUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const targetUid = req.params['targetUid'] as string;
    const result = await socialService.blockUser(req.user.uid, targetUid);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const unblockUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const targetUid = req.params['targetUid'] as string;
    const result = await socialService.unblockUser(req.user.uid, targetUid);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getBlockedList = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const blocked = await socialService.getBlockedList(req.user.uid);
    res.json({ ok: true, blocked });
  } catch (err) {
    next(err);
  }
};

export const setInvisible = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { invisible } = req.body as { invisible: boolean };
    const result = await socialService.setInvisible(req.user.uid, invisible);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const setPrivacy = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const body = req.body as Parameters<typeof socialService.setPrivacy>[1];
    const result = await socialService.setPrivacy(req.user.uid, body);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
