const CACHE_NAME = 'ai-nexus-v2';
const STATIC = [
  '/ai-nexus-studio/',
  '/ai-nexus-studio/index.html',
  '/ai-nexus-studio/icons/icon-192.png',
  '/ai-nexus-studio/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/marked/11.1.0/marked.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(STATIC).catch(() => {}))
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
  // Don't cache API calls (ai endpoints)
  if (url.hostname.includes('anthropic') ||
      url.hostname.includes('openai') ||
      url.hostname.includes('groq') ||
      url.hostname.includes('google') ||
      url.hostname.includes('openrouter') ||
      url.hostname.includes('fal.run') ||
      url.hostname.includes('elevenlabs') ||
      url.hostname.includes('serper') ||
      url.hostname.includes('brave') ||
      url.hostname.includes('duckduckgo') ||
      url.hostname.includes('pollinations')) {
    return;
  }
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
