import type { ThemeShellContext } from '../../../../src/theme-api.ts';
import { Cookie, Map, ShieldCheck } from 'lucide';
import { footerIcon, postAuthor } from '../../components/shared/index.ts';
import { renderCookieConsent } from '../../plugins/cookies/index.ts';
import { renderLanguageNav } from '../../plugins/language/index.ts';
import { renderSearch } from '../../plugins/search/index.ts';

export function renderShell(context: ThemeShellContext): string {
  const languageNav = renderLanguageNav(context);
  const archiveCollection = String(context.config.archive?.collection || 'posts');
  const collectionKey = context.doc.collection === 'archive' ? String(context.doc.data?.archiveCollection || archiveCollection) : context.doc.collection;
  const collectionLabel = context.translate(`collections.${collectionKey}`, collectionKey);
  const isHomePage = context.doc.collection === 'pages' && context.doc.id === 'home';
  const articleMeta = context.doc.pattern === 'blog' ? `<div class="post-meta page-header-meta">${context.doc.date ? `<span class="post-meta-item"><span class="post-meta-label">${context.escapeHtml(context.translate('post.published', 'Published'))}</span><time datetime="${context.escapeHtml(context.doc.date)}">${context.escapeHtml(context.formatDate(context.doc.date))}</time></span>` : ''}<span class="post-meta-item"><span class="post-meta-label">${context.escapeHtml(context.translate('post.author', 'Author'))}</span>${context.escapeHtml(postAuthor(context.doc, context))}</span></div>` : '';
  const pageHeaderClass = context.doc.pattern === 'blog' ? 'page-header page-header-post' : 'page-header';
  const pageHeader = context.doc.source.startsWith('generated:') || isHomePage ? '' : `<header class="${pageHeaderClass}"><p class="eyebrow">${context.escapeHtml(collectionLabel)}</p><h1>${context.escapeHtml(context.doc.title)}</h1>${context.doc.description ? `<p>${context.escapeHtml(context.doc.description)}</p>` : ''}${articleMeta}${languageNav}</header>`;
  const homeLanguageNav = isHomePage && languageNav ? `<div class="home-language-nav">${languageNav}</div>` : '';
  const primaryNav = context.navigationLinks ? `<nav class="primary-nav" aria-label="${context.escapeHtml(context.navigationLabel)}">${context.navigationLinks}</nav>` : '';
  const headerActions = `${renderSearch(context)}${primaryNav}`;
  const siteMapLabel = context.translate('siteMap', context.doc.locale.startsWith('zh-tw') ? '網站地圖' : context.doc.locale.startsWith('zh') ? '站点地图' : 'Site map');
  const privacy = renderCookieConsent(context);
  const privacyPolicy = context.privacy.enabled ? `<a class="footer-tool-link" href="${context.safeUrl(context.privacy.policyHref)}">${footerIcon(ShieldCheck)}<span>${context.escapeHtml(context.privacy.policyLabel)}</span></a>` : '';
  const privacyTrigger = privacy.triggerMarkup ? privacy.triggerMarkup.replace('>', `>${footerIcon(Cookie)}`) : '';
  const footerTools = `<nav class="footer-tools" aria-label="${context.escapeHtml(siteMapLabel)}"><a class="footer-tool-link" href="/sitemap.xml">${footerIcon(Map)}<span>${context.escapeHtml(siteMapLabel)}</span></a>${privacyPolicy}${privacyTrigger}</nav>`;
  return `<!doctype html><html lang="${context.escapeHtml(context.doc.locale)}"><head>${context.head}</head><body class="${context.bodyClass}" data-pattern="${context.escapeHtml(context.doc.pattern)}">${privacy.markup}<a class="skip" href="#main">${context.escapeHtml(context.skipLabel)}</a><header class="site-header"><div class="header-inner"><a class="brand" href="${context.homeHref}"><img class="brand-mark" src="${context.brandIcon}" alt="" width="32" height="32"><span class="brand-copy"><strong>${context.escapeHtml(context.siteName)}</strong><small>${context.escapeHtml(context.headerNote)}</small></span></a>${headerActions ? `<div class="header-actions">${headerActions}</div>` : ''}</div></header><main id="main" class="${context.mainClass}">${pageHeader}${homeLanguageNav}${context.content}</main><footer class="site-footer"><div class="footer-grid">${footerTools}</div>${context.showAttribution ? `<div class="footer-bottom"><span class="footer-credit">${context.attribution}</span></div>` : ''}</footer></body></html>`;
}
