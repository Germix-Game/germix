// Critical /home background art — preloaded ahead of time by other pages
// (e.g. /play) so the browser cache is already warm when the player navigates
// back, instead of /home fetching them from scratch.
export const HOME_CRITICAL_ASSETS = [
  "/assets/backgrounds/main_page_background.png",
  "/assets/ui/game-logo.png",
  "/assets/ui/main-page-element-bg.png",
];

// /select's level-picker art — warmed up from /home so the browser cache is
// already warm by the time the player clicks "PLAY NOW".
export const SELECT_CRITICAL_ASSETS = [
  "/assets/game-selection/germix-graphic-game-26.png",
  "/assets/game-selection/bateria_level.png",
  "/assets/game-selection/parasite_level.png",
];

export function preloadImages(srcs: string[]) {
  for (const src of srcs) {
    const img = new window.Image();
    img.src = src;
  }
}
