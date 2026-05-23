import { SidebarTrigger } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { useEffect, useState } from "react"
import { Sun, Moon } from "lucide-react"

type SocialLink = {
  label: string
  href: string
  icon: string
}

type BottomFloatingNavbarProps = {
  socialLinks?: SocialLink[]
  visitUrl?: string
  shareTitle?: string
}

const STORAGE_KEY = "design-index-theme"

export default function BottomFloatingNavbar({
  socialLinks = [],
  visitUrl,
  shareTitle,
}: BottomFloatingNavbarProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [isDark, setIsDark] = useState(true)
  const [shareLabel, setShareLabel] = useState("Share")

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    setIsDark(stored ? stored === "dark" : true)
    setIsMounted(true)
  }, [])

  const toggleTheme = () => {
    const newIsDark = !isDark
    setIsDark(newIsDark)
    const root = document.documentElement
    root.classList.toggle("dark", newIsDark)
    root.dataset.theme = newIsDark ? "dark" : "light"
    localStorage.setItem(STORAGE_KEY, newIsDark ? "dark" : "light")
    const metaTheme = document.querySelector('meta[name="theme-color"]')
    if (metaTheme) {
      metaTheme.setAttribute("content", newIsDark ? "#000000" : "#ffffff")
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    const title = shareTitle || document.title
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${title} | Design Index`,
          text: `Check out ${title} on Design Index`,
          url: url,
        })
        return
      }
      await navigator.clipboard.writeText(url)
      setShareLabel("Copied")
      setTimeout(() => setShareLabel("Share"), 1500)
    } catch (err) {
      // Ignore
    }
  }

  const hasVisitActions = typeof visitUrl === "string" && visitUrl.trim().length > 0

  if (!isMounted) {
    return (
      <div className={`shadow-everywhere fixed bottom-6 left-1/2 z-40 w-[calc(100%-1.5rem)] -translate-x-1/2 rounded-full border border-[var(--app-border-strong)] bg-[var(--app-navbar)] px-3 py-1.5 backdrop-blur-md flex items-center justify-between gap-2.5 transition-all duration-300 ${
        hasVisitActions ? "max-w-[390px]" : "max-w-[270px]"
      }`}>
        <Skeleton className="h-7 w-7 rounded-full bg-zinc-800 shrink-0" />
        {hasVisitActions && (
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-7 w-12 rounded-full bg-zinc-800" />
            <Skeleton className="h-7 w-12 rounded-full bg-zinc-800" />
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-5 w-5 rounded-full bg-zinc-800" />
          <Skeleton className="h-5 w-5 rounded-full bg-zinc-800" />
          <Skeleton className="h-5 w-5 rounded-full bg-zinc-800" />
        </div>
        <Skeleton className="h-7 w-7 rounded-full bg-zinc-800 shrink-0" />
      </div>
    )
  }

  return (
    <div className={`shadow-everywhere fixed bottom-6 left-1/2 z-40 w-[calc(100%-1.5rem)] -translate-x-1/2 rounded-full border border-[var(--app-border-strong)] bg-[var(--app-navbar)] px-3.5 py-1.5 backdrop-blur-md flex items-center justify-between gap-3 transition-all duration-300 ${
      hasVisitActions ? "max-w-[390px]" : "max-w-[270px]"
    }`}>
      {/* Sidebar Icon Toggle */}
      <SidebarTrigger className="h-7 w-7 rounded-full p-0 theme-nav-control transition-colors shrink-0" />

      {/* Center Actions if visitUrl is present */}
      {hasVisitActions && (
        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={visitUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-7 items-center justify-center rounded-full bg-[var(--app-text)] px-3 text-[9px] font-departure font-semibold uppercase tracking-[0.08em] text-[var(--app-bg)] hover:opacity-90 transition shrink-0"
          >
            Visit
          </a>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex h-7 items-center justify-center rounded-full border border-[var(--app-border-strong)] bg-[var(--app-surface-soft)] px-2.5 text-[9px] font-departure font-semibold uppercase tracking-[0.08em] theme-text-primary hover:bg-[var(--app-sidebar-accent)] transition shrink-0 cursor-pointer"
          >
            {shareLabel}
          </button>
        </div>
      )}

      {/* Social Icons Link Grid */}
      <nav aria-label="Social links" className="flex items-center gap-1">
        {socialLinks.map((social) => (
          <a
            key={social.label}
            href={social.href}
            target="_blank"
            rel="noreferrer"
            aria-label={social.label}
            className="rounded-full p-1 theme-nav-control transition-colors shrink-0"
          >
            <img
              src={social.icon}
              alt=""
              loading="lazy"
              decoding="async"
              width={14}
              height={14}
              className="size-3.5 theme-social-icon"
            />
          </a>
        ))}
      </nav>

      {/* Theme Toggle Button */}
      <button
        id="theme-toggle-btn"
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        className="rounded-full p-1 theme-nav-control theme-text-primary transition-colors flex items-center justify-center cursor-pointer shrink-0"
      >
        {isDark ? (
          <Sun className="size-3.5 text-[var(--app-text)]" />
        ) : (
          <Moon className="size-3.5 text-[var(--app-text)]" />
        )}
      </button>
    </div>
  )
}
