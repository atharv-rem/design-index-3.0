import * as React from "react"
import heart from "@/assets/love.png?url"

export default function HomeSidebar() {
  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false)
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
        event.preventDefault()
        setIsOpen((current) => !current)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const resourceLinks = [
    { label: "Home", href: "/" },
    { label: "Colours", href: "/colours" },
    { label: "Mockups", href: "/mockups" },
    { label: "Illustrations", href: "/illustrations" },
    { label: "Icons", href: "/icons" },
    { label: "Fonts", href: "/fonts" },
    { label: "Design Inspiration", href: "/design-inspo" },
    { label: "Tools", href: "/tools" },
    { label: "Terms", href: "/terms" },
    { label: "About", href: "/about" },
  ]

  return (
    <>
      {!isOpen ? (
        <button
          type="button"
          aria-label="Open sidebar"
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-50 rounded-md bg-black/80 p-2 text-white transition-colors hover:bg-white/10"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
      ) : null}

      {isOpen ? (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/45 md:hidden"
        />
      ) : null}

      <aside
        className={`fixed top-0 left-0 z-50 flex h-dvh w-72 flex-col bg-black text-white shadow-xl transition-transform duration-200 ease-out md:w-64 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <header className="flex items-center gap-2 px-4 py-4">
          <p className="text-md font-semibold tracking-wide">Design Index</p>
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setIsOpen(false)}
            className="ml-auto rounded-md p-1.5 text-white transition-colors hover:bg-white/10"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <nav className="flex-1 overflow-auto px-2">
          <ul className="space-y-1.25 font-departure">
            {resourceLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="block rounded-md px-2 py-1.5 text-sm text-[#bebebe] transition-colors hover:bg-white/10"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <footer className="px-4 py-5">
          <div className="flex items-center justify-center font-departure text-[10px] text-white">
            <span>Made with</span>
            <img src={heart} alt="heart icon" className="mx-1 inline h-4 w-4" />
            <span> by Atharv</span>
          </div>
        </footer>
      </aside>
    </>
  )
}