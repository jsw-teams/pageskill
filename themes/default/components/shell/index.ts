import type { ComponentChromeLink, ComponentShellContext } from '../../../../src/theme-api.ts';
import { renderSiteLink } from '../../../../src/lib/site-links.ts';
import { Cookie, Map, ShieldCheck } from 'lucide';
import { footerIcon } from '../shared/index.ts';
import { renderCookieConsent } from '../consent/index.ts';
import { renderLanguageNav } from '../language/index.ts';
import { renderPostMeta } from '../post-meta/index.ts';
import { renderSearch } from '../search/index.ts';

function renderChromeLinks(context: ComponentShellContext, links: ComponentChromeLink[], className: string): string {
  return links.map(link => renderSiteLink(link, className, context.escapeHtml)).join('');
}

export function renderShell(context: ComponentShellContext): string {
  const chrome = context.chrome || { navigation: { enabled: true, before: [], after: [] }, footer: { enabled: true, before: [], after: [] } };
  const languageNav = renderLanguageNav(context);
  const collectionKey = context.doc.collection === 'archive' ? String(context.doc.data?.archiveCollection || 'posts') : context.doc.collection;
  const collectionLabel = context.translate(`collections.${collectionKey}`, collectionKey);
  const isHomePage = context.doc.collection === 'pages' && context.doc.id === 'home';
  const articleMeta = renderPostMeta(context);
  const pageHeaderClass = context.doc.component === 'post' ? 'page-header page-header-post' : 'page-header';
  const pageHeader = context.doc.source.startsWith('generated:') || isHomePage ? '' : `<header class="${pageHeaderClass}"><p class="eyebrow">${context.escapeHtml(collectionLabel)}</p><h1>${context.escapeHtml(context.doc.title)}</h1>${context.doc.description ? `<p>${context.escapeHtml(context.doc.description)}</p>` : ''}${articleMeta}${languageNav}</header>`;
  const homeLanguageNav = isHomePage && languageNav ? `<div class="home-language-nav">${languageNav}</div>` : '';
  const navLinks = `${renderChromeLinks(context, chrome.navigation.before, 'primary-nav-link')}${context.navigationLinks}${renderChromeLinks(context, chrome.navigation.after, 'primary-nav-link')}`;
  const primaryNav = navLinks ? `<nav class="primary-nav" aria-label="${context.escapeHtml(context.navigationLabel)}">${navLinks}</nav>` : '';
  const headerActions = `${renderSearch(context)}${primaryNav}`;
  const siteMapLabel = context.translate('siteMap', 'Site map');
  const privacy = renderCookieConsent(context);
  const privacyPolicy = context.privacy.enabled ? `<a class="footer-tool-link" data-privacy-policy href="${context.safeUrl(context.privacy.policyHref)}">${footerIcon(ShieldCheck)}<span>${context.escapeHtml(context.privacy.policyLabel)}</span></a>` : '';
  const privacyTrigger = privacy.triggerMarkup ? privacy.triggerMarkup.replace('>', `>${footerIcon(Cookie)}`) : '';
  const footerTools = `<nav class="footer-tools" aria-label="${context.escapeHtml(siteMapLabel)}">${renderChromeLinks(context, chrome.footer.before, 'footer-tool-link')}${context.footerLinks}<a class="footer-tool-link" data-site-map href="${context.safeUrl(context.url.sitemap)}">${footerIcon(Map)}<span>${context.escapeHtml(siteMapLabel)}</span></a>${privacyPolicy}${privacyTrigger}${renderChromeLinks(context, chrome.footer.after, 'footer-tool-link')}</nav>`;
  return `<!doctype html><html lang="${context.escapeHtml(context.htmlLang || context.doc.locale)}"><head>${context.head}</head><body class="${context.bodyClass}" data-component="${context.escapeHtml(context.doc.component)}">${privacy.markup}<a class="skip" href="#main">${context.escapeHtml(context.skipLabel)}</a><header class="site-header"><div class="header-inner"><a class="brand" href="${context.homeHref}"><img class="brand-mark" src="${context.brandIcon}" alt="" width="32" height="32"><span class="brand-copy"><strong>${context.escapeHtml(context.siteName)}</strong><small>${context.escapeHtml(context.headerNote)}</small></span></a>${headerActions ? `<div class="header-actions">${headerActions}</div>` : ''}</div></header><main id="main" tabindex="-1" class="${context.mainClass}">${pageHeader}${homeLanguageNav}${context.renderedContent}</main><footer class="site-footer"><div class="footer-grid">${footerTools}</div></footer></body></html>`;
}
