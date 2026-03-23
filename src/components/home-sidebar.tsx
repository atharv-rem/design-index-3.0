import heart from "@/assets/love.png?url"
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
    title: "Explore",
    links: [
      { label: "Home", href: "/" },
      { label: "Colours", href: "/colours" },
      { label: "Mockups", href: "/mockups" },
      { label: "Illustrations", href: "/illustrations" },
      { label: "Icons", href: "/icons" },
    ],
  },
  {
    title: "Learn",
    links: [
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
]

function HomeSidebarContent() {
  const { setOpenMobile, toggleSidebar } = useSidebar()

  return (
    <>
      <SidebarHeader className="px-4 py-4">
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
      </SidebarHeader>

      <SidebarContent className="px-2 pb-2">
        {linkGroups.map((group) => (
          <SidebarGroup key={group.title} className="px-0 py-1.5">
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
        ))}
      </SidebarContent>

      <SidebarFooter className="px-4 py-5">
        <div className="flex items-center justify-center font-departure text-[15px] text-white md:text-[10px]">
          <span>Made with</span>
          <img src={heart} alt="heart icon" className="mx-1 inline h-4 w-4" />
          <span> by Atharv</span>
        </div>
      </SidebarFooter>
    </>
  )
}

export default function HomeSidebar() {
  return (
    <SidebarProvider defaultOpen={false} className="min-h-0 w-0">
      <SidebarTrigger className="fixed top-4 left-4 z-40 rounded-md bg-black/80 p-2 text-white transition-colors hover:bg-white/10" />

      <Sidebar
        collapsible="offcanvas"
        className="z-50 border-none [--sidebar:#000000] [--sidebar-foreground:#ffffff] [--sidebar-accent:#151515] [--sidebar-accent-foreground:#ffffff] [--sidebar-border:#2a2a2a]"
      >
        <HomeSidebarContent />
      </Sidebar>
    </SidebarProvider>
  )
}