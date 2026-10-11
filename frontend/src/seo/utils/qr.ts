// QR codes as a plain SVG path: built at prerender time for the A4 print
// sheets (audit T4.4, so printing needs no request), and in the browser only
// for the admin authenticator setup (AdminMfaStep, lazy admin chunk).
import qrcode from 'qrcode-generator';

export interface QrPath {
  /** Modules per side, including the quiet zone. */
  size: number;
  /** One filled rectangle per run of dark modules. */
  d: string;
}

const QUIET = 2;

export function qrPath(text: string): QrPath {
  const qr = qrcode(0, 'M');
  qr.addData(text, 'Byte');
  qr.make();
  const n = qr.getModuleCount();
  let d = '';
  for (let y = 0; y < n; y++) {
    let x = 0;
    while (x < n) {
      if (!qr.isDark(y, x)) {
        x++;
        continue;
      }
      let run = 1;
      while (x + run < n && qr.isDark(y, x + run)) run++;
      d += `M${x + QUIET} ${y + QUIET}h${run}v1h-${run}z`;
      x += run;
    }
  }
  return { size: n + QUIET * 2, d };
}
