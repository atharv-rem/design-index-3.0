import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { motion } from "motion/react"
import heart from "@/assets/love.png?url"
import instagramIcon from "@/assets/instagram.svg?url"
import githubIcon from "@/assets/github.svg?url"
import threadsIcon from "@/assets/threads.svg?url"
import twitterIcon from "@/assets/twitter.svg?url"

function SidebarToggleControls() {
  const { isMobile, open, openMobile } = useSidebar()
  const isSidebarVisible = isMobile ? openMobile : open

  return (
    <>
      {!isSidebarVisible ? (
        <SidebarTrigger className="fixed top-4 left-4 z-50 bg-black/80 text-white hover:bg-white/10 hover:text-white" />
      ) : null}
    </>
  )
}

export default function HomeSidebar() {
  const resourceLinks = [
    { label: "Colours", href: "https://coolors.co" },
    { label: "Mockups", href: "https://www.mockupworld.co" },
    { label: "Illustrations", href: "https://undraw.co/illustrations" },
    { label: "Icons", href: "https://iconify.design" },
    { label: "Fonts", href: "https://fonts.google.com" },
    { label: "Design Inspiration", href: "https://dribbble.com" },
    { label: "Tools", href: "https://www.figma.com" },
  ]

  const socialLinks = [
    { label: "Instagram", href: "https://instagram.com", icon: instagramIcon },
    { label: "GitHub", href: "https://github.com", icon: githubIcon },
    { label: "Threads", href: "https://threads.net", icon: threadsIcon },
    { label: "Twitter", href: "https://x.com", icon: twitterIcon },
  ]

  return (
    <SidebarProvider defaultOpen={false}>
      <Sidebar className="border-none! border-r-0 border-l-0 shadow-none [--sidebar:#000] [--sidebar-foreground:#fff] [--sidebar-border:transparent] [--sidebar-accent:rgba(255,255,255,0.12)] [--sidebar-accent-foreground:#fff] **:data-[slot=sidebar-container]:border-r-0 **:data-[slot=sidebar-container]:border-l-0">
        <SidebarHeader className="flex flex-row items-center gap-2 px-4 py-4">
          <p className="text-md font-semibold tracking-wide text-sidebar-foreground">
            Design Index
          </p>
          <SidebarTrigger className="ml-auto text-white hover:bg-white/10 hover:text-white" />
        </SidebarHeader>
        <SidebarContent>
          <ul className="space-y-1.25 px-2 font-departure">
            {resourceLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-md px-2 py-1.5 text-sm text-[#bebebe] transition-colors hover:bg-white/10"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </SidebarContent>
        <SidebarFooter className="px-4! py-5!">
            <div className="flex flex-row items-center justify-center font-departure text-white text-[10px]">
                <span>Made with</span>
                <img src={heart} alt="heart icon" className="inline w-4 h-4 mx-1" />
                <span> by Atharv</span>
            </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-transparent">
        <SidebarToggleControls />
        <motion.div
          className="fixed top-4 right-4 z-40 flex items-center gap-2"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: {
              transition: {
                staggerChildren: 0.06,
                delayChildren: 0.15,
              },
            },
          }}
        >
          {socialLinks.map((social) => (
            <motion.a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noreferrer"
              aria-label={social.label}
              className="rounded-md p-1.5 transition-colors hover:bg-white/10"
              variants={{
                hidden: { opacity: 0, y: -8, scale: 0.92 },
                show: { opacity: 1, y: 0, scale: 1 },
              }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -2, scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
            >
              <img src={social.icon} alt={social.label} className="size-4 brightness-0 invert" />
            </motion.a>
          ))}
        </motion.div>
        <main className="flex h-dvh w-full flex-col items-center justify-center">
          <div className="flex h-auto w-full flex-col items-center justify-center">
            <motion.h1
              className="text-[40px] font-kal font-semibold text-white [text-shadow:0_205px_57px_rgba(0,0,0,0.01),0_131px_52px_rgba(0,0,0,0.09),0_74px_44px_rgba(0,0,0,0.30),0_33px_33px_rgba(0,0,0,0.51),0_8px_18px_rgba(0,0,0,0.59)]"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              Find any design tool you need
            </motion.h1>
            <motion.div
              className="mt-2.5 h-auto w-100 rounded-[10px] bg-black px-2.5 py-1.25 [box-shadow:0_1000px_250px_0_rgba(255,255,255,0.01),0_640px_250px_0_rgba(255,255,255,0.04),0_360px_216px_0_rgba(255,255,255,0.15),0_160px_160px_0_rgba(255,255,255,0.26),0_40px_88px_0_rgba(255,255,255,0.29)]"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.55, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
                <span className="font-departure text-[12px] text-white">
                  ask anything
                </span>
            </motion.div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}