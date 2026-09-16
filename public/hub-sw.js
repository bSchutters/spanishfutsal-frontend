/*
 * Le service worker du Hub, limite au perimetre /hub. Il ne met rien en
 * cache : il recoit les notifications push, les affiche, et ouvre
 * l'evenement concerne quand on touche la notification.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  var donnees = { title: "Hub UDA", body: "", url: "/hub", tag: undefined };
  try {
    if (event.data) donnees = Object.assign(donnees, event.data.json());
  } catch {
    if (event.data) donnees.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(donnees.title, {
      body: donnees.body,
      tag: donnees.tag,
      icon: "/hub/icone/192?fond=1",
      badge: "/hub/icone/192",
      data: { url: donnees.url },
      renotify: false,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || "/hub";
  var cible = new URL(url, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (fenetres) {
      for (var i = 0; i < fenetres.length; i++) {
        var f = fenetres[i];
        if (f.url.indexOf(self.location.origin + "/hub") === 0 && "focus" in f) {
          if ("navigate" in f) f.navigate(cible);
          return f.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(cible);
    }),
  );
});
