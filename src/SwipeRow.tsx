import {
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  useRef,
  useState,
} from 'react';

// Width of the delete button that a short swipe to the left shows.
const ACTION_WIDTH = 88;
// A move of more than this distance starts a swipe or a scroll.
const SLOP = 8;
// A swipe past this part of the row width deletes the row at once.
const DELETE_FRACTION = 0.5;
const ANIMATION_MS = 200;

interface Props {
  className: string;
  style?: CSSProperties;
  onDelete: () => void;
  children: ReactNode;
}

interface Drag {
  pointerId: number;
  x: number;
  y: number;
  base: number;
  // Null until the move is long enough to tell a swipe from a scroll.
  horizontal: boolean | null;
}

// A list row that the user swipes to the left to delete. A short swipe opens a
// delete button. A long swipe deletes the row. A tap on an open row closes it.
export function SwipeRow({ className, style, onDelete, children }: Props) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const drag = useRef<Drag | null>(null);
  // Set after a swipe, so that the click that follows does not reach the row.
  const swiped = useRef(false);

  const remove = (width: number) => {
    setDeleting(true);
    setOffset(-width);
    setTimeout(onDelete, ANIMATION_MS);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (deleting || (e.pointerType === 'mouse' && e.button !== 0)) return;
    swiped.current = false;
    drag.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, base: offset, horizontal: null };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (d.horizontal === null) {
      if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
      d.horizontal = Math.abs(dx) > Math.abs(dy);
      if (!d.horizontal) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
    }
    if (!d.horizontal) return;
    const width = e.currentTarget.offsetWidth;
    setOffset(Math.min(0, Math.max(-width, d.base + dx)));
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    if (!d.horizontal) return;
    swiped.current = true;
    setDragging(false);
    const width = e.currentTarget.offsetWidth;
    if (offset < -width * DELETE_FRACTION) remove(width);
    else setOffset(offset < -ACTION_WIDTH / 2 ? -ACTION_WIDTH : 0);
  };

  const onPointerCancel = () => {
    if (drag.current?.horizontal) {
      setDragging(false);
      setOffset(drag.current.base);
    }
    drag.current = null;
  };

  // Block the click after a swipe, and use a tap on an open row to close it.
  const onClickCapture = (e: MouseEvent) => {
    if (swiped.current || offset !== 0) {
      e.preventDefault();
      e.stopPropagation();
      if (!swiped.current) setOffset(0);
    }
    swiped.current = false;
  };

  return (
    <li className="swipe-row">
      <button
        className="swipe-delete"
        style={{ width: Math.max(ACTION_WIDTH, -offset) }}
        onClick={(e) => remove(e.currentTarget.parentElement?.offsetWidth ?? ACTION_WIDTH)}
        tabIndex={offset === 0 ? -1 : 0}
        aria-hidden={offset === 0}
      >
        Delete
      </button>
      <div
        className={className}
        style={{
          ...style,
          transform: `translateX(${offset}px)`,
          transition: dragging ? 'none' : `transform ${ANIMATION_MS}ms ease-out`,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClickCapture={onClickCapture}
      >
        {children}
      </div>
    </li>
  );
}
