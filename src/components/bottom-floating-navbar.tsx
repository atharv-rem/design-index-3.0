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
      <div className="shadow-hairline fixed bottom-6 left-1/2 z-40 w-auto -translate-x-1/2 rounded-[12px] bg-[var(--app-navbar)] px-3 py-2 backdrop-blur-md flex items-center gap-2 transition-all duration-300">
        <Skeleton className="h-9 w-9 rounded-full bg-[var(--app-surface-soft)] shrink-0" />
        {hasVisitActions && (
          <>
            <Skeleton className="h-9 w-16 rounded-full bg-[var(--app-surface-soft)]" />
            <Skeleton className="h-9 w-16 rounded-full bg-[var(--app-surface-soft)]" />
          </>
        )}
        <Skeleton className="h-9 w-9 rounded-full bg-[var(--app-surface-soft)] shrink-0" />
        <Skeleton className="h-9 w-9 rounded-full bg-[var(--app-surface-soft)] shrink-0" />
        <Skeleton className="h-9 w-9 rounded-full bg-[var(--app-surface-soft)] shrink-0" />
        <Skeleton className="h-9 w-9 rounded-full bg-[var(--app-surface-soft)] shrink-0" />
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-black shadow-hairline fixed bottom-6 left-1/2 z-40 w-auto -translate-x-1/2 rounded-[12px] px-3 py-2 flex items-center gap-2 transition-all duration-300">
      {/* Sidebar Icon Toggle */}
      <SidebarTrigger className="h-9 w-9 rounded-full p-0 theme-nav-control shrink-0 flex items-center justify-center [&_svg]:!size-[22px]" />

      {/* Center Actions if visitUrl is present */}
      {hasVisitActions && (
        <>
          <a
            href={visitUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center justify-center rounded-[12px] bg-[var(--app-text)] px-4 text-[11px] font-rethink font-bold uppercase tracking-[0.08em] text-[var(--app-bg)] hover:opacity-90 transition shrink-0"
          >
            Visit
          </a>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex h-9 items-center justify-center rounded-[12px] border border-[var(--app-border-strong)] bg-[var(--app-surface-soft)] px-3.5 text-[11px] font-rethink font-bold uppercase tracking-[0.08em] theme-text-primary hover:bg-[var(--app-sidebar-accent)] transition shrink-0 cursor-pointer"
          >
            {shareLabel}
          </button>
        </>
      )}

      {/* Social Icons Link List */}
      {socialLinks.map((social) => (
        <a
          key={social.label}
          href={social.href}
          target="_blank"
          rel="noreferrer"
          aria-label={social.label}
          className="h-9 w-9 rounded-full theme-nav-control transition-colors shrink-0 flex items-center justify-center"
        >
          <img
            src={social.icon}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-[22px] theme-social-icon"
          />
        </a>
      ))}

      {/* Theme Toggle Button */}
      <button
        id="theme-toggle-btn"
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        className="h-9 w-9 rounded-full theme-nav-control theme-text-primary transition-colors flex items-center justify-center cursor-pointer shrink-0"
      >
        {isDark ? (
          <Sun className="size-[22px] text-[var(--app-text)]" />
        ) : (
          <Moon className="size-[22px] text-[var(--app-text)]" />
        )}
      </button>
    </div>
  )
}
