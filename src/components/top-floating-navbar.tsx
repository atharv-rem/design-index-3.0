import { SidebarTrigger } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { useEffect, useState } from "react"

type SocialLink = {
  label: string
  href: string
  icon: string
}

type TopFloatingNavbarProps = {
  socialLinks?: SocialLink[]
}

export default function TopFloatingNavbar({
  socialLinks = [],
}: TopFloatingNavbarProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <header className="shadow-everywhere fixed top-4 left-1/2 z-40 w-[calc(100%-1.25rem)] max-w-[500px] -translate-x-1/2 rounded-[10px] md:rounded-2xl border border-white/15 bg-black/55 px-2.5 py-1 backdrop-blur-md md:w-[calc(100%-2rem)] md:px-[10px] md:py-[5px]">
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
      </header>
    )
  }

  return (
    <header className="shadow-everywhere fixed top-4 left-1/2 z-40 w-[calc(100%-1.25rem)] max-w-[500px] -translate-x-1/2 rounded-[10px] border border-white/15 bg-black/55 px-[10px] py-1 text-white backdrop-blur-md md:w-[calc(100%-2rem)] md:px-[5px] md:py-[5px]">
        <div className="flex items-center justify-between gap-2 md:gap-3">
          <div className="flex min-w-0 items-center gap-2 md:gap-2.5">
            <SidebarTrigger className="h-7 w-7 rounded-lg p-0 text-white transition-colors hover:bg-white/15" />
            <a href="/" className="flex min-w-0 items-center gap-1.5 md:gap-2 text-white">
              <span className="truncate font-kal font-semibold text-[11px] md:text-[15px] md:tracking-[0.05em] md:text-white">Design Index</span>
            </a>
          </div>

          <nav aria-label="Social links" className="flex items-center gap-1.5 md:gap-4 pr-[5px] md:px-[10px]">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                aria-label={social.label}
                className="rounded-lg transition-colors hover:bg-white/15"
              >
                <img
                  src={social.icon}
                  alt={social.label}
                  loading="eager"
                  decoding="async"
                  width={16}
                  height={16}
                  className="size-3.5 brightness-0 invert md:size-4"
                />
              </a>
            ))}
          </nav>
        </div>
    </header>
  )
}
