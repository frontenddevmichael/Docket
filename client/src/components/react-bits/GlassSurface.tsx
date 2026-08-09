import { type ReactNode } from 'react';

interface GlassSurfaceProps {
  children: ReactNode;
  className?: string;
  backgroundEffect?: number;
}

export default function GlassSurface({
  children,
  className = '',
  backgroundEffect = 0.15,
}: GlassSurfaceProps) {
  const opacity = Math.max(0, Math.min(1, backgroundEffect));

  return (
    <div
      className={`relative overflow-hidden backdrop-blur-sm ${className}`}
      style={{
        backgroundColor: `rgba(255,255,255,${opacity * 0.08})`,
        boxShadow: '0 1px 2px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(255,255,255,0.08)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, rgba(245,158,11,${opacity * 0.12}), transparent 70%)`,
        }}
        aria-hidden
      />
      {children}
    </div>
  );
}
