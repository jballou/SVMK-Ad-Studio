/**
 * Logo loading animation. Renders the `.logo-loader` CSS class from
 * globals.css (the single source for the SVG; /public/logo-loader.svg is the
 * standalone copy). To recolor, edit the color in that class.
 * Pass `height` to size by height (the width follows the logo's proportions) or `size` to size by width.
 */
export function LogoLoader({
  size = 64,
  height,
  label = "Loading",
  className = "",
}: {
  size?: number;
  height?: number;
  label?: string;
  className?: string;
}) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`logo-loader ${className}`}
      style={height ? { height, width: "auto" } : { width: size }}
    />
  );
}
