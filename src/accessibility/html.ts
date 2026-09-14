import type { AccessibilityDiagnostic } from './types.ts';

export type BrowserHtmlResult = {
  diagnostics: AccessibilityDiagnostic[];
  checks: string[];
};

/** This function is serialized into the browser so the checks inspect the
 * final DOM and computed styles, rather than a source-string approximation. */
export function browserHtmlAuditScript(): string {
  return `(${() => {
    const diagnostics: any[] = [];
    const checks: string[] = [];
    const route = location.pathname;
    const add = (level: string, rule: string, message: string, details: Record<string, any> = {}) => diagnostics.push({ level, rule, message, route, ...details });
    const selectorFor = (element: any): string | undefined => {
      if (!element || !element.tagName) return undefined;
      if (element.id) return '#' + CSS.escape(element.id);
      const parts = [];
      let current = element;
      while (current && current.nodeType === 1 && parts.length < 4) {
        let part = current.tagName.toLowerCase();
        if (current.classList.length) part += '.' + [...current.classList].slice(0, 2).map(CSS.escape).join('.');
        const parent = current.parentElement;
        if (parent) {
          const siblings = [...parent.children].filter(child => child.tagName === current.tagName);
          if (siblings.length > 1) part += ':nth-of-type(' + (siblings.indexOf(current) + 1) + ')';
        }
        parts.unshift(part);
        current = parent;
      }
      return parts.join(' > ');
    };
    const name = (element: any): string => {
      if (!element) return '';
      const labelledBy = element.getAttribute('aria-labelledby');
      if (labelledBy) return labelledBy.split(/\s+/).map((id: string) => document.getElementById(id)?.textContent || '').join(' ').trim();
      const ariaLabel = element.getAttribute('aria-label');
      if (ariaLabel) return String(ariaLabel).replace(/\s+/g, ' ').trim();
      const label = element.id && document.querySelector('label[for="' + CSS.escape(element.id) + '"]') || element.closest?.('label');
      if (label) return String(label.textContent || '').replace(/\s+/g, ' ').trim();
      const alt = element.getAttribute('alt');
      if (alt) return String(alt).replace(/\s+/g, ' ').trim();
      return String(element.textContent || element.getAttribute('title') || '').replace(/\s+/g, ' ').trim();
    };
    const visible = (element: any): boolean => {
      if (!element || element.hidden || element.getAttribute('aria-hidden') === 'true') return false;
      const style = getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden';
    };
    const focusable = (element: any): boolean => element.matches('a[href],button,input,select,textarea,summary,[tabindex]:not([tabindex="-1"])') && visible(element);
    const tabStop = (element: any): boolean => element.matches('a[href],button,input,select,textarea,summary,[tabindex]:not([tabindex="-1"])');
    checks.push('document structure');
    if (document.doctype?.name !== 'html') add('warning', 'html/doctype', 'Document should use the HTML5 doctype.', { element: '<!doctype html>', wcag: ['WCAG 4.1.1'] });
    if (!document.documentElement.lang?.trim()) add('error', 'html/lang', 'The document language is missing.', { selector: 'html', wcag: ['WCAG 3.1.1'] });
    if (!document.title.trim()) add('error', 'html/title', 'The document title is empty.', { selector: 'title', wcag: ['WCAG 2.4.2'] });
    const mains = [...document.querySelectorAll('main')];
    if (mains.length !== 1) add('error', 'html/main', 'Each page must have exactly one main landmark.', { selector: 'main', wcag: ['WCAG 1.3.1'] });
    const main = mains[0];
    if (main && main.id === 'main' && main.getAttribute('tabindex') !== '-1') add('warning', 'html/skip-target', 'The skip-link target should be programmatically focusable with tabindex="-1".', { selector: '#main', wcag: ['WCAG 2.4.1'] });
    const skip = document.querySelector('a.skip');
    if (skip && !document.getElementById((skip.getAttribute('href') || '').replace(/^#/, ''))) add('error', 'html/skip-target', 'Skip link target does not exist.', { selector: 'a.skip', wcag: ['WCAG 2.4.1'] });
    const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')];
    const h1 = headings.filter(element => element.tagName === 'H1');
    if (h1.length !== 1) add('error', 'html/heading-structure', 'Each page should have one and only one h1.', { selector: 'h1', wcag: ['WCAG 1.3.1'] });
    const h1Names = new Map<string, any>();
    for (const heading of h1) {
      const headingName = name(heading).toLocaleLowerCase().replace(/\s+/g, ' ').trim();
      if (!headingName) continue;
      if (h1Names.has(headingName)) add('error', 'html/duplicate-h1', 'The page repeats the same accessible h1 name.', { selector: selectorFor(heading), wcag: ['WCAG 1.3.1'] });
      else h1Names.set(headingName, heading);
    }
    let previousHeading = 0;
    for (const heading of headings) {
      const level = Number(heading.tagName.slice(1));
      if (previousHeading && level > previousHeading + 1) add('warning', 'html/heading-order', 'Heading levels should not skip a level.', { selector: selectorFor(heading), element: heading.outerHTML.slice(0, 160), wcag: ['WCAG 1.3.1'] });
      previousHeading = level;
    }
    checks.push('names and relationships');
    const ids = new Set();
    for (const element of document.querySelectorAll('[id]')) {
      if (ids.has(element.id)) add('error', 'html/duplicate-id', 'The id is repeated in the document.', { selector: selectorFor(element), wcag: ['WCAG 4.1.1'] });
      ids.add(element.id);
    }
    for (const element of document.querySelectorAll('[aria-labelledby],[aria-describedby],[aria-controls],[aria-owns]')) {
      for (const id of (element.getAttribute('aria-labelledby') || '').split(/\s+/).concat((element.getAttribute('aria-describedby') || '').split(/\s+/), (element.getAttribute('aria-controls') || '').split(/\s+/), (element.getAttribute('aria-owns') || '').split(/\s+/)).filter(Boolean)) {
        if (!document.getElementById(id)) add('error', 'html/aria-reference', 'ARIA reference points to an element that does not exist.', { selector: selectorFor(element), element: id, wcag: ['WCAG 1.3.1', 'WCAG 4.1.2'] });
      }
    }
    for (const element of document.querySelectorAll('nav,[role="navigation"],[role="search"],[role="region"],dialog,[role="dialog"]')) {
      if (!name(element)) add('warning', 'html/landmark-name', 'Landmark or dialog needs an accessible name.', { selector: selectorFor(element), wcag: ['WCAG 2.4.6', 'WCAG 4.1.2'] });
    }
    for (const element of document.querySelectorAll('a[href],button,[role="button"],[role="link"]')) {
      if (!name(element)) add('error', 'html/control-name', 'Interactive control has no accessible name.', { selector: selectorFor(element), element: element.outerHTML.slice(0, 160), wcag: ['WCAG 2.4.4', 'WCAG 4.1.2'] });
    }
    for (const element of document.querySelectorAll('[role="button"],[role="link"]')) {
      if (!focusable(element)) add('error', 'html/role-keyboard', 'A custom interactive role must be keyboard focusable; prefer the native element.', { selector: selectorFor(element), wcag: ['WCAG 2.1.1', 'WCAG 4.1.2'] });
    }
    for (const element of document.querySelectorAll('[aria-expanded]')) {
      const value = element.getAttribute('aria-expanded');
      if (value !== 'true' && value !== 'false') add('error', 'aria/expanded-value', 'aria-expanded must be true or false.', { selector: selectorFor(element), wcag: ['WCAG 4.1.2'] });
    }
    for (const input of document.querySelectorAll('input,select,textarea')) {
      const control: any = input;
      if (control.type === 'hidden') continue;
      const labelled = control.getAttribute('aria-label') || control.getAttribute('aria-labelledby') || (control.id && document.querySelector('label[for="' + CSS.escape(control.id) + '"]')) || control.closest('label');
      if (!labelled) add('error', 'html/form-name', 'Form control has no associated label.', { selector: selectorFor(control), wcag: ['WCAG 1.3.1', 'WCAG 3.3.2'] });
    }
    for (const element of document.querySelectorAll('[tabindex]')) if (Number(element.getAttribute('tabindex')) > 0) add('error', 'keyboard/tab-order', 'Positive tabindex values make keyboard order unpredictable.', { selector: selectorFor(element), wcag: ['WCAG 2.4.3'] });
    for (const element of document.querySelectorAll('[aria-hidden="true"]')) if (tabStop(element) || [...element.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')].some(tabStop)) add('error', 'keyboard/hidden-focus', 'aria-hidden content contains a focusable control.', { selector: selectorFor(element), wcag: ['WCAG 4.1.2'] });
    for (const element of document.querySelectorAll('a[href][target="_blank"]')) {
      const rel = new Set((element.getAttribute('rel') || '').toLowerCase().split(/\s+/));
      if (!rel.has('noopener') || !rel.has('noreferrer')) add('error', 'security/external-target', 'A new-tab link must include rel="noopener noreferrer".', { selector: selectorFor(element), wcag: ['WCAG 3.2.5'] });
    }
    for (const element of document.querySelectorAll('button,input,select,textarea,a[href]')) {
      let parent = element.parentElement;
      while (parent) {
        if (parent.matches('a[href],button,[role="button"]')) add('error', 'html/nested-interactive', 'Interactive controls must not be nested.', { selector: selectorFor(element), wcag: ['WCAG 4.1.2'] });
        parent = parent.parentElement;
      }
    }
    for (const image of document.querySelectorAll('img')) {
      if (!image.hasAttribute('alt')) add('error', 'html/image-alt', 'Image is missing an alt attribute.', { selector: selectorFor(image), wcag: ['WCAG 1.1.1'] });
      if (!image.hasAttribute('width') || !image.hasAttribute('height')) add('warning', 'html/image-dimensions', 'Image should declare intrinsic width and height to reduce layout shift.', { selector: selectorFor(image), wcag: ['WCAG 2.2'] });
    }
    for (const svg of document.querySelectorAll('svg')) {
      const decorative = svg.getAttribute('aria-hidden') === 'true';
      if (decorative && svg.getAttribute('focusable') !== 'false') add('warning', 'html/svg-focus', 'Decorative SVG should be aria-hidden and focusable="false".', { selector: selectorFor(svg), wcag: ['WCAG 1.1.1'] });
      if (!decorative && !name(svg)) add('error', 'html/svg-name', 'An informative SVG needs an accessible name.', { selector: selectorFor(svg), wcag: ['WCAG 1.1.1', 'WCAG 4.1.2'] });
    }
    for (const table of document.querySelectorAll('table')) {
      if (!table.querySelector('th')) add('error', 'html/table-header', 'Data table has no header cell.', { selector: selectorFor(table), wcag: ['WCAG 1.3.1'] });
      for (const header of table.querySelectorAll('th')) if (!header.getAttribute('scope') && !header.hasAttribute('rowspan') && !header.hasAttribute('colspan')) add('warning', 'html/table-scope', 'Table header should declare its scope when the relationship is simple.', { selector: selectorFor(header), wcag: ['WCAG 1.3.1'] });
    }
    const color = (value: string): number[] | null => {
      const match = value.match(/rgba?\\(([^)]+)\\)/i);
      if (!match) return null;
      const values = match[1].split(',').slice(0, 3).map(Number);
      return values.every(Number.isFinite) ? values.map(value => value / 255) : null;
    };
    const luminance = (colorValue: number[]): number => colorValue.reduce((sum: number, value: number, index: number) => sum + [0.2126,0.7152,0.0722][index] * (value <= .03928 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4), 0);
    const ratio = (foreground: number[], background: number[]): number => { const a = luminance(foreground); const b = luminance(background); return (Math.max(a,b)+.05)/(Math.min(a,b)+.05); };
    const backgroundFor = (element: any): number[] | null => {
      let current = element;
      while (current && current !== document.documentElement) {
        const value = color(getComputedStyle(current).backgroundColor);
        if (value) return value;
        current = current.parentElement;
      }
      return color(getComputedStyle(document.documentElement).backgroundColor);
    };
    checks.push('computed styles');
    for (const element of document.querySelectorAll('p,li,dt,dd,th,td,h1,h2,h3,h4,h5,h6,a,button,label')) {
      if (!visible(element) || !element.textContent.trim()) continue;
      const styles = getComputedStyle(element);
      const foreground = color(styles.color);
      const background = backgroundFor(element);
      if (!foreground || !background || Number(styles.opacity) < .5) continue;
      const contrast = ratio(foreground, background);
      const size = Number.parseFloat(styles.fontSize) || 16;
      const bold = Number.parseInt(styles.fontWeight, 10) >= 700;
      const threshold = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
      if (contrast < threshold) add('error', 'visual/contrast', 'Text does not meet the WCAG AA contrast ratio for its computed size.', { selector: selectorFor(element), element: element.textContent.trim().slice(0, 100), wcag: ['WCAG 1.4.3'] });
    }
    const body = document.body;
    if (body && document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) add('warning', 'visual/reflow', 'Page is wider than the viewport; check the overflow at this route.', { selector: 'html', wcag: ['WCAG 1.4.10'] });
    const fixed = [...document.querySelectorAll('*')].filter(element => visible(element) && !element.classList.contains('sr-only') && getComputedStyle(element).position !== 'absolute' && getComputedStyle(element).overflow === 'hidden' && element.scrollHeight > element.clientHeight + 2);
    if (fixed.length) add('warning', 'visual/text-spacing', 'A visible overflow-hidden element clips content after text-spacing changes.', { selector: selectorFor(fixed[0]), wcag: ['WCAG 1.4.12'] });
    const focusables = [...document.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex]')];
    if (!focusables.length) add('warning', 'keyboard/focus', 'Page has no keyboard-focusable controls.', { selector: 'body', wcag: ['WCAG 2.1.1'] });
    const dialog = document.querySelector('dialog,[role="dialog"]');
    if (dialog && !dialog.getAttribute('aria-modal')) add('warning', 'keyboard/dialog', 'Dialog should expose aria-modal="true" when used as a modal.', { selector: selectorFor(dialog), wcag: ['WCAG 4.1.2'] });
    return diagnostics;
  }})()`;
}
