const COLUMNS = 64;
const ROWS = 30;
const CELL = 17;
const STEP = 22;
const WIDTH = COLUMNS * STEP;
const HEIGHT = ROWS * STEP;
const FILLS = ["#114a38", "#165a44", "#1d7053", "#2a8a63"];

function noise(seed: number) {
  const value = Math.sin(seed * 127.1 + 11.7) * 43758.5453;
  return value - Math.floor(value);
}

/** A contribution graph that gets denser towards the end of the path. */
export function HeroField() {
  return (
    <svg width={WIDTH} height={HEIGHT} className="absolute left-0 top-0" aria-hidden="true">
      {Array.from({ length: COLUMNS }, (_, fromRight) => {
        const x = WIDTH - (fromRight + 1) * STEP;
        const progress = fromRight / (COLUMNS - 1);
        return (
          <g key={fromRight} className="field-column" style={{ ["--i" as string]: fromRight }}>
            {Array.from({ length: ROWS }, (_, row) => {
              const level = Math.floor(noise(fromRight * 31 + row * 7) * 2.2 + progress * 2.9 - 1.3);
              if (level < 0) return null;
              return <rect key={row} x={x + 2} y={row * STEP + 2} width={CELL} height={CELL} rx="3.5" fill={FILLS[Math.min(3, level)]} />;
            })}
          </g>
        );
      })}
    </svg>
  );
}
