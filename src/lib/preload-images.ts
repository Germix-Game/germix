// Critical /home background art — preloaded ahead of time by other pages
// (e.g. /play) so the browser cache is already warm when the player navigates
// back, instead of /home fetching them from scratch.
export const HOME_CRITICAL_ASSETS = [
  "/assets/backgrounds/main_page_background.png",
  "/assets/ui/game-logo.png",
  "/assets/ui/main-page-element-bg.png",
];

export function preloadImages(srcs: string[]) {
  for (const src of srcs) {
    const img = new window.Image();
    img.src = src;
  }
}
