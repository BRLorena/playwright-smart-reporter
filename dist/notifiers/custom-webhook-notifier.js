"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomWebhookNotifier = void 0;
class CustomWebhookNotifier {
    constructor(url) {
        this.url = url;
    }
    async send(payload, headers) {
        if (!this.url)
            return;
        if (!this.url.startsWith('https://')) {
            console.warn('[smart-reporter] Webhook URL must use HTTPS');
            return;
        }
        try {
            await fetch(this.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...headers,
                },
                body: payload,
            });
            console.log('📤 Custom webhook notification sent');
        }
        catch (err) {
            console.error('Failed to send custom webhook notification:', err);
        }
    }
}
exports.CustomWebhookNotifier = CustomWebhookNotifier;
