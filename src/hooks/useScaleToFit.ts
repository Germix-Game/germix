// useScaleToFit.ts
import { useEffect, useRef, useState } from "react";

// marginPx is reserved on every side of the container before fitting, so a
// shrink-to-fit scale never lands the content flush against the screen edge
// (e.g. an iPad's rounded corners) — without it, "fit exactly" and "touch
// the edge" are the same outcome.
export function useScaleToFit(maxScale = 1, marginPx = 0) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const recalc = () => {
      // measure content at its natural size first
      content.style.transform = "scale(1)";
      const contentRect = content.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      if (contentRect.height === 0 || contentRect.width === 0) return;

      const availableWidth = Math.max(0, containerRect.width - marginPx * 2);
      const availableHeight = Math.max(0, containerRect.height - marginPx * 2);
      const scaleX = availableWidth / contentRect.width;
      const scaleY = availableHeight / contentRect.height;
      setScale(Math.min(scaleX, scaleY, maxScale));
    };

    const ro = new ResizeObserver(recalc);
    ro.observe(container);
    ro.observe(content);
    recalc();

    return () => ro.disconnect();
  }, [maxScale, marginPx]);

  return { containerRef, contentRef, scale };
}