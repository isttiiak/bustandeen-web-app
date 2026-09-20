import crypto from 'crypto';
import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import qrcode from 'qrcode-generator';
import type { IDonation } from '../models/Donation.js';
import { sadaqahRef } from './sadaqahEmail.templates.js';
import { EL_MESSIRI_BOLD_B64, EL_MESSIRI_MEDIUM_B64 } from './receiptFonts.js';

/**
 * Signed PDF receipt for a verified sadaqah.
 *
 * "Signed" here means a server-held HMAC-SHA256 over the receipt's canonical
 * facts (id, amount, transaction ID, verification time). The signature is
 * printed on the PDF and embedded in a QR / link that a public endpoint
 * re-checks, so any edit to the amount, date or ID no longer matches. It is
 * tamper-evident and verifiable by Bustandeen, not a PKI/PAdES signature that
 * a PDF reader would show as "signed" — that needs a purchased certificate.
 */

export const RECEIPT_CONTACT_EMAIL = 'sadaqah@bustandeen.com';
export const RECEIPT_ORIGIN = 'Dhaka, Bangladesh';
const SITE = 'bustandeen.com';

// ── Signing ─────────────────────────────────────────────────────────────────

const getSigningKey = (): Buffer | null => {
  const raw = process.env.RECEIPT_SIGNING_KEY || process.env.FIELD_ENCRYPTION_KEY;
  if (!raw) return null;
  // Domain-separated so reusing FIELD_ENCRYPTION_KEY as the fallback never
  // exposes that key's raw bytes as an HMAC key for anything else.
  return crypto.createHmac('sha256', 'bustandeen-sadaqah-receipt-v1').update(raw).digest();
};

const canonical = (
  d: Pick<IDonation, 'amount' | 'transactionId' | 'verifiedAt'> & { id: string }
) =>
  [
    'bustandeen-sadaqah-receipt',
    'v1',
    d.id,
    String(d.amount),
    d.transactionId,
    d.verifiedAt ? new Date(d.verifiedAt).toISOString() : '',
  ].join('|');

type Signable = Pick<IDonation, 'amount' | 'transactionId' | 'verifiedAt'> & { id: string };

/** base64url HMAC, or null when no signing key is configured. */
export const signReceipt = (d: Signable): string | null => {
  const key = getSigningKey();
  if (!key) return null;
  return crypto.createHmac('sha256', key).update(canonical(d)).digest('base64url');
};

export const verifyReceiptSignature = (d: Signable, sig: string): boolean => {
  const expected = signReceipt(d);
  if (!expected) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const siteOrigin = (): string => {
  const o = process.env.FRONTEND_ORIGIN;
  return o && o.startsWith('https://') ? o.replace(/\/$/, '') : `https://${SITE}`;
};

export const receiptFilename = (id: string): string =>
  `Bustandeen-Sadaqah-Receipt-${sadaqahRef(id)}.pdf`;

export const receiptVerifyUrl = (id: string, sig: string): string =>
  `${siteOrigin()}/sadaqah/verify/${id}?s=${sig}`;

// ── Drawing helpers (designed in top-down coordinates, like SVG) ────────────

const W = 595.28;
const H = 841.89;

const C = {
  void: rgb(0.031, 0.204, 0.157), // deep emerald
  deep: rgb(0.043, 0.267, 0.204),
  mid: rgb(0.063, 0.412, 0.31),
  emerald: rgb(0.063, 0.725, 0.506),
  mint: rgb(0.8, 0.93, 0.87),
  gold: rgb(0.851, 0.627, 0.11),
  goldLight: rgb(0.96, 0.8, 0.42),
  goldDark: rgb(0.62, 0.43, 0.04),
  cream: rgb(0.992, 0.978, 0.945),
  paper: rgb(1, 1, 1),
  ink: rgb(0.06, 0.13, 0.11),
  archInner: rgb(0.04, 0.24, 0.185),
  muted: rgb(0.36, 0.43, 0.4),
  line: rgb(0.86, 0.9, 0.87),
};

const poly = (pts: Array<[number, number]>): string =>
  `M ${pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(' L ')} Z`;

/** {n/2}-style star: alternating outer/inner radius points around a centre. */
const starPoints = (
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  points: number,
  rot = -Math.PI / 2
): Array<[number, number]> => {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rot + (i * Math.PI) / points;
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return out;
};

type Rgb = ReturnType<typeof rgb>;

interface Ctx {
  page: PDFPage;
  med: PDFFont;
  bold: PDFFont;
}

const fillPath = (
  { page }: Ctx,
  path: string,
  color: Rgb,
  opacity = 1,
  border?: { color: Rgb; width: number; opacity?: number }
) =>
  page.drawSvgPath(path, {
    x: 0,
    y: H,
    color,
    opacity,
    ...(border
      ? { borderColor: border.color, borderWidth: border.width, borderOpacity: border.opacity ?? 1 }
      : {}),
  });

const rect = (
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  color: Rgb,
  opacity = 1,
  radius = 0
) => {
  if (radius <= 0) {
    ctx.page.drawRectangle({ x, y: H - y - h, width: w, height: h, color, opacity });
    return;
  }
  const r = Math.min(radius, w / 2, h / 2);
  const path =
    `M ${x + r} ${y} L ${x + w - r} ${y} Q ${x + w} ${y} ${x + w} ${y + r} ` +
    `L ${x + w} ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} ` +
    `L ${x + r} ${y + h} Q ${x} ${y + h} ${x} ${y + h - r} ` +
    `L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
  fillPath(ctx, path, color, opacity);
};

/** Glyphs El Messiri's Latin subset lacks (e.g. Bengali names) would render
 *  as blank boxes, so drop them rather than ship a broken-looking PDF. */
const safeText = (font: PDFFont, text: string): string => {
  const supported = new Set(font.getCharacterSet());
  const cleaned = Array.from(text.replace(/[\r\n\t]+/g, ' '))
    .filter((ch) => supported.has(ch.codePointAt(0)!))
    .join('')
    .trim();
  return cleaned;
};

const fit = (font: PDFFont, text: string, size: number, maxWidth: number): string => {
  const t = safeText(font, text);
  if (font.widthOfTextAtSize(t, size) <= maxWidth) return t;
  let s = t;
  while (s.length > 1 && font.widthOfTextAtSize(`${s}...`, size) > maxWidth) s = s.slice(0, -1);
  return `${s.trimEnd()}...`;
};

const text = (
  ctx: Ctx,
  str: string,
  x: number,
  yTop: number,
  size: number,
  color: Rgb,
  opts: { bold?: boolean; align?: 'left' | 'center' | 'right'; maxWidth?: number } = {}
) => {
  const font = opts.bold ? ctx.bold : ctx.med;
  const t = opts.maxWidth ? fit(font, str, size, opts.maxWidth) : safeText(font, str);
  const w = font.widthOfTextAtSize(t, size);
  const px = opts.align === 'center' ? x - w / 2 : opts.align === 'right' ? x - w : x;
  ctx.page.drawText(t, { x: px, y: H - yTop - size * 0.8, size, font, color });
};

/** Islamic 8-point-star lattice — the header/footer texture. */
const starLattice = (
  ctx: Ctx,
  x0: number,
  y0: number,
  w: number,
  h: number,
  cell: number,
  color: Rgb,
  opacity: number
) => {
  for (let row = 0; row * cell < h + cell; row++) {
    for (let col = 0; col * cell < w + cell; col++) {
      const cx = x0 + col * cell + (row % 2 ? cell / 2 : 0);
      const cy = y0 + row * cell * 0.5;
      if (cx > x0 + w + cell / 2 || cy > y0 + h + cell / 2) continue;
      const path = poly(starPoints(cx, cy, cell * 0.42, cell * 0.2, 8));
      fillPath(ctx, path, color, opacity);
    }
  }
};

const drawCrescent = (ctx: Ctx, cx: number, cy: number, r: number, color: Rgb) => {
  // A disc with an offset disc (the arch's own fill colour) cut out of it.
  ctx.page.drawCircle({ x: cx, y: H - cy, size: r, color });
  ctx.page.drawCircle({ x: cx + r * 0.42, y: H - cy, size: r * 0.86, color: C.archInner });
};

/** Mihrab-style pointed arch silhouette used as the header emblem frame. */
const archPath = (cx: number, top: number, w: number, h: number): string => {
  const l = cx - w / 2;
  const r = cx + w / 2;
  const shoulder = top + h * 0.42;
  const bottom = top + h;
  return (
    `M ${l} ${bottom} L ${l} ${shoulder} ` +
    `C ${l} ${top + h * 0.2} ${cx - w * 0.18} ${top + h * 0.08} ${cx} ${top} ` +
    `C ${cx + w * 0.18} ${top + h * 0.08} ${r} ${top + h * 0.2} ${r} ${shoulder} ` +
    `L ${r} ${bottom} Z`
  );
};

const drawHeader = (ctx: Ctx) => {
  // Vertical emerald gradient, banded (pure vector, no image).
  const bands = 40;
  const headerH = 206;
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    const col = rgb(
      C.void.red + (C.mid.red - C.void.red) * t,
      C.void.green + (C.mid.green - C.void.green) * t,
      C.void.blue + (C.mid.blue - C.void.blue) * t
    );
    rect(ctx, 0, (headerH / bands) * i, W, headerH / bands + 0.6, col);
  }
  starLattice(ctx, -10, -8, W + 20, headerH, 44, C.mint, 0.07);

  // Soft glow discs behind the emblem.
  for (let i = 5; i >= 1; i--) {
    ctx.page.drawCircle({
      x: W / 2,
      y: H - 78,
      size: 22 + i * 13,
      color: C.gold,
      opacity: 0.035 * (6 - i),
    });
  }

  // Emblem: arch frame, crescent, star.
  fillPath(ctx, archPath(W / 2, 20, 104, 118), C.deep, 0.9, { color: C.gold, width: 1.6 });
  fillPath(ctx, archPath(W / 2, 30, 84, 98), C.archInner, 1, {
    color: C.goldLight,
    width: 0.7,
    opacity: 0.8,
  });
  drawCrescent(ctx, W / 2 - 4, 88, 20, C.goldLight);
  fillPath(ctx, poly(starPoints(W / 2 + 12, 82, 9, 4, 5)), C.goldLight);

  text(ctx, 'SADAQAH RECEIPT', W / 2, 146, 27, C.paper, { bold: true, align: 'center' });
  text(ctx, 'Bustandeen  |  Nourish Your Deen', W / 2, 180, 11.5, C.mint, { align: 'center' });

  // Gold rule under the header, with a small centre star.
  rect(ctx, 0, headerH, W, 3, C.gold);
  fillPath(ctx, poly(starPoints(W / 2, headerH + 1.5, 9, 4.2, 8)), C.gold, 1, {
    color: C.cream,
    width: 1.5,
  });
};

const drawSeal = (ctx: Ctx, cx: number, cy: number) => {
  // Rosette: two rotated 16-point stars + concentric rings + check mark.
  fillPath(ctx, poly(starPoints(cx, cy, 52, 45, 24)), C.goldDark, 0.35);
  fillPath(ctx, poly(starPoints(cx, cy, 50, 43, 24)), C.gold, 1, {
    color: C.goldDark,
    width: 0.8,
  });
  ctx.page.drawCircle({ x: cx, y: H - cy, size: 38, color: C.void });
  ctx.page.drawCircle({
    x: cx,
    y: H - cy,
    size: 32,
    borderColor: C.goldLight,
    borderWidth: 0.6,
    borderOpacity: 0.9,
  });
  // Check mark
  ctx.page.drawSvgPath(`M ${cx - 13} ${cy - 3} L ${cx - 4} ${cy + 7} L ${cx + 14} ${cy - 13}`, {
    x: 0,
    y: H,
    borderColor: C.emerald,
    borderWidth: 4.4,
    borderLineCap: 1,
  });
  text(ctx, 'VERIFIED', cx, cy + 15, 8.5, C.goldLight, { bold: true, align: 'center' });
};

const drawQr = (ctx: Ctx, url: string, x: number, y: number, size: number) => {
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  const n = qr.getModuleCount();
  const cell = size / n;
  rect(ctx, x - 8, y - 8, size + 16, size + 16, C.paper, 1, 8);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) {
        ctx.page.drawRectangle({
          x: x + c * cell,
          y: H - (y + r * cell) - cell,
          width: cell + 0.15,
          height: cell + 0.15,
          color: C.void,
        });
      }
    }
  }
};

export interface ReceiptInput {
  id: string;
  donorName: string | null;
  onBehalfOf: string | null;
  amount: number;
  transactionId: string;
  paymentMethod: 'bkash' | 'nagad';
  transactionDate: Date;
  verifiedAt: Date;
}

const fmtDate = (d: Date): string =>
  d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Dhaka',
  });

const fmtDateTime = (d: Date): string =>
  `${d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Dhaka',
  })} (BST, UTC+6)`;

export const buildReceiptPdf = async (input: ReceiptInput): Promise<Uint8Array> => {
  const sig = signReceipt({
    id: input.id,
    amount: input.amount,
    transactionId: input.transactionId,
    verifiedAt: input.verifiedAt,
  });
  if (!sig) throw new Error('No receipt signing key configured (RECEIPT_SIGNING_KEY).');

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const med = await pdf.embedFont(Buffer.from(EL_MESSIRI_MEDIUM_B64, 'base64'), { subset: true });
  const bold = await pdf.embedFont(Buffer.from(EL_MESSIRI_BOLD_B64, 'base64'), { subset: true });
  const page = pdf.addPage([W, H]);
  const ctx: Ctx = { page, med, bold };
  const ref = sadaqahRef(input.id);

  pdf.setTitle(`Sadaqah Receipt #${ref}`);
  pdf.setAuthor('Bustandeen');
  pdf.setSubject(`Verified sadaqah of ${input.amount} BDT`);
  pdf.setKeywords(['sadaqah', 'receipt', `sig:${sig}`]);
  pdf.setCreator('Bustandeen');
  pdf.setProducer('Bustandeen');
  pdf.setCreationDate(input.verifiedAt);
  pdf.setModificationDate(input.verifiedAt);

  // Page background
  rect(ctx, 0, 0, W, H, C.cream);
  drawHeader(ctx);

  // ── Amount hero card ──
  const cardX = 48;
  const cardW = W - 96;
  const heroY = 228;
  rect(ctx, cardX + 2, heroY + 3, cardW, 116, C.void, 0.08, 18);
  rect(ctx, cardX, heroY, cardW, 116, C.paper, 1, 18);
  fillPath(
    ctx,
    `M ${cardX + 18} ${heroY} L ${cardX + cardW - 18} ${heroY} Q ${cardX + cardW} ${heroY} ${cardX + cardW} ${heroY + 18} L ${cardX + cardW} ${heroY + 30} L ${cardX} ${heroY + 30} L ${cardX} ${heroY + 18} Q ${cardX} ${heroY} ${cardX + 18} ${heroY} Z`,
    C.mint,
    0.55
  );
  text(ctx, 'AMOUNT GIVEN', W / 2, heroY + 9, 10.5, C.deep, { bold: true, align: 'center' });
  text(ctx, `${input.amount.toLocaleString('en-US')} BDT`, W / 2, heroY + 36, 42, C.void, {
    bold: true,
    align: 'center',
  });
  const who = input.donorName ? input.donorName : 'Anonymous';
  text(ctx, `Given by ${who}`, W / 2, heroY + 90, 14, C.mid, {
    align: 'center',
    maxWidth: cardW - 40,
  });

  // ── Detail rows ──
  const rows: Array<[string, string]> = [
    ['Receipt no.', `#${ref}`],
    ['Transaction ID', input.transactionId],
    ['Payment method', input.paymentMethod === 'bkash' ? 'bKash' : 'Nagad'],
    ['Transaction date', fmtDate(input.transactionDate)],
    ['Verified on', fmtDate(input.verifiedAt)],
    ['Status', 'Verified by the Bustandeen team'],
  ];
  if (input.onBehalfOf) rows.splice(1, 0, ['On behalf of', input.onBehalfOf]);

  const rowsY = 360;
  const rowH = 30;
  rect(ctx, cardX, rowsY, cardW, rowH * rows.length + 8, C.paper, 1, 16);
  rows.forEach(([label, value], i) => {
    const y = rowsY + 4 + i * rowH;
    if (i > 0) rect(ctx, cardX + 20, y, cardW - 40, 0.7, C.line);
    // small gold star bullet
    fillPath(ctx, poly(starPoints(cardX + 26, y + rowH / 2, 4.2, 1.9, 8)), C.gold);
    text(ctx, label, cardX + 40, y + 8, 12, C.muted);
    text(ctx, value, cardX + cardW - 22, y + 7, 13.5, C.ink, {
      bold: true,
      align: 'right',
      maxWidth: cardW - 210,
    });
  });

  // ── Dua strip ──
  const duaY = rowsY + rowH * rows.length + 30;
  text(ctx, 'May Allah accept it from you and make it a sadaqah jariyah.', W / 2, duaY, 14, C.mid, {
    align: 'center',
    maxWidth: cardW,
  });
  text(ctx, 'JazakAllahu khayran.', W / 2, duaY + 20, 12, C.goldDark, {
    bold: true,
    align: 'center',
  });

  // ── Signature + QR block ──
  const sigY = 664;
  rect(ctx, cardX, sigY, cardW, 104, C.paper, 1, 16);
  fillPath(
    ctx,
    `M ${cardX} ${sigY + 16} Q ${cardX} ${sigY} ${cardX + 16} ${sigY} L ${cardX + 20} ${sigY} L ${cardX + 20} ${sigY + 104} L ${cardX + 16} ${sigY + 104} Q ${cardX} ${sigY + 104} ${cardX} ${sigY + 88} Z`,
    C.gold
  );
  const verifyUrl = receiptVerifyUrl(input.id, sig);
  drawQr(ctx, verifyUrl, cardX + 42, sigY + 18, 68);
  text(ctx, 'DIGITALLY SIGNED BY BUSTANDEEN', cardX + 136, sigY + 14, 10.5, C.deep, { bold: true });
  text(ctx, `Signed ${fmtDateTime(input.verifiedAt)}`, cardX + 136, sigY + 32, 9.5, C.muted);
  text(ctx, 'Signature (HMAC-SHA256)', cardX + 136, sigY + 50, 9.5, C.muted);
  text(ctx, sig.slice(0, 22), cardX + 136, sigY + 63, 10.5, C.ink, { bold: true });
  text(ctx, sig.slice(22), cardX + 136, sigY + 77, 10.5, C.ink, { bold: true });
  text(
    ctx,
    'Scan the code, or visit bustandeen.com, to confirm this receipt is genuine.',
    cardX + 136,
    sigY + 91,
    8.5,
    C.muted,
    {
      maxWidth: cardW - 150,
    }
  );

  drawSeal(ctx, cardX + 62, heroY + 60);
  // Mirror ornament on the right so the hero card stays balanced.
  fillPath(ctx, poly(starPoints(cardX + cardW - 62, heroY + 60, 44, 22, 8)), C.mint, 0.55);
  fillPath(
    ctx,
    poly(starPoints(cardX + cardW - 62, heroY + 60, 28, 14, 8, -Math.PI / 8)),
    C.gold,
    0.25
  );

  // ── Footer ──
  const footY = 786;
  rect(ctx, 0, footY, W, H - footY, C.void);
  starLattice(ctx, -10, footY - 6, W + 20, H - footY + 12, 30, C.mint, 0.06);
  rect(ctx, 0, footY, W, 2.5, C.gold);
  text(ctx, `Contact  ${RECEIPT_CONTACT_EMAIL}`, W / 2, footY + 14, 12, C.paper, {
    bold: true,
    align: 'center',
  });
  text(ctx, `Bustandeen  |  ${RECEIPT_ORIGIN}  |  ${SITE}`, W / 2, footY + 33, 10.5, C.mint, {
    align: 'center',
  });

  return pdf.save();
};
