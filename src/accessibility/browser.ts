import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { chromium, type Browser, type Page } from 'playwright';
import { browserHtmlAuditScript } from './html.ts';
import { diagnosticsForRule } from './diagnostics.ts';
import type { AccessibilityDiagnostic } from './types.ts';
import type { BuildContext } from '../compiler/types.ts';

type BrowserAuditResult = {
  diagnostics: AccessibilityDiagnostic[];
  routes: string[];
  checks: string[];
  browser: string;
};

type AxeResult = {
  violations?: Array<{ id: string; help: string; tags?: string[]; nodes?: Array<{ target?: string[]; html?: string; failureSummary?: string }> }>;
};

const require = createRequire(import.meta.url);
const EDGE_CANDIDATES = [
  process.env.PAGESKILL_BROWSER,
  process.env['ProgramFiles(x86)'] ? path.join(process.env['ProgramFiles(x86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe') : '',
  process.env.ProgramFiles ? path.join(process.env.ProgramFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe') : ''
].filter(Boolean) as string[];

function contentType(file: string): string {
  const extension = path.extname(file).toLowerCase();
  return ({
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.svg': 'image/svg+xml'
  } as Record<string, string>)[extension] || 'application/octet-stream';
}

async function filesUnder(directory: string): Promise<string[]> {
  const files: string[] = [];
  const visit = async (current: string) => {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      const file = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(file);
      else files.push(file);
    }
  };
  await visit(directory);
  return files;
}

function routeForFile(root: string, file: string): string {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  if (relative === 'index.html') return '/';
  if (relative.endsWith('/index.html')) return `/${relative.slice(0, -'index.html'.length)}`;
  return `/${relative}`;
}

function safeFile(root: string, pathname: string): string | undefined {
  let decoded: string;
  try { decoded = decodeURIComponent(pathname); } catch { return undefined; }
  const relative = decoded.replace(/^\/+/, '');
  const candidate = path.resolve(root, relative || 'index.html');
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) return undefined;
  return candidate;
}

async function startStaticServer(root: string): Promise<{ url: string; close: () => Promise<void> }> {
  const server = createServer(async (request: any, response: any) => {
    const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
    const direct = safeFile(root, requestUrl.pathname);
    const candidates = direct && requestUrl.pathname.endsWith('/')
      ? [path.join(direct, 'index.html')]
      : direct ? [direct] : [];
    let file: string | undefined;
    for (const candidate of candidates) {
      try { if ((await fs.stat(candidate)).isFile()) { file = candidate; break; } } catch { /* continue */ }
    }
    if (!file && requestUrl.pathname !== '/404.html') file = path.join(root, '404.html');
    if (!file) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }
    try {
      const data = await fs.readFile(file);
      response.writeHead(200, { 'content-type': contentType(file), 'cache-control': 'no-store' });
      response.end(request.method === 'HEAD' ? undefined : data);
    } catch {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen({ host: '127.0.0.1', port: 0 }, () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('accessibility audit could not determine its local server port');
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>(resolve => server.close(() => resolve()))
  };
}

async function launchBrowser(): Promise<{ browser: Browser; name: string }> {
  for (const executablePath of EDGE_CANDIDATES) {
    try {
      await fs.access(executablePath);
      return { browser: await chromium.launch({ headless: true, executablePath }), name: `Edge (${path.basename(executablePath)})` };
    } catch { /* try the next installed browser */ }
  }
  try { return { browser: await chromium.launch({ headless: true }), name: 'Playwright Chromium' }; }
  catch (error) {
    throw new Error(`browser accessibility audit could not start Edge or Playwright Chromium; set PAGESKILL_BROWSER or run "npx playwright install chromium" (${error instanceof Error ? error.message : String(error)})`);
  }
}

function axeScript(): string {
  try { return require.resolve('axe-core/axe.min.js'); }
  catch { throw new Error('axe-core is not installed; run npm install'); }
}

async function runAxe(page: Page, route: string): Promise<AccessibilityDiagnostic[]> {
  const source = await fs.readFile(axeScript(), 'utf8');
  const loaded = await page.evaluate(() => Boolean((window as any).axe));
  if (!loaded) await page.addScriptTag({ content: source });
  let result: AxeResult;
  try {
    result = await page.evaluate(async () => (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa', 'best-practice'] } }) as Promise<AxeResult>);
  } catch {
    result = await page.evaluate(async () => (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'best-practice'] } }) as Promise<AxeResult>);
  }
  return (result.violations || []).flatMap(violation => {
    const tags = violation.tags || [];
    const isBestPractice = tags.includes('best-practice') && !tags.some(tag => /^wcag/i.test(tag));
    const level = isBestPractice ? 'warning' : 'error';
    return (violation.nodes || [{ target: [], html: '' }]).map(node => diagnosticsForRule(level, `axe/${violation.id}`, `${violation.help}${node.failureSummary ? ` ${node.failureSummary.replaceAll(/\s+/g, ' ').trim()}` : ''}`, {
      route,
      selector: Array.isArray(node.target) ? node.target.join(' ') : String(node.target || ''),
      element: node.html,
      wcag: tags.filter(tag => /^wcag/i.test(tag) || tag === 'best-practice')
    }));
  });
}

async function focusInfo(page: Page): Promise<{ index: number; selector: string; visible: boolean; indicator: boolean; covered: boolean; covering?: string } | null> {
  return page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null;
    if (!element || element === document.body) return null;
    const focusables = [...document.querySelectorAll<HTMLElement>('a[href],button,input,select,textarea,summary,[tabindex]')]
      .filter(candidate => candidate.getAttribute('tabindex') !== '-1' && !candidate.hidden && getComputedStyle(candidate).display !== 'none' && getComputedStyle(candidate).visibility !== 'hidden');
    const index = focusables.indexOf(element);
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const candidates = [element, element.parentElement, element.parentElement?.parentElement].filter(Boolean) as HTMLElement[];
    const indicator = candidates.some(candidate => {
      const candidateStyle = getComputedStyle(candidate);
      const outlineWidth = Number.parseFloat(candidateStyle.outlineWidth) || 0;
      return (candidateStyle.outlineStyle !== 'none' && outlineWidth > 0 && candidateStyle.outlineColor !== 'rgba(0, 0, 0, 0)') || candidateStyle.boxShadow !== 'none';
    });
    const x = Math.min(Math.max(rect.left + Math.min(Math.max(rect.width / 2, 1), Math.max(rect.width - 1, 1)), 1), Math.max(window.innerWidth - 1, 1));
    const y = Math.min(Math.max(rect.top + Math.min(Math.max(rect.height / 2, 1), Math.max(rect.height - 1, 1)), 1), Math.max(window.innerHeight - 1, 1));
    const top = document.elementFromPoint(x, y);
    const visible = style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0 && rect.width > 0 && rect.height > 0;
    // An inline link's geometric center can land on its paragraph parent when
    // the center is between glyphs. That parent is not an obscuring overlay;
    // only a sibling/ancestor outside the focus target can cover it.
    const covered = Boolean(top && top !== element && !element.contains(top) && !top.contains(element));
    const selector = element.id ? `#${element.id}` : `${element.tagName.toLowerCase()}${element.className ? `.${String(element.className).split(/\s+/)[0]}` : ''}`;
    const covering = covered && top ? top.outerHTML.slice(0, 140) : undefined;
    return { index, selector, visible, indicator, covered, covering };
  });
}

async function runKeyboardChecks(page: Page, route: string, checks: Set<string>): Promise<AccessibilityDiagnostic[]> {
  const diagnostics: AccessibilityDiagnostic[] = [];
  const add = (rule: string, message: string, details: Partial<AccessibilityDiagnostic> = {}) => diagnostics.push(diagnosticsForRule('error', rule, message, { route, ...details }));
  checks.add('keyboard tab order, focus visibility, and focus not obscured');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(60);
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo(0, 0);
  });
  const visited = new Set<number>();
  for (let step = 0; step < 160; step += 1) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(20);
    const info = await focusInfo(page);
    if (!info) {
      if (!visited.size) add('keyboard/focus-order', 'Tab did not move focus to a keyboard-accessible control.', { selector: 'body', wcag: ['WCAG 2.1.1', 'WCAG 2.4.3'] });
      break;
    }
    if (visited.has(info.index)) break;
    visited.add(info.index);
    if (!info.visible) add('keyboard/focus-visible', 'A Tab stop is not visible after it receives focus.', { selector: info.selector, wcag: ['WCAG 2.4.7'] });
    if (!info.indicator) add('keyboard/focus-indicator', 'A keyboard focus target has no visible outline or focus treatment.', { selector: info.selector, wcag: ['WCAG 2.4.7', 'WCAG 2.4.11'] });
    if (info.covered) add('keyboard/focus-obscured', `A keyboard focus target is covered at its visible center by another element${info.covering ? ` (${info.covering})` : ''}.`, { selector: info.selector, wcag: ['WCAG 2.4.11'] });
  }
  if (!visited.size) add('keyboard/focus-order', 'The page has no reachable keyboard focus order.', { selector: 'body', wcag: ['WCAG 2.1.1'] });
  await page.keyboard.press('Shift+Tab');
  await page.waitForTimeout(20);
  const reverse = await focusInfo(page);
  if (!reverse && visited.size) add('keyboard/focus-order', 'Shift+Tab left the document without a visible focus target.', { selector: 'body', wcag: ['WCAG 2.1.1', 'WCAG 2.4.3'] });
  return diagnostics;
}

async function dynamicAxe(page: Page, route: string, checks: Set<string>, state: string): Promise<AccessibilityDiagnostic[]> {
  checks.add(`dynamic DOM axe: ${state}`);
  return runAxe(page, route);
}

async function runPointerTargetChecks(page: Page, route: string, checks: Set<string>): Promise<AccessibilityDiagnostic[]> {
  checks.add('24px pointer target size');
  const targets = await page.evaluate(() => {
    const selectors = 'button,select,textarea,summary,a.primary-nav-link,a.languages-list-link,.primary-nav a,.languages-list a,.privacy-trigger,.footer-tool-link,[data-code-copy]';
    const selectorFor = (element: HTMLElement): string => {
      if (element.id) return `#${CSS.escape(element.id)}`;
      const className = [...element.classList].find(Boolean);
      return `${element.tagName.toLowerCase()}${className ? `.${CSS.escape(className)}` : ''}`;
    };
    return [...document.querySelectorAll<HTMLElement>(selectors)].map(element => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        selector: selectorFor(element),
        width: rect.width,
        height: rect.height,
        visible: !element.hidden && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0
      };
    }).filter(target => target.visible && target.width > 0 && target.height > 0);
  });
  return targets
    .filter(target => target.width < 24 || target.height < 24)
    .map(target => diagnosticsForRule('warning', 'visual/target-size', `The interactive target is ${Math.round(target.width)}×${Math.round(target.height)} CSS px; provide at least 24×24 CSS px unless a documented WCAG exception applies.`, {
      route,
      selector: target.selector,
      wcag: ['WCAG 2.5.8']
    }));
}

async function runInteractiveStateChecks(page: Page, route: string, checks: Set<string>): Promise<AccessibilityDiagnostic[]> {
  checks.add('computed hover and focus state contrast');
  const diagnostics: AccessibilityDiagnostic[] = [];
  const selectors = 'a[href],button,summary,input,select,textarea,.privacy-trigger,[data-code-copy]';
  const count = Math.min(await page.locator(selectors).count(), 32);
  for (let index = 0; index < count; index += 1) {
    const control = page.locator(selectors).nth(index);
    if (!(await control.isVisible().catch(() => false))) continue;
    const states: Array<'hover' | 'focus'> = ['hover', 'focus'];
    for (const state of states) {
      if (state === 'hover') await control.hover({ timeout: 3000 }).catch(() => {});
      else await control.focus().catch(() => {});
      const result = await control.evaluate(element => {
        const parse = (value: string): [number, number, number] | undefined => {
          const match = value.match(/rgba?\(([^)]+)\)/i);
          if (!match) return undefined;
          const channels = match[1].split(',');
          const alpha = channels[3] === undefined ? 1 : Number(channels[3]);
          if (!Number.isFinite(alpha) || alpha < .99) return undefined;
          const rgb = channels.slice(0, 3).map(Number);
          return rgb.every(Number.isFinite) ? rgb.map(channel => channel / 255) as [number, number, number] : undefined;
        };
        const luminance = (color: [number, number, number]): number => color.reduce((sum, value, channel) => {
          const linear = value <= .03928 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
          return sum + [0.2126, 0.7152, 0.0722][channel] * linear;
        }, 0);
        const foreground = parse(getComputedStyle(element).color);
        let current: Element | null = element;
        let background: [number, number, number] | undefined;
        while (current) {
          const candidate = parse(getComputedStyle(current).backgroundColor);
          if (candidate) {
            background = candidate;
            break;
          }
          current = current.parentElement;
        }
        if (!background) background = parse(getComputedStyle(document.documentElement).backgroundColor);
        if (!foreground || !background) return undefined;
        const foregroundLuminance = luminance(foreground);
        const backgroundLuminance = luminance(background);
        const ratio = (Math.max(foregroundLuminance, backgroundLuminance) + .05) / (Math.min(foregroundLuminance, backgroundLuminance) + .05);
        const style = getComputedStyle(element);
        const size = Number.parseFloat(style.fontSize) || 16;
        const bold = Number.parseInt(style.fontWeight, 10) >= 700;
        return {
          ratio,
          threshold: size >= 24 || (bold && size >= 18.66) ? 3 : 4.5,
          selector: element.id ? `#${CSS.escape(element.id)}` : `${element.tagName.toLowerCase()}${element.classList[0] ? `.${CSS.escape(element.classList[0])}` : ''}`,
          text: String(element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80)
        };
      });
      if (result && result.ratio < result.threshold) diagnostics.push(diagnosticsForRule('error', `visual/${state}-contrast`, `Interactive text has a ${result.ratio.toFixed(2)}:1 contrast ratio in its ${state} state; expected at least ${result.threshold}:1.`, {
        route,
        selector: result.selector,
        element: result.text,
        wcag: ['WCAG 1.4.3', 'WCAG 1.4.11']
      }));
    }
  }
  return diagnostics;
}

async function runInteractionChecks(page: Page, route: string, checks: Set<string>): Promise<AccessibilityDiagnostic[]> {
  const diagnostics: AccessibilityDiagnostic[] = [];
  const add = (rule: string, message: string, details: Partial<AccessibilityDiagnostic> = {}) => diagnostics.push(diagnosticsForRule('error', rule, message, { route, ...details }));
  diagnostics.push(...await runKeyboardChecks(page, route, checks));
  diagnostics.push(...await runPointerTargetChecks(page, route, checks));
  diagnostics.push(...await runInteractiveStateChecks(page, route, checks));
  const search = page.locator('[data-local-search]').first();
  if (await search.count()) {
    const input = search.locator('[data-search-input]').first();
    await input.fill('Pageskill');
    await page.waitForTimeout(180);
    const resultState = await search.getAttribute('data-search-state');
    if (resultState === 'error') add('interaction/search', 'Search entered an error state for a known query.', { selector: '[data-local-search]' });
    diagnostics.push(...await dynamicAxe(page, route, checks, 'search results'));
    await input.press('Escape');
    if (await input.evaluate(element => document.activeElement !== element)) add('interaction/search-focus', 'Escape should clear search and return focus to the search input.', { selector: '[data-search-input]', wcag: ['WCAG 2.1.1', 'WCAG 2.4.3'] });
  }
  const copyButton = page.locator('[data-code-copy]').first();
  if (await copyButton.count()) {
    const before = await copyButton.evaluate(element => element.closest('[data-code-block]')?.querySelector('code')?.textContent || '');
    await copyButton.click();
    await page.waitForTimeout(80);
    await copyButton.press('Enter');
    await page.waitForTimeout(40);
    const after = await copyButton.evaluate(element => element.closest('[data-code-block]')?.querySelector('code')?.textContent || '');
    if (before !== after) add('interaction/code-copy', 'Copying code must not change the code text.', { selector: '[data-code-copy]' });
    const statusText = await copyButton.evaluate(element => element.closest('[data-code-block]')?.querySelector('[data-code-copy-status]')?.textContent || '');
    if (!statusText.trim()) add('interaction/code-copy-status', 'Code copy needs a non-empty status announcement after activation.', { selector: '[data-code-copy-status]', wcag: ['WCAG 4.1.3'] });
    diagnostics.push(...await dynamicAxe(page, route, checks, 'code copy status'));
  }
  const toc = page.locator('.toc-drawer').first();
  if (await toc.count()) {
    const summary = toc.locator('summary').first();
    // `.toc-drawer` is the disclosure itself, not a wrapper around another
    // details element.
    const details = toc;
    if (await summary.evaluate(element => element.tagName !== 'SUMMARY')) add('interaction/toc', 'Table of contents disclosure must be keyboard operable.', { selector: '.toc-drawer summary', wcag: ['WCAG 2.1.1'] });
    else {
      const initiallyOpen = (await details.getAttribute('open')) !== null;
      await summary.focus();
      await summary.press('Space');
      if ((await details.getAttribute('open')) !== null === initiallyOpen) add('interaction/toc', 'Table of contents disclosure did not respond to Space.', { selector: '.toc-drawer summary', wcag: ['WCAG 2.1.1'] });
      await summary.press('Space');
      diagnostics.push(...await dynamicAxe(page, route, checks, 'table of contents disclosure'));
    }
  }
  const cookie = page.locator('[data-cookie-consent][data-cookie-ui="true"]').first();
  if (await cookie.count()) {
    const trigger = page.locator('.privacy-trigger').first();
    if (await trigger.count()) {
      await trigger.click();
      const dialog = page.locator('[data-cookie-dialog]').first();
      if (!(await dialog.getAttribute('open'))) add('interaction/dialog', 'Privacy settings trigger should open its dialog.', { selector: '[data-cookie-dialog]', wcag: ['WCAG 4.1.2'] });
      if (await dialog.count() && await dialog.evaluate(element => !element.contains(document.activeElement))) add('interaction/dialog-focus', 'Opening the privacy dialog should move focus into the dialog.', { selector: '[data-cookie-dialog]', wcag: ['WCAG 2.4.3'] });
      if (await dialog.count()) {
        await page.keyboard.press('Tab');
        if (await dialog.evaluate(element => !element.contains(document.activeElement))) add('interaction/dialog-containment', 'Tab must remain inside the open privacy dialog.', { selector: '[data-cookie-dialog]', wcag: ['WCAG 2.4.3'] });
        await page.keyboard.press('Shift+Tab');
        if (await dialog.evaluate(element => !element.contains(document.activeElement))) add('interaction/dialog-containment', 'Shift+Tab must remain inside the open privacy dialog.', { selector: '[data-cookie-dialog]', wcag: ['WCAG 2.4.3'] });
      }
      diagnostics.push(...await dynamicAxe(page, route, checks, 'privacy dialog'));
      await page.keyboard.press('Escape');
      if (await trigger.evaluate(element => document.activeElement !== element)) add('interaction/dialog-return', 'Closing the privacy dialog should return focus to its trigger.', { selector: '[data-cookie-action="open"]', wcag: ['WCAG 2.4.3'] });
    }
  }
  const selection = await page.evaluate(() => {
    const selectors = ['main p', 'main h1', 'main li', 'main blockquote', 'main td', 'main pre', 'main .post-meta'];
    const results: Record<string, boolean> = {};
    for (const selector of selectors) {
      const target = document.querySelector(selector);
      if (!target?.firstChild) continue;
      const range = document.createRange();
      range.selectNodeContents(target);
      const current = window.getSelection();
      current?.removeAllRanges();
      current?.addRange(range);
      results[selector] = Boolean(current && !current.isCollapsed);
    }
    return results;
  });
  for (const [selector, selectable] of Object.entries(selection)) if (!selectable) add('interaction/selection', 'Readable content should remain selectable.', { selector, wcag: ['WCAG 1.4.12'] });
  return diagnostics;
}

async function runViewportChecks(page: Page, route: string): Promise<AccessibilityDiagnostic[]> {
  const diagnostics: AccessibilityDiagnostic[] = [];
  const waitForLayout = async () => {
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
    await page.waitForTimeout(80);
  };
  const measureStress = () => page.evaluate(() => {
    const clipped = [...document.querySelectorAll<HTMLElement>('main *')].filter(element => {
      const style = getComputedStyle(element);
      return !element.classList.contains('sr-only') && style.display !== 'none' && style.visibility !== 'hidden' && ['hidden', 'clip'].includes(style.overflow) && element.scrollHeight > element.clientHeight + 2;
    }).slice(0, 1).map(element => element.tagName.toLowerCase());
    return {
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body?.scrollWidth || 0,
      clipped
    };
  });
  const addStressStyle = async (id: string, css: string) => {
    await page.evaluate(({ id: styleId, css: styleText }) => {
      document.getElementById(styleId)?.remove();
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = styleText;
      document.head.append(style);
    }, { id, css });
    await waitForLayout();
    const result = await measureStress();
    await page.evaluate(styleId => document.getElementById(styleId)?.remove(), id);
    return result;
  };
  const widths = [320, 375, 768, 1280];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    // Let responsive CSS, fonts, and client-side layout settle before measuring
    // the scroll container. A resize event can otherwise report a stale width.
    await waitForLayout();
    const result = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body?.scrollWidth || 0,
      scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
      clipped: [...document.querySelectorAll('*')].filter(element => {
        const style = getComputedStyle(element);
        return !element.classList.contains('sr-only') && style.position !== 'absolute' && style.overflow === 'hidden' && element.scrollHeight > element.clientHeight + 2;
      }).slice(0, 1).map(element => element.tagName.toLowerCase())
    }));
    if (result.scrollWidth > result.width + 1 || result.bodyScrollWidth > result.width + 1) diagnostics.push(diagnosticsForRule('warning', 'visual/reflow', `The ${width}px viewport has horizontal overflow.`, { route, selector: 'html', wcag: ['WCAG 1.4.10'] }));
    if (result.scrollBehavior !== 'auto') diagnostics.push(diagnosticsForRule('warning', 'visual/reduced-motion', `The ${width}px viewport did not disable smooth scrolling under prefers-reduced-motion.`, { route, selector: 'html', wcag: ['WCAG 2.3.3'] }));
    if (result.clipped.length) diagnostics.push(diagnosticsForRule('warning', 'visual/text-spacing', `The ${width}px viewport contains clipped overflow-hidden content.`, { route, selector: result.clipped[0], wcag: ['WCAG 1.4.12'] }));
  }
  const spacing = await addStressStyle('pageskill-a11y-text-spacing', 'p,li,dt,dd,th,td,h1,h2,h3,h4,h5,h6,label,button,a{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p,li,dt,dd{margin-bottom:2em!important}');
  if (spacing.scrollWidth > spacing.width + 1 || spacing.bodyScrollWidth > spacing.width + 1 || spacing.clipped.length) diagnostics.push(diagnosticsForRule('warning', 'visual/text-spacing', 'The page clips content or overflows when WCAG text-spacing values are applied.', { route, selector: spacing.clipped[0] || 'html', wcag: ['WCAG 1.4.12'] }));
  const resized = await addStressStyle('pageskill-a11y-resize-text', 'html{font-size:200%!important}');
  if (resized.scrollWidth > resized.width + 1 || resized.bodyScrollWidth > resized.width + 1 || resized.clipped.length) diagnostics.push(diagnosticsForRule('warning', 'visual/resize-text', 'The page clips content or overflows when text is enlarged.', { route, selector: resized.clipped[0] || 'html', wcag: ['WCAG 1.4.4'] }));
  await page.setViewportSize({ width: 640, height: 900 });
  await page.addStyleTag({ content: 'html{zoom:2!important}' });
  await waitForLayout();
  const zoomOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  if (zoomOverflow) diagnostics.push(diagnosticsForRule('warning', 'visual/zoom', 'The page has horizontal overflow at an equivalent 200% zoom check.', { route, selector: 'html', wcag: ['WCAG 1.4.4'] }));
  await page.emulateMedia({ forcedColors: 'active' }).catch(() => {});
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'reduce' }).catch(() => {});
  await page.reload({ waitUntil: 'domcontentloaded' });
  return diagnostics;
}

async function auditRoute(page: Page, baseUrl: string, route: string, responsive: boolean): Promise<{ diagnostics: AccessibilityDiagnostic[]; checks: string[] }> {
  const url = `${baseUrl}${route}`;
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (!response || response.status() >= 400) return { diagnostics: [diagnosticsForRule('error', 'browser/route', `Generated route returned HTTP ${response?.status() || 'no response'}.`, { route })], checks: ['route response'] };
  await page.waitForTimeout(80);
  const diagnostics: AccessibilityDiagnostic[] = [];
  diagnostics.push(...await runAxe(page, route));
  diagnostics.push(...await page.evaluate(browserHtmlAuditScript()) as AccessibilityDiagnostic[]);
  const checks = ['axe-core WCAG 2.2 AA', 'final DOM and computed styles'];
  if (responsive) {
    diagnostics.push(...await runViewportChecks(page, route));
    const interactionChecks = new Set<string>();
    diagnostics.push(...await runInteractionChecks(page, route, interactionChecks));
    checks.push(...interactionChecks);
    checks.push('keyboard and component interactions', '320/375/768/desktop reflow', '200% zoom, reduced motion, forced colors, selection', 'text spacing and resize text');
  }
  return { diagnostics, checks };
}

export async function auditBrowserSite(ctx: BuildContext, requestedRoutes?: string[]): Promise<BrowserAuditResult> {
  const outputRoot = path.resolve(ctx.out, ctx.deployment?.staticDirectory || 'public');
  const files = (await filesUnder(outputRoot)).filter(file => file.toLowerCase().endsWith('.html')).sort();
  if (!files.length) throw new Error('browser accessibility audit found no generated HTML files in the public output');
  const allRoutes = files.map(file => routeForFile(outputRoot, file));
  const requested = requestedRoutes?.length ? new Set(requestedRoutes) : undefined;
  const routes = requested ? allRoutes.filter(route => requested.has(route)) : allRoutes;
  if (!routes.length) throw new Error('browser accessibility audit was given no generated routes to inspect');
  const server = await startStaticServer(outputRoot);
  const { browser, name } = await launchBrowser();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: server.url }).catch(() => {});
  const page = await context.newPage();
  const diagnostics: AccessibilityDiagnostic[] = [];
  const checks = new Set<string>();
  const responsiveRoutes = routes.filter(route => /\/posts\/(markdown|post-meta-demo|start)\//.test(route) || route === '/' || route.includes('/about/'));
  try {
    for (const route of routes) {
      const result = await auditRoute(page, server.url, route, responsiveRoutes.includes(route));
      diagnostics.push(...result.diagnostics);
      result.checks.forEach(check => checks.add(check));
    }
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    await server.close();
  }
  return { diagnostics, routes, checks: [...checks], browser: name };
}
