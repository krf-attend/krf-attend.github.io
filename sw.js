// KRF출퇴근 서비스 워커: 바탕화면 설치 조건을 맞추기 위한 최소 구성
// 출퇴근 기록(서버 요청)은 건드리지 않고 그대로 보냄
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
// 화면(index.html)은 항상 인터넷에서 새로 받아 씀 (2.5초 안에 안 오면 폰에 저장해 둔 것으로)
// 아이콘 같은 나머지 파일은 저장본을 바로 쓰고 뒤에서 새로 받아 둠
const CACHE = 'krf-v2';
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
));
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  const path = url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname;
  const key = url.origin + path;
  const isPage = e.request.mode === 'navigate' || path.endsWith('.html');
  const net = caches.open(CACHE).then((cache) =>
    fetch(key, { cache: 'no-cache', credentials: 'same-origin' }).then((res) => {
      if (res.ok) cache.put(key, res.clone());
      return res;
    }));
  e.waitUntil(net.catch(() => {}));
  e.respondWith((async () => {
    const cached = await caches.match(key);
    if (!isPage) return cached || net;
    if (!cached) return net;
    const timeout = new Promise((r) => setTimeout(() => r(null), 2500));
    const fresh = await Promise.race([net.catch(() => null), timeout]);
    return fresh || cached;
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
