/**
 * GlassFilters
 * Global SVG filter definitions for Liquid Glass refraction.
 * Mounted once in root layout; referenced via CSS `backdrop-filter: url(#glass-refract)`.
 *
 * Ported verbatim from sales-ai-liquid (port 3002). Kept in
 * src/components/liquid/glass/ to isolate from the classic mockup tree.
 */
export function GlassFilters() {
  return (
    <svg
      width="0"
      height="0"
      aria-hidden="true"
      style={{
        position: 'absolute',
        width: 0,
        height: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <defs>
        <filter
          id="glass-refract"
          x="-10%"
          y="-10%"
          width="120%"
          height="120%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.008 0.012"
            numOctaves="2"
            seed="7"
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation="2" result="softNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="softNoise"
            scale="28"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        <filter
          id="glass-refract-sm"
          x="-10%"
          y="-10%"
          width="120%"
          height="120%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.02 0.02"
            numOctaves="2"
            seed="3"
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation="1.2" result="softNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="softNoise"
            scale="12"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
