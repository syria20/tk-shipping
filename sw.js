// Minimal service worker: lets the app install; always loads fresh data from the network.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request).catch(()=>new Response('<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><body style="font-family:sans-serif;text-align:center;padding:40px;background:#07142e;color:#fff" dir=rtl><h2>لا يوجد اتصال بالإنترنت</h2><p>تحقق من الاتصال وحاول مرة أخرى.</p>',{headers:{'Content-Type':'text/html; charset=utf-8'}})));
  }
});
