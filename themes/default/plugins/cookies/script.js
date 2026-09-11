// Optional provider resources are created only after an affirmative purpose choice.
const root = document.querySelector('[data-cookie-consent]');

if (root) {
  const banner = root.querySelector('[data-cookie-banner]');
  const dialog = root.querySelector('[data-cookie-dialog]');
  const preferenceKey = 'pagekiln-consent';
  const storageMode = root.dataset.cookieStorage || 'cookie';
  const retentionDays = Math.max(0, Number(root.dataset.cookieRetentionDays || 365));
  // Keep the storage key stable while migrating old category names to the
  // purpose vocabulary emitted by the current renderer.
  const PURPOSE_ALIASES = {
    analytics: 'measurement',
    security: 'fraud-prevention',
    social: 'social-embedding'
  };
  const normalizePurpose = value => PURPOSE_ALIASES[value] || value;
  const integrationPurpose = item => normalizePurpose(item?.purpose || item?.category || '');
  const normalizeConsent = value => {
    if (!value || typeof value !== 'object') return null;
    const categories = Object.fromEntries(Object.entries(value.categories || {}).map(([purpose, granted]) => [normalizePurpose(purpose), Boolean(granted)]));
    return { ...value, categories };
  };
  const parse = value => {
    try {
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  };
  const integrations = parse(root.dataset.cookieIntegrations) || [];
  const googleIntegrations = integrations.filter(item => item.provider === 'google-analytics' || item.provider === 'google-ads');
  const captchaIntegrations = integrations.filter(item => item.provider === 'recaptcha' || item.provider === 'hcaptcha' || item.provider === 'turnstile');
  const xIntegrations = integrations.filter(item => item.provider === 'x-for-websites');
  const scriptPromises = new Map();
  let lastFocus = null;

  const readCookie = () => {
    try {
      const cookie = document.cookie.split('; ').find(entry => entry.startsWith(`${preferenceKey}=`));
      return normalizeConsent(cookie ? parse(decodeURIComponent(cookie.slice(preferenceKey.length + 1))) : null);
    } catch {
      return null;
    }
  };

  const readStorage = () => {
    try {
      const value = parse(localStorage.getItem(preferenceKey));
      const updatedAt = Date.parse(value?.updatedAt || '');
      if (!value || !Number.isFinite(updatedAt) || retentionDays > 0 && Date.now() - updatedAt > retentionDays * 86400000) {
        localStorage.removeItem(preferenceKey);
        return null;
      }
      return normalizeConsent(value);
    } catch {
      return null;
    }
  };

  const read = () => storageMode === 'localStorage' ? (readStorage() || readCookie()) : (readCookie() || readStorage());

  const write = value => {
    const encoded = encodeURIComponent(JSON.stringify(value));
    if (storageMode !== 'localStorage') {
      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `${preferenceKey}=${encoded}; Max-Age=${retentionDays * 86400}; Path=/; SameSite=Lax${secure}`;
    }
    try {
      localStorage.setItem(preferenceKey, JSON.stringify(value));
    } catch {}
  };

  const setState = state => {
    root.dataset.cookieState = state;
  };

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

  const loadAllowedScripts = categories => root.querySelectorAll('[data-cookie-script]').forEach(template => {
    const purpose = normalizePurpose(template.dataset.cookiePurpose || template.dataset.cookieCategory);
    const source = template.dataset.cookieSrc;
    if (!purpose || !source || !categories?.[purpose] || template.dataset.loaded === 'true') return;
    let scriptUrl;
    try {
      scriptUrl = new URL(source, window.location.href);
    } catch {
      return;
    }
    if (scriptUrl.protocol !== 'http:' && scriptUrl.protocol !== 'https:') return;
    const script = document.createElement('script');
    script.type = 'module';
    script.src = scriptUrl.href;
    script.dataset.cookiePurpose = purpose;
    // Keep the old data attribute on dynamically inserted scripts for themes
    // that still inspect it, while all new markup uses data-cookie-purpose.
    script.dataset.cookieCategory = purpose;
    script.dataset.pagekilnConsent = 'true';
    document.head.append(script);
    template.dataset.loaded = 'true';
  });

  const googleConsent = categories => {
    const analyticsGranted = googleIntegrations.some(item => item.provider === 'google-analytics' && categories?.[integrationPurpose(item)]);
    const advertisingGranted = googleIntegrations.some(item => item.provider === 'google-ads' && categories?.[integrationPurpose(item)]);
    return {
      analytics_storage: analyticsGranted ? 'granted' : 'denied',
      ad_storage: advertisingGranted ? 'granted' : 'denied',
      ad_user_data: advertisingGranted ? 'granted' : 'denied',
      ad_personalization: advertisingGranted ? 'granted' : 'denied'
    };
  };

  const syncGoogleConsent = categories => {
    if (typeof window.gtag === 'function') window.gtag('consent', 'update', googleConsent(categories));
  };

  const loadGoogle = async categories => {
    const allowed = googleIntegrations.filter(item => categories?.[integrationPurpose(item)]);
    // GA4 uses a G- measurement ID; Google Ads uses the Google tag ID shown
    // by Ads (normally AW- or GT-). Neither value is a Pageskill-generated ID.
    const ids = [...new Set(allowed.map(item => item.measurementId || item.tagId).filter(Boolean))];
    if (!ids.length) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    if (!window.__pagekilnGoogleConsentDefaulted) {
      window.gtag('consent', 'default', { ...googleConsent(categories), wait_for_update: 500 });
      window.__pagekilnGoogleConsentDefaulted = true;
    }
    await loadScript('google-tag', `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ids[0])}`, { async: true, 'data-pagekiln-provider': 'google' });
    window.__pagekilnGoogleConfiguredIds = window.__pagekilnGoogleConfiguredIds || new Set();
    if (!window.__pagekilnGoogleInitialized) {
      window.gtag('js', new Date());
      window.__pagekilnGoogleInitialized = true;
    }
    ids.forEach(id => {
      if (window.__pagekilnGoogleConfiguredIds.has(id)) return;
      window.gtag('config', id);
      window.__pagekilnGoogleConfiguredIds.add(id);
    });
    syncGoogleConsent(categories);
  };

  const loadCloudflare = categories => integrations
    .filter(item => item.provider === 'cloudflare-web-analytics' && categories?.[integrationPurpose(item)])
    .forEach(item => {
      if (item.token) void loadScript(`cloudflare:${item.token}`, 'https://static.cloudflareinsights.com/beacon.min.js', {
        type: 'module',
        defer: true,
        'data-cf-beacon': JSON.stringify({ token: item.token }),
        'data-pagekiln-provider': 'cloudflare'
      });
    });

  const loadBaidu = categories => integrations
    .filter(item => item.provider === 'baidu-tongji' && categories?.[integrationPurpose(item)])
    .forEach(item => {
      if (!item.siteSignature) return;
      window._hmt = window._hmt || [];
      void loadScript(`baidu:${item.siteSignature}`, `https://hm.baidu.com/hm.js?${encodeURIComponent(item.siteSignature)}`, { async: true, 'data-pagekiln-provider': 'baidu' });
    });

  const captchaSources = {
    recaptcha: 'https://www.google.com/recaptcha/api.js',
    hcaptcha: 'https://js.hcaptcha.com/1/api.js',
    turnstile: 'https://challenges.cloudflare.com/turnstile/v0/api.js'
  };
  const captchaSelectors = {
    recaptcha: '.g-recaptcha,[data-recaptcha],[data-captcha-provider="recaptcha"]',
    hcaptcha: '.h-captcha,[data-hcaptcha],[data-captcha-provider="hcaptcha"]',
    turnstile: '.cf-turnstile,[data-turnstile],[data-captcha-provider="turnstile"]'
  };

  const prepareCaptcha = item => {
    const selector = captchaSelectors[item.provider];
    if (!selector) return;
    document.querySelectorAll(selector).forEach(element => {
      if (item.siteKey && !element.getAttribute('data-sitekey')) element.setAttribute('data-sitekey', item.siteKey);
      element.dataset.pagekilnConsent = 'true';
    });
  };

  const loadCaptcha = categories => captchaIntegrations
    .filter(item => item.provider && item.siteKey && categories?.[integrationPurpose(item)])
    .forEach(item => {
      prepareCaptcha(item);
      const source = captchaSources[item.provider];
      if (!source) return;
      void loadScript(`captcha:${item.provider}`, source, {
        async: true,
        defer: true,
        'data-pagekiln-provider': 'captcha',
        'data-pagekiln-platform': item.provider
      }).then(loaded => {
        window.dispatchEvent(new CustomEvent('pagekiln:captcha-ready', {
          detail: { platform: item.provider, siteKey: item.siteKey, loaded: Boolean(loaded) }
        }));
      });
    });

  const xSelector = 'blockquote.twitter-tweet,blockquote[data-x-embed],[data-x-embed],.twitter-timeline,.twitter-share-button,.twitter-follow-button';
  const loadX = categories => {
    if (!xIntegrations.some(item => categories?.[integrationPurpose(item)]) || !document.querySelector(xSelector)) return;
    void loadScript('x-widgets', 'https://platform.x.com/widgets.js', {
      async: true,
      defer: true,
      'data-pagekiln-provider': 'x-for-websites'
    }).then(loaded => {
      if (loaded) window.twttr?.widgets?.load?.();
      window.dispatchEvent(new CustomEvent('pagekiln:x-ready', { detail: { loaded: Boolean(loaded) } }));
    });
  };

  const clearCookies = prefixes => document.cookie.split(';')
    .map(value => value.trim().split('=')[0])
    .filter(name => prefixes.some(prefix => name.startsWith(prefix)))
    .forEach(name => {
      document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
    });

  const clearProviderStorage = (before, after) => {
    const analyticsBefore = googleIntegrations.some(item => item.provider === 'google-analytics' && before?.[integrationPurpose(item)]);
    const analyticsAfter = googleIntegrations.some(item => item.provider === 'google-analytics' && after?.[integrationPurpose(item)]);
    if (analyticsBefore && !analyticsAfter) clearCookies(['_ga', '_gid', '_gat']);
    const advertisingBefore = googleIntegrations.some(item => item.provider === 'google-ads' && before?.[integrationPurpose(item)]);
    const advertisingAfter = googleIntegrations.some(item => item.provider === 'google-ads' && after?.[integrationPurpose(item)]);
    if (advertisingBefore && !advertisingAfter) {
      clearCookies(['_gcl_']);
      try {
        localStorage.removeItem('_gcl_ls');
      } catch {}
    }
    const baiduBefore = integrations.some(item => item.provider === 'baidu-tongji' && before?.[integrationPurpose(item)]);
    const baiduAfter = integrations.some(item => item.provider === 'baidu-tongji' && after?.[integrationPurpose(item)]);
    if (baiduBefore && !baiduAfter) clearCookies(['Hm_', '_hmt']);
  };

  const loadProviders = categories => {
    loadAllowedScripts(categories);
    void loadGoogle(categories);
    loadCloudflare(categories);
    loadBaidu(categories);
    loadCaptcha(categories);
    loadX(categories);
  };

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
      } catch {
        dialog.setAttribute('open', '');
      }
    }
    const existing = read();
    dialog.querySelectorAll('input[data-cookie-purpose],input[data-cookie-category]').forEach(input => {
      const purpose = normalizePurpose(input.dataset.cookiePurpose || input.dataset.cookieCategory);
      if (!input.disabled) input.checked = Boolean(existing?.categories?.[purpose]);
    });
    dialog.querySelector('button, input')?.focus();
  };

  const readCategories = forceOptional => {
    const categories = {};
    root.querySelectorAll('input[data-cookie-purpose],input[data-cookie-category]').forEach(input => {
      const purpose = normalizePurpose(input.dataset.cookiePurpose || input.dataset.cookieCategory);
      if (purpose) categories[purpose] = input.disabled ? true : forceOptional ?? Boolean(input.checked);
    });
    return categories;
  };

  const save = forceOptional => {
    const previous = read();
    const value = { version: 2, essential: true, categories: readCategories(forceOptional), updatedAt: new Date().toISOString() };
    write(value);
    setState('saved');
    if (banner) banner.hidden = true;
    clearProviderStorage(previous?.categories || {}, value.categories);
    loadProviders(value.categories);
    closeDialog();
    window.dispatchEvent(new CustomEvent('pagekiln:consent', { detail: value }));
  };

  document.querySelectorAll('[data-cookie-action]').forEach(button => button.addEventListener('click', () => {
    const action = button.dataset.cookieAction;
    if (action === 'open') openDialog();
    else if (action === 'accept-all') save(true);
    else if (action === 'reject-optional') save(false);
    else if (action === 'save') save();
    else if (action === 'close') closeDialog();
  }));
  dialog?.addEventListener('cancel', event => {
    event.preventDefault();
    closeDialog();
  });
  dialog?.addEventListener('click', event => {
    if (event.target === dialog) closeDialog();
  });

  const existing = read();
  if (!existing) {
    setState('pending');
    if (banner) banner.hidden = false;
  } else {
    setState('saved');
    if (banner) banner.hidden = true;
    loadProviders(existing.categories || {});
  }
}
