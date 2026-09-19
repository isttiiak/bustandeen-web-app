import type { UpdateAudience } from '../hooks/useAdminUpdateEmails.js';

export interface UpdateEmailTemplate {
  id: string;
  label: string;
  /** Audience this template is written for; picking it selects that audience. */
  audience: UpdateAudience;
  subject: string;
  /** Without the closing lines: the page adds the shared trailer itself. {name} becomes the first name. */
  body: string;
}

const NOOR_COMMON_EN = `A small update to Noor in Bustandeen, to make it fairer for everyone.

- Your Noor now starts at 0 each day and only goes up. It no longer drops as prayer times pass, and a long streak no longer gives a head start.
- Prayers are still the heart of it (50 of 100). Zikr and Quran count against your own daily goals, and steadiness plus a few extras (a completed fast, nafl prayer, ṣalawāt or istighfār) make up the rest. Reaching 100 no longer depends on fasting.
- A new "This week" view shows your average since Friday, so a quiet day never defines you. Each friend also shows how they compare with their own usual.`;

const NOOR_COMMON_BN = `Bustandeen-এর নূরে একটি ছোট পরিবর্তন এসেছে, যাতে সবার জন্য আরও ন্যায্য হয়।

- আপনার নূর এখন প্রতিদিন ০ থেকে শুরু হয় এবং শুধু বাড়ে। নামাযের ওয়াক্ত পার হলে আর কমে না, আর লম্বা ধারা থাকলেও আগেভাগে কোনো পয়েন্ট মেলে না।
- নামাযই মূল বিষয়, ১০০-র মধ্যে ৫০। যিকির ও কুরআন আপনার নিজের দৈনিক লক্ষ্যের তুলনায় ধরা হয়, বাকিটা ধারাবাহিকতা ও কিছু বাড়তি আমল (পূর্ণ রোযা, নফল নামায, দরূদ বা ইস্তিগফার)। ১০০ ছোঁয়া এখন রোযার উপর নির্ভর করে না।
- নতুন "এই সপ্তাহ" দেখায় শুক্রবার থেকে আপনার গড়, তাই একটি শান্ত দিন আপনাকে সংজ্ঞায়িত করে না। প্রতিটি বন্ধুর সারিতে তাঁর নিজের স্বাভাবিকের সাথে তুলনাও দেখা যায়।`;

const SISTERS_EXTRA_EN = `- On Rayhanah days, prayer and fasting are excused, not lost: Dhikr and Quran count for more, so Noor can still reach 100.`;
const SISTERS_EXTRA_BN = `- রায়হানার দিনগুলোতে নামায ও রোযা মাফ, হারিয়ে যায় না: যিকির ও কুরআনের মূল্য বেশি ধরা হয়, তাই নূর তখনও ১০০ ছুঁতে পারে।`;

const NOTE_EN = `Numbers may look different for a day or two while everything is recalculated. Noor is encouragement, never judgement.`;
const NOTE_BN = `সব নতুন করে হিসাব হওয়ায় এক-দুই দিন সংখ্যাগুলো আলাদা দেখাতে পারে। নূর উৎসাহ, বিচার নয়।`;

export const UPDATE_EMAIL_TEMPLATES: UpdateEmailTemplate[] = [
  {
    id: 'noor-v2-brothers',
    label: 'Noor v2 update (brothers)',
    audience: 'brother',
    subject: 'A fairer Noor in Bustandeen',
    body: `Assalamu alaikum {name},\n\n${NOOR_COMMON_EN}\n\n${NOTE_EN}\n\n---\n\nআসসালামু আলাইকুম {name},\n\n${NOOR_COMMON_BN}\n\n${NOTE_BN}`,
  },
  {
    id: 'noor-v2-sisters',
    label: 'Noor v2 update (sisters)',
    audience: 'sister',
    subject: 'A fairer Noor in Bustandeen',
    body: `Assalamu alaikum {name},\n\n${NOOR_COMMON_EN}\n${SISTERS_EXTRA_EN}\n\n${NOTE_EN}\n\n---\n\nআসসালামু আলাইকুম {name},\n\n${NOOR_COMMON_BN}\n${SISTERS_EXTRA_BN}\n\n${NOTE_BN}`,
  },
  {
    id: 'blank',
    label: 'Blank message',
    audience: 'all',
    subject: '',
    body: 'Assalamu alaikum {name},\n\n',
  },
];
