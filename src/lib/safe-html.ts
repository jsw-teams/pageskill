const SAFE_HTML = Symbol('Pageskill.SafeHtml');

export class Html extends String {
  readonly [SAFE_HTML] = true;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function safeUrl(value: unknown): string {
  const input = String(value ?? '').trim();
  if (!input) return '#';
  try {
    const url = new URL(input, 'https://pageskill.invalid');
    if (!['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) return '#';
    return escapeHtml(input);
  } catch {
    return '#';
  }
}

export function html(strings: TemplateStringsArray, ...values: unknown[]): Html {
  let output = '';
  for (let index = 0; index < strings.length; index += 1) {
    output += strings[index];
    if (index < values.length) output += values[index] instanceof Html ? String(values[index]) : escapeHtml(values[index]);
  }
  return new Html(output);
}

export function unsafeHtml(value: string): Html {
  return new Html(value);
}
