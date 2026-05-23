"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useEffect } from "react";

type HomeScrollFadeProps = {
  fadeDistanceMultiplier?: number;
};

export default function HomeScrollFade({
  fadeDistanceMultiplier = 1.1,
}: HomeScrollFadeProps) {
  const rawOpacity = useMotionValue(0);
  const prefersReducedMotion = useReducedMotion();
  const smoothOpacity = useSpring(rawOpacity, {
    stiffness: 160,
    damping: 28,
    mass: 0.25,
  });

  useEffect(() => {
    const pageRoot = document.querySelector<HTMLElement>(".min-w-0.flex-1");
    const rootStyles = pageRoot ? window.getComputedStyle(pageRoot) : null;

    const hasInternalScroll =
      pageRoot &&
      (rootStyles?.overflowY === "auto" || rootStyles?.overflowY === "scroll") &&
      pageRoot.scrollHeight > pageRoot.clientHeight;

    const scrollTarget: Window | HTMLElement =
      hasInternalScroll && pageRoot ? pageRoot : window;

    let fadeDistance = Math.max(window.innerHeight * fadeDistanceMultiplier, 1);

    const getScrollTop = () => {
      if (scrollTarget instanceof Window) {
        return window.scrollY || document.documentElement.scrollTop || 0;
      }

      return scrollTarget.scrollTop;
    };

    const updateFade = () => {
      const progress = Math.min(getScrollTop() / fadeDistance, 1);
      rawOpacity.set(progress);
    };

    const updateFadeDistance = () => {
      fadeDistance = Math.max(window.innerHeight * fadeDistanceMultiplier, 1);
      updateFade();
    };

    scrollTarget.addEventListener("scroll", updateFade, { passive: true });
    window.addEventListener("resize", updateFadeDistance);
    updateFade();

    return () => {
      scrollTarget.removeEventListener("scroll", updateFade);
      window.removeEventListener("resize", updateFadeDistance);
    };
  }, [fadeDistanceMultiplier, rawOpacity]);

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-20 theme-body-bg"
      style={{ opacity: prefersReducedMotion ? rawOpacity : smoothOpacity }}
    />
  );
}
