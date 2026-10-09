// The app's route table (audit T2.4: moved out of App.tsx unchanged).
import { lazy } from 'react';
import { Route, Routes } from 'react-router';
import ZikrCounter from './pages/ZikrCounter.js';
import NotFound from './pages/NotFound.js';
import {
  AdminProtected,
  BanglaEntry,
  DemoEntry,
  Protected,
  RootRoute,
  ServantProtected,
} from './routeGuards.js';

// Route-level code splitting — keeps each tracker's page weight off the shell
// and Profile/Settings are large; keep them out of the initial bundle.
const ZikrAnalytics = lazy(() => import('./pages/ZikrAnalytics.js'));
const Settings = lazy(() => import('./pages/Settings.js'));
const Onboarding = lazy(() => import('./pages/Onboarding.js'));
const AuthSignIn = lazy(() => import('./pages/AuthSignIn.js'));
const AuthSignUp = lazy(() => import('./pages/AuthSignUp.js'));
const AuthAction = lazy(() => import('./pages/AuthAction.js'));
const Profile = lazy(() => import('./pages/Profile.js'));
const SalatTracker = lazy(() => import('./pages/SalatTracker.js'));
const SalatAnalytics = lazy(() => import('./pages/SalatAnalytics.js'));
const FastingTracker = lazy(() => import('./pages/FastingTracker.js'));
const FastingAnalytics = lazy(() => import('./pages/FastingAnalytics.js'));
const PrayerTimes = lazy(() => import('./pages/PrayerTimes.js'));
const QiblaCompass = lazy(() => import('./pages/QiblaCompass.js'));
const QuranHabit = lazy(() => import('./pages/QuranHabit.js'));
const IslamicSpecialDay = lazy(() => import('./pages/IslamicSpecialDay.js'));
const Friends = lazy(() => import('./pages/Friends.js'));
const ConnectFriend = lazy(() => import('./pages/ConnectFriend.js'));
const About = lazy(() => import('./pages/About.js'));
const DuaLibrary = lazy(() => import('./pages/DuaLibrary.js'));
const AdhkarLibrary = lazy(() => import('./pages/AdhkarLibrary.js'));
const AsmaUlHusnaLibrary = lazy(() => import('./pages/AsmaUlHusnaLibrary.js'));
const ZakatCalculatorLibrary = lazy(() => import('./pages/ZakatCalculatorLibrary.js'));
const Privacy = lazy(() => import('./pages/Privacy.js'));
const Terms = lazy(() => import('./pages/Terms.js'));
const Feedback = lazy(() => import('./pages/Feedback.js'));
const Contact = lazy(() => import('./pages/Contact.js'));
const RayhanahCycle = lazy(() => import('./pages/RayhanahCycle.js'));
const RamadanTracker = lazy(() => import('./pages/RamadanTracker.js'));
const MusafirMode = lazy(() => import('./pages/MusafirMode.js'));
const RamadanAnalytics = lazy(() => import('./pages/RamadanAnalytics.js'));
const CycleAnalytics = lazy(() => import('./pages/CycleAnalytics.js'));
const QuranKhatam = lazy(() => import('./pages/QuranKhatam.js'));
const QuranBrowse = lazy(() => import('./pages/QuranBrowse.js'));
const QuranListen = lazy(() => import('./pages/QuranListen.js'));
const QuranAnalytics = lazy(() => import('./pages/QuranAnalytics.js'));
const QuranReader = lazy(() => import('./pages/QuranReader.js'));
const QuranBookmarks = lazy(() => import('./pages/QuranBookmarks.js'));
const QuranHifz = lazy(() => import('./pages/QuranHifz.js'));
const Sadaqah = lazy(() => import('./pages/Sadaqah.js'));
const SadaqahDonate = lazy(() => import('./pages/SadaqahDonate.js'));
const SadaqahThankYou = lazy(() => import('./pages/SadaqahThankYou.js'));
const SadaqahVerify = lazy(() => import('./pages/SadaqahVerify.js'));
const AdminSadaqah = lazy(() => import('./pages/AdminSadaqah.js'));
const AdminZikrRequests = lazy(() => import('./pages/AdminZikrRequests.js'));
const AdminHome = lazy(() => import('./pages/AdminHome.js'));
const AdminUsers = lazy(() => import('./pages/AdminUsers.js'));
const AdminAccounts = lazy(() => import('./pages/AdminAccounts.js'));
const AdminAuditLog = lazy(() => import('./pages/AdminAuditLog.js'));
const AdminFeedback = lazy(() => import('./pages/AdminFeedback.js'));
const AdminUserDetail = lazy(() => import('./pages/AdminUserDetail.js'));
const AdminOpsHealth = lazy(() => import('./pages/AdminOpsHealth.js'));
const AdminBroadcast = lazy(() => import('./pages/AdminBroadcast.js'));
const AdminMoonSighting = lazy(() => import('./pages/AdminMoonSighting.js'));
const AdminComposeEmail = lazy(() => import('./pages/AdminComposeEmail.js'));
const NaseehPage = lazy(() => import('./pages/NaseehPage.js'));

// Programmatic-SEO static pages (prayer-times/qibla/ramadan-calendar by
// city, du'a library, adhkar, Hijri converter) — pre-rendered at build time
// by scripts/prerender.mjs; these lazy wrappers let React Router take over
// in-app navigation once the client bundle loads. One shared chunk (same
// import specifier) reused across every language-prefixed route below.
const SeoPrayerTimesCity = lazy(() =>
  import('./seo/routes/ClientRoutes.js').then((m) => ({ default: m.PrayerTimesCityRoute }))
);
const SeoQiblaCity = lazy(() =>
  import('./seo/routes/ClientRoutes.js').then((m) => ({ default: m.QiblaCityRoute }))
);
const SeoRamadanCalendar = lazy(() =>
  import('./seo/routes/ClientRoutes.js').then((m) => ({ default: m.RamadanCalendarRoute }))
);
const SeoRamadanCalendarIndex = lazy(() =>
  import('./seo/routes/ClientRoutes.js').then((m) => ({ default: m.RamadanCalendarIndexRoute }))
);
const SeoDuaSituation = lazy(() =>
  import('./seo/routes/ClientRoutes.js').then((m) => ({ default: m.DuaSituationRoute }))
);
const SeoDuasIndex = lazy(() =>
  import('./seo/routes/ClientRoutes.js').then((m) => ({ default: m.DuasIndexRoute }))
);
const SeoAdhkarMorning = lazy(() =>
  import('./seo/routes/ClientRoutes.js').then((m) => ({ default: m.AdhkarMorningRoute }))
);
const SeoAdhkarEvening = lazy(() =>
  import('./seo/routes/ClientRoutes.js').then((m) => ({ default: m.AdhkarEveningRoute }))
);
const SeoHijriConverter = lazy(() =>
  import('./seo/routes/ClientRoutes.js').then((m) => ({ default: m.HijriConverterRoute }))
);
const SeoAsmaUlHusna = lazy(() =>
  import('./seo/routes/ClientRoutes.js').then((m) => ({ default: m.AsmaUlHusnaRoute }))
);
const SeoZakatCalculator = lazy(() =>
  import('./seo/routes/ClientRoutes.js').then((m) => ({ default: m.ZakatCalculatorRoute }))
);

/** `revision` remounts every route when a sign-in sync changed settings. */
export default function AppRoutes({ revision }: { revision: number }) {
  return (
    <Routes key={revision}>
      <Route path="/" element={<RootRoute />} />
      <Route path="/bn" element={<BanglaEntry />} />
      <Route path="/demo/:as" element={<DemoEntry />} />
      <Route path="/zikr" element={<ZikrCounter />} />
      <Route path="/salat" element={<SalatTracker />} />
      <Route
        path="/salat/analytics"
        element={
          <Protected>
            <SalatAnalytics />
          </Protected>
        }
      />
      <Route path="/musafir" element={<MusafirMode />} />
      <Route path="/fasting" element={<FastingTracker />} />
      <Route
        path="/fasting/analytics"
        element={
          <Protected>
            <FastingAnalytics />
          </Protected>
        }
      />
      <Route path="/prayer-times" element={<PrayerTimes />} />
      <Route path="/qibla" element={<QiblaCompass />} />

      {/* Programmatic-SEO static pages — pre-rendered by
          scripts/prerender.mjs, React Router takes over from here
          once the client bundle loads. See TODO-v3.md. */}
      <Route path="/prayer-times/:city" element={<SeoPrayerTimesCity lang="en" />} />
      <Route path="/bn/prayer-times/:city" element={<SeoPrayerTimesCity lang="bn" />} />
      <Route path="/ar/prayer-times/:city" element={<SeoPrayerTimesCity lang="ar" />} />
      <Route path="/qibla/:city" element={<SeoQiblaCity lang="en" />} />
      <Route path="/bn/qibla/:city" element={<SeoQiblaCity lang="bn" />} />
      <Route path="/ar/qibla/:city" element={<SeoQiblaCity lang="ar" />} />
      <Route path="/ramadan-calendar" element={<SeoRamadanCalendarIndex lang="en" />} />
      <Route path="/bn/ramadan-calendar" element={<SeoRamadanCalendarIndex lang="bn" />} />
      <Route path="/ar/ramadan-calendar" element={<SeoRamadanCalendarIndex lang="ar" />} />
      <Route path="/ramadan-calendar/:city/:year" element={<SeoRamadanCalendar lang="en" />} />
      <Route path="/bn/ramadan-calendar/:city/:year" element={<SeoRamadanCalendar lang="bn" />} />
      <Route path="/ar/ramadan-calendar/:city/:year" element={<SeoRamadanCalendar lang="ar" />} />
      <Route path="/duas" element={<SeoDuasIndex lang="en" />} />
      <Route path="/bn/duas" element={<SeoDuasIndex lang="bn" />} />
      <Route path="/ar/duas" element={<SeoDuasIndex lang="ar" />} />
      <Route path="/duas/:situation" element={<SeoDuaSituation lang="en" />} />
      <Route path="/bn/duas/:situation" element={<SeoDuaSituation lang="bn" />} />
      <Route path="/ar/duas/:situation" element={<SeoDuaSituation lang="ar" />} />
      <Route path="/adhkar/morning" element={<SeoAdhkarMorning lang="en" />} />
      <Route path="/bn/adhkar/morning" element={<SeoAdhkarMorning lang="bn" />} />
      <Route path="/ar/adhkar/morning" element={<SeoAdhkarMorning lang="ar" />} />
      <Route path="/adhkar/evening" element={<SeoAdhkarEvening lang="en" />} />
      <Route path="/bn/adhkar/evening" element={<SeoAdhkarEvening lang="bn" />} />
      <Route path="/ar/adhkar/evening" element={<SeoAdhkarEvening lang="ar" />} />
      <Route path="/hijri-date-converter" element={<SeoHijriConverter lang="en" />} />
      <Route path="/bn/hijri-date-converter" element={<SeoHijriConverter lang="bn" />} />
      <Route path="/ar/hijri-date-converter" element={<SeoHijriConverter lang="ar" />} />
      <Route path="/asma-ul-husna" element={<SeoAsmaUlHusna lang="en" />} />
      <Route path="/bn/asma-ul-husna" element={<SeoAsmaUlHusna lang="bn" />} />
      <Route path="/ar/asma-ul-husna" element={<SeoAsmaUlHusna lang="ar" />} />
      <Route path="/zakat-calculator" element={<SeoZakatCalculator lang="en" />} />
      <Route path="/bn/zakat-calculator" element={<SeoZakatCalculator lang="bn" />} />
      <Route path="/ar/zakat-calculator" element={<SeoZakatCalculator lang="ar" />} />
      <Route
        path="/quran"
        element={
          <Protected>
            <QuranHabit />
          </Protected>
        }
      />
      <Route
        path="/quran/khatam"
        element={
          <Protected>
            <QuranKhatam />
          </Protected>
        }
      />
      <Route
        path="/quran/browse"
        element={
          <Protected>
            <QuranBrowse />
          </Protected>
        }
      />
      <Route
        path="/quran/listen"
        element={
          <Protected>
            <QuranListen />
          </Protected>
        }
      />
      <Route
        path="/quran/analytics"
        element={
          <Protected>
            <QuranAnalytics />
          </Protected>
        }
      />
      <Route
        path="/quran/bookmarks"
        element={
          <Protected>
            <QuranBookmarks />
          </Protected>
        }
      />
      <Route
        path="/quran/hifz"
        element={
          <Protected>
            <QuranHifz />
          </Protected>
        }
      />
      <Route
        path="/quran/read/:surah"
        element={
          <Protected>
            <QuranReader />
          </Protected>
        }
      />
      <Route
        path="/zikr/analytics"
        element={
          <Protected>
            <ZikrAnalytics />
          </Protected>
        }
      />
      <Route
        path="/welcome"
        element={
          <Protected>
            <Onboarding />
          </Protected>
        }
      />
      <Route
        path="/settings"
        element={
          <Protected>
            <Settings />
          </Protected>
        }
      />
      <Route
        path="/profile"
        element={
          <Protected>
            <Profile />
          </Protected>
        }
      />
      <Route path="/special-day/:id" element={<IslamicSpecialDay />} />
      <Route
        path="/friends"
        element={
          <Protected>
            <Friends />
          </Protected>
        }
      />
      <Route
        path="/cycle"
        element={
          <Protected>
            <RayhanahCycle />
          </Protected>
        }
      />
      <Route
        path="/ramadan"
        element={
          <Protected>
            <RamadanTracker />
          </Protected>
        }
      />
      <Route
        path="/ramadan/analytics"
        element={
          <Protected>
            <RamadanAnalytics />
          </Protected>
        }
      />
      <Route
        path="/cycle/analytics"
        element={
          <Protected>
            <CycleAnalytics />
          </Protected>
        }
      />
      {/* Public: handles guests itself (sign-in gate that returns here) */}
      <Route path="/connect/:code" element={<ConnectFriend />} />
      {/* Public: guests can donate too, so these are unwrapped */}
      <Route path="/sadaqah" element={<Sadaqah />} />
      <Route path="/sadaqah/donate" element={<SadaqahDonate />} />
      <Route path="/sadaqah/thank-you" element={<SadaqahThankYou />} />
      <Route path="/sadaqah/verify/:id" element={<SadaqahVerify />} />
      <Route
        path="/admin"
        element={
          <AdminProtected>
            <AdminHome />
          </AdminProtected>
        }
      />
      <Route
        path="/admin/sadaqah"
        element={
          <AdminProtected>
            <AdminSadaqah />
          </AdminProtected>
        }
      />
      <Route
        path="/admin/zikr-requests"
        element={
          <AdminProtected>
            <AdminZikrRequests />
          </AdminProtected>
        }
      />
      <Route
        path="/admin/users"
        element={
          <AdminProtected>
            <ServantProtected>
              <AdminUsers />
            </ServantProtected>
          </AdminProtected>
        }
      />
      <Route
        path="/admin/users/:uid"
        element={
          <AdminProtected>
            <ServantProtected>
              <AdminUserDetail />
            </ServantProtected>
          </AdminProtected>
        }
      />
      <Route
        path="/admin/accounts"
        element={
          <AdminProtected>
            <ServantProtected>
              <AdminAccounts />
            </ServantProtected>
          </AdminProtected>
        }
      />
      <Route
        path="/admin/feedback"
        element={
          <AdminProtected>
            <AdminFeedback />
          </AdminProtected>
        }
      />
      <Route
        path="/admin/audit-log"
        element={
          <AdminProtected>
            <ServantProtected>
              <AdminAuditLog />
            </ServantProtected>
          </AdminProtected>
        }
      />
      <Route
        path="/admin/ops-health"
        element={
          <AdminProtected>
            <ServantProtected>
              <AdminOpsHealth />
            </ServantProtected>
          </AdminProtected>
        }
      />
      <Route
        path="/admin/broadcast"
        element={
          <AdminProtected>
            <AdminBroadcast />
          </AdminProtected>
        }
      />
      <Route
        path="/admin/moon-sighting"
        element={
          <AdminProtected>
            <ServantProtected>
              <AdminMoonSighting />
            </ServantProtected>
          </AdminProtected>
        }
      />
      <Route
        path="/admin/compose-email"
        element={
          <AdminProtected>
            <ServantProtected>
              <AdminComposeEmail />
            </ServantProtected>
          </AdminProtected>
        }
      />
      <Route path="/about" element={<About />} />
      <Route path="/library/duas" element={<DuaLibrary />} />
      <Route path="/library/adhkar" element={<AdhkarLibrary />} />
      <Route path="/library/asma-ul-husna" element={<AsmaUlHusnaLibrary />} />
      <Route path="/library/zakat-calculator" element={<ZakatCalculatorLibrary />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/feedback" element={<Feedback />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/login" element={<AuthSignIn />} />
      <Route path="/signup" element={<AuthSignUp />} />
      <Route path="/auth/action" element={<AuthAction />} />
      <Route path="/naseeh" element={<NaseehPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
