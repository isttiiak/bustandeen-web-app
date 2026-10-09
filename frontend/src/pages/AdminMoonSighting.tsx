import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MoonIcon } from '@heroicons/react/24/outline';
import AnimatedBackground from '../components/AnimatedBackground.js';
import { BTN_PRIMARY, CARD, OPTION_OFF, OPTION_ON } from '../components/bustanStyles.js';
import {
  ADMIN_INPUT_SM,
  AdminHero,
  BTN_SMALL,
  OPTION_CHIP,
} from '../components/admin/adminParts.js';
import Seo from '../components/Seo.js';
import {
  useAdminMoonSighting,
  useCreateMoonSighting,
  useDeactivateMoonSighting,
} from '../hooks/useAdminMoonSighting.js';
import { countryName } from '../utils/countryDefaults.js';
import { hijriDateWithOffset, formatHijriDate } from '../utils/islamicCalendar.js';

const OFFSETS = [
  { value: -1, label: 'A day after Umm al-Qura (-1)' },
  { value: 0, label: 'Same as Umm al-Qura (0)' },
  { value: 1, label: 'A day before Umm al-Qura (+1)' },
] as const;

/** What devices in the country show on `day` with `offset` (plain Umm
 * al-Qura when 0), independent of this device's own setting. */
function previewHijri(day: string, offset: number): string {
  const h = hijriDateWithOffset(new Date(`${day}T12:00:00`), offset);
  return h ? formatHijriDate(h) : '';
}

/**
 * Servant-only (T4.1, FIQH-02): national moon-sighting records. From the
 * effective date until the next record for the same country, devices in that
 * country shift the Umm al-Qura date by the offset, unless the user set their
 * own. Every add and deactivation is in the audit log.
 */
export default function AdminMoonSighting() {
  const { t } = useTranslation();
  const { data: records, isLoading } = useAdminMoonSighting();
  const create = useCreateMoonSighting();
  const deactivate = useDeactivateMoonSighting();
  const [form, setForm] = useState({
    country: 'BD',
    effectiveFrom: '',
    offset: -1,
    note: '',
    sourceUrl: '',
  });
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const valid =
    /^[A-Z]{2}$/.test(form.country) &&
    /^\d{4}-\d{2}-\d{2}$/.test(form.effectiveFrom) &&
    form.note.trim().length >= 3 &&
    (!form.sourceUrl || form.sourceUrl.startsWith('https://'));

  const submit = () => {
    if (!valid) return;
    create.mutate(
      {
        country: form.country,
        effectiveFrom: form.effectiveFrom,
        offset: form.offset,
        note: form.note.trim(),
        ...(form.sourceUrl ? { sourceUrl: form.sourceUrl.trim() } : {}),
      },
      { onSuccess: () => setForm((f) => ({ ...f, effectiveFrom: '', note: '', sourceUrl: '' })) }
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
            "From the effective date until the next record for the same country, every device in that country on Automatic shifts the Umm al-Qura date by the offset. A user's own offset always wins. Enter only what the committee announced, with the date the month began there. Every change is in the audit log."
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
              {t('adminMoonSighting.effectiveFrom', 'Effective from (Gregorian)')}
              <input
                type="date"
                value={form.effectiveFrom}
                onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))}
                className={`${ADMIN_INPUT_SM} w-full mt-1 h-11`}
              />
            </label>
          </div>
          <div role="radiogroup" aria-label="Offset" className="flex flex-wrap gap-2">
            {OFFSETS.map((o) => (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={form.offset === o.value}
                onClick={() => setForm((f) => ({ ...f, offset: o.value }))}
                className={`${OPTION_CHIP} min-h-[44px] ${form.offset === o.value ? OPTION_ON : OPTION_OFF}`}
              >
                {o.label}
              </button>
            ))}
          </div>
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
          {form.effectiveFrom && (
            <p className="text-xs text-brand-gold">
              Preview: on {form.effectiveFrom} devices in {form.country} show{' '}
              <b>{previewHijri(form.effectiveFrom, form.offset)}</b> (Umm al-Qura:{' '}
              {previewHijri(form.effectiveFrom, 0)}).
            </p>
          )}
          {create.isError && (
            <p className="text-xs text-red-300">Could not save. Check the fields and try again.</p>
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
                  <span>from {r.effectiveFrom}</span>
                  <span className="text-brand-gold">
                    {r.offset > 0 ? '+1' : r.offset < 0 ? '-1' : '0'}
                  </span>
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
