// KRF출퇴근 서비스 워커: 바탕화면 설치 조건을 맞추기 위한 최소 구성
// 출퇴근 기록(서버 요청)은 건드리지 않고 그대로 보냄
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
// 화면 파일은 폰에 저장해 둔 것을 바로 보여 주고(빠른 시작), 뒤에서 새 버전을 받아 둠
// 새 버전이 있으면 화면에 알려서 다음에 바로 반영
const CACHE = 'krf-v1';
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  const path = url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname;
  const key = url.origin + path;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(key);
    const update = (async () => {
      const res = await fetch(key, { cache: 'no-cache', credentials: 'same-origin' });
      if (!res.ok) return res;
      if (cached && path.endsWith('.html')) {
        const [a, b] = await Promise.all([cached.clone().text(), res.clone().text()]);
        await cache.put(key, res.clone());
        if (a !== b) (await self.clients.matchAll({ type: 'window' })).forEach((c) => c.postMessage('updated'));
      } else {
        await cache.put(key, res.clone());
      }
      return res;
    })();
    if (cached) { e.waitUntil(update.catch(() => {})); return cached; }
    return update.catch(() => fetch(e.request));
  })());
});

// 관리자 폰 푸시 알림: 서버는 '신호'만 보내고 문구는 여기서 표시
self.addEventListener('push', (e) => {
  e.waitUntil(self.registration.showNotification('KRF출퇴근 · 등록 신청', {
    body: '새 등록 신청이 들어왔어요.\n눌러서 승인해 주세요.',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: 'krf-pend',
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: { url: './?admin=1' }
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) {
      if (new URL(c.url).origin === self.location.origin) { c.postMessage('openAdmin'); return c.focus(); }
    }
    return self.clients.openWindow(url);
  }));
});
