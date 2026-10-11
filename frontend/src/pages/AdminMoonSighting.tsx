import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MoonIcon } from '@heroicons/react/24/outline';
import AnimatedBackground from '../components/AnimatedBackground.js';
import { BTN_PRIMARY, CARD } from '../components/bustanStyles.js';
import { ADMIN_INPUT_SM, AdminHero, BTN_SMALL } from '../components/admin/adminParts.js';
import Seo from '../components/Seo.js';
import {
  useAdminMoonSighting,
  useCreateMoonSighting,
  useDeactivateMoonSighting,
} from '../hooks/useAdminMoonSighting.js';
import { countryName } from '../utils/countryDefaults.js';
import {
  addDays,
  nextHijriMonth,
  recordShift,
  resolveHijriDay,
  ummAlQura,
  type HijriYmd,
  type MoonSightingRecord,
} from '../utils/hijriOffset.js';

const MONTHS = [
  'Muharram',
  'Safar',
  "Rabi' al-Awwal",
  "Rabi' al-Akhir",
  'Jumada al-Ula',
  'Jumada al-Akhirah',
  'Rajab',
  "Sha'ban",
  'Ramadan',
  'Shawwal',
  "Dhul Qa'dah",
  'Dhul Hijjah',
];

const hijriText = (h: HijriYmd) => `${h.day} ${MONTHS[h.month - 1] ?? ''} ${h.year}`;

const localToday = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** The next Umm al-Qura month (the one an admin is most likely announcing). */
function upcomingMonth(): { year: number; month: number } {
  const h = ummAlQura(localToday());
  return nextHijriMonth(h.year, h.month);
}

function shiftText(shift: number | null): string {
  if (shift === null) return "more than 2 days from Umm al-Qura's 1st: check the month and date";
  if (shift === 0) return 'the same day as Umm al-Qura';
  const n = Math.abs(shift);
  return `${n} day${n > 1 ? 's' : ''} ${shift < 0 ? 'after' : 'before'} Umm al-Qura`;
}

/** The server's reason (e.g. "a Hijri month has 29 or 30 days ..."), if any. */
function errorMessage(err: unknown): string | null {
  const msg = (err as { response?: { data?: { error?: unknown } } } | null)?.response?.data?.error;
  return typeof msg === 'string' ? msg : null;
}

/**
 * Servant and 'general' Ansar (T4.1, FIQH-02; U8): national month-start
 * records ("Ramadan 1448 began on 9 Feb in BD"). Devices in that country count
 * the month from its start unless the user set their own offset (rule:
 * utils/hijriOffset.ts). Every add and deactivation is in the audit log.
 */
export default function AdminMoonSighting() {
  const { t } = useTranslation();
  const { data: records, isLoading } = useAdminMoonSighting();
  const create = useCreateMoonSighting();
  const deactivate = useDeactivateMoonSighting();
  const [form, setForm] = useState(() => {
    const m = upcomingMonth();
    return {
      country: 'BD',
      hijriYear: m.year,
      hijriMonth: m.month,
      startDate: '',
      note: '',
      sourceUrl: '',
    };
  });
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const shift = form.startDate ? recordShift(form) : null;
  const valid =
    /^[A-Z]{2}$/.test(form.country) &&
    /^\d{4}-\d{2}-\d{2}$/.test(form.startDate) &&
    shift !== null &&
    form.note.trim().length >= 3 &&
    (!form.sourceUrl || form.sourceUrl.startsWith('https://'));

  // What devices in the country would show around the new month, with the
  // active records plus this one.
  const preview = (() => {
    if (!form.startDate || shift === null) return [];
    const toRecord = (
      id: string,
      r: { country: string; hijriYear: number; hijriMonth: number; startDate: string }
    ): MoonSightingRecord => ({
      id,
      country: r.country,
      hijriYear: r.hijriYear,
      hijriMonth: r.hijriMonth,
      startDate: r.startDate,
      effectiveFrom: r.startDate,
      offset: 0,
      note: '',
    });
    const all = [
      ...(records ?? [])
        .filter(
          (r) => r.active && !(r.hijriYear === form.hijriYear && r.hijriMonth === form.hijriMonth)
        )
        .map((r) => toRecord(r._id, r)),
      toRecord('draft', form),
    ];
    const rows: { day: string; shown: HijriYmd; uq: HijriYmd }[] = [];
    for (let i = -3; i <= 31; i++) {
      const day = addDays(form.startDate, i);
      const shown = resolveHijriDay({
        manual: false,
        userOffset: 0,
        country: form.country,
        records: all,
        day,
      }).hijri;
      rows.push({ day, shown, uq: ummAlQura(day) });
    }
    return rows;
  })();

  const submit = () => {
    if (!valid) return;
    create.mutate(
      {
        country: form.country,
        hijriYear: form.hijriYear,
        hijriMonth: form.hijriMonth,
        startDate: form.startDate,
        note: form.note.trim(),
        ...(form.sourceUrl ? { sourceUrl: form.sourceUrl.trim() } : {}),
      },
      { onSuccess: () => setForm((f) => ({ ...f, startDate: '', note: '', sourceUrl: '' })) }
    );
  };

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('adminMoonSighting.seoTitle', 'Moon sighting')}
        description="Internal dashboard."
        path="/admin/moon-sighting"
        index={false}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        <AdminHero
          icon={MoonIcon}
          title={t('adminMoonSighting.pageTitle', 'Moon sighting')}
          subtitle={t(
            'adminMoonSighting.pageSubtitle',
            "Set a country's Hijri dates from its national committee's announcement."
          )}
        />
        <p className="text-sm text-white/80">
          {t(
            'adminMoonSighting.explain',
            "Record each month the committee announces: which Hijri month, and the Gregorian date its 1st fell on in that country. Devices on Automatic count the month from that day (29 or 30 days) and, until the next announcement, follow Umm al-Qura shifted the same way. Enter the next month as soon as it is announced, so a 30th day shows correctly. A user's own offset always wins. Every change is in the audit log."
          )}
        </p>

        <div className={`${CARD} p-4 space-y-3`}>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block text-xs text-white/80 font-semibold">
              {t('adminMoonSighting.country', 'Country code (ISO, e.g. BD)')}
              <input
                value={form.country}
                onChange={(e) =>
                  setForm((f) => ({ ...f, country: e.target.value.toUpperCase().slice(0, 2) }))
                }
                className={`${ADMIN_INPUT_SM} w-full mt-1 h-11`}
              />
              {/^[A-Z]{2}$/.test(form.country) && (
                <span className="block text-white/70 font-normal mt-1">
                  {countryName(form.country, 'en')}
                </span>
              )}
            </label>
            <label className="block text-xs text-white/80 font-semibold">
              {t('adminMoonSighting.month', 'Hijri month and year')}
              <span className="flex gap-2 mt-1">
                <select
                  value={form.hijriMonth}
                  onChange={(e) => setForm((f) => ({ ...f, hijriMonth: Number(e.target.value) }))}
                  className={`${ADMIN_INPUT_SM} flex-1 min-w-0 h-11`}
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  aria-label="Hijri year"
                  value={form.hijriYear}
                  min={1400}
                  max={1600}
                  onChange={(e) => setForm((f) => ({ ...f, hijriYear: Number(e.target.value) }))}
                  className={`${ADMIN_INPUT_SM} w-24 h-11`}
                />
              </span>
            </label>
          </div>
          <label className="block text-xs text-white/80 font-semibold">
            {t('adminMoonSighting.startDate', 'The 1st of the month in that country (Gregorian)')}
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              className={`${ADMIN_INPUT_SM} w-full mt-1 h-11`}
            />
            {form.startDate && (
              <span
                className={`block font-normal mt-1 ${shift === null ? 'text-red-300' : 'text-white/70'}`}
              >
                {shiftText(shift)}
              </span>
            )}
          </label>
          <label className="block text-xs text-white/80 font-semibold">
            {t('adminMoonSighting.note', 'Note shown to users (what was announced)')}
            <input
              value={form.note}
              maxLength={200}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="National Moon Sighting Committee: Ramadan 1448 begins on ..."
              className={`${ADMIN_INPUT_SM} w-full mt-1 h-11`}
            />
          </label>
          <label className="block text-xs text-white/80 font-semibold">
            {t('adminMoonSighting.source', 'Announcement link (https, optional)')}
            <input
              value={form.sourceUrl}
              onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))}
              placeholder="https://"
              className={`${ADMIN_INPUT_SM} w-full mt-1 h-11`}
            />
          </label>
          {preview.length > 0 && (
            <div className="text-xs">
              <p className="text-white/80 font-semibold mb-1">
                Preview: what devices in {form.country} on Automatic would show
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 max-h-64 overflow-y-auto">
                {preview.map((r) => {
                  const differs =
                    r.shown.day !== r.uq.day ||
                    r.shown.month !== r.uq.month ||
                    r.shown.year !== r.uq.year;
                  return (
                    <li key={r.day} className="flex justify-between gap-2 py-0.5 tabular-nums">
                      <span className="text-white/70">{r.day}</span>
                      <span className={differs ? 'text-brand-gold font-semibold' : 'text-white'}>
                        {hijriText(r.shown)}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="text-white/70 mt-1">Gold: differs from Umm al-Qura.</p>
            </div>
          )}
          {create.isError && (
            <p className="text-xs text-red-300">
              {errorMessage(create.error) ?? 'Could not save. Check the fields and try again.'}
            </p>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={!valid || create.isPending}
            className={BTN_PRIMARY}
          >
            {t('adminMoonSighting.add', 'Add record')}
          </button>
        </div>

        <section className="space-y-2">
          <h2 className="font-display text-xl font-bold text-white">
            {t('adminMoonSighting.history', 'Records')}
          </h2>
          {isLoading ? (
            <p className="text-white/70 text-sm">Loading…</p>
          ) : !records?.length ? (
            <p className="text-white/70 text-sm">No records yet: every country uses Umm al-Qura.</p>
          ) : (
            records.map((r) => (
              <div key={r._id} className={`${CARD} p-3 ${r.active ? '' : 'opacity-60'}`}>
                <div className="flex flex-wrap items-center gap-2 text-sm text-white">
                  <b>
                    {countryName(r.country, 'en')} ({r.country})
                  </b>
                  <span>
                    {MONTHS[r.hijriMonth - 1]} {r.hijriYear} began {r.startDate}
                  </span>
                  <span className="text-brand-gold">{shiftText(recordShift(r))}</span>
                  {!r.active && <span className="text-xs text-white/70">(deactivated)</span>}
                </div>
                <p className="text-xs text-white/80 mt-1">{r.note}</p>
                <p className="text-[11px] text-white/70 mt-1">
                  Added by {r.createdBy}
                  {r.deactivatedBy ? `, deactivated by ${r.deactivatedBy}` : ''}
                  {r.sourceUrl && (
                    <>
                      {' · '}
                      <a
                        href={r.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-brand-gold"
                      >
                        source
                      </a>
                    </>
                  )}
                </p>
                {r.active &&
                  (confirmId === r._id ? (
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() =>
                          deactivate.mutate(r._id, { onSettled: () => setConfirmId(null) })
                        }
                        className={`${BTN_SMALL} min-h-[44px] text-red-300`}
                      >
                        Yes, deactivate
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className={`${BTN_SMALL} min-h-[44px]`}
                      >
                        Keep
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmId(r._id)}
                      className={`${BTN_SMALL} min-h-[44px] mt-2`}
                    >
                      Deactivate
                    </button>
                  ))}
              </div>
            ))
          )}
        </section>
      </div>
    </AnimatedBackground>
  );
}
