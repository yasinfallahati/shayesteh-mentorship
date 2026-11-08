const CELL = 20;
const STEP = 24;
const COLUMNS = 62;
const PEAK = 55;
const HEIGHT = 520;
const FILLS = ["#b4e8bd", "#62cf7a", "#27a24b", "#116a35"];

function random(seed: number) {
  const value = Math.sin(seed * 127.1) * 43758.5453;
  return value - Math.floor(value);
}

function columnHeight(fromRight: number) {
  const beforePeak = fromRight <= PEAK ? fromRight : PEAK - (fromRight - PEAK) * 2;
  const progress = beforePeak / PEAK;
  const rise = 2 + 15 * Math.pow(progress, 1.7);
  const swell = 1.1 * Math.sin(fromRight / 3.4) + 0.5 * Math.sin(fromRight / 1.7);
  return Math.max(1, Math.round(rise + swell));
}

function cellFill(depth: number, seed: number) {
  const base = depth === 0 ? 0 : depth < 3 ? 1 : depth < 7 ? 2 : 3;
  const shift = random(seed) > 0.72 ? 1 : 0;
  return FILLS[Math.min(3, base + shift)];
}

/** The hero landscape: a contribution graph that has grown into a hill. */
export function GrassHill() {
  const heights = Array.from({ length: COLUMNS }, (_, index) => columnHeight(index));
  const peak = heights.indexOf(Math.max(...heights));
  const flagX = 1488 - peak * STEP - STEP + CELL / 2;
  const flagBase = HEIGHT - heights[peak] * STEP;

  return (
    <svg
      viewBox={`0 0 1488 ${HEIGHT}`}
      preserveAspectRatio="xMinYMax slice"
      className="absolute inset-0 size-full"
      aria-hidden="true"
    >
      {heights.map((height, fromRight) => {
        const x = 1488 - (fromRight + 1) * STEP;
        return (
          <g key={fromRight} className="hill-column" style={{ ["--i" as string]: fromRight }}>
            {Array.from({ length: height }, (_, row) => (
              <rect
                key={row}
                x={x + 2}
                y={HEIGHT - (row + 1) * STEP + 2}
                width={CELL}
                height={CELL}
                rx="4"
                fill={cellFill(height - row - 1, fromRight * 31 + row * 7)}
              />
            ))}
          </g>
        );
      })}
      <g className="hill-flag">
        <rect x={flagX - 1.5} y={flagBase - 62} width="3" height="62" rx="1.5" fill="#0f2f4d" />
        <path d={`M${flagX} ${flagBase - 62} l-36 11 l36 11 z`} fill="#ffc53d" />
      </g>
    </svg>
  );
}
