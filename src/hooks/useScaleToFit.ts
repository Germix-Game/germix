// useScaleToFit.ts
import { useEffect, useRef, useState } from "react";

export function useScaleToFit(maxScale = 1) {
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

      const scaleX = containerRect.width / contentRect.width;
      const scaleY = containerRect.height / contentRect.height;
      setScale(Math.min(scaleX, scaleY, maxScale));
    };

    const ro = new ResizeObserver(recalc);
    ro.observe(container);
    ro.observe(content);
    recalc();

    return () => ro.disconnect();
  }, [maxScale]);

  return { containerRef, contentRef, scale };
}