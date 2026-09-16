export function mount(root, runtime) {
  const parse = value => {
    try { return value ? JSON.parse(value) : null; } catch { return null; }
  };
  const config = parse(root.dataset.languageCopy) || {};
  const locales = Array.isArray(config.locales) ? config.locales.map(String) : [];
  const normalized = value => String(value || '').trim().toLocaleLowerCase().replaceAll('_', '-');
  const aliases = config.localeAliases && typeof config.localeAliases === 'object' ? config.localeAliases : {};
  const resolveLocale = value => {
    const language = normalized(value);
    if (!language) return null;
    return locales.find(locale => normalized(locale) === language)
      || locales.find(locale => Array.isArray(aliases[locale]) && aliases[locale].some(alias => normalized(alias) === language))
      || null;
  };
  const readStoredLocale = () => {
    const key = config.storageKey || 'pageskill-locale';
    try {
      const value = window.localStorage.getItem(key);
      return resolveLocale(value) || resolveLocale(parse(value)?.locale);
    } catch { /* storage can be disabled or unavailable */ }
    return null;
  };
  const writeStoredLocale = locale => {
    const key = config.storageKey || 'pageskill-locale';
    try { window.localStorage.setItem(key, locale); } catch { /* continue with the normal link */ }
  };
  const browserLocale = () => {
    let languages = [];
    try { languages = Array.isArray(navigator.languages) ? navigator.languages : []; } catch { /* use the single language below */ }
    try { if (navigator.language) languages = [...languages, navigator.language]; } catch { /* browser language is optional */ }
    for (const language of languages) {
      const match = resolveLocale(language);
      if (match) return match;
    }
    return null;
  };
  const setText = (selector, value, scope = document) => {
    if (!scope) return null;
    const target = selector ? scope.querySelector(selector) : scope;
    if (target && value !== undefined && value !== null) target.textContent = String(value);
    return target;
  };
  const setDirectText = (element, value) => {
    if (!element || value === undefined || value === null) return;
    const textNodes = [...element.childNodes].filter(node => node.nodeType === 3);
    if (textNodes.length) textNodes[textNodes.length - 1].nodeValue = String(value);
    else element.append(document.createTextNode(String(value)));
  };
  const setFooterLabel = (link, value) => {
    if (!link) return;
    const label = link.querySelector('span:not(.footer-icon)');
    if (label) label.textContent = String(value);
    else setDirectText(link, value);
  };
  const updatePrivacy = copy => {
    const privacy = copy?.privacy;
    const consent = document.querySelector('[data-cookie-consent]');
    if (!privacy || !consent) return;
    consent.setAttribute('aria-label', privacy.bannerLabel || 'Privacy choices');
    setText('#cookie-banner-title strong', privacy.title, consent);
    setText('.cookie-banner-copy p:nth-child(2)', privacy.description, consent);
    setText('#cookie-dialog-title', privacy.title, consent);
    setText('#cookie-dialog-description', privacy.description, consent);
    setText('fieldset legend', privacy.bannerLabel, consent);
    const actions = {
      'reject-optional': privacy.rejectLabel,
      open: privacy.settingsLabel,
      'accept-all': privacy.acceptLabel,
      save: privacy.saveLabel,
      close: privacy.closeLabel
    };
    consent.querySelectorAll('[data-cookie-action]').forEach(button => {
      const label = actions[button.dataset.cookieAction];
      if (label) button.textContent = label;
      if (button.dataset.cookieAction === 'close' && label) button.setAttribute('aria-label', label);
    });
    consent.querySelectorAll('.privacy-links a').forEach(link => {
      setDirectText(link, privacy.policyLabel);
      if (privacy.policyHref) link.setAttribute('href', privacy.policyHref);
    });
    const categories = new Map((Array.isArray(privacy.categories) ? privacy.categories : []).map(category => [String(category.purpose || category.id), category]));
    consent.querySelectorAll('.cookie-option').forEach(option => {
      const input = option.querySelector('input[data-cookie-purpose],input[data-cookie-category]');
      const purpose = input?.dataset.cookiePurpose || input?.dataset.cookieCategory || '';
      const category = categories.get(purpose);
      if (!category) return;
      setText('strong', category.label, option);
      const providers = Array.isArray(category.providers) ? category.providers.join(', ') : category.provider;
      const details = [category.description, providers].filter(Boolean).join(' · ');
      setText('small', details, option);
    });
    setText('[data-pageskill-social-placeholder-title]', privacy.socialPlaceholderTitle);
    setText('[data-pageskill-social-placeholder-description]', privacy.socialPlaceholderDescription);
    setText('[data-pageskill-allow-purpose="social-embedding"]', privacy.socialPlaceholderAllowLabel);
  };
  const updateLocaleLinks = (locale, copy) => {
    const localePath = `/${encodeURIComponent(String(locale).replace(/^\/+|\/+$/g, ''))}`;
    const brand = document.querySelector('.brand');
    if (brand) brand.setAttribute('href', `${localePath}/`);
    const skip = document.querySelector('.skip');
    if (skip && copy.skipToContent) skip.textContent = String(copy.skipToContent);
    const footerTools = document.querySelector('.footer-tools');
    if (footerTools && copy.siteMap) footerTools.setAttribute('aria-label', String(copy.siteMap));
    document.querySelectorAll('.primary-nav').forEach(nav => {
      if (copy.navigationLabel) nav.setAttribute('aria-label', String(copy.navigationLabel));
    });
    const policyHref = copy.privacy?.policyHref || `${localePath}/privacy/`;
    document.querySelectorAll('.privacy-links a').forEach(link => link.setAttribute('href', policyHref));
    document.querySelectorAll('.footer-tools .footer-tool-link').forEach(link => {
      if (String(link.getAttribute('href') || '').includes('/privacy/')) link.setAttribute('href', policyHref);
    });
    (Array.isArray(copy.links) ? copy.links : []).forEach(item => {
      if (!item?.key) return;
      document.querySelectorAll(`[data-link-key="${CSS.escape(String(item.key))}"]`).forEach(link => {
        if (item.label) link.textContent = String(item.label);
        if (item.href) link.setAttribute('href', String(item.href));
        link.removeAttribute('aria-current');
      });
    });
  };
  const applyCopy = locale => {
    const copy = config.copy?.[locale];
    if (!copy) return;
    document.documentElement.lang = copy.htmlLang || locale;
    if (copy.title && copy.siteName) document.title = `${copy.title} · ${copy.siteName}`;
    const description = document.querySelector('meta[name="description"]');
    if (description && copy.siteDescription) description.setAttribute('content', copy.siteDescription);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && copy.title) ogTitle.setAttribute('content', copy.title);
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription && copy.siteDescription) ogDescription.setAttribute('content', copy.siteDescription);
    setText('#language-picker-title', copy.title);
    setText('.language-picker-description', copy.description);
    setText('.brand-copy strong', copy.siteName);
    setText('.brand-copy small', copy.headerNote);
    setText('.language-switcher summary span', copy.languageName);
    setText('.footer-brand', copy.siteName);
    setText('.footer-kicker', copy.footerKicker);
    setText('.footer-note', copy.footerNote);
    updateLocaleLinks(locale, copy);
    if (root.matches('[data-not-found-localized]') && copy.notFound) {
      setText('.error-kicker', copy.notFound.kicker);
      setText('#not-found-title', copy.notFound.title);
      setText('.error-description', copy.notFound.description);
      const home = root.querySelector('[data-not-found-home]');
      const guide = root.querySelector('[data-not-found-guide]');
      if (home) {
        home.textContent = String(copy.notFound.home || 'Back to home');
        home.setAttribute('href', String(copy.notFound.homeHref || `/${locale}/`));
      }
      if (guide) {
        guide.textContent = String(copy.notFound.guide || 'Open the guide');
        guide.setAttribute('href', String(copy.notFound.guideHref || `/${locale}/`));
      }
      document.querySelectorAll('.languages [data-locale]').forEach(link => link.toggleAttribute('aria-current', resolveLocale(link.dataset.locale) === locale));
      const languageNav = document.querySelector('.languages');
      if (languageNav && copy.languageLabel) languageNav.setAttribute('aria-label', String(copy.languageLabel));
    }
    setFooterLabel(document.querySelector('.site-footer [data-site-map]'), copy.siteMap);
    if (copy.privacy) {
      setFooterLabel(document.querySelector('.site-footer [data-privacy-policy]'), copy.privacy.policyLabel);
      setDirectText(document.querySelector('.privacy-trigger'), copy.privacy.settingsLabel);
    }
    const card = [...root.querySelectorAll('[data-locale]')].find(link => resolveLocale(link.dataset.locale) === locale);
    if (card) {
      card.dataset.recommended = 'true';
      const recommendation = card.querySelector('[data-language-recommended]');
      if (recommendation) {
        recommendation.removeAttribute('aria-hidden');
        recommendation.textContent = copy.recommended || 'Recommended';
      }
      card.setAttribute('aria-label', `${card.querySelector('strong')?.textContent || locale} — ${copy.recommended || 'Recommended'}`);
    }
    updatePrivacy(copy);
  };
  document.querySelectorAll('a[data-locale]').forEach(link => link.addEventListener('click', () => {
    const locale = resolveLocale(link.dataset.locale);
    if (locale) writeStoredLocale(locale);
  }, { signal: runtime.signal }));
  const pathLocale = root.matches('[data-not-found-localized]') ? resolveLocale(window.location.pathname.split('/').filter(Boolean)[0]) : null;
  const storedLocale = readStoredLocale();
  const preferredLocale = pathLocale || storedLocale || browserLocale() || resolveLocale(config.defaultLocale) || locales[0];
  if (preferredLocale) {
    applyCopy(preferredLocale);
  }
}
