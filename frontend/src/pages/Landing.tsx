import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import InstallPwaBanner from '../components/InstallPwaBanner.js';
import LandingBody, { type LandingLink } from '../components/landing/LandingBody.js';

/** In-app links: the router's Link, so the demo and sign-up stay in the app. */
const RouterLink: LandingLink = ({ href, className, children }) => (
  <Link to={href} className={className}>
    {children}
  </Link>
);

/** The landing when the app itself answers `/` for a guest (signed-out
 * visitors normally get the prerendered page, seo/templates/LandingPage.tsx).
 * Both render the same Bustan Arch body (components/landing/LandingBody.tsx). */
export default function Landing() {
  const { t, i18n } = useTranslation();
  return (
    <AnimatedBackground variant="dark">
      <InstallPwaBanner />
      <Seo
        title={t('landing.seoTitle', 'Bustandeen - Nourish Your Deen')}
        description={t(
          'landing.seoDescription',
          'Track your zikr, salat, fasting and Quran reading - with authentic references, streaks, prayer times and a private circle of friends. Free, ad-free, and built for the Muslim community.'
        )}
        path="/"
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-20">
        <LandingBody
          t={(key, fallback) => t(key, fallback)}
          lang={i18n.language === 'bn' ? 'bn' : 'en'}
          A={RouterLink}
        />
      </div>
    </AnimatedBackground>
  );
}
