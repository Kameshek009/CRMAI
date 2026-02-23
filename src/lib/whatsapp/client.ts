import { logger } from "@/lib/logger";

const GRAPH_API_VERSION = "v21.0";
const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  wabaId?: string;
}

interface SendMessageResponse {
  messaging_product: string;
  contacts: { input: string; wa_id: string }[];
  messages: { id: string }[];
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  components: {
    type: string;
    text?: string;
    format?: string;
    example?: { body_text?: string[][] };
  }[];
}

export class WhatsAppClient {
  constructor(private config: WhatsAppConfig) {}

  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      const errorMsg = data?.error?.message || `HTTP ${res.status}`;
      logger.error("WhatsApp", `API error: ${errorMsg}`, data);
      throw new Error(errorMsg);
    }

    return data as T;
  }

  async sendTextMessage(to: string, body: string): Promise<string> {
    const data = await this.request<SendMessageResponse>(
      `${BASE_URL}/${this.config.phoneNumberId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: { preview_url: false, body },
        }),
      }
    );
    return data.messages[0].id;
  }

  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string,
    params: string[]
  ): Promise<string> {
    const components = params.length > 0
      ? [{
          type: "body",
          parameters: params.map((p) => ({ type: "text", text: p })),
        }]
      : [];

    const data = await this.request<SendMessageResponse>(
      `${BASE_URL}/${this.config.phoneNumberId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "template",
          template: {
            name: templateName,
            language: { code: languageCode },
            components,
          },
        }),
      }
    );
    return data.messages[0].id;
  }

  async markAsRead(messageId: string): Promise<void> {
    await this.request(
      `${BASE_URL}/${this.config.phoneNumberId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          messaging_product: "whatsapp",
          status: "read",
          message_id: messageId,
        }),
      }
    );
  }

  async getBusinessProfile(): Promise<{ name: string; about?: string }> {
    const data = await this.request<{
      data: { about?: string; messaging_product: string; address?: string; description?: string; vertical?: string; websites?: string[]; profile_picture_url?: string }[];
    }>(
      `${BASE_URL}/${this.config.phoneNumberId}/whatsapp_business_profile?fields=about,address,description,vertical,websites,profile_picture_url`
    );

    // Also get phone number display name
    const phoneData = await this.request<{ verified_name: string }>(
      `${BASE_URL}/${this.config.phoneNumberId}?fields=verified_name`
    );

    return {
      name: phoneData.verified_name || "WhatsApp Business",
      about: data.data?.[0]?.about,
    };
  }

  async getTemplates(): Promise<WhatsAppTemplate[]> {
    if (!this.config.wabaId) throw new Error("WABA ID is required for templates");
    const data = await this.request<{ data: WhatsAppTemplate[] }>(
      `${BASE_URL}/${this.config.wabaId}/message_templates?limit=100`
    );
    return data.data.filter((t) => t.status === "APPROVED");
  }
}
