import type { SendMailOptions } from './email.service.js';
import { escapeHtml } from './sadaqahEmail.templates.js';

export const WELCOME_SUBJECT = 'Welcome to Bustandeen — a small step, in sha Allah';

/**
 * Sent once, right after a brand-new account's very first successful sign-in
 * (see auth.controller.ts). Warm and personal on purpose — this is the one
 * email every single user will read, so it sets the tone for the whole app.
 */
export const welcomeEmail = (d: { name?: string }): Omit<SendMailOptions, 'to'> => {
  const greeting = d.name ? `Assalamu Alaikum ${d.name},` : 'Assalamu Alaikum,';
  const hadith =
    '"The most beloved of deeds to Allah are those that are consistent, even if small." — Prophet Muhammad ﷺ (Ṣaḥīḥ al-Bukhārī 6465, Ṣaḥīḥ Muslim 782)';

  const text = `${greeting}\n\nWelcome to Bustandeen. We're genuinely glad you're here.\n\nThis app was built around one simple belief: that the small, quiet acts of worship — a few extra tasbih, a prayer logged on time, a verse saved for later — are worth just as much care as the big ones. You don't need to be perfect here. You just need to keep showing up.\n\n${hadith}\n\nHowever this journey looks for you — a streak that grows slowly, a missed day you come back from, a du'a you finally memorize — we're honoured to be a small part of it.\n\nMay Allah accept it from you and make it easy.\n\n— The Bustandeen team`;

  const html = `<p>${escapeHtml(greeting)}</p><p>Welcome to Bustandeen. We're genuinely glad you're here.</p><p>This app was built around one simple belief: that the small, quiet acts of worship — a few extra tasbih, a prayer logged on time, a verse saved for later — are worth just as much care as the big ones. You don't need to be perfect here. You just need to keep showing up.</p><blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #10b981;color:#334155;font-style:italic;">${escapeHtml(hadith)}</blockquote><p>However this journey looks for you — a streak that grows slowly, a missed day you come back from, a du'a you finally memorize — we're honoured to be a small part of it.</p><p>May Allah accept it from you and make it easy.</p><p>— The Bustandeen team</p>`;

  return { subject: WELCOME_SUBJECT, text, html };
};
