"use client";

import { useEffect, useState, type ReactNode } from "react";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "size-5 shrink-0",
  "aria-hidden": true,
};

const ITEMS: { id: string; label: string; icon: ReactNode }[] = [
  {
    id: "detector",
    label: "Detector",
    icon: (
      <svg {...iconProps}>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
      </svg>
    ),
  },
  {
    id: "how",
    label: "How it works",
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.33c-.6.25-1 .83-1 1.47v.4M12 17.2v.1" />
      </svg>
    ),
  },
  {
    id: "model",
    label: "Model",
    icon: (
      <svg {...iconProps}>
        <rect x="6" y="6" width="12" height="12" rx="2" />
        <path d="M9 2.5V6M15 2.5V6M9 18v3.5M15 18v3.5M2.5 9H6M2.5 15H6M18 9h3.5M18 15h3.5M10 10h4v4h-4z" />
      </svg>
    ),
  },
  {
    id: "about",
    label: "About",
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
      </svg>
    ),
  },
  {
    id: "projects",
    label: "Projects",
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
        <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
        <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
        <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
      </svg>
    ),
  },
  {
    id: "contact",
    label: "Contact",
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="m4 7 8 6 8-6" />
      </svg>
    ),
  },
];

/** Sticky top bar: icon + label (icons only on phones); highlights the section being read. */
export function NavBar() {
  const [active, setActive] = useState("detector");

  useEffect(() => {
    const sections = ITEMS.map((item) => document.getElementById(item.id)).filter((el): el is HTMLElement => el !== null);
    // A section counts as "being read" when it crosses a band near the top third of the screen.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length > 0) setActive(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Sections"
      className="border-b border-black/5"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:px-6 lg:px-10">
        <a href="#detector" className="flex items-center gap-2.5 rounded-full pr-2" aria-label="Song Detector, back to top">
          {/* Mini vinyl, same as the app icon */}
          <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-[#16181d] shadow-[var(--shadow-soft-sm)]">
            <span className="grid size-3.5 place-items-center rounded-full bg-accent">
              <span className="size-1 rounded-full bg-canvas" />
            </span>
          </span>
          <span className="hidden text-lg font-bold text-ink xl:inline">Song Detector</span>
        </a>

        <ul className="flex items-center gap-1 sm:gap-1.5">
          {ITEMS.map((item) => {
            const isActive = active === item.id;
            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  aria-label={item.label}
                  aria-current={isActive ? "location" : undefined}
                  title={item.label}
                  className={[
                    "flex size-11 items-center justify-center gap-2 rounded-full text-base font-semibold transition-[box-shadow,color] md:size-auto md:px-4 md:py-2.5",
                    isActive
                      ? "text-accent-deep shadow-[var(--shadow-soft-inset)]"
                      : "text-ink-muted hover:text-ink",
                  ].join(" ")}
                >
                  {item.icon}
                  <span className="hidden md:inline">{item.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
