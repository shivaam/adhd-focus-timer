"use client";

type Props = {
  progress: number;
  variant?: "focus" | "break" | "warn" | "idle";
  size?: number;
  children?: React.ReactNode;
  dimmed?: boolean;
};

export function Wedge({ progress, variant = "focus", size = 280, children, dimmed = false }: Props) {
  const angle = (1 - Math.min(1, Math.max(0, progress))) * 360;

  const accentVar =
    variant === "break" ? "--color-accent-2"
    : variant === "warn" ? "--color-warn"
    : "--color-accent";
  const softVar =
    variant === "break" ? "--color-accent-2-soft"
    : variant === "warn" ? "--color-warn-soft"
    : "--color-accent-soft";

  const filledColor = `var(${accentVar})`;
  const emptyColor = `var(${softVar})`;
  const bg =
    variant === "idle"
      ? `radial-gradient(circle, var(${softVar}) 0%, var(${softVar}) 100%)`
      : `conic-gradient(${filledColor} 0deg ${angle}deg, ${emptyColor} ${angle}deg 360deg)`;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        position: "relative",
        opacity: dimmed ? 0.5 : 1,
        transition: "opacity 200ms ease-out",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 8,
          borderRadius: "50%",
          border: "1px solid rgba(0,0,0,0.04)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}
