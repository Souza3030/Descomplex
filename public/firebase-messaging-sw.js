self.addEventListener('push', event => {
  const payload = event.data ? event.data.json() : {};
  const data = payload.data || payload;
  event.waitUntil(self.registration.showNotification(data.title || 'Descomplex', {
    body: data.body || 'Seu próximo passo está esperando por você.',
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: 'descomplex-daily',
    data: { url: '/' },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url || '/'));
});
