const CACHE_NAME = "emma-studio-v1";
const ARCHIVOS_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "https://cdn.jsdelivr.net/npm/chart.js",
  "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js",
  "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js",
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js",
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("📦 Cacheando archivos...");
      return cache.addAll(ARCHIVOS_CACHE).catch(err => {
        console.log("Algunos archivos no se pudieron cachear:", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.url.includes("firestore.googleapis.com") ||
      event.request.url.includes("identitytoolkit.googleapis.com") ||
      event.request.url.includes("firebase")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && event.request.method === "GET") {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
        });
      })
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.tipo === "programarNotif") {
    const { titulo, cuerpo, cuando } = event.data;
    const delay = cuando - Date.now();
    if (delay > 0) {
      setTimeout(() => {
        self.registration.showNotification(titulo, {
          body: cuerpo,
          icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cdefs%3E%3ClinearGradient id='g'%3E%3Cstop offset='0%25' stop-color='%231a1a1a'/%3E%3Cstop offset='100%25' stop-color='%23c9a227'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='512' height='512' rx='100' fill='url(%23g)'/%3E%3Ctext x='50%25' y='58%25' font-size='220' font-weight='900' fill='%23fff' text-anchor='middle' dominant-baseline='middle' font-family='Georgia'%3EE%3C/text%3E%3C/svg%3E",
          vibrate: [200, 100, 200]
        });
      }, delay);
    }
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow("./");
    })
  );
});