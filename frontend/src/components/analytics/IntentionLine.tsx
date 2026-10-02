import { useTranslation } from 'react-i18next';

/** FIQH-05: one quiet line of intention under the tabs of every worship
 * analytics page (not Rayhanah: cycle tracking is not a count of deeds). */
export default function IntentionLine() {
  const { t } = useTranslation();
  return (
    <p className="text-white/60 text-xs text-center leading-relaxed italic">
      {t(
        'common.analyticsIntention',
        'A private mirror for your own growth. Only Allah knows what each deed is worth.'
      )}
    </p>
  );
}
