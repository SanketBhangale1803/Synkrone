// Client push helper: registers service worker, requests permission, and subscribes
(async function() {
  function urlBase64ToUint8Array(base64String) {
    if (!base64String || typeof base64String !== 'string') {
      throw new Error('VAPID public key is not a string');
    }
    // remove whitespace/newlines and ensure base64 URL format
    const cleaned = base64String.trim().replace(/\s+/g, '');
    const padding = '='.repeat((4 - cleaned.length % 4) % 4);
    const base64 = (cleaned + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async function getVapidKey() {
    try {
      const res = await fetch('/vapidPublicKey', { credentials: 'same-origin' });
      if (!res.ok) throw new Error('Failed to load VAPID key');
      const json = await res.json();
      return json.publicKey;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        return reg;
      } catch (e) {
        console.error('Service Worker registration failed:', e);
      }
    }
    return null;
  }

  async function subscribeUser() {
    try {
      // Check if already subscribed via localStorage
      if (localStorage.getItem('pushNotificationsEnabled') === 'true') {
        console.log('Push notifications already enabled');
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Notification permission is required to receive appointment reminders.');
        return;
      }

      const reg = await registerServiceWorker();
      if (!reg) return;

      const vapidKey = await getVapidKey();
      if (!vapidKey) {
        console.error('No VAPID key returned from server. Make sure VAPID_PUBLIC_KEY is set.');
        alert('Server VAPID key missing. Check console.');
        return;
      }

      // Prefer existing subscription if present
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const applicationServerKey = urlBase64ToUint8Array(vapidKey);
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey
        });
      } else {
        console.log('Using existing subscription:', sub);
      }

      // Send subscription to server (include cookies for session auth)
      const resp = await fetch('/subscribe', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub)
      });

      const text = await resp.text();
      console.log('Subscribe response status:', resp.status, 'body:', text);
      if (!resp.ok) throw new Error('Failed to save subscription on server: ' + text);

      // Store the enabled state in localStorage
      localStorage.setItem('pushNotificationsEnabled', 'true');
      alert('Notifications enabled. You will receive appointment reminders.');
    } catch (err) {
      console.error('Subscription error:', err);
      alert('Could not enable notifications. See console for details.');
    }
  }

  // Check if notifications are already enabled on load
  async function checkExistingSubscription() {
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            localStorage.setItem('pushNotificationsEnabled', 'true');
          }
        }
      } catch (error) {
        console.error('Error checking existing subscription:', error);
      }
    }
  }

  // Run the check on load
  checkExistingSubscription();

  // Expose helper to window for UI to call
  window.pushNotifications = { 
    enable: subscribeUser,
    isEnabled: () => localStorage.getItem('pushNotificationsEnabled') === 'true'
  };
})();