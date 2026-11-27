import { useTranslation, Trans } from 'react-i18next';
import { CARD, SECTION_TITLE } from '../bustanStyles.js';
import { Star8Icon } from '../icons/IslamicIcons.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import ExtLink from '../ExtLink.js';

export default function RamadanLastTen({
  nightNo,
  tonightOdd,
}: {
  nightNo: number;
  tonightOdd: number | null;
}) {
  const { t } = useTranslation();

  return (
    <section className={`${CARD} border-brand-info/40 p-5`}>
      <h2 className={SECTION_TITLE}>
        <Star8Icon className="w-5 h-5 text-brand-info" aria-hidden="true" />
        {t('ramadan.lastTenNights', 'The last ten nights')}
      </h2>
      <p className="text-white/80 text-xs mt-1.5 leading-relaxed">
        <Trans
          i18nKey="ramadan.laylatalQadrNote"
          components={{
            1: <ExtLink href="https://quran.com/97/3" className="underline text-brand-gold" />,
            3: (
              <ExtLink
                href="https://sunnah.com/bukhari:2017"
                className="underline text-brand-gold"
              />
            ),
            5: <span className="italic text-white" />,
            7: (
              <ExtLink
                href="https://sunnah.com/tirmidhi:3513"
                className="underline text-brand-gold"
              />
            ),
          }}
        />
      </p>
      {/* The night comes before its day (R10): say when each begins. */}
      <p className="text-white/70 text-xs mt-1.5 leading-relaxed">
        {t(
          'ramadan.nightBeginsNote',
          'Each night begins at Maghrib, the evening before its fast: the 21st night begins at iftar of the 20th fast. The marked fasts are the ones whose night is odd.'
        )}
      </p>
      {tonightOdd && (
        <p className="text-brand-info text-xs font-bold mt-1.5" data-testid="tonight-odd-night">
          {t(
            'ramadan.tonightOddNight',
            'Tonight is night {{night}} of Ramadan, an odd night of the last ten.',
            { night: formatLocaleNumber(tonightOdd) }
          )}
        </p>
      )}
      <div className="flex gap-1.5 mt-3">
        {[21, 23, 25, 27, 29].map((n) => (
          <span
            key={n}
            className={`flex-1 text-center py-2 rounded-control text-sm font-bold tabular-nums border ${
              n === nightNo
                ? 'bg-brand-info text-on-color border-brand-info shadow-elev-1'
                : n < nightNo
                  ? 'bg-shade/20 text-white/55 border-brand-border'
                  : 'bg-brand-info/10 text-brand-info border-brand-info/40'
            }`}
          >
            {formatLocaleNumber(n)}
          </span>
        ))}
      </div>
    </section>
  );
}
