import {
  IconFolder,
  IconHelp,
  IconPlus,
  IconSearch,
  IconSparkles,
  SpellbookLogo,
} from './icons'
import { SidebarIcon } from './SidebarIcon'

export function LeftSidebar() {
  return (
    <aside className="flex w-16 shrink-0 flex-col items-center border-r border-gray-200 bg-white py-4">
      <div className="mb-2 flex flex-col items-center gap-1">
        <div className="mb-2" aria-hidden>
          <SpellbookLogo />
        </div>
        <SidebarIcon label="New">
          <IconPlus />
        </SidebarIcon>
        <SidebarIcon label="Search">
          <IconSearch />
        </SidebarIcon>
        <SidebarIcon label="Library">
          <IconFolder />
        </SidebarIcon>
        <SidebarIcon label="Assist">
          <IconSparkles />
        </SidebarIcon>
      </div>
      <div className="mt-auto flex flex-col items-center gap-1">
        <SidebarIcon label="Help">
          <IconHelp />
        </SidebarIcon>
        <button
          type="button"
          className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-teal-500 text-sm font-semibold text-white"
          aria-label="Account"
        >
          F
        </button>
      </div>
    </aside>
  )
}
