import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router';
import { useTranslation, Trans } from 'react-i18next';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

/**
 * Wherever the app shows a ḍaʿīf badge, this card must appear near the bottom
 * of that page (Istiak's rule): a reader deserves to know WHY something is
 * called weak, WHO said so, and what the chain's actual defect is — not just a
 * label.
 *
 * Every entry names the specific narrator or defect, because "weak" alone is
 * unfalsifiable. Grades follow the muḥaddithūn cited; where scholars differ
 * (acting on weak reports in faḍāʾil al-aʿmāl) that difference is stated
 * rather than resolved — this app does not issue rulings.
 *
 * Bengali fields (`*Bn`) are full hand-translated strings, citations already
 * transliterated inline — same pattern as NAFL_TYPE_META's hadithBn in
 * hooks/useSalatLog.ts. Not run through translateReference().
 */

export type DaifTopic = 'ramadan-ashra' | 'nafl-fard-reward' | 'waqiah-poverty';

interface DaifEntry {
  id: DaifTopic;
  claim: string;
  claimBn: string;
  source: string;
  sourceBn: string;
  sourceUrl: string;
  defect: string;
  defectBn: string;
  verdict: string;
  verdictBn: string;
  practice: string;
  practiceBn: string;
}

const ENTRIES: Record<DaifTopic, DaifEntry> = {
  'ramadan-ashra': {
    id: 'ramadan-ashra',
    claim:
      'That Ramadan divides into ten days of mercy (raḥmah), ten of forgiveness (maghfirah) and ten of freedom from the Fire (ʿitq min an-nār).',
    claimBn:
      'যে রমজান তিন ভাগে বিভক্ত — দশ দিন রহমতের (raḥmah), দশ দিন ক্ষমার (maghfirah), এবং দশ দিন জাহান্নাম থেকে মুক্তির (ʿitq min an-nār)।',
    source: 'Ṣaḥīḥ Ibn Khuzaymah 1887 — the Salmān al-Fārisī (ra) sermon',
    sourceBn: 'সহীহ ইবনে খুযাইমাহ ১৮৮৭ — সালমান আল-ফারিসী (রা)-এর খুতবা',
    sourceUrl:
      'https://hadithanswers.com/the-famous-hadith-on-the-virtues-of-ramadan-radiyallahu-anhu/',
    defect:
      'Its chain contains ʿAlī ibn Zayd ibn Judʿān, whom an-Nasāʾī and other critics declared weak for poor retention. Ibn Khuzaymah himself introduced the report with "if the report is authentic" (in ṣaḥḥa\'l-khabar) — an explicit signal of his own doubt, unusual in a collection titled Ṣaḥīḥ.',
    defectBn:
      'এর সনদে রয়েছেন আলী ইবনে যায়েদ ইবনে জুদআন, যাকে আন-নাসাঈ ও অন্যান্য সমালোচক দুর্বল স্মরণশক্তির কারণে যঈফ বলে ঘোষণা করেছেন। স্বয়ং ইবনে খুযাইমাহ হাদীসটি "ইন সাহহাল খবর" (যদি বর্ণনাটি সহীহ হয়) বলে উপস্থাপন করেছিলেন — যা তাঁর নিজেরই সন্দেহের স্পষ্ট ইঙ্গিত, এবং সহীহ নামাঙ্কিত একটি সংকলনে এটি অস্বাভাবিক।',
    verdict: 'Ḍaʿīf. Graded weak by al-Albānī and by the majority of later critics.',
    verdictBn: 'যঈফ। আল-আলবানী ও পরবর্তী অধিকাংশ সমালোচক একে দুর্বল বলে গ্রেড দিয়েছেন।',
    practice:
      'The three names remain the most common way Muslims organise the month, so Bustandeen uses them as a FRAMING for the calendar — never as a promised reward structure. The last ten nights are a separate matter: their virtue and the search for Laylat al-Qadr are firmly authentic (Ṣaḥīḥ al-Bukhārī 2017).',
    practiceBn:
      'এই তিনটি নাম মুসলিমদের মাসটি সাজানোর সবচেয়ে প্রচলিত পদ্ধতি হিসেবে রয়ে গেছে, তাই Bustandeen এগুলোকে ক্যালেন্ডারের কাঠামো হিসেবে ব্যবহার করে — কখনো প্রতিশ্রুত সওয়াবের কাঠামো হিসেবে নয়। শেষ দশ রাত সম্পূর্ণ ভিন্ন বিষয়: এর ফযীলত এবং লাইলাতুল কদরের সন্ধান দৃঢ়ভাবে সহীহ (সহীহ বুখারী ২০১৭)।',
  },
  'nafl-fard-reward': {
    id: 'nafl-fard-reward',
    claim:
      'That a voluntary act in Ramadan carries the reward of an obligatory one, and an obligatory act the reward of seventy.',
    claimBn:
      'যে রমজানে একটি নফল আমল একটি ফরযের সওয়াব বহন করে, এবং একটি ফরয আমল সত্তরটি ফরযের সওয়াব বহন করে।',
    source: 'Ṣaḥīḥ Ibn Khuzaymah 1887 — the same Salmān al-Fārisī sermon',
    sourceBn: 'সহীহ ইবনে খুযাইমাহ ১৮৮৭ — একই সালমান আল-ফারিসীর খুতবা',
    sourceUrl: 'https://islamqa.info/en/answers/21364',
    defect:
      'Identical chain and identical defect as above — ʿAlī ibn Zayd ibn Judʿān — since both statements come from one sermon, not two independent reports.',
    defectBn:
      'উপরের মতোই একই সনদ ও একই ত্রুটি — আলী ইবনে যায়েদ ইবনে জুদআন — কারণ উভয় বক্তব্যই একই খুতবা থেকে এসেছে, দুটি স্বতন্ত্র বর্ণনা থেকে নয়।',
    verdict: 'Ḍaʿīf.',
    verdictBn: 'যঈফ।',
    practice:
      'Bustandeen shows it because it is so widely quoted that silence would be more confusing than disclosure, but always beside an authentic alternative. Ramadan\'s established virtue needs no weak support: "When Ramadan begins, the gates of Paradise are opened…" (Ṣaḥīḥ al-Bukhārī 1899).',
    practiceBn:
      'Bustandeen এটি দেখায় কারণ এটি এত ব্যাপকভাবে উদ্ধৃত হয় যে চুপ থাকার চেয়ে প্রকাশ করাই বেশি স্পষ্ট, তবে সবসময় একটি সহীহ বিকল্পের পাশে। রমজানের প্রতিষ্ঠিত ফযীলতের জন্য কোনো দুর্বল সমর্থনের প্রয়োজন নেই: "রমজান শুরু হলে জান্নাতের দরজাগুলো খুলে দেওয়া হয়…" (সহীহ বুখারী ১৮৯৯)।',
  },
  'waqiah-poverty': {
    id: 'waqiah-poverty',
    claim: 'That whoever recites Sūrat al-Wāqiʿah every night will never be afflicted by poverty.',
    claimBn: 'যে প্রতি রাতে সূরা আল-ওয়াকিয়াহ পাঠ করবে, সে কখনো দারিদ্র্যে আক্রান্ত হবে না।',
    source: 'al-Bayhaqī, Shuʿab al-Īmān 2269',
    sourceBn: 'আল-বায়হাকী, শুআবুল ঈমান ২২৬৯',
    sourceUrl: 'https://islamweb.net/en/fatwa/348835/',
    defect:
      'The routes are defective in different ways: one passes through Abū Shujāʿ, criticised for weakness; another, narrated from Ibn ʿAbbās via Aḥmad al-Yamāmī, involves a narrator accused of lying — which pushes that route to fabricated (mawḍūʿ) rather than merely weak.',
    defectBn:
      "বিভিন্ন সূত্রে বিভিন্নভাবে ত্রুটিপূর্ণ: একটি সূত্র আবু শুজা'র মাধ্যমে আসে, যিনি দুর্বলতার জন্য সমালোচিত; অন্যটি, ইবনে আব্বাস থেকে আহমাদ আল-ইয়ামামীর মাধ্যমে বর্ণিত, এমন একজন বর্ণনাকারী জড়িত যাকে মিথ্যা বলার অভিযোগে অভিযুক্ত করা হয়েছে — যা এই সূত্রটিকে নিছক দুর্বল নয়, বরং জাল পর্যায়ে ঠেলে দেয়।",
    verdict:
      'Ḍaʿīf; some chains graded mawḍūʿ. Declared weak by al-Albānī, and Imām Aḥmad is reported to have rejected it.',
    verdictBn:
      'যঈফ; কিছু সনদ জাল হিসেবে গ্রেড করা হয়েছে। আল-আলবানী একে দুর্বল ঘোষণা করেছেন, এবং ইমাম আহমাদ সম্পর্কে বলা হয় যে তিনি এটি প্রত্যাখ্যান করেছিলেন।',
    practice:
      'What IS established is the practice of the companion: ʿAbdullāh ibn Masʿūd (ra) instructed his daughters to recite it each night. So Bustandeen offers the surah as a good nightly habit and states no reward. Note too that the wording is "every night", not specifically after Maghrib.',
    practiceBn:
      'যা প্রতিষ্ঠিত তা হলো সাহাবীর আমল: আবদুল্লাহ ইবনে মাসউদ (রা) তাঁর কন্যাদের প্রতি রাতে এটি পাঠ করার নির্দেশ দিয়েছিলেন। তাই Bustandeen এই সূরাটিকে একটি ভালো রাতের অভ্যাস হিসেবে উপস্থাপন করে এবং কোনো সওয়াবের কথা বলে না। এটাও লক্ষণীয় যে, ভাষাটি হলো "প্রতি রাতে", নির্দিষ্টভাবে মাগরিবের পর নয়।',
  },
};

export default function DaifExplainer({ topics }: { topics: DaifTopic[] }) {
  const { t, i18n } = useTranslation();
  const isBn = i18n.language === 'bn';
  const [open, setOpen] = useState(false);
  const list = topics.map((topic) => ENTRIES[topic]).filter(Boolean);
  if (list.length === 0) return null;

  return (
    <div className="rounded-3xl border border-brand-gold/20 bg-brand-gold/[0.05] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
      >
        <span className="text-lg shrink-0">⚖️</span>
        <span className="flex-1 min-w-0">
          <span className="block text-brand-gold/90 font-bold text-sm">
            <Trans
              i18nKey="daifExplainer.headerTitle"
              defaults="Why some things on this page are marked <1>ḍaʿīf</1>"
              components={{ 1: <span className="italic" /> }}
            />
          </span>
          <span className="block text-white/30 text-[11px] mt-0.5">
            {t('daifExplainer.narrationCount', {
              count: list.length,
              defaultValue: '{{count}} narration — the chain, the defect, and who graded it',
            })}
          </span>
        </span>
        <ChevronDownIcon
          className={`w-4 h-4 text-brand-gold/50 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-5 pb-5 space-y-4">
              <p className="text-white/40 text-xs leading-relaxed border-l-2 border-brand-gold/25 pl-3">
                <Trans
                  i18nKey="daifExplainer.explainerParagraph"
                  defaults="The term <1>ḍaʿīf</1> means the chain of transmission has a flaw — a narrator with weak memory, an unknown link, or a break — so the words cannot be attributed to the Prophet ﷺ with confidence. It does not automatically mean the meaning is false. Many scholars permit acting on a weak report to encourage good deeds (faḍāʾil al-aʿmāl) provided nothing is treated as an established ruling or a guaranteed reward; others decline to use them at all. Bustandeen shows the grade so you can follow your own scholars."
                  components={{ 1: <b className="text-white/70" /> }}
                />
              </p>

              {list.map((e) => (
                <div key={e.id} className="rounded-2xl bg-black/20 border border-brand-gold/15 p-4">
                  <p className="text-white/80 text-sm font-semibold leading-relaxed">
                    {isBn ? e.claimBn : e.claim}
                  </p>

                  <dl className="mt-2.5 space-y-1.5 text-xs leading-relaxed">
                    <div>
                      <dt className="inline text-white/30">
                        {t('daifExplainer.whereFound', 'Where it is found:')}{' '}
                      </dt>
                      <dd className="inline text-white/60">{isBn ? e.sourceBn : e.source}</dd>
                    </div>
                    <div>
                      <dt className="inline text-white/30">
                        {t('daifExplainer.theDefect', 'The defect:')}{' '}
                      </dt>
                      <dd className="inline text-white/60">{isBn ? e.defectBn : e.defect}</dd>
                    </div>
                    <div>
                      <dt className="inline text-white/30">
                        {t('daifExplainer.verdictLabel', 'Verdict:')}{' '}
                      </dt>
                      <dd className="inline text-brand-gold/80 font-semibold">
                        {isBn ? e.verdictBn : e.verdict}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline text-white/30">
                        {t('daifExplainer.howWeUseIt', 'How Bustandeen uses it:')}{' '}
                      </dt>
                      <dd className="inline text-white/60">{isBn ? e.practiceBn : e.practice}</dd>
                    </div>
                  </dl>

                  <a
                    href={e.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block mt-2 text-[11px] text-brand-gold/60 hover:text-brand-gold underline underline-offset-2"
                  >
                    {t('daifExplainer.readScholarlyDiscussion', 'Read the scholarly discussion ↗')}
                  </a>
                </div>
              ))}

              <p className="text-white/30 text-[11px] leading-relaxed">
                {t(
                  'daifExplainer.footerText',
                  'Bustandeen is not a source of religious authority — verify with a scholar you trust. Spotted a grading you believe is wrong?'
                )}{' '}
                <Link
                  to="/feedback"
                  className="text-brand-emerald/70 hover:text-brand-emerald underline underline-offset-2"
                >
                  {t('daifExplainer.footerLink', 'Tell us and we will correct it')}
                </Link>
                .
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
