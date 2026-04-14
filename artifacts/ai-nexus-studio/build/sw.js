const CACHE_NAME = 'ai-nexus-v5';
const STATIC_ASSETS = [
  '/ai-nexus-studio/icons/icon-192.png',
  '/ai-nexus-studio/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/marked/11.1.0/marked.min.js',
];

// Hosts that should NEVER be cached (AI APIs + connectors)
const NO_CACHE_HOSTS = [
  'anthropic.com','openai.com','groq.com','googleapis.com',
  'openrouter.ai','fal.run','elevenlabs.io','serper.dev',
  'brave.com','duckduckgo.com','pollinations.ai','openweathermap.org',
  'gnews.io','alphavantage.co','api.github.com','reddit.com',
  'slack.com','api.telegram.org','notion.com','notionapis.com',
  'gmail.googleapis.com','youtube.googleapis.com',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Never cache AI APIs or connector APIs
  if (NO_CACHE_HOSTS.some(h => url.hostname.includes(h))) return;

  // HTML pages: Network-First (always get the latest version)
  if (e.request.destination === 'document' ||
      url.pathname.endsWith('.html') ||
      url.pathname === '/ai-nexus-studio/' ||
      url.pathname === '/ai-nexus-studio') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Static assets (icons, fonts, libs): Cache-First
  e.respondWith(
    caches.match(e.request).then(hit => {
      if (hit) return hit;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match('/ai-nexus-studio/'));
    })
  );
});
