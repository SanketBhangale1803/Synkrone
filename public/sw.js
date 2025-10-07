self.addEventListener('push', function(event) {
	let data = {};
	try {
		data = event.data ? event.data.json() : {};
	} catch (e) {
		data = { title: 'Appointment Reminder', body: event.data ? event.data.text() : 'You have an appointment soon.' };
	}

	const title = data.title || 'Appointment Reminder';
	const options = {
		body: data.body || 'You have an upcoming appointment.',
		icon: '/images/logo.png',
		badge: '/images/logo.png',
		data: data
	};

	event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
	event.notification.close();
	const urlToOpen = '/appointments';
	event.waitUntil(
		clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
			for (let i = 0; i < windowClients.length; i++) {
				const client = windowClients[i];
				if (client.url.includes(urlToOpen) && 'focus' in client) return client.focus();
			}
			if (clients.openWindow) return clients.openWindow(urlToOpen);
		})
	);
});
