import { Link } from 'react-router';
import { Trans } from 'react-i18next';

const LINK = 'text-brand-emerald underline underline-offset-2 hover:text-white';

/** "By continuing, you agree to our Terms of Service and Privacy Policy." under
 * the sign-in and sign-up forms. `<1>`/`<3>` go through `components`, never
 * positional children (positional ones silently dropped text before). */
export default function LegalAgreeLine({ mode }: { mode: 'signIn' | 'signUp' }) {
  return (
    <p className="text-center text-white/70 text-xs leading-relaxed px-2">
      <Trans
        i18nKey={mode === 'signIn' ? 'legal.agreeSignIn' : 'legal.agreeSignUp'}
        components={{
          1: <Link to="/terms" className={LINK} />,
          3: <Link to="/privacy" className={LINK} />,
        }}
      />
    </p>
  );
}
