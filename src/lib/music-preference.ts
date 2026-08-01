export const MUSIC_VOLUME_KEY = "germix-music-volume";
export const MUSIC_MUTED_KEY = "germix-music-muted";
export const MUSIC_PREFERENCE_EVENT = "germix-music-preference";

export const DEFAULT_MUSIC_VOLUME = 70;

export type MusicPreference = {
  volume: number;
  muted: boolean;
};

export function getMusicPreference(): MusicPreference {
  const savedVolume = Number(localStorage.getItem(MUSIC_VOLUME_KEY));
  const savedMuted = localStorage.getItem(MUSIC_MUTED_KEY);

  return {
    volume: Number.isFinite(savedVolume) && savedVolume >= 0 && savedVolume <= 100
      ? savedVolume
      : DEFAULT_MUSIC_VOLUME,
    muted: savedMuted === "true",
  };
}

export function saveMusicPreference({ volume, muted }: MusicPreference): void {
  localStorage.setItem(MUSIC_VOLUME_KEY, String(volume));
  localStorage.setItem(MUSIC_MUTED_KEY, String(muted));
  window.dispatchEvent(
    new CustomEvent<MusicPreference>(MUSIC_PREFERENCE_EVENT, { detail: { volume, muted } }),
  );
}
