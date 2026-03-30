import { SidebarTrigger } from "@/components/ui/sidebar"
import { Input } from "@/components/ui/input"
import { TOOLS_SEARCH_EVENT } from "@/lib/tools-search-event"
import { useState } from "react"

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

export default function TopFloatingNavbar({
  socialLinks = [],
  mode = "brand",
  searchPlaceholder = "Search design tools...",
}: TopFloatingNavbarProps) {
  const [searchValue, setSearchValue] = useState("")

  const emitSearch = () => {
    window.dispatchEvent(new CustomEvent(TOOLS_SEARCH_EVENT, { detail: searchValue.trim().toLowerCase() }))
  }

  return (
    <header className="fixed top-4 left-1/2 z-40 w-[calc(100%-1.25rem)] max-w-[500px] -translate-x-1/2 rounded-2xl border border-white/15 bg-black/55 px-3 py-2 text-white shadow-[0_10px_35px_rgba(0,0,0,0.45)] backdrop-blur-md md:w-[calc(100%-2rem)] md:px-[10px] md:py-[5px]">
      {mode === "search" ? (
        <div className="flex items-center gap-2">
          <SidebarTrigger className="h-9 w-9 shrink-0 rounded-lg p-0 text-white transition-colors hover:bg-white/15" />
          <Input
            type="search"
            aria-label="Search"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                emitSearch()
              }
            }}
            className="h-9 border-white/20 bg-white/6 font-departure text-sm text-white placeholder:text-zinc-400 focus-visible:ring-white/25"
          />
          <button
            type="button"
            aria-label="Search"
            onClick={emitSearch}
            className="h-9 shrink-0 rounded-lg border border-white/20 px-3 font-departure text-xs uppercase tracking-[0.1em] text-zinc-100 transition-colors hover:bg-white/15"
          >
            Search
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <SidebarTrigger className="h-9 w-9 rounded-lg p-0 text-white transition-colors hover:bg-white/15" />
            <a href="/" className="flex min-w-0 items-center gap-2 text-white">
              <img src="/favicon.svg" alt="Design Index logo" className="h-6 w-6 shrink-0" />
              <span className="truncate font-kal font-semibold text-sm tracking-[0.14em] md:text-white">Design Index</span>
            </a>
          </div>

          <nav aria-label="Social links" className="flex items-center gap-2 md:gap-4 pr-[5px]">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                aria-label={social.label}
                className="rounded-lg transition-colors hover:bg-white/15"
              >
                <img src={social.icon} alt={social.label} className="size-4 brightness-0 invert" />
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}