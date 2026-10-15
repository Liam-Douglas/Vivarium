import { useRef, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'

/** Past this, a release closes the sheet whatever its speed. */
const DISTANCE_PX = 120
/** A flick closes it from much shorter: px per ms at release. */
const FLICK_VELOCITY = 0.11

/**
 * Drag a bottom sheet down to close it.
 *
 * Attach the returned handlers to the sheet's grab area (the grabber and the
 * title row). The panel follows the finger 1:1 by setting its own transform,
 * resists being pulled upward, and on release either closes (far enough, or
 * flicked) or settles back. Settling and closing are the sheet's ordinary CSS
 * transitions: clearing the inline transform lets them run from wherever the
 * finger left it.
 *
 * Phones only; above 640px the panel is a centred dialog.
 */
export function useDragToDismiss(panelRef: RefObject<HTMLElement | null>, onDismiss: () => void) {
  const drag = useRef<{ id: number; startY: number; startTime: number; dy: number } | null>(null)

  function onPointerDown(e: ReactPointerEvent<HTMLElement>) {
    if (drag.current) return // a second finger mid-drag would make it jump
    if (!window.matchMedia('(max-width: 639px)').matches) return
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea')) return
    const panel = panelRef.current
    if (!panel) return
    drag.current = { id: e.pointerId, startY: e.clientY, startTime: performance.now(), dy: 0 }
    e.currentTarget.setPointerCapture(e.pointerId)
    panel.style.transition = 'none'
  }

  function onPointerMove(e: ReactPointerEvent<HTMLElement>) {
    const d = drag.current
    const panel = panelRef.current
    if (!d || d.id !== e.pointerId || !panel) return
    const raw = e.clientY - d.startY
    // Downward follows the finger; upward meets rising resistance rather
    // than a wall, so the sheet feels attached rather than stuck.
    d.dy = raw >= 0 ? raw : -Math.sqrt(-raw) * 2
    panel.style.transform = `translateY(${d.dy}px)`
  }

  function onPointerEnd(e: ReactPointerEvent<HTMLElement>) {
    const d = drag.current
    const panel = panelRef.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    const velocity = d.dy / Math.max(1, performance.now() - d.startTime)
    if (panel) {
      panel.style.transition = ''
      panel.style.transform = ''
    }
    if (d.dy > DISTANCE_PX || (d.dy > 8 && velocity > FLICK_VELOCITY)) onDismiss()
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: onPointerEnd,
    onPointerCancel: onPointerEnd,
  }
}
