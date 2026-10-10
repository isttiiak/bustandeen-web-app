// Build-time QR codes for the A4 print sheets (audit T4.4). Imported only by
// entry-server.tsx: qrcode-generator is a devDependency and never reaches a
// browser. The page gets a plain SVG path, so printing needs no request.
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
