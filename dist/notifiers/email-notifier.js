"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailNotifier = void 0;
class EmailNotifier {
    constructor(config) {
        this.config = config;
    }
    async send(message, context) {
        // SendGrid API path
        if (this.config.sendgridApiKey) {
            await this.sendViaSendGrid(message, context);
            return;
        }
        // SMTP via fetch to a relay is not practical without nodemailer.
        // Log a helpful message instead of silently failing.
        console.warn('Email notification: Set sendgridApiKey in notification config, or use a webhook channel for SMTP relay.');
    }
    async sendViaSendGrid(message, context) {
        const { sendgridApiKey, from, to } = this.config;
        if (!sendgridApiKey || !from || !to) {
            console.warn('Email notification: sendgridApiKey, from, and to are required');
            return;
        }
        try {
            const subject = `Test Report: ${context.passed}/${context.total} passed (${context.passRate}%)`;
            const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${sendgridApiKey}`,
                },
                body: JSON.stringify({
                    personalizations: [{ to: [{ email: to }] }],
                    from: { email: from },
                    subject,
                    content: [{ type: 'text/plain', value: message }],
                }),
            });
            if (!response.ok) {
                const errorBody = await response.text();
                console.warn(`Email notification failed: ${response.status} ${errorBody}`);
                return;
            }
            console.log('📤 Email notification sent via SendGrid');
        }
        catch (err) {
            console.error('Failed to send email notification:', err);
        }
    }
}
exports.EmailNotifier = EmailNotifier;
