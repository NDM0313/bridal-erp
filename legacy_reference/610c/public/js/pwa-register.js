// 610C POS System - Service Worker Registration
// This registers the service worker and handles PWA updates

(function() {
  'use strict';

  // Check if service workers are supported
  if (!navigator.serviceWorker) {
    console.warn('Service Workers not supported in this browser');
    return;
  }

  // Register service worker
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/610c/public/service-worker.js', {
        scope: '/610c/public/'
      })
      .then(registration => {
        console.log('[PWA] Service Worker registered:', registration);

        // Check for updates every 5 minutes
        setInterval(() => {
          registration.update();
        }, 5 * 60 * 1000);

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('[PWA] Update found, installing new Service Worker');

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available, notify user
              showUpdatePrompt();
            }
          });
        });
      })
      .catch(error => {
        console.error('[PWA] Service Worker registration failed:', error);
      });

    // Handle messages from service worker
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data.type === 'SYNC_COMPLETE') {
        console.log('[PWA]', event.data.message);
        showNotification(event.data.message, 'success');
      }
    });
  });

  // Request persistent storage
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().then(persistent => {
      console.log('[PWA] Persistent storage:', persistent ? 'granted' : 'denied');
    });
  }

  // Detect offline/online status
  window.addEventListener('online', () => {
    console.log('[PWA] Back online');
    document.body.classList.remove('offline');
    showNotification('You are back online', 'success');
    
    // Sync data when back online
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SYNC_REQUEST',
        tags: ['sync-sales', 'sync-inventory']
      });
    }
  });

  window.addEventListener('offline', () => {
    console.log('[PWA] You are offline');
    document.body.classList.add('offline');
    showNotification('You are offline - data will sync when online', 'warning');
  });

  // Show update prompt
  function showUpdatePrompt() {
    const updateContainer = document.createElement('div');
    updateContainer.id = 'pwa-update-prompt';
    updateContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #2196F3;
      color: white;
      padding: 16px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      z-index: 9999;
      font-family: Roboto, sans-serif;
      max-width: 300px;
    `;
    
    updateContainer.innerHTML = `
      <div style="margin-bottom: 12px;">
        <strong>Update Available!</strong>
        <p style="margin: 8px 0; font-size: 14px;">
          A new version of 610C is available.
        </p>
      </div>
      <div style="display: flex; gap: 8px;">
        <button id="pwa-update-yes" style="
          background: #1976D2;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        ">Update Now</button>
        <button id="pwa-update-later" style="
          background: transparent;
          color: white;
          border: 1px solid white;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        ">Later</button>
      </div>
    `;
    
    document.body.appendChild(updateContainer);
    
    document.getElementById('pwa-update-yes').addEventListener('click', () => {
      window.location.reload();
    });
    
    document.getElementById('pwa-update-later').addEventListener('click', () => {
      updateContainer.remove();
    });
  }

  // Show notifications
  function showNotification(message, type = 'info') {
    // Show in console
    console.log(`[PWA - ${type.toUpperCase()}]`, message);
    
    // Show toast notification (optional)
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'success' ? '#4CAF50' : type === 'warning' ? '#FF9800' : '#2196F3'};
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      z-index: 9998;
      font-family: Roboto, sans-serif;
      animation: slideDown 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  // Check for install prompt
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    showInstallPrompt();
  });

  function showInstallPrompt() {
    const installContainer = document.createElement('div');
    installContainer.id = 'pwa-install-prompt';
    installContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: #4CAF50;
      color: white;
      padding: 16px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      z-index: 9999;
      font-family: Roboto, sans-serif;
      max-width: 300px;
    `;
    
    installContainer.innerHTML = `
      <div style="margin-bottom: 12px;">
        <strong>Install 610C App</strong>
        <p style="margin: 8px 0; font-size: 14px;">
          Install our app for faster access and offline support!
        </p>
      </div>
      <div style="display: flex; gap: 8px;">
        <button id="pwa-install-yes" style="
          background: #388E3C;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        ">Install</button>
        <button id="pwa-install-later" style="
          background: transparent;
          color: white;
          border: 1px solid white;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        ">Not Now</button>
      </div>
    `;
    
    document.body.appendChild(installContainer);
    
    document.getElementById('pwa-install-yes').addEventListener('click', () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(choiceResult => {
          if (choiceResult.outcome === 'accepted') {
            console.log('[PWA] App installed');
          }
          deferredPrompt = null;
          installContainer.remove();
        });
      }
    });
    
    document.getElementById('pwa-install-later').addEventListener('click', () => {
      installContainer.remove();
    });
  }

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed successfully');
    deferredPrompt = null;
  });

})();
