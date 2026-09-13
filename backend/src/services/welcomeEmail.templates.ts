import type { SendMailOptions } from './email.service.js';
import { escapeHtml } from './sadaqahEmail.templates.js';

export const WELCOME_SUBJECT = 'Welcome to Bustandeen — a small step, in sha Allah';

const ABOUT_URL = 'https://bustandeen.com/about';
const PRIVACY_URL = 'https://bustandeen.com/privacy';
const SIGN_OFF_NAME = 'Istiak';
const SIGN_OFF_TITLE = 'Founder & Developer, Bustandeen';

/**
 * Sent once, right after a brand-new account's very first successful sign-in
 * (see auth.controller.ts), from the founder's own mailbox (see
 * email.service.ts's 'istiak' sender) rather than a system address — this is
 * the one email every single user will read, so it should read like a real
 * person, not a noreply@ mailbox.
 *
 * Structure is deliberate: warm welcome -> a short personal intro -> where to
 * learn more (About/Privacy) -> a real sign-off with name and title. Edit the
 * intro paragraph freely — it's the one part only Istiak can really write.
 */
export const welcomeEmail = (d: { name?: string }): Omit<SendMailOptions, 'to'> => {
  const greeting = d.name ? `Assalamu Alaikum ${d.name},` : 'Assalamu Alaikum,';
  const hadith =
    '"The most beloved of deeds to Allah are those that are consistent, even if small." — Prophet Muhammad ﷺ (Ṣaḥīḥ al-Bukhārī 6465, Ṣaḥīḥ Muslim 782)';
  const intro =
    "I'm Istiak — I built Bustandeen myself, as a small, honest place to keep up with the everyday acts of worship: zikr, salat, fasting, Quran. No ads, nothing sold, just something I wanted to exist and hope is useful to you too.";

  const text = [
    greeting,
    '',
    "Welcome to Bustandeen — I'm genuinely glad you're here.",
    '',
    hadith,
    '',
    intro,
    '',
    'You can read more about why this app exists, and how your data is handled, here:',
    `About us — ${ABOUT_URL}`,
    `Privacy — ${PRIVACY_URL}`,
    '',
    'If anything ever feels off, or you just want to say hello, this inbox reaches me directly.',
    '',
    'Warm regards,',
    SIGN_OFF_NAME,
    SIGN_OFF_TITLE,
  ].join('\n');

  const html = `
    <p>${escapeHtml(greeting)}</p>
    <p>Welcome to Bustandeen — I'm genuinely glad you're here.</p>
    <blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #10b981;color:#334155;font-style:italic;">${escapeHtml(hadith)}</blockquote>
    <p>${escapeHtml(intro)}</p>
    <p>You can read more about why this app exists, and how your data is handled, here:</p>
    <p><a href="${ABOUT_URL}">About us</a><br><a href="${PRIVACY_URL}">Privacy</a></p>
    <p>If anything ever feels off, or you just want to say hello, this inbox reaches me directly.</p>
    <p>Warm regards,<br>${escapeHtml(SIGN_OFF_NAME)}<br>${escapeHtml(SIGN_OFF_TITLE)}</p>
  `.trim();

  return { subject: WELCOME_SUBJECT, text, html };
};
