import type { ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
  distance?: number;
  duration?: number;
  scale?: boolean;
  className?: string;
}

// Render plain container without animations for maximum performance and instant loading
export default function ScrollReveal({
  children,
  className = "",
}: ScrollRevealProps) {
  return <div className={className}>{children}</div>;
}
