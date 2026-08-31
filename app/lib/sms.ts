/** SMS delivery via Twilio REST API with console.log fallback for development */

interface SmsCredentials {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

function getTwilioCredentials(): SmsCredentials | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (accountSid && authToken && fromNumber) {
    return { accountSid, authToken, fromNumber };
  }
  return null;
}

export async function sendSms(to: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const credentials = getTwilioCredentials();

  // Format phone number to E.164 format (assuming Indian numbers if not already formatted)
  const formattedTo = formatPhoneNumber(to);

  if (!credentials) {
    // Development fallback: log to console
    console.log(`[SMS Preview] To: ${formattedTo}\nMessage: ${body}`);
    return { success: true, messageId: `dev-${Date.now()}` };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/Messages.json`;
    const auth = Buffer.from(`${credentials.accountSid}:${credentials.authToken}`).toString("base64");

    const formData = new URLSearchParams();
    formData.append("To", formattedTo);
    formData.append("From", credentials.fromNumber);
    formData.append("Body", body);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[SMS Error]", data);
      return { success: false, error: data.message || "Failed to send SMS" };
    }

    return { success: true, messageId: data.sid };
  } catch (error) {
    console.error("[SMS Exception]", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, "");

  // If already in E.164 format, return as is
  if (phone.startsWith("+")) return phone;

  // If starts with 91 (India country code), add +
  if (digits.startsWith("91") && digits.length === 12) {
    return `+${digits}`;
  }

  // If 10-digit Indian number, add +91
  if (digits.length === 10) {
    return `+91${digits}`;
  }

  // Fallback: add + if not present
  return phone.startsWith("+") ? phone : `+${digits}`;
}

export function buildOtpMessage(code: string, purpose: "signup" | "login" | "password_reset"): string {
  const purposes: Record<string, string> = {
    signup: "verify your phone number and complete signup",
    login: "log in to your account",
    password_reset: "reset your password",
  };

  return `Your Nexriva OTP is ${code}. Use this code to ${purposes[purpose]}. Valid for 15 minutes. Do not share this code.`;
}