import { TAHLIL_NAME } from './zikrLibrary.js';

const ZIKR_AUDIO_MAP: Record<string, string> = {
  SubhanAllah: '/audio/zikr/subhanallah.mp3',
  Alhamdulillah: '/audio/zikr/alhamdulillah.mp3',
  'Allahu Akbar': '/audio/zikr/allahu-akbar.mp3',
  'La ilaha illallah': '/audio/zikr/la-ilaha-illallah.mp3',
  [TAHLIL_NAME]: '/audio/zikr/la-ilaha-illallahu-wahdahu.mp3',
  Astaghfirullah: '/audio/zikr/astaghfirullah.mp3',
  'Astaghfirullah wa atubu ilayh': '/audio/zikr/astaghfirullah-wa-atubu.mp3',
  'Sayyidul-Istighfar': '/audio/zikr/sayyidul-istighfar.mp3',
  'SubhanAllah wa bihamdihi': '/audio/zikr/subhanallah-wa-bihamdihi.mp3',
  'SubhanAllahil-Azim wa bihamdihi': '/audio/zikr/subhanallahil-azim.mp3',
  'La hawla wa la quwwata illa billah': '/audio/zikr/la-hawla.mp3',
  'Ayatul Kursi': '/audio/zikr/ayatul-kursi.mp3',
  'Durud Ibrahim': '/audio/zikr/durud-e-brahim.mp3',
  // 'Astaghfirullahal-Azim' and the old "four beloved words" audio were
  // pulled — both were confirmed to be the wrong recitation for their
  // text. Re-add once a correct recording exists (see zikr.audio memory).
};

export function getZikrAudioUrl(zikrName: string): string | null {
  return ZIKR_AUDIO_MAP[zikrName] ?? null;
}

export function hasZikrAudio(zikrName: string): boolean {
  return zikrName in ZIKR_AUDIO_MAP;
}
