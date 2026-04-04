import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationService {
  constructor() {}

  /**
   * Sends a notification to a user via multiple channels.
   * @param phone User's phone number
   * @param message Message content
   * @param channels Array of channels: 'PUSH' | 'SMS' | 'WHATSAPP'
   */
  async sendNotification(
    phone: string,
    message: string,
    channels: string[] = ['PUSH'],
  ) {
    console.log(
      `[NotificationService] Sending to ${phone}: "${message}" via [${channels.join(', ')}]`,
    );

    if (channels.includes('SMS')) {
      await this.sendSMS(phone, message);
    }

    if (channels.includes('WHATSAPP')) {
      await this.sendWhatsApp(phone, message);
    }

    return { success: true, sentAt: new Date() };
  }

  private async sendSMS(phone: string, message: string) {
    // Integration with SMS Gateway (e.g., Twilio, Plivo, or local provider)
    console.log(`[SMS] Mock SMS sent to ${phone}`);
  }

  private async sendWhatsApp(phone: string, message: string) {
    // Integration with WhatsApp Business API
    console.log(`[WhatsApp] Mock WhatsApp sent to ${phone}`);
  }
}
