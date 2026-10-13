import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';

// Audit AI-01: every Naseeh AI card links to what it sends, and shows a plain,
// non-AI version when its AI request fails. Rendered statically with the AI
// hooks mocked into their error state.

const ai = vi.hoisted(() => ({
  error: true,
  mutation: () => ({ isError: ai.error, isPending: false, mutate: () => {} }),
}));

vi.mock('react-i18next', () => ({
  // Imported by the app's i18n setup, which some utils pull in.
  initReactI18next: { type: '3rdParty', init: () => {} },
  useTranslation: () => ({
    i18n: { language: 'en' },
    t: (key: string, def?: unknown, opts?: Record<string, unknown>) => {
      const text = typeof def === 'string' ? def : key;
      const vars = (typeof def === 'object' ? def : opts) as Record<string, unknown> | undefined;
      return text.replace(/\{\{(\w+)\}\}/g, (_m, k: string) => String(vars?.[k] ?? ''));
    },
  }),
}));
vi.mock('../../store/useAuthStore.js', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) =>
    sel({ user: { uid: 'u1' }, aiEnabled: true, setAiEnabled: () => {} }),
}));
vi.mock('../../hooks/useUserProfile.js', () => ({
  useUpdateProfile: () => ({ mutateAsync: async () => null }),
}));
vi.mock('../../hooks/useAi.js', () => ({
  useAiMuhasabah: ai.mutation,
  useAiStreakCoach: ai.mutation,
  useAiFastingCompanion: ai.mutation,
  useAiComeback: ai.mutation,
  useGroqKeyStatus: () => ({ data: { hasOwnKey: false } }),
}));
vi.mock('../../hooks/useAnalytics.js', () => ({
  useAnalytics: () => ({
    data: { chartData: [{ date: '2026-09-26', total: 1200 }], streak: { currentStreak: 3 } },
  }),
}));
vi.mock('../../hooks/useQuran.js', () => ({
  useQuranSummary: () => ({
    data: {
      streak: 2,
      todayAyat: 0,
      bestStreak: 9,
      // Five quiet days in a row (no Quran, no dhikr) for the welcome-back note.
      last7: ['09-26', '09-27', '09-28', '09-29', '09-30', '10-01', '10-02'].map((d, i) => ({
        date: `2026-${d}`,
        pages: 0,
        units: i === 0 ? 3 : 0,
      })),
    },
  }),
}));
vi.mock('../../hooks/useSalatLog.js', () => ({
  useSalatAnalytics: () => ({ data: { currentStreak: 4, completionRate: 86 } }),
}));
vi.mock('../../hooks/useFasting.js', () => ({
  useFastingSummary: () => ({ data: { stats: { thisMonth: 2 } } }),
}));
vi.mock('../../hooks/useCycleAiGate.js', () => ({ useCycleAiGate: () => 'clear' }));

const render = (el: ReactElement, url = '/naseeh') =>
  renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [url] }, el));

const NO_AI = 'No AI was used';
const AI_LABEL = 'AI-generated encouragement';

// The first dynamic import of a component graph can take over Vitest's 5 s
// default on a cold (Windows) run. Warm every graph once here, under one long
// hook timeout, so no single test pays for the cold import.
let mods: {
  AiDisclaimer: typeof import('./AiFlair.js').AiDisclaimer;
  AiPrivacyPanel: typeof import('./AiPrivacyPanel.js').default;
  MuhasabahReport: typeof import('./MuhasabahReport.js').default;
  StreakCoaching: typeof import('./StreakCoaching.js').default;
  FastingCompanion: typeof import('./FastingCompanion.js').default;
  ComebackNudge: typeof import('../ComebackNudge.js').default;
};

beforeAll(async () => {
  const [flair, privacy, muhasabah, streak, fasting, comeback] = await Promise.all([
    import('./AiFlair.js'),
    import('./AiPrivacyPanel.js'),
    import('./MuhasabahReport.js'),
    import('./StreakCoaching.js'),
    import('./FastingCompanion.js'),
    import('../ComebackNudge.js'),
  ]);
  mods = {
    AiDisclaimer: flair.AiDisclaimer,
    AiPrivacyPanel: privacy.default,
    MuhasabahReport: muhasabah.default,
    StreakCoaching: streak.default,
    FastingCompanion: fasting.default,
    ComebackNudge: comeback.default,
  };
}, 60_000);

beforeEach(() => {
  ai.error = true;
});

describe('"What is sent?" links', () => {
  it('the disclaimer links to its feature row on /naseeh', () => {
    const html = render(createElement(mods.AiDisclaimer, { feature: 'patterns' }));
    expect(html).toContain('href="/naseeh#ai-sends-patterns"');
    expect(html).toContain('What is sent?');
  });

  it('the privacy panel has a row for every feature a card links to', () => {
    const html = render(createElement(mods.AiPrivacyPanel));
    for (const f of ['quickLog', 'summary', 'patterns', 'kaza', 'plan', 'chat', 'coaching']) {
      expect(html).toContain(`id="ai-sends-${f}"`);
    }
  });
});

describe('non-AI fallbacks when the AI request fails', () => {
  it('muhāsabah shows the week in numbers plus the verified reference', () => {
    const html = render(createElement(mods.MuhasabahReport));
    expect(html).toContain('This week you counted 1,200 dhikr.');
    expect(html).toContain('You logged 86% of this week&#x27;s prayers.');
    expect(html).toContain(NO_AI);
    expect(html).not.toContain(AI_LABEL);
    expect(html).toContain('href="/naseeh#ai-sends-summary"');
  });

  it('muhāsabah renders nothing while there is no report and no failure', () => {
    ai.error = false;
    expect(render(createElement(mods.MuhasabahReport))).toBe('');
  });

  it('streak coaching shows a fixed milestone note', () => {
    const html = render(
      createElement(mods.StreakCoaching, { zikrStreak: 7, quranStreak: null, salatStreak: null })
    );
    expect(html).toContain('7 days of Zikr in a row. Alhamdulillah.');
    expect(html).toContain(NO_AI);
    expect(html).toContain('href="/naseeh#ai-sends-coaching"');
  });

  it('the fasting companion shows a fixed note, morning and evening', () => {
    const morning = render(
      createElement(mods.FastingCompanion, { fastType: 'nafl', isPostMaghrib: false })
    );
    expect(morning).toContain('May Allah accept your fast today.');
    expect(morning).toContain(NO_AI);
    const evening = render(
      createElement(mods.FastingCompanion, { fastType: 'nafl', isPostMaghrib: true })
    );
    expect(evening).toContain('Iftar is close.');
  });

  it('the welcome-back note shows a fixed note', () => {
    const html = render(createElement(mods.ComebackNudge));
    expect(html).toContain('Welcome back. Begin again with something small');
    expect(html).toContain(NO_AI);
  });
});
