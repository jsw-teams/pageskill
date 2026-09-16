// Provider resources are controlled by the trusted adapter metadata emitted
// by the compiler. Site YAML never supplies a URL or an executable script.
export function mount(root, runtime) {
  const banner = root.querySelector('[data-cookie-banner]');
  const dialog = root.querySelector('[data-cookie-dialog]');
  const hasConsentUi = root.dataset.cookieUi === 'true';
  // Use the current product namespace. The state stores purpose choices only,
  // never provider identifiers or site configuration.
  const preferenceKey = 'pageskill-consent';
  const decisionRetentionDays = Math.max(0, Number(root.dataset.cookieDecisionRetentionDays || 365));
  const parse = value => {
    try { return value ? JSON.parse(value) : null; } catch { return null; }
  };
  const integrations = parse(root.dataset.cookieIntegrations) || [];
  const purposes = [...new Set(integrations.map(item => String(item?.purpose || '')).filter(Boolean))];
  const optionalPurposes = new Set(integrations.filter(item => item?.consent !== 'none').map(item => String(item.purpose || '')).filter(Boolean));
  const googleIntegrations = integrations.filter(item => item.id === 'google-analytics' || item.id === 'google-ads');
  const captchaIntegrations = integrations.filter(item => item.id === 'recaptcha' || item.id === 'hcaptcha' || item.id === 'turnstile');
  const xIntegrations = integrations.filter(item => item.id === 'x-for-websites');
  const placeholderCopy = {
    title: root.dataset.cookieSocialPlaceholderTitle || 'Social content is paused',
    description: root.dataset.cookieSocialPlaceholderDescription || 'Allow social content to load this embed.',
    allow: root.dataset.cookieSocialPlaceholderAllow || 'Allow social content'
  };
  const scriptPromises = new Map();
  let lastFocus = null;

  const normalizeConsent = value => {
    if (!value || typeof value !== 'object' || value.version !== 1) return null;
    const source = value.purposes && typeof value.purposes === 'object' ? value.purposes : {};
    const selected = Object.fromEntries([...optionalPurposes].map(purpose => [purpose, source[purpose] === true]));
    const updatedAt = Date.parse(value.updatedAt || '');
    return Number.isFinite(updatedAt) ? { version: 1, purposes: selected, updatedAt: new Date(updatedAt).toISOString() } : null;
  };

  const readCookie = () => {
    try {
      const cookie = document.cookie.split('; ').find(entry => entry.startsWith(`${preferenceKey}=`));
      return normalizeConsent(cookie ? parse(decodeURIComponent(cookie.slice(preferenceKey.length + 1))) : null);
    } catch { return null; }
  };

  const readLocalStorage = () => {
    try { return normalizeConsent(parse(localStorage.getItem(preferenceKey))); } catch { return null; }
  };

  const read = () => {
    const value = readCookie() || readLocalStorage();
    if (!value) return null;
    const updatedAt = Date.parse(value.updatedAt);
    if (decisionRetentionDays === 0 || !Number.isFinite(updatedAt) || Date.now() - updatedAt > decisionRetentionDays * 86400000) {
      try { localStorage.removeItem(preferenceKey); } catch {}
      try { document.cookie = `${preferenceKey}=; Max-Age=0; Path=/; SameSite=Lax`; } catch {}
      return null;
    }
    return value;
  };

  const write = value => {
    if (decisionRetentionDays === 0) {
      try { document.cookie = `${preferenceKey}=; Max-Age=0; Path=/; SameSite=Lax`; } catch {}
      try { localStorage.removeItem(preferenceKey); } catch {}
      return;
    }
    const encoded = encodeURIComponent(JSON.stringify(value));
    const maxAge = decisionRetentionDays * 86400;
    try {
      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `${preferenceKey}=${encoded}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
    } catch {}
    // Keep a second browser fallback without exposing storage as a site
    // configuration API.
    try { localStorage.setItem(preferenceKey, JSON.stringify(value)); } catch {}
  };

  const canLoad = (item, selected) => item?.consent === 'none' || item?.load === 'immediate' || selected?.[item?.purpose] === true;
  const scriptSource = id => ({
    recaptcha: 'https://www.google.com/recaptcha/api.js',
    hcaptcha: 'https://js.hcaptcha.com/1/api.js',
    turnstile: 'https://challenges.cloudflare.com/turnstile/v0/api.js'
  }[id]);

  const loadScript = (key, source, attributes = {}) => {
    if (!source) return Promise.resolve(false);
    if (scriptPromises.has(key)) return scriptPromises.get(key);
    const promise = new Promise(resolve => {
      const script = document.createElement('script');
      let settled = false;
      const finish = loaded => {
        if (settled) return;
        settled = true;
        resolve(loaded);
      };
      Object.entries(attributes).forEach(([name, value]) => {
        if (value === true) script.setAttribute(name, '');
        else if (value != null) script.setAttribute(name, String(value));
      });
      script.src = source;
      script.addEventListener('load', () => finish(true), { once: true });
      script.addEventListener('error', () => finish(false), { once: true });
      document.head.append(script);
    });
    scriptPromises.set(key, promise);
    return promise;
  };

  const googleConsent = selected => ({
    analytics_storage: googleIntegrations.some(item => item.id === 'google-analytics' && canLoad(item, selected)) ? 'granted' : 'denied',
    ad_storage: googleIntegrations.some(item => item.id === 'google-ads' && canLoad(item, selected)) ? 'granted' : 'denied',
    ad_user_data: googleIntegrations.some(item => item.id === 'google-ads' && canLoad(item, selected)) ? 'granted' : 'denied',
    ad_personalization: googleIntegrations.some(item => item.id === 'google-ads' && canLoad(item, selected)) ? 'granted' : 'denied'
  });

  const syncGoogleConsent = selected => {
    if (typeof window.gtag === 'function') window.gtag('consent', 'update', googleConsent(selected));
  };

  const loadGoogle = async selected => {
    const allowed = googleIntegrations.filter(item => canLoad(item, selected));
    const ids = [...new Set(allowed.map(item => item.measurementId || item.tagId).filter(Boolean))];
    if (!ids.length) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    if (!window.__pageskillGoogleConsentDefaulted) {
      window.gtag('consent', 'default', { ...googleConsent(selected), wait_for_update: 500 });
      window.__pageskillGoogleConsentDefaulted = true;
    }
    await loadScript('google-tag', `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ids[0])}`, { async: true, 'data-pageskill-provider': 'google' });
    window.__pageskillGoogleConfiguredIds = window.__pageskillGoogleConfiguredIds || new Set();
    if (!window.__pageskillGoogleInitialized) {
      window.gtag('js', new Date());
      window.__pageskillGoogleInitialized = true;
    }
    ids.forEach(id => {
      if (window.__pageskillGoogleConfiguredIds.has(id)) return;
      window.gtag('config', id);
      window.__pageskillGoogleConfiguredIds.add(id);
    });
    syncGoogleConsent(selected);
  };

  const loadCloudflare = selected => integrations
    .filter(item => item.id === 'cloudflare-web-analytics' && canLoad(item, selected))
    .forEach(item => void loadScript(`cloudflare:${item.token}`, 'https://static.cloudflareinsights.com/beacon.min.js', {
      type: 'module', defer: true, 'data-cf-beacon': JSON.stringify({ token: item.token }), 'data-pageskill-provider': 'cloudflare'
    }));

  const loadBaidu = selected => integrations
    .filter(item => item.id === 'baidu-tongji' && canLoad(item, selected))
    .forEach(item => {
      if (!item.siteSignature) return;
      window._hmt = window._hmt || [];
      void loadScript(`baidu:${item.siteSignature}`, `https://hm.baidu.com/hm.js?${encodeURIComponent(item.siteSignature)}`, { async: true, 'data-pageskill-provider': 'baidu' });
    });

  const captchaSelectors = {
    recaptcha: '.g-recaptcha,[data-recaptcha],[data-captcha-provider="recaptcha"]',
    hcaptcha: '.h-captcha,[data-hcaptcha],[data-captcha-provider="hcaptcha"]',
    turnstile: '.cf-turnstile,[data-turnstile],[data-captcha-provider="turnstile"]'
  };

  const prepareCaptcha = item => {
    const selector = captchaSelectors[item.id];
    if (!selector) return;
    document.querySelectorAll(selector).forEach(element => {
      if (item.siteKey && !element.getAttribute('data-sitekey')) element.setAttribute('data-sitekey', item.siteKey);
      element.dataset.pageskillConsent = item.consent === 'none' ? 'not-required' : 'true';
    });
  };

  const loadCaptcha = selected => captchaIntegrations
    .filter(item => item.siteKey && canLoad(item, selected))
    .forEach(item => {
      prepareCaptcha(item);
      const source = scriptSource(item.id);
      if (!source) return;
      void loadScript(`captcha:${item.id}`, source, {
        async: true, defer: true, 'data-pageskill-provider': 'captcha', 'data-pageskill-platform': item.id
      }).then(loaded => {
        window.dispatchEvent(new CustomEvent('pageskill:captcha-ready', {
          detail: { platform: item.id, siteKey: item.siteKey, loaded: Boolean(loaded) }
        }));
      });
    });

  const xSelector = 'blockquote.twitter-tweet,blockquote[data-x-embed],[data-x-embed],.twitter-timeline,.twitter-share-button,.twitter-follow-button';
  const removeXPlaceholders = () => {
    document.querySelectorAll('[data-pageskill-social-placeholder]').forEach(element => element.remove());
    document.querySelectorAll(xSelector).forEach(element => {
      if (element.dataset.pageskillConsentHidden !== 'true') return;
      element.hidden = false;
      delete element.dataset.pageskillConsentHidden;
    });
  };
  const prepareXPlaceholder = selected => {
    const allowed = xIntegrations.some(item => item.placeholder !== false && canLoad(item, selected));
    if (allowed) {
      removeXPlaceholders();
      return;
    }
    if (!xIntegrations.some(item => item.placeholder === true)) return;
    document.querySelectorAll(xSelector).forEach(element => {
      if (element.dataset.pageskillConsentHidden === 'true') return;
      const placeholder = document.createElement('aside');
      placeholder.className = 'privacy-embed-placeholder';
      placeholder.dataset.pageskillSocialPlaceholder = 'true';
      placeholder.setAttribute('role', 'note');
      const title = document.createElement('strong');
      title.dataset.pageskillSocialPlaceholderTitle = 'true';
      title.textContent = placeholderCopy.title;
      const description = document.createElement('p');
      description.dataset.pageskillSocialPlaceholderDescription = 'true';
      description.textContent = placeholderCopy.description;
      const button = document.createElement('button');
      button.className = 'button-secondary';
      button.type = 'button';
      button.dataset.pageskillAllowPurpose = 'social-embedding';
      button.textContent = placeholderCopy.allow;
      placeholder.append(title, description, button);
      element.hidden = true;
      element.dataset.pageskillConsentHidden = 'true';
      element.before(placeholder);
    });
  };
  const loadX = selected => {
    if (!xIntegrations.some(item => canLoad(item, selected))) {
      prepareXPlaceholder(selected);
      return;
    }
    removeXPlaceholders();
    if (!document.querySelector(xSelector)) return;
    void loadScript('x-widgets', 'https://platform.x.com/widgets.js', {
      async: true, defer: true, 'data-pageskill-provider': 'x-for-websites'
    }).then(loaded => {
      if (loaded) window.twttr?.widgets?.load?.();
      window.dispatchEvent(new CustomEvent('pageskill:x-ready', { detail: { loaded: Boolean(loaded) } }));
    });
  };

  const clearCookies = prefixes => document.cookie.split(';')
    .map(value => value.trim().split('=')[0])
    .filter(name => prefixes.some(prefix => name.startsWith(prefix)))
    .forEach(name => { document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`; });

  const clearProviderStorage = (before, after) => {
    const analyticsBefore = googleIntegrations.some(item => item.id === 'google-analytics' && before?.[item.purpose]);
    const analyticsAfter = googleIntegrations.some(item => item.id === 'google-analytics' && after?.[item.purpose]);
    if (analyticsBefore && !analyticsAfter) clearCookies(['_ga', '_gid', '_gat']);
    const advertisingBefore = googleIntegrations.some(item => item.id === 'google-ads' && before?.[item.purpose]);
    const advertisingAfter = googleIntegrations.some(item => item.id === 'google-ads' && after?.[item.purpose]);
    if (advertisingBefore && !advertisingAfter) {
      clearCookies(['_gcl_']);
      try { localStorage.removeItem('_gcl_ls'); } catch {}
    }
    const baiduBefore = integrations.some(item => item.id === 'baidu-tongji' && before?.[item.purpose]);
    const baiduAfter = integrations.some(item => item.id === 'baidu-tongji' && after?.[item.purpose]);
    if (baiduBefore && !baiduAfter) clearCookies(['Hm_', '_hmt']);
  };

  const loadProviders = selected => {
    void loadGoogle(selected);
    loadCloudflare(selected);
    loadBaidu(selected);
    loadCaptcha(selected);
    loadX(selected);
  };

  const setState = state => { root.dataset.cookieState = state; };
  const closeDialog = restore => {
    if (dialog && typeof dialog.close === 'function' && dialog.hasAttribute('open')) dialog.close();
    else dialog?.removeAttribute('open');
    dialog?.setAttribute('aria-hidden', 'true');
    if (restore !== false) lastFocus?.focus?.();
  };

  const openDialog = () => {
    lastFocus = document.activeElement;
    if (!dialog) return;
    dialog.setAttribute('aria-hidden', 'false');
    if (!dialog.hasAttribute('open')) {
      try {
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
      } catch { dialog.setAttribute('open', ''); }
    }
    const existing = read();
    dialog.querySelectorAll('input[data-cookie-purpose]').forEach(input => {
      input.checked = Boolean(existing?.purposes?.[input.dataset.cookiePurpose]);
    });
    dialog.querySelector('button, input')?.focus();
  };

  const readPurposes = acceptAll => {
    const selected = {};
    root.querySelectorAll('input[data-cookie-purpose]').forEach(input => {
      const purpose = String(input.dataset.cookiePurpose || '');
      if (purpose) selected[purpose] = acceptAll === true || acceptAll === false ? acceptAll : Boolean(input.checked);
    });
    return selected;
  };

  const save = acceptAll => {
    const previous = read();
    const value = { version: 1, purposes: readPurposes(acceptAll), updatedAt: new Date().toISOString() };
    write(value);
    setState('saved');
    if (banner) banner.hidden = true;
    clearProviderStorage(previous?.purposes || {}, value.purposes);
    loadProviders(value.purposes);
    closeDialog();
    window.dispatchEvent(new CustomEvent('pageskill:consent', { detail: value }));
  };

  const grantPurpose = purpose => {
    if (!optionalPurposes.has(purpose)) return;
    const previous = read();
    const selected = Object.fromEntries([...optionalPurposes].map(item => [item, previous?.purposes?.[item] === true]));
    selected[purpose] = true;
    const value = { version: 1, purposes: selected, updatedAt: new Date().toISOString() };
    write(value);
    setState('saved');
    if (banner) banner.hidden = true;
    clearProviderStorage(previous?.purposes || {}, value.purposes);
    loadProviders(value.purposes);
    closeDialog(false);
    window.dispatchEvent(new CustomEvent('pageskill:consent', { detail: value }));
  };

  document.querySelectorAll('[data-pageskill-allow-purpose]').forEach(button => button.addEventListener('click', () => {
    grantPurpose(String(button.dataset.pageskillAllowPurpose || ''));
  }, { signal: runtime.signal }));

  if (hasConsentUi) {
    document.querySelectorAll('[data-cookie-action]').forEach(button => button.addEventListener('click', () => {
      const action = button.dataset.cookieAction;
      if (action === 'open') openDialog();
      else if (action === 'accept-all') save(true);
      else if (action === 'reject-optional') save(false);
      else if (action === 'save') save();
      else if (action === 'close') closeDialog();
    }, { signal: runtime.signal }));
    dialog?.addEventListener('cancel', event => { event.preventDefault(); closeDialog(); }, { signal: runtime.signal });
    dialog?.addEventListener('click', event => { if (event.target === dialog) closeDialog(); }, { signal: runtime.signal });
  }

  const existing = read();
  if (hasConsentUi && !existing) {
    setState('pending');
    if (banner) banner.hidden = false;
    prepareXPlaceholder({});
  } else {
    setState(existing ? 'saved' : 'not-required');
    if (banner) banner.hidden = true;
    loadProviders(existing?.purposes || {});
  }
}
