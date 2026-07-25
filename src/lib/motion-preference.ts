export const MOTION_STORAGE_KEY = "germix-motion-enabled";

export function getMotionPreference(): boolean {
  const savedPreference = localStorage.getItem(MOTION_STORAGE_KEY);

  if (savedPreference === "true" || savedPreference === "false") {
    return savedPreference === "true";
  }

  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function saveMotionPreference(enabled: boolean): void {
  localStorage.setItem(MOTION_STORAGE_KEY, String(enabled));
}
