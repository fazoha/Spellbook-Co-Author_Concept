import type { ReactNode } from 'react'

type SidebarIconProps = {
  children: ReactNode
  label: string
}

export function SidebarIcon({ children, label }: SidebarIconProps) {
  return (
    <button
      type="button"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
      aria-label={label}
    >
      {children}
    </button>
  )
}
