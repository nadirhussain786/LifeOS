import Svg, { Circle, Rect } from 'react-native-svg';

/**
 * The LifeOS mark.
 *
 * Four life areas as unlike shapes, two of them recessed. It says "operating
 * system" without leaning on a letter, and the mix of solid and receded forms is
 * the design system's own premise — "depth comes from layered surfaces, never
 * from neomorphic bevels or skeuomorphic texture" (constants/design-tokens.ts).
 *
 * The geometry matches `MARKS.modules` in `scripts/make-brand-assets.mjs`
 * exactly, in a 100-unit space, with the viewBox set to the mark's own ink
 * bounding box so it self-centres at any size. Keeping the two in step matters:
 * the launcher icon, the native splash and this component are the three places a
 * user meets the brand, and a mark that drifts between them reads as three
 * different apps. That script also holds three alternate marks — changing which
 * one ships means updating both files.
 */
export function LifeOSMark({
  size = 40,
  color = '#ffffff',
  /** False renders a flat silhouette, for stencils and masks where a recessed
   *  layer would fill rather than recede. */
  layered = true,
}: {
  size?: number;
  color?: string;
  layered?: boolean;
}) {
  const recessed = layered ? 0.45 : 1;
  return (
    <Svg width={size} height={size} viewBox="10 10 80 80" accessibilityRole="image">
      <Rect x={10} y={10} width={36} height={36} rx={10} fill={color} />
      <Circle cx={72} cy={28} r={18} fill={color} />
      <Circle cx={28} cy={72} r={18} fill={color} opacity={recessed} />
      <Rect x={54} y={54} width={36} height={36} rx={10} fill={color} opacity={recessed} />
    </Svg>
  );
}
