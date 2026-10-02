import * as React from "react"

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY)

  // Support both modern and older mobile browsers.
  if (typeof mql.addEventListener === "function") {
    mql.addEventListener("change", onChange)
  } else {
    mql.addListener(onChange)
  }

  return () => {
    if (typeof mql.removeEventListener === "function") {
      mql.removeEventListener("change", onChange)
    } else {
      mql.removeListener(onChange)
    }
  }
}

const getSnapshot = () => window.innerWidth < MOBILE_BREAKPOINT

// The server (and the hydration render) always assume desktop so the markup
// matches; React then switches to the real value synchronously after hydrating.
const getServerSnapshot = () => false

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
