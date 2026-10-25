import { getEnv } from '../config/env.js';
import { EmailAdapter } from '../types/email.types.js';
import { consoleEmailAdapter } from '../adapters/email/console-email.adapter.js';
import { GmailSmtpAdapter } from '../adapters/email/gmail-smtp.adapter.js';

export class EmailFactory {
  private static cachedGmailAdapter: GmailSmtpAdapter | null = null;

  static getAdapter(providerOverride?: string): EmailAdapter {
    const env = getEnv();
    const provider = providerOverride || env.EMAIL_PROVIDER || 'console';

    switch (provider.toLowerCase()) {
      case 'gmail': {
        if (!this.cachedGmailAdapter) {
          this.cachedGmailAdapter = new GmailSmtpAdapter({
            user: env.GMAIL_USER,
            appPassword: env.GMAIL_APP_PASSWORD,
          });
        }
        return this.cachedGmailAdapter;
      }
      case 'console':
      default:
        return consoleEmailAdapter;
    }
  }

  static clearCache(): void {
    this.cachedGmailAdapter = null;
  }
}
