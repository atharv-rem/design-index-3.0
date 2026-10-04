"use client";

import React, { useRef } from "react";
import {
    motion,
    useScroll,
    useSpring,
    useTransform,
    useMotionValue,
    useVelocity,
    useAnimationFrame,
    wrap,
} from "framer-motion";
import { cn } from "@/lib/utils";

interface ScrollBasedVelocityProps {
    text: string;
    default_velocity?: number;
    className?: string;
    containerRef?: React.RefObject<HTMLElement | null>;
}

interface ParallaxProps {
    children: string;
    baseVelocity: number;
    className?: string;
    containerRef?: React.RefObject<HTMLElement | null>;
}

function ParallaxText({ children, baseVelocity = 100, className, containerRef }: ParallaxProps) {
    const baseX = useMotionValue(0);
    const { scrollY } = useScroll(containerRef ? { container: containerRef } : undefined);
    const scrollVelocity = useVelocity(scrollY);
    const smoothVelocity = useSpring(scrollVelocity, {
        damping: 50,
        stiffness: 400,
    });
    const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 2], {
        clamp: false,
    });

    /**
     * This is a magic wrapping for the length of the text - you
     * have to replace for wrapping that works for you or dynamically
     * calculate
     */
    const x = useTransform(baseX, (v) => `${wrap(-12.5, 0, v)}%`);

    const directionFactor = useRef<number>(1);
    useAnimationFrame((t, delta) => {
        let moveBy = directionFactor.current * baseVelocity * (delta / 1000);

        /**
         * This is what changes the direction of the scroll once we
         * switch scrolling directions.
         */
        if (velocityFactor.get() < 0) {
            directionFactor.current = -1;
        } else if (velocityFactor.get() > 0) {
            directionFactor.current = 1;
        }

        moveBy += directionFactor.current * moveBy * velocityFactor.get();

        baseX.set(baseX.get() + moveBy);
    });

    return (
        <div className="overflow-hidden whitespace-nowrap flex flex-nowrap" style={{ width: '100%' }}>
            <motion.div
                className={cn("flex whitespace-nowrap", className)}
                style={{ x }}
            >
                {Array.from({ length: 8 }).map((_, i) => (
                    <span key={i} className="block mr-10 last:mr-10">{children}</span>
                ))}
            </motion.div>
        </div>
    );
}

export function ScrollBasedVelocity({
    text,
    default_velocity = 5,
    className,
    containerRef,
}: ScrollBasedVelocityProps) {
    return (
        <section className="relative w-full">
            <ParallaxText baseVelocity={default_velocity} className={className} containerRef={containerRef}>
                {text}
            </ParallaxText>
            <ParallaxText baseVelocity={-default_velocity} className={className} containerRef={containerRef}>
                {text}
            </ParallaxText>
        </section>
    );
}
