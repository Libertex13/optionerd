/** Mini payoff shape SVGs for strategy cards and template chips */

interface PayoffShapeProps {
  shape: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
  className?: string;
}

export function PayoffShape({
  shape,
  width = 220,
  height = 54,
  strokeWidth = 1.8,
  className,
}: PayoffShapeProps) {
  const y0 = height * 0.62;
  const ymax = height * 0.12;
  const ymin = height * 0.88;
  const w = width;
  const h = height;

  const paths: Record<string, string> = {
    up: `M0 ${ymin} L${w * 0.55} ${ymin} L${w * 0.95} ${ymax}`,
    down: `M0 ${ymax} L${w * 0.45} ${ymin} L${w} ${ymin}`,
    flat: `M0 ${ymin} L${w * 0.22} ${y0} L${w * 0.35} ${ymax} L${w * 0.65} ${ymax} L${w * 0.78} ${y0} L${w} ${ymin}`,
    vol: `M0 ${ymax} L${w * 0.45} ${ymin} L${w * 0.55} ${ymin} L${w} ${ymax}`,
    hockeyup: `M0 ${ymin} L${w * 0.5} ${ymin} L${w * 0.95} ${ymax}`,
    hockeydown: `M0 ${ymax} L${w * 0.5} ${ymin} L${w} ${ymin}`,
    stepup: `M0 ${ymin} L${w * 0.35} ${ymin} L${w * 0.65} ${ymax} L${w} ${ymax}`,
    stepdown: `M0 ${ymax} L${w * 0.35} ${ymax} L${w * 0.65} ${ymin} L${w} ${ymin}`,
    stepflat: `M0 ${ymin} L${w * 0.4} ${ymin} L${w * 0.6} ${ymax} L${w} ${ymax}`,
    stepflatd: `M0 ${ymax} L${w * 0.4} ${ymax} L${w * 0.6} ${ymin} L${w} ${ymin}`,
    tent: `M0 ${ymin} L${w * 0.2} ${ymin} L${w * 0.3} ${ymax} L${w * 0.7} ${ymax} L${w * 0.8} ${ymin} L${w} ${ymin}`,
    pyramid: `M0 ${ymin} L${w * 0.5} ${ymax} L${w} ${ymin}`,
    wave: `M0 ${ymin + 4} L${w * 0.3} ${y0} L${w * 0.5} ${ymax} L${w * 0.7} ${y0} L${w} ${ymin + 4}`,
    hump: `M0 ${y0 + 8} C ${w * 0.35} ${ymax - 6}, ${w * 0.65} ${ymax - 6}, ${w} ${y0 + 8}`,
    spike: `M0 ${ymin - 2} L${w * 0.35} ${ymin - 2} L${w * 0.5} ${ymax} L${w * 0.65} ${ymin - 2} L${w} ${ymin - 2}`,
    slopecap: `M0 ${ymin} L${w * 0.55} ${ymax} L${w} ${ymax}`,
    vee: `M0 ${ymax} L${w * 0.5} ${ymin} L${w} ${ymax}`,
  };

  const d = paths[shape] || `M0 ${y0} L${w} ${y0}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={className}
      style={{ width: "100%", height: "100%" }}
    >
      <line
        x1="0"
        y1={ymin}
        x2={w}
        y2={ymin}
        stroke="var(--color-border)"
        strokeDasharray="2 3"
      />
      <path
        d={d}
        fill="none"
        stroke="var(--color-foreground)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
