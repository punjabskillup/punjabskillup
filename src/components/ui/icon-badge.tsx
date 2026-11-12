import type { ReactNode } from "react";

type IconBadgeProps = {
  children: ReactNode;
  tone?: "primary" | "navy" | "saffron" | "teal" | "muted" | "rose";
  className?: string;
};

export function IconBadge({
  children,
  tone = "primary",
  className = "",
}: IconBadgeProps) {
  return (
    <span
      className={`icon-badge icon-badge-${tone}${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}
