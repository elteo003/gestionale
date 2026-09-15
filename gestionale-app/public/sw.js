/* Service Worker — Web Push JEINS. Deve restare in public/ (scope /). */

self.addEventListener('push', (event) => {
    event.waitUntil(handlePush(event));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = (event.notification.data && event.notification.data.url) || '/notifiche';
    event.waitUntil(openUrl(url));
});

async function handlePush(event) {
    let data = { title: 'JEINS', body: '', url: '/notifiche', tag: 'jeins' };
    try {
        if (event.data) data = Object.assign(data, event.data.json());
    } catch {
        /* payload non JSON */
    }

    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientsList) {
        client.postMessage({ type: 'push', payload: data });
    }
    const focused = clientsList.some((c) => c.focused);
    if (focused) return;

    await self.registration.showNotification(data.title || 'JEINS', {
        body: data.body || '',
        tag: data.tag || data.notificationId || 'jeins',
        data: {
            url: data.url || '/notifiche',
            notificationId: data.notificationId,
        },
        icon: '/vite.svg',
    });
}

async function openUrl(path) {
    const origin = self.location.origin;
    const target = path.startsWith('http') ? path : `${origin}${path.startsWith('/') ? path : `/${path}`}`;
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
        await client.focus();
        client.postMessage({ type: 'navigate', url: path });
        return;
    }
    await self.clients.openWindow(target);
}
