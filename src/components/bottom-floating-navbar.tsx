import { SidebarTrigger } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { Suspense, lazy, useEffect, useState } from "react"
import { ArrowUpRight, Check, Moon, Search, Share2, Sun } from "lucide-react"
import { withShareUtm, withUtm } from "@/lib/utm"

// Loaded on demand so the search model and UI only ship once someone opens search.
const loadCommandSearch = () => import("@/components/command-search")
const CommandSearch = lazy(loadCommandSearch)

type BottomFloatingNavbarProps = {
  showSearch?: boolean
  visitUrl?: string
  visitSponsored?: boolean
  shareTitle?: string
}

const STORAGE_KEY = "design-index-theme"

const shellClassName =
  "font-google fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 z-40 flex w-auto max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-1.5 rounded-[24px] [corner-shape:squircle] border border-[var(--app-border-strong)] bg-white p-1.5 shadow-[0_8px_30px_rgb(0_0_0/0.12),0_1px_3px_rgb(0_0_0/0.1)] dark:bg-[#1f1f23] dark:shadow-[0_8px_30px_rgb(0_0_0/0.7),0_2px_6px_rgb(0_0_0/0.6),inset_0_1px_0_rgb(255_255_255/0.08)]"

const controlClassName =
  "flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-[17px] [corner-shape:squircle] theme-nav-control transition-[background-color,transform] duration-150 active:scale-95"

export default function BottomFloatingNavbar({
  showSearch = false,
  visitUrl,
  visitSponsored = false,
  shareTitle,
}: BottomFloatingNavbarProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [isDark, setIsDark] = useState(true)
  const [copied, setCopied] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchLoaded, setSearchLoaded] = useState(false)

  const openSearch = () => {
    setSearchLoaded(true)
    setSearchOpen(true)
  }

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    setIsDark(stored ? stored === "dark" : true)
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!showSearch) return

    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setSearchLoaded(true)
        setSearchOpen((open) => !open)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [showSearch])

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
    const url = withShareUtm(window.location.href, { content: "floating-navbar" })
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
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      // Ignore
    }
  }

  const hasVisitActions = typeof visitUrl === "string" && visitUrl.trim().length > 0

  if (!isMounted) {
    return (
      <div className={shellClassName}>
        <Skeleton className="h-11 w-11 shrink-0 rounded-[17px] bg-[var(--app-surface-soft)]" />
        {showSearch && (
          <Skeleton className="h-11 w-11 shrink-0 rounded-[17px] bg-[var(--app-surface-soft)]" />
        )}
        {hasVisitActions && (
          <>
            <Skeleton className="h-11 w-[96px] shrink-0 rounded-[17px] bg-[var(--app-surface-soft)]" />
            <Skeleton className="h-11 w-[104px] shrink-0 rounded-[17px] bg-[var(--app-surface-soft)]" />
          </>
        )}
        <Skeleton className="h-11 w-11 shrink-0 rounded-[17px] bg-[var(--app-surface-soft)]" />
      </div>
    )
  }

  return (
    <div className={shellClassName}>
      {/* Sidebar Icon Toggle */}
      <SidebarTrigger data-cuelume-open className={`${controlClassName} p-0 [&_svg]:!size-[24px]`} />

      {/* Search (content pages only) */}
      {showSearch && (
        <button
          type="button"
          onClick={openSearch}
          data-cuelume-open
          data-cuelume-emphasis="subtle"
          onPointerEnter={loadCommandSearch}
          onFocus={loadCommandSearch}
          aria-label="Search design tools"
          title="Search (Ctrl K)"
          className={`${controlClassName} theme-text-primary`}
        >
          <Search className="size-[22px]" />
        </button>
      )}

      {/* Page actions if visitUrl is present */}
      {hasVisitActions && (
        <>
          <a
            href={withUtm(visitUrl, { content: "floating-navbar" })}
            data-cuelume-tap
            target="_blank"
            rel={visitSponsored ? "sponsored noopener noreferrer" : "noopener"}
            className="group/visit flex h-11 shrink-0 items-center justify-center gap-2 rounded-[17px] [corner-shape:squircle] bg-[var(--app-text)] pr-3.5 pl-4.5 font-google text-[15px] font-medium text-[var(--app-bg)] transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-95"
          >
            Visit
            <ArrowUpRight className="size-[18px] transition-transform duration-200 group-hover/visit:translate-x-0.5 group-hover/visit:-translate-y-0.5" />
          </a>
          <button
            type="button"
            onClick={handleShare}
            data-cuelume-tap
            data-cuelume-emphasis="subtle"
            className="flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[17px] [corner-shape:squircle] theme-nav-control px-4 font-google text-[15px] font-medium theme-text-primary transition-[background-color,transform] duration-150 active:scale-95"
          >
            {copied ? <Check className="size-[18px]" /> : <Share2 className="size-[18px]" />}
            {copied ? "Copied" : "Share"}
          </button>
        </>
      )}

      {/* Theme Toggle Button */}
      <button
        id="theme-toggle-btn"
        type="button"
        onClick={toggleTheme}
        data-cuelume-toggle
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        className={`${controlClassName} theme-text-primary`}
      >
        {isDark ? <Sun className="size-[24px]" /> : <Moon className="size-[24px]" />}
      </button>
      {showSearch && searchLoaded && (
        <Suspense fallback={null}>
          <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
        </Suspense>
      )}
    </div>
  )
}
