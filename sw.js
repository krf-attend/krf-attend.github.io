// KRF출퇴근 서비스 워커: 바탕화면 설치 조건을 맞추기 위한 최소 구성
// 출퇴근 기록(서버 요청)은 건드리지 않고 그대로 보냄
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(fetch(e.request));
});
