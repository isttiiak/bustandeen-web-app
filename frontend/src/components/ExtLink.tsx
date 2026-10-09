import type { ReactNode } from 'react';

/**
 * An external link (new tab, no opener/referrer). Use it as a <Trans> slot:
 * <Trans components={{ 1: <ExtLink href="…" /> }} />. Trans fills in the
 * children from the translation, which a bare <a /> slot hides from the
 * jsx-a11y anchor-has-content check (audit T3.5).
 */
export default function ExtLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}
