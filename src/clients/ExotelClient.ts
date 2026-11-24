import axios, {
  AxiosInstance,
  AxiosResponse,
} from "axios";

const API_TIMEOUT = 30_000;

export interface ExotelConfig {
  accountSid: string;
  apiKey: string;
  apiToken: string;
  /** Defaults to 'api.exotel.com' */
  subdomain?: string;
}

export interface CallOptions {
  /** Exotel Voice App (flow) ID */
  voiceAppId: string;
  /** StatusCallback URL */
  webhookUrl?: string;
  recordCall?: boolean;
  callType?: "trans" | "promo";
  maxRetries?: number;
}

interface CallResponse {
  Call?: { Sid?: string; Status?: string };
  RestException?: { Code?: string; Message?: string };
}

export class ExotelError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ExotelError";
  }
}

export class ExotelClient {
  private readonly client: AxiosInstance;
  private readonly config: ExotelConfig;

  constructor(config: ExotelConfig) {
    this.config = config;

    const subdomain = config.subdomain ?? "api.exotel.com";
    const baseURL = `https://${subdomain}/v1/Accounts/${config.accountSid}/Calls/connect`;
    const basicAuth = Buffer.from(
      `${config.apiKey}:${config.apiToken}`,
    ).toString("base64");

    this.client = axios.create({
      baseURL,
      timeout: API_TIMEOUT,
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${basicAuth}`,
      },
      validateStatus: () => true,
    });
  }

  /**
   * Initiates an outbound call.
   *
   * @param to       - The number to dial (customer / destination)
   * @param callerId - Your Exotel virtual number (caller ID shown to `to`)
   * @param options  - Call configuration (voice app, webhook, retries, etc.)
   * @returns        - Exotel Call SID on success
   */
  async call(
    to: string,
    callerId: string,
    options: CallOptions,
  ): Promise<string> {
    const maxRetries = options.maxRetries ?? 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const formData = this.buildFormData(to, callerId, options);
        const response: AxiosResponse<CallResponse> = await this.client.post(
          "",
          formData,
        );
        return this.extractCallSid(response);
      } catch (error) {
        lastError = error;

        if (error instanceof ExotelError && !this.isRetryable(error)) {
          throw error;
        }

        if (attempt === maxRetries) {
          throw new ExotelError(
            `Call failed after ${maxRetries} attempts: ${(error as Error).message}`,
            "MAX_RETRIES_EXCEEDED",
          );
        }

        await this.backoff(attempt);
      }
    }

    throw new ExotelError(
      `Unexpected error: ${(lastError as Error)?.message ?? "unknown"}`,
    );
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private buildFormData(
    to: string,
    callerId: string,
    options: CallOptions,
  ): FormData {
    const voiceUrl = `https://my.exotel.com/exoml/start/${options.voiceAppId}`;

    const form = new FormData();
    form.append("From", to);
    form.append("CallerId", callerId);
    form.append("Url", voiceUrl);
    form.append("Record", String(options.recordCall !== false));
    form.append("CallType", options.callType ?? "trans");

    if (options.webhookUrl) {
      form.append("StatusCallback", options.webhookUrl);
    }

    return form;
  }

  private extractCallSid(response: AxiosResponse<CallResponse>): string {
    if (response.status >= 400) {
      const msg =
        response.data?.RestException?.Message ?? `HTTP ${response.status}`;
      const code = response.data?.RestException?.Code;
      throw new ExotelError(msg, code, response.status);
    }

    const sid = response.data?.Call?.Sid;
    if (!sid) {
      throw new ExotelError("API response missing Call SID", "MISSING_SID");
    }

    return sid;
  }

  private isRetryable(error: ExotelError): boolean {
    // Don't retry 4xx errors except rate limiting (429)
    if (error.status && error.status >= 400 && error.status < 500) {
      return error.status === 429;
    }
    return true;
  }

  private backoff(attempt: number, base = 1000): Promise<void> {
    const delay = Math.min(base * 2 ** (attempt - 1), 30_000);
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
}
