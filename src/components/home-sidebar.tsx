import heart from "@/assets/love.png?url"
import instagramIcon from "@/assets/instagram.svg?url"
import githubIcon from "@/assets/github.svg?url"
import threadsIcon from "@/assets/threads.svg?url"
import twitterIcon from "@/assets/twitter.svg?url"
import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { motion } from "motion/react"
import BottomFloatingNavbar from "@/components/bottom-floating-navbar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"

const linkGroups = [
  {
    title: "Home",
    links: [{ label: "Home", href: "/" }],
  },
  {
    title: "Explore",
    links: [
      { label: "Colours", href: "/colours" },
      { label: "Mockups", href: "/mockups" },
      { label: "Illustrations", href: "/illustrations" },
      { label: "Icons", href: "/icons" },
      { label: "Fonts", href: "/fonts" },
      { label: "Design Inspiration", href: "/design-inspo" },
      { label: "Tools", href: "/tools" },
    ],
  },
  {
    title: "Info",
    links: [
      { label: "Terms", href: "/terms" },
      { label: "About", href: "/about" },
    ],
  },
  {
    title: "Contribute",
    links: [
      { label: "Submit Tool", href: "/submit-tool" },
      { label: "Feedback", href: "/feedback" },
    ],
  },
]

const defaultSocialLinks = [
  { label: "Instagram", href: "https://instagram.com", icon: instagramIcon },
  { label: "GitHub", href: "https://github.com", icon: githubIcon },
  { label: "Threads", href: "https://threads.net", icon: threadsIcon },
  { label: "Twitter", href: "https://x.com", icon: twitterIcon },
]

function HomeSidebarContent({ heartIconSrc }: { heartIconSrc?: string }) {
  const { setOpenMobile, toggleSidebar, isMobile } = useSidebar()

  const mobileMotion = isMobile
    ? {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
      }
    : undefined

  return (
    <>
      <SidebarHeader className="px-4 py-4">
        <motion.div
          {...mobileMotion}
          transition={{ type: "spring", stiffness: 180, damping: 24, mass: 0.95 }}
        >
          <div className="flex items-center gap-2">
            <p className="text-md font-semibold tracking-[0.05rem] theme-text-primary">design index</p>
            <button
              type="button"
              aria-label="Close sidebar"
              onClick={toggleSidebar}
              className="ml-auto rounded-md p-1.5 theme-text-primary transition-colors hover:bg-[var(--sidebar-accent)]"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </motion.div>
      </SidebarHeader>

      <SidebarContent className="px-2 pb-2">
        {linkGroups.map((group, index) => (
          <motion.div
            key={group.title}
            {...mobileMotion}
            transition={{ type: "spring", stiffness: 170, damping: 24, mass: 0.95, delay: 0.06 + index * 0.05 }}
          >
            <SidebarGroup className="px-0 py-1.5">
              <SidebarGroupLabel className="px-2 pb-1 font-rethink font-medium text-[11px] uppercase tracking-[0.16em] theme-text-soft">
                {group.title}
              </SidebarGroupLabel>
              <SidebarMenu className="space-y-1 font-rethink">
                {group.links.map((link) => (
                  <SidebarMenuItem key={link.label}>
                    <SidebarMenuButton
                      asChild
                      className="text-sm font-semibold theme-text-muted hover:bg-[var(--sidebar-accent)] hover:theme-text-primary bg-[#fafafa] dark:bg-[#141414] rounded-md px-2 py-1.5 transition-colors"
                    >
                      <a href={link.href} onClick={() => setOpenMobile(false)}>
                        {link.label}
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </motion.div>
        ))}
      </SidebarContent>
 
      <SidebarFooter className="px-4 py-5">
        <motion.div
          {...mobileMotion}
          transition={{ type: "spring", stiffness: 165, damping: 25, mass: 1, delay: 0.22 }}
        >
          <div className="flex items-center justify-center font-rethink text-[15px] theme-text-primary md:text-[10px]">
            <span>Made with</span>
            <img
              src={heartIconSrc || heart}
              alt="heart icon"
              loading="lazy"
              decoding="async"
              width={16}
              height={16}
              className="mx-1 inline h-4 w-4"
            />
            <span> by Atharv</span>
          </div>
        </motion.div>
      </SidebarFooter>
    </>
  )
}

function HomeSidebarSkeletonContent() {
  return (
    <>
      <SidebarHeader className="px-4 py-4">
        <Skeleton className="h-6 w-28 bg-[var(--sidebar-accent)]" />
      </SidebarHeader>

      <SidebarContent className="px-2 pb-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <SidebarGroup key={index} className="px-0 py-1.5">
            <div className="px-2 pb-2">
              <Skeleton className="h-3 w-20 bg-[var(--sidebar-accent)]" />
            </div>
            <SidebarMenu className="space-y-1 px-2">
              <Skeleton className="h-8 w-full bg-[var(--sidebar-accent)]" />
              <Skeleton className="h-8 w-5/6 bg-[var(--sidebar-accent)]" />
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="px-4 py-5">
        <div className="flex items-center justify-center gap-2">
          <Skeleton className="h-4 w-16 bg-[var(--sidebar-accent)]" />
          <Skeleton className="h-4 w-4 rounded-full bg-[var(--sidebar-accent)]" />
          <Skeleton className="h-4 w-16 bg-[var(--sidebar-accent)]" />
        </div>
      </SidebarFooter>
    </>
  )
}

type HomeSidebarProps = {
  children?: ReactNode
  showDefaultTrigger?: boolean
  floatingNavbarSocialLinks?: Array<{ label: string; href: string; icon: string }>
  visitUrl?: string
  shareTitle?: string
  heartIconSrc?: string
}

export default function HomeSidebar({
  children,
  showDefaultTrigger = true,
  floatingNavbarSocialLinks = [],
  visitUrl,
  shareTitle,
  heartIconSrc,
}: HomeSidebarProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const resolvedFloatingNavbarSocialLinks =
    floatingNavbarSocialLinks.length > 0 ? floatingNavbarSocialLinks : defaultSocialLinks

  return (
    <SidebarProvider defaultOpen={false} className="min-h-svh w-full">
      <BottomFloatingNavbar
        socialLinks={resolvedFloatingNavbarSocialLinks}
        visitUrl={visitUrl}
        shareTitle={shareTitle}
      />

      {showDefaultTrigger ? (
        <SidebarTrigger className="fixed top-4 left-4 z-40 rounded-md bg-[var(--app-navbar)] border border-[var(--app-border-strong)] p-2 theme-text-primary transition-colors hover:bg-[var(--app-sidebar-accent)]" />
      ) : null}

      <Sidebar
        collapsible="offcanvas"
        className="z-50 border-r border-sidebar-border shadow-hairline theme-sidebar-shell"
      >
        {isMounted ? <HomeSidebarContent heartIconSrc={heartIconSrc} /> : <HomeSidebarSkeletonContent />}
      </Sidebar>

      <div className="min-w-0 flex-1">
        {children}
      </div>
    </SidebarProvider>
  )
}
