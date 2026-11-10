(() => {
  const nativeFetch = window.fetch.bind(window);
  const siteRoot = '/Githook';
  const withSiteRoot = (value) => {
    if (typeof value !== 'string') return value;
    if (
      value.startsWith('/_next/') ||
      value.startsWith('/Githook/fonts/') ||
      value.startsWith('/repo-media/')
    ) {
      return siteRoot + value;
    }
    return value;
  };

  const nativeSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function setAttribute(name, value) {
    const nextValue = name === 'src' || name === 'href' ? withSiteRoot(value) : value;
    return nativeSetAttribute.call(this, name, nextValue);
  };

  for (const [prototype, property] of [
    [HTMLScriptElement.prototype, 'src'],
    [HTMLLinkElement.prototype, 'href'],
  ]) {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, property);
    if (!descriptor?.get || !descriptor?.set) continue;
    Object.defineProperty(prototype, property, {
      configurable: descriptor.configurable,
      enumerable: descriptor.enumerable,
      get: descriptor.get,
      set(value) {
        descriptor.set.call(this, withSiteRoot(value));
      },
    });
  }

  const manifestReady = nativeFetch(`${siteRoot}/__api-manifest.json`, {
    cache: 'no-store',
  })
    .then((response) => (response.ok ? response.json() : {}))
    .catch(() => ({}));

  window.fetch = async (input, init) => {
    const requestUrl = new URL(
      typeof input === 'string' || input instanceof URL ? input : input.url,
      window.location.href,
    );
    const isApi =
      requestUrl.pathname === '/api' ||
      requestUrl.pathname.startsWith('/api/') ||
      requestUrl.pathname === `${siteRoot}/api` ||
      requestUrl.pathname.startsWith(`${siteRoot}/api/`);

    if (isApi) {
      const manifest = await manifestReady;
      const pathname = requestUrl.pathname.startsWith(siteRoot)
        ? requestUrl.pathname
        : siteRoot + requestUrl.pathname;
      const exactKey = pathname + requestUrl.search;
      const responsePath = manifest[exactKey] || manifest[pathname];
      if (responsePath) return nativeFetch(responsePath, init);

      if ((init?.method || 'GET').toUpperCase() === 'GET') {
        const fallback =
          pathname === `${siteRoot}/api/hatch/rooms`
            ? { rooms: [] }
            : pathname === `${siteRoot}/api/hatch/catalog`
              ? { models: [], connections: { ai: null } }
              : null;
        if (fallback) {
          return new Response(JSON.stringify(fallback), {
            status: 200,
            headers: { 'content-type': 'application/json; charset=utf-8' },
          });
        }
      }
    }

    return nativeFetch(input, init);
  };
})();
