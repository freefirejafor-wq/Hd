// CinePulse — Phone OS Notification Worker (MovieBox-Style New Uploads & Episode Alerts)
const DELIVERED_CACHE_NAME = 'cinepulse-notif-delivered-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CINEPULSE_SHOW_OS_NOTIFICATION' && event.data.notif) {
    const notif = event.data.notif;
    const movie = notif.movie || {};
    const deepLinkUrl =
      event.data.url ||
      `./?watch=${encodeURIComponent(movie.path || '')}&title=${encodeURIComponent(movie.title || '')}`;

    event.waitUntil(
      self.registration.showNotification(notif.headlineBn || movie.title || 'CinePulse Update', {
        body: notif.subtitleBn || `${movie.title} is now streaming in Full HD!`,
        icon: movie.poster || './pwa-192x192.png',
        badge: './pwa-192x192.png',
        tag: notif.id || `cp-${Date.now()}`,
        renotify: true,
        vibrate: [180, 80, 180],
        data: {
          url: deepLinkUrl,
          movie,
        },
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const targetUrl = data.url || './';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({
            type: 'CINEPULSE_OPEN_MOVIE',
            movie: data.movie || null,
            url: targetUrl,
          });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
