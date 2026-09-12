"use client";

import { useCallback, useState } from "react";

/**
 * Measured width of an element, so the chart can lay out in real pixels rather
 * than scale a fixed viewBox and take its type with it. A callback ref rather
 * than an effect: it fires at commit with the node in hand, so the first paint
 * already has a width.
 */
export function useElementWidth(): [(node: HTMLElement | null) => void, number] {
  const [width, setWidth] = useState(0);

  const measure = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    setWidth(node.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [measure, width];
}
