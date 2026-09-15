import { notificationsAPI } from '../../services/api';
import { urlBase64ToUint8Array } from '../../lib/urlBase64';

export type PushSubscribeResult = 'subscribed' | 'unavailable' | 'denied';

export async function ensurePushSubscription(): Promise<PushSubscribeResult> {
    if (typeof window === 'undefined') return 'unavailable';
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        return 'unavailable';
    }

    let publicKey = '';
    try {
        const res = await notificationsAPI.vapidPublicKey();
        publicKey = res?.publicKey || '';
    } catch {
        return 'unavailable';
    }
    if (!publicKey) return 'unavailable';

    const permission = Notification.permission === 'default'
        ? await Notification.requestPermission()
        : Notification.permission;
    if (permission !== 'granted') return 'denied';

    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    let sub = await registration.pushManager.getSubscription();
    if (!sub) {
        sub = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        });
    }

    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return 'unavailable';

    await notificationsAPI.subscribePush({
        platform: window.jeins?.isDesktop ? 'desktop' : 'web',
        endpoint: json.endpoint,
        expirationTime: json.expirationTime ?? null,
        keys: {
            p256dh: json.keys.p256dh,
            auth: json.keys.auth,
        },
    });
    return 'subscribed';
}
