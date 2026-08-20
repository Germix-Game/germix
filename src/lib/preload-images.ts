// Critical /home background art — preloaded ahead of time by other pages
// (e.g. /play) so the browser cache is already warm when the player navigates
// back, instead of /home fetching them from scratch.
export const HOME_CRITICAL_ASSETS = [
  "/assets/backgrounds/main_page_background.webp",
  "/assets/ui/game-logo.webp",
  "/assets/ui/main-page-element-bg.webp",
];

export function preloadImages(srcs: string[]) {
  for (const src of srcs) {
    const img = new window.Image();
    img.src = src;
  }
}
