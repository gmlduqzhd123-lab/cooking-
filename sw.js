// 요리 대백과 서비스 워커: 한 번 열어 본 뒤에는 인터넷이 없어도 레시피를 볼 수 있게 한다.
// index.html이나 아이콘을 바꾸면 CACHE_VERSION을 올려야 예전 캐시가 정리된다.
const CACHE_VERSION = 'honbap-v23';
// 같은 주소(gmlduqzhd123-lab.github.io)의 다른 앱들과 저장소를 함께 쓰므로, 이 앱의 이전 캐시만 지운다.
const CACHE_PREFIX = 'honbap-v';
const APP_SHELL = [
    './',
    './index.html',
    './manifest.webmanifest',
    './ys-install.js',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_VERSION).then(cache => cache.addAll(APP_SHELL)));
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_VERSION).map(key => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);

    // 우리 사이트 파일: 새 버전을 먼저 받아 오고, 인터넷이 없으면 저장해 둔 것을 보여준다
    if (url.origin === self.location.origin) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    if (response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_VERSION).then(cache => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(() => caches.match(request, { ignoreSearch: true })
                    .then(cached => cached || caches.match('./index.html')))
        );
        return;
    }

    // 글꼴(Pretendard): 한 번 받으면 저장해 두고 재사용
    if (url.hostname === 'cdn.jsdelivr.net') {
        event.respondWith(
            caches.match(request).then(cached => cached || fetch(request).then(response => {
                if (response.ok) {
                    const copy = response.clone();
                    caches.open(CACHE_VERSION).then(cache => cache.put(request, copy));
                }
                return response;
            }))
        );
    }
    // 유튜브 썸네일·영상은 브라우저에 맡긴다 (다른 사이트 이미지는 캐시 용량을 크게 차지함)
});
