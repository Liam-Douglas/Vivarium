import { useLayoutEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { motion } from 'motion/react'

type Direction = 'push' | 'pop' | 'none'

// Today lives at "/", but it is a tab like the others, not a level above them.
const depth = (path: string) => Math.max(1, path.split('/').filter(Boolean).length)

/**
 * The navigation-stack feel: opening something deeper (an animal from the
 * list) slides the new screen in from the right; going back brings the
 * shallower one in from the left. Switching tabs is not a push, so it does
 * not move, as on iOS. Entrance only: the old screen is gone at once, which
 * keeps scroll position and fixed bars out of trouble. Under Reduce Motion
 * the travel drops away and only the fade is left.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  // Derived from the previous render's path, the way React suggests for
  // state that depends on what came before.
  const [nav, setNav] = useState<{ path: string; dir: Direction }>({ path: pathname, dir: 'none' })
  if (nav.path !== pathname) {
    const from = depth(nav.path)
    const to = depth(pathname)
    setNav({ path: pathname, dir: to > from ? 'push' : to < from ? 'pop' : 'none' })
  }

  // A pushed screen starts at its top, not wherever the list was scrolled to.
  useLayoutEffect(() => {
    if (nav.dir === 'push') window.scrollTo(0, 0)
  }, [nav])

  const initial = nav.dir === 'push' ? { x: 64, opacity: 0 } : nav.dir === 'pop' ? { x: -40, opacity: 0 } : false

  return (
    <motion.div
      key={pathname}
      className="flex-1 flex flex-col min-w-0"
      initial={initial}
      animate={{ x: 0, opacity: 1 }}
      transition={{ x: { type: 'spring', bounce: 0, duration: 0.42 }, opacity: { duration: 0.22, ease: 'easeOut' } }}
    >
      {children}
    </motion.div>
  )
}
