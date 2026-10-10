import { Request, Response, NextFunction } from 'express';
import * as updateEmailService from '../services/updateEmail.service.js';
import type { CampaignInput } from '../services/updateEmail.service.js';
import { logAdminAction } from '../services/adminAudit.service.js';

const idParam = (req: Request): string => {
  const v = req.params['id'];
  return (Array.isArray(v) ? v[0] : v) ?? '';
};

const handle =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await fn(req, res);
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 400 || status === 404 || status === 409) {
        res.status(status).json({ ok: false, error: (err as Error).message });
        return;
      }
      next(err);
    }
  };

export const audienceHandler = handle(async (_req, res) => {
  res.json({ ok: true, ...(await updateEmailService.getAudienceSummary()) });
});

export const listHandler = handle(async (_req, res) => {
  res.json({ ok: true, campaigns: await updateEmailService.listCampaigns() });
});

export const getHandler = handle(async (req, res) => {
  res.json({ ok: true, ...(await updateEmailService.getCampaign(idParam(req))) });
});

/** Creates the campaign and sends the first chunk; the page keeps calling
 * /continue until nothing is pending. */
export const createHandler = handle(async (req, res) => {
  const campaign = await updateEmailService.createCampaign(
    req.body as CampaignInput,
    req.admin!.email
  );
  const { campaign: sent } = await updateEmailService.sendNextChunk(campaign._id.toString());
  await logAdminAction({
    actorEmail: req.admin!.email,
    actorRole: req.admin!.role,
    action: 'email.update.send',
    targetType: 'UpdateEmailCampaign',
    targetId: campaign._id.toString(),
    metadata: { subject: campaign.subject, recipients: campaign.recipients.length },
  });
  res.json({ ok: true, campaign: updateEmailService.summarise(sent) });
});

export const continueHandler = handle(async (req, res) => {
  const { campaign, busy } = await updateEmailService.sendNextChunk(idParam(req));
  // busy: another tab or request is sending this campaign's next chunk.
  res.json({ ok: true, campaign: updateEmailService.summarise(campaign), busy });
});

/** Logged: it sends the campaign again to everyone it failed for. The
 *  /continue calls that follow are the same send and are not logged one by one. */
export const retryHandler = handle(async (req, res) => {
  const campaign = await updateEmailService.retryFailed(idParam(req));
  const summary = updateEmailService.summarise(campaign);
  await logAdminAction({
    actorEmail: req.admin!.email,
    actorRole: req.admin!.role,
    action: 'email.update.retry',
    targetType: 'UpdateEmailCampaign',
    targetId: summary._id,
    metadata: { subject: summary.subject, recipients: summary.pending },
  });
  res.json({ ok: true, campaign: summary });
});
