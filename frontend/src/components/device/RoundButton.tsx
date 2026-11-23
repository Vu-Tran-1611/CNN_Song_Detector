import type { ReactNode } from "react";

type RoundButtonProps = {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
};

export function RoundButton({ label, icon, onClick, disabled = false }: RoundButtonProps) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={[
          "grid size-12 place-items-center rounded-full panel-texture text-panel-ink",
          "shadow-[var(--shadow-knob)] transition-[box-shadow,transform,opacity] duration-150",
          "enabled:active:scale-95 enabled:active:shadow-[var(--shadow-knob-pressed)]",
          "disabled:cursor-not-allowed disabled:opacity-40",
        ].join(" ")}
      >
        {icon}
      </button>
      <span aria-hidden="true" className="text-xs font-medium text-panel-muted">
        {label}
      </span>
    </div>
  );
}
