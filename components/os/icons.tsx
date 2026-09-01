import type { SVGProps } from 'react'

/**
 * One 24×24 grid, 1.5 stroke, round joins. Every icon is drawn on the same
 * skeleton so a folder and a document read as belonging to the same system.
 */
function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  )
}

export type IconComponent = (props: SVGProps<SVGSVGElement>) => React.ReactElement

export const FolderIcon: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M3 7.5a1.5 1.5 0 0 1 1.5-1.5h4.2a1.5 1.5 0 0 1 1.05.43l1.2 1.17a1.5 1.5 0 0 0 1.05.43h6.45A1.5 1.5 0 0 1 20 9.5v8a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3 17.5z" />
    <path d="M3 11h17" opacity={0.55} />
  </Icon>
)

export const CalendarIcon: IconComponent = (props) => (
  <Icon {...props}>
    <rect x="3.5" y="5" width="17" height="15" rx="1.5" />
    <path d="M3.5 9.5h17" />
    <path d="M8 3.5v3M16 3.5v3" />
    <path d="M7.5 13h2M11 13h2M14.5 13h2M7.5 16.5h2M11 16.5h2" opacity={0.6} />
  </Icon>
)

export const BriefcaseIcon: IconComponent = (props) => (
  <Icon {...props}>
    <rect x="3" y="7.5" width="18" height="12" rx="1.5" />
    <path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5" />
    <path d="M3 13h18" opacity={0.55} />
    <path d="M10.5 13v1.8h3V13" />
  </Icon>
)

export const PersonIcon: IconComponent = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="8.5" r="3.5" />
    <path d="M5 19.5a7 7 0 0 1 14 0" />
  </Icon>
)

export const SparkIcon: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z" />
    <path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" opacity={0.65} />
  </Icon>
)

export const DocIcon: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M6 3.5h7.5L19 9v11.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1z" />
    <path d="M13.5 3.5V9H19" />
    <path d="M8 13h8M8 16.5h5.5" opacity={0.6} />
  </Icon>
)

export const LogIcon: IconComponent = (props) => (
  <Icon {...props}>
    <rect x="3.5" y="4" width="17" height="16" rx="1.5" />
    <path d="M7 8.5h3M7 12h3M7 15.5h3" />
    <path d="M13 8.5h4M13 12h4M13 15.5h2.5" opacity={0.55} />
  </Icon>
)

export const InfoIcon: IconComponent = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5.5" />
    <circle cx="12" cy="7.9" r="0.9" fill="currentColor" stroke="none" />
  </Icon>
)

export const RouteIcon: IconComponent = (props) => (
  <Icon {...props}>
    <circle cx="6" cy="18" r="2.5" />
    <circle cx="18" cy="6" r="2.5" />
    <path d="M8.5 18h5a3 3 0 0 0 0-6h-3a3 3 0 0 1 0-6h4.5" />
  </Icon>
)

export const TerminalIcon: IconComponent = (props) => (
  <Icon {...props}>
    <rect x="3" y="4.5" width="18" height="15" rx="1.5" />
    <path d="M7 9.5l3 2.5-3 2.5" />
    <path d="M12.5 15h4.5" opacity={0.7} />
  </Icon>
)

export const ChevronRightIcon: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M9.5 5.5l6.5 6.5-6.5 6.5" />
  </Icon>
)

export const CloseIcon: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </Icon>
)

export const MinimizeIcon: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M6 17h12" />
  </Icon>
)

export const MaximizeIcon: IconComponent = (props) => (
  <Icon {...props}>
    <rect x="5.5" y="5.5" width="13" height="13" rx="1" />
  </Icon>
)

export const RestoreIcon: IconComponent = (props) => (
  <Icon {...props}>
    <rect x="4.5" y="7.5" width="11" height="11" rx="1" />
    <path d="M8 7.5V6a1.5 1.5 0 0 1 1.5-1.5H18A1.5 1.5 0 0 1 19.5 6v8.5A1.5 1.5 0 0 1 18 16h-1.5" opacity={0.6} />
  </Icon>
)

export const SpeakerIcon: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" />
    <path d="M15.5 9.5a3.5 3.5 0 0 1 0 5" />
    <path d="M18 7a7 7 0 0 1 0 10" opacity={0.6} />
  </Icon>
)

export const SpeakerOffIcon: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" />
    <path d="M16 10l4 4M20 10l-4 4" />
  </Icon>
)

export const MusicIcon: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M9 18V6.5l10-2V16" />
    <circle cx="6.75" cy="18" r="2.25" />
    <circle cx="16.75" cy="16" r="2.25" />
  </Icon>
)

export const GridIcon: IconComponent = (props) => (
  <Icon {...props}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" />
  </Icon>
)

export const GamepadIcon: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M7.5 8.5h9a4.5 4.5 0 0 1 4.36 3.39l1.02 4.07A2.5 2.5 0 0 1 19.45 19c-.83 0-1.6-.41-2.06-1.1L16 16H8l-1.39 1.9c-.46.69-1.23 1.1-2.06 1.1a2.5 2.5 0 0 1-2.43-3.04l1.02-4.07A4.5 4.5 0 0 1 7.5 8.5z" />
    <path d="M7 11.5v2.2M5.9 12.6h2.2" />
    <path d="M16 12h.01M18 14h.01" />
  </Icon>
)

export const ChevronUpIcon: IconComponent = (props) => (
  <Icon {...props}>
    <path d="m6 14.5 6-6 6 6" />
  </Icon>
)
