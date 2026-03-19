// static/push_notifications.js - Handle Push Notification registration and subscription

console.log('Push Notifications script loaded');

// The VAPID_PUBLIC_KEY is provided by the template globally
if (typeof VAPID_PUBLIC_KEY === 'undefined') {
    window.VAPID_PUBLIC_KEY = ""; // Fallback
    console.warn('VAPID_PUBLIC_KEY was undefined at script load.');
}

// Utility function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
    if (!base64String) return new Uint8Array(0);
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Register service worker
async function registerServiceWorker() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
            let scriptURL = '/static/sw.js';
            // Handle Trusted Types if the browser requires it
            if (window.trustedTypes && trustedTypes.createPolicy) {
                try {
                    const policy = trustedTypes.createPolicy('stutrack-policy', {
                        createScriptURL: url => url
                    });
                    scriptURL = policy.createScriptURL(scriptURL);
                } catch (e) {
                    console.warn('Could not create Trusted Types policy', e);
                }
            }
            const registration = await navigator.serviceWorker.register(scriptURL);
            console.log('Service Worker registered with scope:', registration.scope);
            return registration;
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    } else {
        console.warn('Push messaging is not supported');
    }
}
async function subscribeUserToPush() {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            console.log('User is already subscribed.');
            return subscription;
        }

        if (!VAPID_PUBLIC_KEY) {
            console.error('VAPID_PUBLIC_KEY is empty. Cannot subscribe to push notifications.');
            return null;
        }

        // Clean up the key just in case it has surrounding spaces or quotes
        const cleanKey = VAPID_PUBLIC_KEY.trim().replace(/^['"]|['"]$/g, '');
        const applicationServerKey = urlBase64ToUint8Array(cleanKey);

        const newSubscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey
        });

        console.log('User is subscribed:', newSubscription);

        // Send subscription to server
        const response = await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                subscription: newSubscription
            })
        });

        if (!response.ok) {
            console.error('Failed to send subscription to server');
        } else {
            console.log('Subscription sent to server successfully');
        }

        return newSubscription;
    } catch (err) {
        console.error('Failed to subscribe user:', err);
        // Do not throw the error, just return null so it doesn't crash the script
        return null;
    }
}

async function enableNotifications() {
    console.log('--- enableNotifications() triggered ---');

    // 1. Check for Secure Context (HTTPS or localhost)
    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        console.error('Insecure Context detected.');
        alert('ERROR: Web Notifications REQUIRE a secure connection (HTTPS) or "localhost". If you are accessing this via an IP address, the browser will block the notification prompt. Please use HTTPS or localhost.');
        return;
    }

    // 2. Check for Notification API
    if (!('Notification' in window)) {
        console.error('Notification API missing.');
        alert('Your browser does not support the Notification API.');
        return;
    }

    // 3. Check for Service Worker & Push Manager
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.error('Push/SW support missing.');
        alert('Push notifications are not supported by your browser or service workers are disabled.');
        return;
    }

    // 4. Handle existing "Denied" state
    if (Notification.permission === 'denied') {
        console.warn('Permission already denied.');
        alert('Notifications are BLOCKED by your browser for this site. \n\nTo fix this: \n1. Click the lock/settings icon next to the URL. \n2. Find "Notifications" and change it to "Allow". \n3. Refresh the page.');
        return;
    }

    if (Notification.permission === 'granted') {
        console.log('Permission already granted.');
        alert('Notifications are already enabled for this browser.');
        // Ensure subscription is active anyway
        const swRegistration = await registerServiceWorker();
        if (swRegistration) await subscribeUserToPush();
        updateBellStatus();
        return;
    }

    try {
        console.log('Requesting permission now...');
        const permission = await Notification.requestPermission();
        console.log('Response from user:', permission);

        if (permission === 'granted') {
            const swRegistration = await registerServiceWorker();
            if (swRegistration) {
                await subscribeUserToPush();
                alert('Success! Notifications are now enabled.');
            } else {
                alert('Service worker registration failed. Check console for errors.');
            }
        } else if (permission === 'denied') {
            alert('You denied the permission request. You will NOT receive notifications until you change this in your browser settings.');
        } else {
            console.log('Permission prompt was closed/dismissed.');
        }
    } catch (error) {
        console.error('Error during requestPermission:', error);
        alert('A system error occurred: ' + error.message);
    }
    updateBellStatus();
}

function checkFirstLoginPrompt() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('first_login') === '1') {
        setTimeout(enableNotifications, 1000);
    }
}

function updateBellStatus() {
    const bell = document.getElementById('notifBell');
    if (!bell) return;

    // Remove old listeners to prevent duplicates if this is called multiple times
    bell.removeEventListener('click', enableNotifications);
    bell.addEventListener('click', enableNotifications);

    if (Notification.permission === 'default') {
        bell.classList.add('pulse');
        bell.title = "Click to enable notifications";
    } else {
        bell.classList.remove('pulse');
        if (Notification.permission === 'granted') {
            bell.title = "Notifications enabled";
            bell.style.color = "var(--accent)";
            bell.style.background = "hsla(204, 70%, 53%, 0.1)";
        } else {
            bell.title = "Notifications blocked";
            bell.style.color = "var(--text-muted)";
            bell.style.opacity = "0.5";
        }
    }
}

// Automatically try to subscribe if permission is already granted
window.addEventListener('load', async () => {
    updateBellStatus();
    checkFirstLoginPrompt();
    if (Notification.permission === 'granted') {
        console.log('Permission already granted, ensuring subscription...');
        try {
            const swRegistration = await registerServiceWorker();
            if (swRegistration) {
                // If the user is already subscribed, let's verify it still works.
                const sub = await swRegistration.pushManager.getSubscription();
                if (!sub) {
                    console.log('No active subscription found. Subscribing now...');
                    await subscribeUserToPush();
                } else {
                    console.log('Active subscription found:', sub.endpoint);
                }
            }
        } catch (e) {
            console.error('Error during auto-subscription check:', e);
        }
    }
});
