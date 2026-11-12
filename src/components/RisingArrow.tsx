export default function RisingArrow() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1000 600"
      preserveAspectRatio="xMaxYMax meet"
      className="pointer-events-none absolute inset-0 -z-10 hidden h-full w-full lg:block"
    >
      <defs>
        <linearGradient
          id="risingArrowGradient"
          gradientUnits="userSpaceOnUse"
          x1="0" y1="600" x2="900" y2="100"
        >
          <stop offset="0" stopColor="#2347D5" stopOpacity="0.05" />
          <stop offset="1" stopColor="#2347D5" stopOpacity="0.30" />
        </linearGradient>
      </defs>
      <path
        className="hero-rising-arrow-path"
        pathLength="1"
        d="M-20 600 L250 380 L420 500 L900 100 M780 100 H900 V220"
        fill="none"
        stroke="url(#risingArrowGradient)"
        strokeWidth="64"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
