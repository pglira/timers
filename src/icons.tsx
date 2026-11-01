import type { ReactNode } from 'react';

// All icons use one style: a 24×24 box, solid shapes and lines of the same
// width with square ends. Each shape is at the center of the box.
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  );
}

export function PlusIcon() {
  return (
    <Icon>
      <path className="line" d="M12 5V19M5 12H19" />
    </Icon>
  );
}

export function PauseIcon() {
  return (
    <Icon>
      <rect x="6" y="5" width="4" height="14" />
      <rect x="14" y="5" width="4" height="14" />
    </Icon>
  );
}

// The centroid of the triangle is at the center of the box.
export function PlayIcon() {
  return (
    <Icon>
      <path d="M8 5L20 12L8 19Z" />
    </Icon>
  );
}

// A circle with a gap at the upper left and an arrowhead at the top that
// points counterclockwise.
export function ResetIcon() {
  return (
    <Icon>
      <path className="line" d="M12 6A7 7 0 1 1 5.94 9.5" />
      <path d="M12.5 2.5V9.5L8.5 6Z" />
    </Icon>
  );
}

// A circle with a solid left half.
export function AutoThemeIcon() {
  return (
    <Icon>
      <circle className="line" cx="12" cy="12" r="7.5" />
      <path d="M12 4.5A7.5 7.5 0 0 0 12 19.5Z" />
    </Icon>
  );
}

export function LightThemeIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="4.5" />
      <path
        className="line"
        d="M12 2V4.5M12 19.5V22M2 12H4.5M19.5 12H22M4.9 4.9L6.7 6.7M17.3 17.3L19.1 19.1M4.9 19.1L6.7 17.3M17.3 6.7L19.1 4.9"
      />
    </Icon>
  );
}

// A crescent: the outer arc of a circle and the inner arc of a second circle.
export function DarkThemeIcon() {
  return (
    <Icon>
      <path d="M11.5 4A8 8 0 1 0 19.9 13.3A6.5 6.5 0 0 1 11.5 4Z" />
    </Icon>
  );
}

// Two vertical arrows that point in opposite directions.
export function SortIcon() {
  return (
    <Icon>
      <path className="line" d="M8 4V20M4 16L8 20L12 16M16 20V4M12 8L16 4L20 8" />
    </Icon>
  );
}

export function CheckIcon() {
  return (
    <Icon>
      <path className="line" d="M5 12L10 17L19 7" />
    </Icon>
  );
}

// Three horizontal lines: the handle that moves a row.
export function GripIcon() {
  return (
    <Icon>
      <path className="line" d="M4 8H20M4 12H20M4 16H20" />
    </Icon>
  );
}

// An arrow that points down into a tray: the backup of the data.
export function BackupIcon() {
  return (
    <Icon>
      <path className="line" d="M12 4V14M8 10L12 14L16 10M4 16V20H20V16" />
    </Icon>
  );
}
