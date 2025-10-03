self.addEventListener("push", function (event) {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "Notification", {
      body: data.body || "You have a new update.",
      icon: "/images/logo.png" // Optional
    })
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/') // Redirect to desired page
  );
});
