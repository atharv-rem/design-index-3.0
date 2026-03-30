import heart from "@/assets/love.png?url"
import instagramIcon from "@/assets/instagram.svg?url"
import githubIcon from "@/assets/github.svg?url"
import threadsIcon from "@/assets/threads.svg?url"
import twitterIcon from "@/assets/twitter.svg?url"
import type { ReactNode } from "react"
import { motion } from "motion/react"
import TopFloatingNavbar from "@/components/top-floating-navbar"
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

function HomeSidebarContent() {
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
          <p className="text-md font-semibold tracking-wide text-white">Design Index</p>
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={toggleSidebar}
            className="ml-auto rounded-md p-1.5 text-white transition-colors hover:bg-white/10"
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
            <SidebarGroupLabel className="px-2 pb-1 font-departure text-[11px] uppercase tracking-[0.16em] text-[#8f8f8f]">
              {group.title}
            </SidebarGroupLabel>
            <SidebarMenu className="space-y-1 font-departure">
              {group.links.map((link) => (
                <SidebarMenuItem key={link.label}>
                  <SidebarMenuButton
                    asChild
                    className="text-sm text-[#bebebe] hover:bg-white/10 hover:text-white"
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
        <div className="flex items-center justify-center font-departure text-[15px] text-white md:text-[10px]">
          <span>Made with</span>
          <img src={heart} alt="heart icon" className="mx-1 inline h-4 w-4" />
          <span> by Atharv</span>
        </div>
        </motion.div>
      </SidebarFooter>
    </>
  )
}

type HomeSidebarProps = {
  children?: ReactNode
  showDefaultTrigger?: boolean
  floatingNavbarSocialLinks?: Array<{ label: string; href: string; icon: string }>
  floatingNavbarMode?: "brand" | "search"
  floatingNavbarSearchPlaceholder?: string
}

export default function HomeSidebar({
  children,
  showDefaultTrigger = true,
  floatingNavbarSocialLinks = [],
  floatingNavbarMode = "brand",
  floatingNavbarSearchPlaceholder = "Search design tools...",
}: HomeSidebarProps) {
  const resolvedFloatingNavbarSocialLinks =
    floatingNavbarSocialLinks.length > 0 ? floatingNavbarSocialLinks : defaultSocialLinks

  return (
    <SidebarProvider defaultOpen={false} className="min-h-svh w-full">
      <TopFloatingNavbar
        socialLinks={resolvedFloatingNavbarSocialLinks}
        mode={floatingNavbarMode}
        searchPlaceholder={floatingNavbarSearchPlaceholder}
      />

      {showDefaultTrigger ? (
        <SidebarTrigger className="fixed top-4 left-4 z-40 rounded-md bg-black/80 p-2 text-white transition-colors hover:bg-white/10" />
      ) : null}

      <Sidebar
        collapsible="offcanvas"
        className="z-50 border-none [--sidebar:#000000] [--sidebar-foreground:#ffffff] [--sidebar-accent:#151515] [--sidebar-accent-foreground:#ffffff] [--sidebar-border:#2a2a2a]"
      >
        <HomeSidebarContent />
      </Sidebar>

      <div className="min-w-0 flex-1">
        {children}
      </div>
    </SidebarProvider>
  )
}