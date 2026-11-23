// Site footer with the author's links.

const LINKS = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/hoang-tran-963b8b416",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden="true">
        <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4V21H3V9.75Zm6.5 0h3.8v1.6h.06c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.77 2.65 4.77 6.1V21h-4v-4.95c0-1.18-.02-2.7-1.65-2.7-1.65 0-1.9 1.29-1.9 2.62V21h-4V9.75Z" />
      </svg>
    ),
  },
  {
    label: "GitHub",
    href: "https://github.com/Vu-Tran-1611",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden="true">
        <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.58 9.58 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
      </svg>
    ),
  },
  {
    label: "Email",
    href: "mailto:hoangvumytran@gmail.com",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="m4 7 8 6 8-6" />
      </svg>
    ),
  },
];

export function Footer() {
  return (
    <footer className="flex flex-col items-center gap-5 border-t border-black/5 pt-8 text-center sm:flex-row sm:justify-between sm:text-left">
      <div>
        <p className="font-bold text-ink">Song Detector</p>
        <p className="text-sm text-ink-muted">A CNN song recognizer · Next.js, FastAPI and PyTorch</p>
      </div>
      <ul className="flex gap-4">
        {LINKS.map((link) => {
          const external = link.href.startsWith("http");
          return (
            <li key={link.label}>
              <a
                href={link.href}
                aria-label={link.label}
                title={link.label}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="grid size-11 place-items-center rounded-full text-ink-muted shadow-[var(--shadow-soft-sm)] transition-colors hover:text-accent-deep active:shadow-[var(--shadow-soft-inset)]"
              >
                {link.icon}
              </a>
            </li>
          );
        })}
      </ul>
    </footer>
  );
}
