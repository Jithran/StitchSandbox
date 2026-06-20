// Stroke-based 24×24 icons. They inherit color via `currentColor` and scale
// with font-size, so they sit naturally inside toolbar buttons.

type IconProps = { size?: number };

function Svg({ size = 17, children }: IconProps & { children: React.ReactNode }): React.ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function EraserIcon(p: IconProps): React.ReactElement {
  return (
    <Svg {...p}>
      <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
      <path d="M22 21H7" />
      <path d="m5 11 9 9" />
    </Svg>
  );
}

export function EyedropperIcon(p: IconProps): React.ReactElement {
  return (
    <Svg {...p}>
      <path d="m12 9 7-7 3 3-7 7" />
      <path d="m14 11-9 9H2v-3l9-9" />
      <path d="m17 7-3-3" />
    </Svg>
  );
}

export function ReplaceIcon(p: IconProps): React.ReactElement {
  return (
    <Svg {...p}>
      <path d="M3 8h13l-3-3" />
      <path d="M21 16H8l3 3" />
    </Svg>
  );
}

export function PanIcon(p: IconProps): React.ReactElement {
  return (
    <Svg {...p}>
      <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2" />
      <path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2" />
      <path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8" />
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
    </Svg>
  );
}

export function SelectIcon(p: IconProps): React.ReactElement {
  return (
    <svg
      width={p.size ?? 17}
      height={p.size ?? 17}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray="4 3"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  );
}

export function UndoIcon(p: IconProps): React.ReactElement {
  return (
    <Svg {...p}>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H10" />
    </Svg>
  );
}

export function RedoIcon(p: IconProps): React.ReactElement {
  return (
    <Svg {...p}>
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H14" />
    </Svg>
  );
}

export function MirrorHIcon(p: IconProps): React.ReactElement {
  return (
    <Svg {...p}>
      <path d="M12 3v18" />
      <path d="m4 8 5 4-5 4Z" />
      <path d="m20 8-5 4 5 4Z" />
    </Svg>
  );
}

export function MirrorVIcon(p: IconProps): React.ReactElement {
  return (
    <Svg {...p}>
      <path d="M3 12h18" />
      <path d="m8 4 4 5 4-5Z" />
      <path d="m8 20 4-5 4 5Z" />
    </Svg>
  );
}

export function RotateCCWIcon(p: IconProps): React.ReactElement {
  return (
    <Svg {...p}>
      <path d="M3 5v6h6" />
      <path d="M3.5 11a9 9 0 1 1 .9 4" />
    </Svg>
  );
}

export function RotateCWIcon(p: IconProps): React.ReactElement {
  return (
    <Svg {...p}>
      <path d="M21 5v6h-6" />
      <path d="M20.5 11a9 9 0 1 0-.9 4" />
    </Svg>
  );
}

export function CopyIcon(p: IconProps): React.ReactElement {
  return (
    <Svg {...p}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </Svg>
  );
}

export function CutIcon(p: IconProps): React.ReactElement {
  return (
    <Svg {...p}>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M8.12 8.12 20 20" />
      <path d="M14.8 14.8 20 4" />
      <path d="M8.12 15.88 12 12" />
    </Svg>
  );
}

export function PasteIcon(p: IconProps): React.ReactElement {
  return (
    <Svg {...p}>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </Svg>
  );
}

export function TrashIcon(p: IconProps): React.ReactElement {
  return (
    <Svg {...p}>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </Svg>
  );
}

export function ZoomInIcon(p: IconProps): React.ReactElement {
  return (
    <Svg {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
      <path d="M11 8v6M8 11h6" />
    </Svg>
  );
}

export function ZoomOutIcon(p: IconProps): React.ReactElement {
  return (
    <Svg {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
      <path d="M8 11h6" />
    </Svg>
  );
}

export function FitIcon(p: IconProps): React.ReactElement {
  return (
    <Svg {...p}>
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </Svg>
  );
}

export function NewIcon(p: IconProps): React.ReactElement {
  return (
    <Svg {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M12 12v6M9 15h6" />
    </Svg>
  );
}

export function ExportIcon(p: IconProps): React.ReactElement {
  return (
    <Svg {...p}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </Svg>
  );
}

export function ImportIcon(p: IconProps): React.ReactElement {
  return (
    <Svg {...p}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 8l5-5 5 5" />
      <path d="M12 3v12" />
    </Svg>
  );
}

export function ChartIcon(p: IconProps): React.ReactElement {
  return (
    <Svg {...p}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
    </Svg>
  );
}

export function ProjectsIcon(p: IconProps): React.ReactElement {
  return (
    <Svg {...p}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </Svg>
  );
}

export function MoreIcon(p: IconProps): React.ReactElement {
  return (
    <Svg {...p}>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </Svg>
  );
}

export function MoveIcon(p: IconProps): React.ReactElement {
  return (
    <Svg {...p}>
      <path d="M12 2v20M2 12h20" />
      <path d="m9 5 3-3 3 3M9 19l3 3 3-3M5 9l-3 3 3 3M19 9l3 3-3 3" />
    </Svg>
  );
}
