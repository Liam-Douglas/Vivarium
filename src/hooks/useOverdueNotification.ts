import { useEffect, useRef } from 'react'
import { isOverdue } from '@/lib/dates'
import type { Animal } from '@/hooks/useAnimals'

export function useOverdueNotification(animals: Animal[]) {
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current || animals.length === 0) return
    if (!('Notification' in window)) return

    const overdue = animals.filter((a) => isOverdue(a.last_fed_at, a.feeding_frequency_days))

    if (overdue.length === 0) return
    fired.current = true

    const fire = () => {
      const names = overdue.map((a) => a.name).join(', ')
      new Notification('Vivarium — feeding overdue', {
        body: overdue.length === 1
          ? `${names} hasn't been fed and is overdue.`
          : `${overdue.length} animals are overdue: ${names}.`,
        icon: '/icon-192.png',
      })
    }

    if (Notification.permission === 'granted') {
      fire()
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then((p) => { if (p === 'granted') fire() })
    }
  }, [animals])
}
