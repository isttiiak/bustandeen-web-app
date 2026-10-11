// Account emails (password reset, email verification) that the app sends
// itself instead of Firebase's built-in templates, so the wording is ours and
// the link opens bustandeen.com (see utils/authActionLink.ts). English and
// Bangla, chosen by the app language the request came from.

import { EMAIL_TAGLINE } from './emailBrand.js';
import { escapeHtml } from './sadaqahEmail.templates.js';

export type AuthEmailLang = 'en' | 'bn';

export interface AuthEmail {
  subject: string;
  text: string;
  html: string;
}

interface Parts {
  subject: string;
  greeting: string;
  before: string[];
  cta: string;
  copyHint: string;
  after: string[];
  signOff: string;
}

const greet = (lead: string, name: string | null): string =>
  name ? `${lead} ${name},` : `${lead},`;

function render(p: Parts, link: string): AuthEmail {
  const signOff = `${p.signOff}\nBustandeen\n${EMAIL_TAGLINE}`;
  const text = [p.greeting, ...p.before, `${p.cta}:\n${link}`, ...p.after, signOff].join('\n\n');
  const para = (s: string) => `<p>${escapeHtml(s).replace(/\n/g, '<br>')}</p>`;
  const href = escapeHtml(link);
  const html = [
    para(p.greeting),
    ...p.before.map(para),
    `<p><a href="${href}" style="display:inline-block;padding:12px 20px;border-radius:12px;` +
      `background:#5f7f54;color:#ffffff;text-decoration:none;font-weight:600">` +
      `${escapeHtml(p.cta)}</a></p>`,
    `<p style="font-size:13px;color:#6b6457">${escapeHtml(p.copyHint)}<br>` +
      `<a href="${href}" style="color:#5f7f54;word-break:break-all">${href}</a></p>`,
    ...p.after.map(para),
    para(signOff),
  ].join('');
  return { subject: p.subject, text, html };
}

export function passwordResetEmail(
  lang: AuthEmailLang,
  d: { name: string | null; email: string; link: string }
): AuthEmail {
  if (lang === 'bn') {
    return render(
      {
        subject: 'আপনার Bustandeen পাসওয়ার্ড রিসেট করুন',
        greeting: greet('আসসালামু আলাইকুম', d.name),
        before: [
          `আপনার Bustandeen অ্যাকাউন্টের (${d.email}) পাসওয়ার্ড রিসেট করার একটি অনুরোধ আমরা পেয়েছি।`,
        ],
        cta: 'নতুন পাসওয়ার্ড দিন',
        copyHint: 'বাটনটি কাজ না করলে এই লিঙ্কটি ব্রাউজারে খুলুন:',
        after: [
          'লিঙ্কটি একবারই কাজ করবে এবং ১ ঘণ্টার মধ্যে এর মেয়াদ শেষ হবে। মেয়াদ শেষ হয়ে গেলে সাইন-ইন পেজ থেকে নতুন লিঙ্ক চেয়ে নিতে পারেন।',
          'আপনি যদি এই অনুরোধ না করে থাকেন, তাহলে নিশ্চিন্তে এই ইমেইলটি উপেক্ষা করুন। আপনার পাসওয়ার্ড আগের মতোই থাকবে, অ্যাকাউন্টে কিছুই বদলাবে না।',
        ],
        signOff: 'শুভেচ্ছান্তে,',
      },
      d.link
    );
  }
  return render(
    {
      subject: 'Reset your Bustandeen password',
      greeting: greet('Assalamu Alaikum', d.name),
      before: [
        `We received a request to reset the password for your Bustandeen account (${d.email}).`,
      ],
      cta: 'Set a new password',
      copyHint: 'If the button does not work, open this link in your browser:',
      after: [
        'This link works once and expires within 1 hour. If it has expired, you can ask for a new one from the sign-in page.',
        'If you did not ask for this, you can safely ignore this email. Your password stays the same and nothing changes in your account.',
      ],
      signOff: 'Warm regards,',
    },
    d.link
  );
}

export function verifyEmailEmail(
  lang: AuthEmailLang,
  d: { name: string | null; email: string; link: string }
): AuthEmail {
  if (lang === 'bn') {
    return render(
      {
        subject: 'Bustandeen-এ আপনার ইমেইল নিশ্চিত করুন',
        greeting: greet('আসসালামু আলাইকুম', d.name),
        before: [
          `Bustandeen-এ আপনাকে স্বাগতম। অনুগ্রহ করে নিশ্চিত করুন যে ${d.email} আপনার ইমেইল ঠিকানা। এতে আপনার অ্যাকাউন্ট সুরক্ষিত থাকবে, আর কখনো পাসওয়ার্ড ভুলে গেলে তা ফিরে পেতে পারবেন।`,
        ],
        cta: 'ইমেইল নিশ্চিত করুন',
        copyHint: 'বাটনটি কাজ না করলে এই লিঙ্কটি ব্রাউজারে খুলুন:',
        after: [
          'লিঙ্কটি একবারই কাজ করবে। কাজ না করলে অ্যাপ থেকে নতুন লিঙ্ক পাঠাতে পারবেন।',
          'আপনি যদি Bustandeen-এ কোনো অ্যাকাউন্ট না খুলে থাকেন, তাহলে নিশ্চিন্তে এই ইমেইলটি উপেক্ষা করুন।',
        ],
        signOff: 'শুভেচ্ছান্তে,',
      },
      d.link
    );
  }
  return render(
    {
      subject: 'Confirm your email for Bustandeen',
      greeting: greet('Assalamu Alaikum', d.name),
      before: [
        `Welcome to Bustandeen. Please confirm that ${d.email} is your email address. This keeps your account safe and lets you recover it if you ever forget your password.`,
      ],
      cta: 'Confirm my email',
      copyHint: 'If the button does not work, open this link in your browser:',
      after: [
        'This link works once. If it no longer works, you can send a new one from the app.',
        'If you did not create a Bustandeen account, you can safely ignore this email.',
      ],
      signOff: 'Warm regards,',
    },
    d.link
  );
}

/** Email-first sign-up: the link that lets someone choose a password and
 *  only then creates the account. */
export function signupLinkEmail(
  lang: AuthEmailLang,
  d: { name: string | null; email: string; link: string }
): AuthEmail {
  if (lang === 'bn') {
    return render(
      {
        subject: 'আপনার Bustandeen অ্যাকাউন্ট তৈরি শেষ করুন',
        greeting: greet('আসসালামু আলাইকুম', d.name),
        before: [
          `Bustandeen-এ যোগ দেওয়ার জন্য ধন্যবাদ। ${d.email} দিয়ে অ্যাকাউন্ট তৈরি শেষ করতে এই লিঙ্কটি খুলুন এবং একটি পাসওয়ার্ড বেছে নিন।`,
        ],
        cta: 'সাইন-আপ শেষ করুন',
        copyHint: 'বাটনটি কাজ না করলে এই লিঙ্কটি ব্রাউজারে খুলুন:',
        after: [
          'লিঙ্কটি একবারই কাজ করবে এবং ১ ঘণ্টার মধ্যে এর মেয়াদ শেষ হবে। মেয়াদ শেষ হয়ে গেলে আবার সাইন-আপ করুন।',
          'আপনি যদি সাইন-আপ করার চেষ্টা না করে থাকেন, তাহলে নিশ্চিন্তে এই ইমেইলটি উপেক্ষা করুন। লিঙ্কটি ব্যবহার না করলে কোনো অ্যাকাউন্ট তৈরি হবে না।',
        ],
        signOff: 'শুভেচ্ছান্তে,',
      },
      d.link
    );
  }
  return render(
    {
      subject: 'Finish creating your Bustandeen account',
      greeting: greet('Assalamu Alaikum', d.name),
      before: [
        `Thank you for joining Bustandeen. To finish creating your account for ${d.email}, open this link and choose your password.`,
      ],
      cta: 'Finish sign-up',
      copyHint: 'If the button does not work, open this link in your browser:',
      after: [
        'This link works once and expires within 1 hour. If it has expired, just sign up again.',
        'If you did not try to sign up, you can safely ignore this email. No account is created unless the link is used.',
      ],
      signOff: 'Warm regards,',
    },
    d.link
  );
}

/** Sent instead of a sign-up link when the email already has an account, so
 *  the sign-up form never reveals which emails are registered. */
export function accountExistsEmail(
  lang: AuthEmailLang,
  d: { name: string | null; email: string; link: string }
): AuthEmail {
  if (lang === 'bn') {
    return render(
      {
        subject: 'আপনার ইতিমধ্যে একটি Bustandeen অ্যাকাউন্ট আছে',
        greeting: greet('আসসালামু আলাইকুম', d.name),
        before: [
          `${d.email} দিয়ে কেউ সাইন-আপ করার চেষ্টা করেছেন, কিন্তু এই ইমেইলে ইতিমধ্যে একটি Bustandeen অ্যাকাউন্ট আছে।`,
        ],
        cta: 'সাইন ইন করুন',
        copyHint: 'বাটনটি কাজ না করলে এই লিঙ্কটি ব্রাউজারে খুলুন:',
        after: [
          'পাসওয়ার্ড মনে নেই? সাইন-ইন পেজে "পাসওয়ার্ড ভুলে গেছেন?" বেছে নিয়ে একটি রিসেট লিঙ্ক নিন।',
          'এটি যদি আপনি না হয়ে থাকেন, তাহলে নিশ্চিন্তে এই ইমেইলটি উপেক্ষা করুন। আপনার অ্যাকাউন্টে কিছুই বদলায়নি।',
        ],
        signOff: 'শুভেচ্ছান্তে,',
      },
      d.link
    );
  }
  return render(
    {
      subject: 'You already have a Bustandeen account',
      greeting: greet('Assalamu Alaikum', d.name),
      before: [
        `Someone tried to sign up with ${d.email}, but this email already has a Bustandeen account.`,
      ],
      cta: 'Sign in',
      copyHint: 'If the button does not work, open this link in your browser:',
      after: [
        'Forgot your password? On the sign-in page, choose "Forgot password?" to get a reset link.',
        'If this was not you, you can safely ignore this email. Nothing has changed in your account.',
      ],
      signOff: 'Warm regards,',
    },
    d.link
  );
}
