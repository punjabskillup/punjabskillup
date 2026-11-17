import type { ComponentPropsWithoutRef, ElementType } from "react";

type SurfaceCardProps<T extends ElementType> = {
  as?: T;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className">;

export function SurfaceCard<T extends ElementType = "div">({
  as,
  className = "",
  ...props
}: SurfaceCardProps<T>) {
  const Component = as ?? "div";
  return (
    <Component
      className={`surface-card${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}
