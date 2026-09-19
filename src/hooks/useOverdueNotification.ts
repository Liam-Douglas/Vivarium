import { useEffect, useRef } from 'react'
import { isOverdue } from '@/lib/dates'
import type { Animal } from '@/hooks/useAnimals'

// Two problems with how this used to work.
//
// It called Notification.requestPermission() on page load, with no user
// gesture behind it. Browsers penalise that — Chrome and Firefox both suppress
// unprompted requests — so the permission dialog the code was counting on
// often never appeared at all.
//
// And it fired with `new Notification()`, which throws "Illegal constructor" on
// Android Chrome. For a mobile-first PWA that is the primary platform, so the
// one code path that mattered most was the one that could not work. Notifying
// through the service worker registration is the form Android supports, and it
// is also the only form that works when the app is installed.
//
// Permission is now only ever requested from a user gesture — the control in
// Settings — via requestNotificationPermission below.

async function show(title: string, body: string) {
  try {
    const registration = await navigator.serviceWorker?.getRegistration()
    if (registration) {
      // The form Android Chrome supports, and the only one that works for an
      // installed PWA.
      await registration.showNotification(title, { body, icon: '/icon-192.png' })
      return
    }
    new Notification(title, { body, icon: '/icon-192.png' })
  } catch {
    // A notification failing is never worth surfacing to the person using the
    // app, let alone breaking a render over.
  }
}

/** Asks for permission. Call this from a click, never on load. */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export function useOverdueNotification(animals: Animal[]) {
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current || animals.length === 0) return
    if (!('Notification' in window)) return
    // Only when permission is already held. Asking here is what browsers
    // suppress, and what annoys people who have not opted in.
    if (Notification.permission !== 'granted') return

    const overdue = animals.filter((a) => isOverdue(a.last_fed_at, a.feeding_frequency_days))
    if (overdue.length === 0) return
    fired.current = true

    const names = overdue.map((a) => a.name).join(', ')
    void show(
      'Vivarium — feeding overdue',
      overdue.length === 1
        ? `${names} hasn't been fed and is overdue.`
        : `${overdue.length} animals are overdue: ${names}.`
    )
  }, [animals])
}
