import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { CalculatorIcon, CalendarDaysIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import {
  DuaHandsIcon,
  NamesMedallionIcon,
  OrnamentDivider,
  SunriseIcon,
} from '../icons/IslamicIcons.js';

/** Friends, the Islamic library and the footer line. */
export function HomeLinks() {
  const { t } = useTranslation();
  const library = [
    {
      Icon: DuaHandsIcon,
      to: '/library/duas',
      title: t('home.libraryDuaTitle'),
      subtitle: t('home.libraryDuaSubtitle'),
    },
    {
      Icon: SunriseIcon,
      to: '/library/adhkar',
      title: t('home.libraryAdhkarTitle'),
      subtitle: t('home.libraryAdhkarSubtitle'),
    },
    {
      Icon: NamesMedallionIcon,
      to: '/library/asma-ul-husna',
      title: t('home.libraryAsmaTitle'),
      subtitle: t('home.libraryAsmaSubtitle'),
    },
    {
      Icon: CalculatorIcon,
      to: '/library/zakat-calculator',
      title: t('home.libraryZakatTitle'),
      subtitle: t('home.libraryZakatSubtitle'),
    },
  ];

  return (
    <>
      <OrnamentDivider className="my-5" />

      {/* Friends */}
      <Link to="/friends" className="block group mb-6">
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-card border border-brand-border/70 bg-brand-deep shadow-elev-1 hover:border-brand-gold/40 hover:shadow-hover transition-[border-color,box-shadow]">
          <UserGroupIcon className="w-6 h-6 shrink-0 text-brand-gold" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-white">{t('home.friendsTitle')}</h2>
            <p className="text-white/60 text-xs truncate">{t('home.friendsSubtitle')}</p>
          </div>
          <span className="shrink-0 text-brand-gold text-xs font-bold">{t('home.compete')}</span>
        </div>
      </Link>

      {/* Islamic library: one-stop utilities */}
      <div className="mb-8">
        <div className="mb-3">
          <h2 className="font-display text-base font-semibold text-white">
            {t('home.libraryTitle')}
          </h2>
          <p className="text-white/60 text-xs">{t('home.librarySubtitle')}</p>
        </div>
        <Link to="/library/calendar" className="block group mb-3">
          <div className="rounded-card border border-brand-border/70 bg-brand-deep shadow-elev-1 p-4 flex items-center gap-3 hover:border-brand-emerald/40 hover:shadow-hover transition-[border-color,box-shadow]">
            <CalendarDaysIcon className="w-6 h-6 text-brand-emerald shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate">
                {t('home.libraryCalendarTitle')}
              </h3>
              <p className="text-white/60 text-xs mt-0.5 truncate">
                {t('home.libraryCalendarSubtitle')}
              </p>
            </div>
          </div>
        </Link>
        <div className="grid grid-cols-2 gap-3">
          {library.map(({ Icon, to, title, subtitle }) => (
            <Link key={to} to={to} className="block group">
              <div className="h-full rounded-card border border-brand-border/70 bg-brand-deep shadow-elev-1 p-4 hover:border-brand-emerald/40 hover:shadow-hover transition-[border-color,box-shadow]">
                <Icon className="w-6 h-6 text-brand-emerald" />
                <h3 className="text-sm font-bold text-white mt-2 truncate">{title}</h3>
                <p className="text-white/60 text-xs mt-0.5 truncate">{subtitle}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="text-center text-xs text-white/50 pb-4">{t('home.footer')}</div>
    </>
  );
}
