import type { ComponentPropsWithoutRef, ElementType } from "react";

type GlassCardProps<T extends ElementType> = {
  as?: T;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className">;

export function GlassCard<T extends ElementType = "div">({
  as,
  className = "",
  ...props
}: GlassCardProps<T>) {
  const Component = as ?? "div";
  return (
    <Component
      className={`glass-card${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}
