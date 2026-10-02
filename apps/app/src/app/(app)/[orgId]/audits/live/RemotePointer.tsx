'use client';
import { useEffect, useRef, type RefObject } from 'react';
import type { AuditPointer } from './live-types';

export interface PointerPosition extends AuditPointer {
  receivedAt: number;
}
export function RemotePointer({
  position,
  root,
  name,
}: {
  position: RefObject<PointerPosition | null>;
  root: RefObject<HTMLDivElement | null>;
  name: string;
}) {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    let x = 0;
    let y = 0;
    let initialized = false;
    const draw = () => {
      const target = position.current;
      const bounds = root.current?.getBoundingClientRect();
      const node = element.current;
      if (node && target && bounds && target.visible && Date.now() - target.receivedAt < 1500) {
        const anchor = target.anchor
          ? Array.from(document.querySelectorAll<HTMLElement>('[data-audit-live-target]')).find(
              (el) => el.dataset.auditLiveTarget === target.anchor,
            )
          : null;
        const reference = anchor?.getBoundingClientRect() ?? bounds;
        const tx = reference.left - bounds.left + target.x * reference.width;
        const ty = reference.top - bounds.top + target.y * reference.height;
        if (!initialized) {
          x = tx;
          y = ty;
          initialized = true;
        }
        x += (tx - x) * 0.4;
        y += (ty - y) * 0.4;
        node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        node.style.opacity = '1';
      } else if (node) {
        node.style.opacity = '0';
        initialized = false;
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [position, root]);
  return (
    <div
      ref={element}
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-0 z-[60] opacity-0"
    >
      <svg width="22" height="26" viewBox="0 0 22 26">
        <path
          d="M2 2L19 15L11 16L7 24Z"
          fill="var(--primary)"
          stroke="var(--background)"
          strokeWidth="2"
        />
      </svg>
      <span className="ml-4 rounded bg-primary px-2 py-1 text-xs text-primary-foreground shadow-sm">
        {name}
      </span>
    </div>
  );
}
