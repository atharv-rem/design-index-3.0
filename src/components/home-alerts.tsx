import * as React from "react";
import { HeartHandshake, Share2, X } from "lucide-react";
import { motion, useAnimationControls } from "motion/react";

type AlertKind = "sponsor" | "share";

const VISIBLE_MS = 5000;
const FIRST_DELAY_MS = 1500;
const GAP_MS = 1500;
const EXIT_MS = 300;
const SWIPE_DISMISS_PX = 40;
const SWIPE_DISMISS_VELOCITY = 400;

const SESSION_KEY = "design-index-alerts-shown";
const SITE_URL ="https://designindex.xyz";

export function HomeAlerts() {
	const [active, setActive] = React.useState<AlertKind | null>(null);
	const [shown, setShown] = React.useState(false);
	const [isMobile, setIsMobile] = React.useState(false);
	const controls = useAnimationControls();
	const draggedRef = React.useRef(false);

	// Swipe-up-to-dismiss only on mobile, where the alert sits at the top of the screen.
	React.useEffect(() => {
		const mq = window.matchMedia("(max-width: 767px)");
		const update = () => setIsMobile(mq.matches);
		update();
		mq.addEventListener("change", update);
		return () => mq.removeEventListener("change", update);
	}, []);

	React.useEffect(() => {
		// Show the alerts once per browser session, on whichever page is visited first.
		try {
			if (sessionStorage.getItem(SESSION_KEY)) return;
			sessionStorage.setItem(SESSION_KEY, "1");
		} catch {
			// storage unavailable: fall through and show them
		}

		const timers: number[] = [];
		const queue: AlertKind[] = ["sponsor", "share"];

		const run = (index: number, delay: number) => {
			if (index >= queue.length) return;
			timers.push(
				window.setTimeout(() => {
					setActive(queue[index]);
					setShown(true);
					timers.push(
						window.setTimeout(() => {
							setShown(false);
							timers.push(
								window.setTimeout(() => {
									setActive(null);
									run(index + 1, GAP_MS);
								}, EXIT_MS)
							);
						}, VISIBLE_MS)
					);
				}, delay)
			);
		};

		run(0, FIRST_DELAY_MS);
		return () => timers.forEach((t) => window.clearTimeout(t));
	}, []);

	const dismiss = () => setShown(false);

	const share = async () => {
		if (draggedRef.current) return;
		const data = { title: "Design Index", text: "Curated design tools & resources", url: SITE_URL };
		try {
			if (navigator.share) {
				await navigator.share(data);
			} else {
				await navigator.clipboard.writeText(SITE_URL);
			}
		} catch {
			// user cancelled or clipboard unavailable
		}
	};

	if (!active) return null;

	const cardClassName =
		"flex w-full cursor-pointer items-center gap-3 rounded-2xl p-3 pr-9 md:gap-4 md:p-4 md:pr-11";

	const cardContent = (
		<>
			<div className="flex size-11 shrink-0 md:size-14 items-center justify-center rounded-xl bg-muted">
				{active === "sponsor" ? (
					<HeartHandshake className="size-5 md:size-6" strokeWidth={1.75} />
				) : (
					<Share2 className="size-5 md:size-6" strokeWidth={1.75} />
				)}
			</div>
			<p className="font-google text-xs font-medium leading-[1.3] md:text-[13px]">
				{active === "sponsor"
					? "This is an open-source project, and we welcome sponsorship opportunities."
					: "Enjoying Design Index? Help other designers find it by sharing it."}
			</p>
		</>
	);

	return (
		<div
			className={`pointer-events-none fixed inset-x-3 top-3 z-50 transition-all duration-300 ease-out md:inset-x-auto md:top-auto md:bottom-4 md:right-4 md:w-96 ${
				shown
					? "translate-y-0 opacity-100"
					: "-translate-y-4 opacity-0 md:translate-y-4"
			}`}
		>
			<motion.div
				role="status"
				animate={controls}
				drag={isMobile ? "y" : false}
				dragConstraints={{ top: 0, bottom: 0 }}
				dragElastic={{ top: 0.6, bottom: 0.05 }}
				onDragStart={() => {
					draggedRef.current = true;
				}}
				onDragEnd={(_, info) => {
					window.setTimeout(() => {
						draggedRef.current = false;
					}, 0);
					if (info.offset.y < -SWIPE_DISMISS_PX || info.velocity.y < -SWIPE_DISMISS_VELOCITY) {
						controls
							.start({ y: -160, opacity: 0, transition: { duration: 0.2, ease: "easeOut" } })
							.then(dismiss);
					}
				}}
				className="pointer-events-auto relative touch-pan-x rounded-2xl bg-background text-foreground ring-1 ring-black/10 shadow-[0_12px_32px_-6px_rgb(0_0_0/0.28),0_4px_12px_-4px_rgb(0_0_0/0.18)] dark:ring-white/15 dark:shadow-[0_16px_40px_-6px_rgb(0_0_0/0.85),0_0_0_1px_rgb(0_0_0/0.6)]"
			>
				{active === "sponsor" ? (
					<a
						href="/sponsor"
						data-cuelume-navigate
						className={cardClassName}
						onClick={(e) => {
							if (draggedRef.current) e.preventDefault();
						}}
					>
						{cardContent}
					</a>
				) : (
					<button type="button" data-cuelume-tap onClick={share} className={`${cardClassName} text-left`}>
						{cardContent}
					</button>
				)}
				<button
					type="button"
					aria-label="Dismiss"
					onClick={dismiss}
					data-cuelume-close
					data-cuelume-emphasis="subtle"
					className="absolute top-3 right-3 md:top-4 md:right-4 text-muted-foreground hover:text-foreground"
				>
					<X className="size-4" />
				</button>
			</motion.div>
		</div>
	);
}
