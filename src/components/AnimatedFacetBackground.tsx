import React from 'react';

/**
 * Continuous, subtle facet-glass and geometric light-refraction background
 * rendered behind all application routes (Landing, Login, Register, Privacy,
 * HR Workspace, Employee Workspace, and Candidate Workspace).
 * Respects `prefers-reduced-motion` and never intercepts pointer events.
 */
export const AnimatedFacetBackground: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none"
    >
      {/* Subtle architectural drafting grid */}
      <div className="absolute inset-0 architectural-grid-overlay" />

      {/* Top-right moving angular facet */}
      <svg
        className="absolute -top-24 -right-24 w-[540px] h-[540px] opacity-65 dark:opacity-35 animate-facet-slow"
        viewBox="0 0 600 600"
        fill="none"
      >
        <polygon
          points="140,20 560,70 490,470 210,520 60,260"
          fill="var(--brand-subtle)"
          stroke="var(--border-emphasis)"
          strokeWidth="1.25"
        />
        <polygon
          points="220,90 520,150 430,420 170,360"
          fill="transparent"
          stroke="var(--brand-primary)"
          strokeOpacity="0.22"
          strokeWidth="1"
        />
        <line
          x1="140"
          y1="20"
          x2="430"
          y2="420"
          stroke="var(--border-emphasis)"
          strokeOpacity="0.45"
          strokeWidth="0.9"
        />
        <line
          x1="560"
          y1="70"
          x2="170"
          y2="360"
          stroke="var(--border-emphasis)"
          strokeOpacity="0.35"
          strokeWidth="0.9"
        />
      </svg>

      {/* Bottom-left counter-drifting prism */}
      <svg
        className="absolute -bottom-28 -left-24 w-[520px] h-[520px] opacity-60 dark:opacity-30 animate-facet-counter"
        viewBox="0 0 560 560"
        fill="none"
      >
        <polygon
          points="70,120 420,50 510,360 280,510 50,390"
          fill="var(--surface-secondary)"
          fillOpacity="0.55"
          stroke="var(--border-subtle)"
          strokeWidth="1.25"
        />
        <polygon
          points="130,180 390,120 450,330 220,440"
          fill="var(--brand-subtle)"
          stroke="var(--border-emphasis)"
          strokeWidth="1"
        />
        <line
          x1="70"
          y1="120"
          x2="450"
          y2="330"
          stroke="var(--brand-primary)"
          strokeOpacity="0.16"
          strokeWidth="1"
        />
      </svg>

      {/* Center-right subtle refraction diamond */}
      <svg
        className="
          hidden md:block absolute top-1/3 left-1/2 -translate-x-1/2
          w-[680px] h-[440px] opacity-45 dark:opacity-25 animate-facet-drift
        "
        viewBox="0 0 680 440"
        fill="none"
      >
        <polygon
          points="340,20 640,220 340,420 40,220"
          fill="transparent"
          stroke="var(--border-emphasis)"
          strokeOpacity="0.4"
          strokeWidth="1"
        />
        <polygon
          points="340,70 560,220 340,370 120,220"
          fill="var(--brand-subtle)"
          fillOpacity="0.35"
          stroke="var(--brand-primary)"
          strokeOpacity="0.16"
          strokeWidth="0.8"
        />
      </svg>
    </div>
  );
};
