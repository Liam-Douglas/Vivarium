import { LargeTitle } from '@/components/ui/LargeTitle'

interface HeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

/** A screen's title: the iOS large title, collapsing into the bar on scroll. */
export function Header({ title, subtitle, action }: HeaderProps) {
  return <LargeTitle title={title} subtitle={subtitle} trailing={action} />
}
