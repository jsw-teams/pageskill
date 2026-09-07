const root = document.querySelector('[data-language-picker]');

if (root) {
  const parse = value => {
    try { return value ? JSON.parse(value) : null; } catch { return null; }
  };
  const config = parse(root.dataset.languageCopy) || {};
  const locales = Array.isArray(config.locales) ? config.locales.map(String) : [];
  const normalized = value => String(value || '').trim().toLocaleLowerCase().replaceAll('_', '-');
  const languageFamily = value => {
    const language = normalized(value);
    if (/^zh-(?:hant|tw|hk|mo)(?:-|$)/.test(language)) return 'zh-tw';
    if (/^zh-(?:hans|cn|sg)(?:-|$)/.test(language) || language === 'zh') return 'zh-sg';
    if (/^en(?:-|$)/.test(language)) return 'en';
    return language;
  };
  const resolveLocale = value => {
    const language = normalized(value);
    if (!language) return null;
    const mapped = languageFamily(language);
    return locales.find(locale => normalized(locale) === language)
      || locales.find(locale => normalized(locale) === mapped)
      || locales.find(locale => normalized(locale).split('-')[0] === mapped.split('-')[0])
      || null;
  };
  const readStoredLocale = () => {
    const keys = [...new Set([config.storageKey || 'pagekiln-locale', 'pageskill-locale'])];
    for (const key of keys) {
      try {
        const value = window.localStorage.getItem(key);
        const stored = resolveLocale(value) || resolveLocale(parse(value)?.locale);
        if (stored) return stored;
      } catch { /* storage can be disabled or unavailable */ }
    }
    return null;
  };
  const writeStoredLocale = locale => {
    const key = config.storageKey || 'pagekiln-locale';
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
    const categories = new Map((Array.isArray(privacy.categories) ? privacy.categories : []).map(category => [String(category.id), category]));
    const isChinese = String(document.documentElement.lang || '').startsWith('zh');
    consent.querySelectorAll('.cookie-option').forEach(option => {
      const input = option.querySelector('input[data-cookie-category]');
      const category = categories.get(input?.dataset.cookieCategory || '');
      if (!category) return;
      setText('strong', category.label, option);
      const details = [category.description, category.provider, category.retentionDays ? `${category.retentionDays} ${isChinese ? '天' : 'days'}` : ''].filter(Boolean).join(' · ');
      setText('small', details, option);
    });
  };
  const applyCopy = locale => {
    const copy = config.copy?.[locale];
    if (!copy) return;
    document.documentElement.lang = locale;
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
    const footerLinks = document.querySelectorAll('.site-footer .footer-tool-link');
    setFooterLabel(footerLinks[0], copy.siteMap);
    if (copy.privacy) {
      setFooterLabel(footerLinks[1], copy.privacy.policyLabel);
      setDirectText(document.querySelector('.privacy-trigger'), copy.privacy.settingsLabel);
    }
    const card = [...root.querySelectorAll('[data-locale]')].find(link => resolveLocale(link.dataset.locale) === locale);
    if (card) {
      card.dataset.recommended = 'true';
      const recommendation = card.querySelector('[data-language-recommended]');
      if (recommendation) {
        recommendation.hidden = false;
        recommendation.textContent = copy.recommended || 'Recommended';
      }
      card.setAttribute('aria-label', `${card.querySelector('strong')?.textContent || locale} — ${copy.recommended || 'Recommended'}`);
    }
    updatePrivacy(copy);
  };
  root.querySelectorAll('a[data-locale]').forEach(link => link.addEventListener('click', () => {
    const locale = resolveLocale(link.dataset.locale);
    if (locale) writeStoredLocale(locale);
  }));
  const storedLocale = readStoredLocale();
  const preferredLocale = storedLocale || browserLocale() || resolveLocale(config.defaultLocale) || locales[0];
  if (preferredLocale) {
    applyCopy(preferredLocale);
  }
}
