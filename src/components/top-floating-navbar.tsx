import { SidebarTrigger } from "@/components/ui/sidebar"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { TOOLS_SEARCH_EVENT } from "@/lib/tools-search-event"
import { useEffect, useState } from "react"

type SocialLink = {
  label: string
  href: string
  icon: string
}

type TopFloatingNavbarProps = {
  socialLinks?: SocialLink[]
  mode?: "brand" | "search"
  searchPlaceholder?: string
}

export default function TopFloatingNavbar({socialLinks = [], mode = "brand",}: TopFloatingNavbarProps) {
  const [searchValue, setSearchValue] = useState("")
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const emitSearch = () => {
    window.dispatchEvent(new CustomEvent(TOOLS_SEARCH_EVENT, { detail: searchValue.trim().toLowerCase() }))
  }

  if (!isMounted) {
    return (
      <header className="fixed top-4 left-1/2 z-40 w-[calc(100%-1.25rem)] max-w-[500px] -translate-x-1/2 rounded-[10px] md:rounded-2xl border border-white/15 bg-black/55 px-2.5 py-1 shadow-[0_10px_35px_rgba(0,0,0,0.45)] backdrop-blur-md md:w-[calc(100%-2rem)] md:px-[10px] md:py-[5px]">
        {mode === "search" ? (
          <div className="flex items-center gap-1.5 md:gap-2">
            <Skeleton className="h-7 w-7 rounded-lg bg-zinc-800" />
            <Skeleton className="h-7 flex-1 rounded-lg bg-zinc-800" />
            <Skeleton className="h-7 w-14 rounded-lg bg-zinc-800" />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 md:gap-3">
            <div className="flex min-w-0 items-center gap-2 md:gap-2.5">
              <Skeleton className="h-7 w-7 rounded-lg bg-zinc-800" />
              <Skeleton className="h-5 w-24 rounded bg-zinc-800" />
            </div>
            <div className="flex items-center gap-1.5 md:gap-4">
              <Skeleton className="h-3.5 w-3.5 rounded bg-zinc-800 md:h-4 md:w-4" />
              <Skeleton className="h-3.5 w-3.5 rounded bg-zinc-800 md:h-4 md:w-4" />
              <Skeleton className="h-3.5 w-3.5 rounded bg-zinc-800 md:h-4 md:w-4" />
              <Skeleton className="h-3.5 w-3.5 rounded bg-zinc-800 md:h-4 md:w-4" />
            </div>
          </div>
        )}
      </header>
    )
  }

  return (
    <header className="fixed top-4 left-1/2 z-40 w-[calc(100%-1.25rem)] max-w-[500px] -translate-x-1/2 rounded-[10px] border border-white/15 bg-black/55 px-2.5 py-1 text-white shadow-[0_10px_35px_rgba(0,0,0,0.45)] backdrop-blur-md md:w-[calc(100%-2rem)] md:px-[5px] md:py-[5px]">
      {mode === "search" ? (
        <div className="flex items-center gap-1.5 md:gap-2">
          <SidebarTrigger className="h-7 w-7 shrink-0 rounded-lg p-0 text-white transition-colors hover:bg-white/15" />
          <Input
            type="search"
            aria-label="Search"
            placeholder= "search tools"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                emitSearch()
              }
            }}
            className="h-7 border-white/20 bg-white/6 font-departure text-xs text-white placeholder:text-zinc-400 !rounded-[5px] items-center justify-center"
          />
          <button
            type="button"
            aria-label="Search"
            onClick={emitSearch}
            className="h-7 shrink-0 rounded-lg border border-white/20 px-2 font-departure text-[10px] uppercase tracking-[0.1em] text-zinc-100 transition-colors hover:bg-white/15 md:px-2.5"
          >
            Search
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 md:gap-3">
          <div className="flex min-w-0 items-center gap-2 md:gap-2.5">
            <SidebarTrigger className="h-7 w-7 rounded-lg p-0 text-white transition-colors hover:bg-white/15" />
            <a href="/" className="flex min-w-0 items-center gap-1.5 md:gap-2 text-white">
              <img src="/favicon.svg" alt="Design Index logo" className="h-5 w-5 shrink-0" />
              <span className="truncate font-kal font-semibold text-[11px] tracking-[0.1em] md:text-xs md:tracking-[0.14em] md:text-white">Design Index</span>
            </a>
          </div>

          <nav aria-label="Social links" className="flex items-center gap-1.5 md:gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                aria-label={social.label}
                className="rounded-lg transition-colors hover:bg-white/15"
              >
                <img src={social.icon} alt={social.label} className="size-3.5 brightness-0 invert md:size-4" />
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}