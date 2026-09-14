function channel(value: string): number | undefined {
  const number = Number(value.trim());
  return Number.isFinite(number) ? number / 255 : undefined;
}

export function parseColor(value: string): [number, number, number] | undefined {
  const input = String(value || '').trim().toLowerCase();
  const hex = input.match(/^#([0-9a-f]{3,8})$/i)?.[1];
  if (hex) {
    if (hex.length === 3 || hex.length === 4) return [0, 1, 2].map(index => Number.parseInt(hex[index] + hex[index], 16) / 255) as [number, number, number];
    if (hex.length === 6 || hex.length === 8) return [0, 2, 4].map(index => Number.parseInt(hex.slice(index, index + 2), 16) / 255) as [number, number, number];
    return undefined;
  }
  const rgb = input.match(/^rgba?\(([^)]+)\)$/i)?.[1];
  if (!rgb) return undefined;
  const parts = rgb.split(',').slice(0, 3).map(channel);
  return parts.every(value => value !== undefined) ? parts as [number, number, number] : undefined;
}

function linear(value: number): number {
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(color: [number, number, number]): number {
  return 0.2126 * linear(color[0]) + 0.7152 * linear(color[1]) + 0.0722 * linear(color[2]);
}

export function contrastRatio(foreground: string | [number, number, number], background: string | [number, number, number]): number | undefined {
  const foregroundColor = Array.isArray(foreground) ? foreground : parseColor(foreground);
  const backgroundColor = Array.isArray(background) ? background : parseColor(background);
  if (!foregroundColor || !backgroundColor) return undefined;
  const foregroundLuminance = relativeLuminance(foregroundColor);
  const backgroundLuminance = relativeLuminance(backgroundColor);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}
