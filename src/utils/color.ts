const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

type RgbColor = {
  red: number;
  green: number;
  blue: number;
};

function hexToRgb(hexColor: string): RgbColor | null {
  const sanitizedColor = sanitizeHexColor(hexColor);

  if (!sanitizedColor) {
    return null;
  }

  return {
    red: Number.parseInt(sanitizedColor.slice(1, 3), 16),
    green: Number.parseInt(sanitizedColor.slice(3, 5), 16),
    blue: Number.parseInt(sanitizedColor.slice(5, 7), 16),
  };
}

export function sanitizeHexColor(color: string) {
  const trimmedColor = color.trim();

  if (!HEX_COLOR_PATTERN.test(trimmedColor)) {
    return null;
  }

  const upperColor = trimmedColor.toUpperCase();

  if (upperColor.length === 4) {
    return `#${upperColor[1]}${upperColor[1]}${upperColor[2]}${upperColor[2]}${upperColor[3]}${upperColor[3]}`;
  }

  return upperColor;
}

export function normalizeHexColor(color: string | null | undefined, fallback: string) {
  return sanitizeHexColor(color ?? '') ?? fallback;
}

export function getContrastTextColor(color: string, darkColor = '#0F172A', lightColor = '#FFFFFF') {
  const rgbColor = hexToRgb(color);

  if (!rgbColor) {
    return darkColor;
  }

  const brightness = (rgbColor.red * 299 + rgbColor.green * 587 + rgbColor.blue * 114) / 1000;

  return brightness >= 160 ? darkColor : lightColor;
}

export function toRgba(color: string, alpha: number) {
  const rgbColor = hexToRgb(color);

  if (!rgbColor) {
    return `rgba(15, 23, 42, ${alpha})`;
  }

  return `rgba(${rgbColor.red}, ${rgbColor.green}, ${rgbColor.blue}, ${alpha})`;
}
