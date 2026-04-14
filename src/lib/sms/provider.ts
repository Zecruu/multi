import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { truncateSms } from "./phone";

export type SendResult = {
  provider: "aws" | "preview";
  messageId?: string;
  preview?: true;
  message: string;
};

function awsConfigured() {
  return (
    !!process.env.AWS_SNS_REGION &&
    !!process.env.AWS_SNS_ACCESS_KEY_ID &&
    !!process.env.AWS_SNS_SECRET_ACCESS_KEY &&
    !!process.env.AWS_SNS_PHONE_TWO_WAY
  );
}

let _client: SNSClient | null = null;
function client() {
  if (_client) return _client;
  _client = new SNSClient({
    region: process.env.AWS_SNS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_SNS_REGION
        ? process.env.AWS_SNS_ACCESS_KEY_ID!
        : "",
      secretAccessKey: process.env.AWS_SNS_SECRET_ACCESS_KEY!,
    },
  });
  return _client;
}

/**
 * Send an SMS. When AWS env vars are missing (or SMS_PROVIDER=preview),
 * returns a preview result without hitting SNS — the caller stores the
 * message in the conversation record so the dashboard can display it.
 */
export async function sendSms(
  toE164: string,
  rawMessage: string
): Promise<SendResult> {
  const message = truncateSms(rawMessage, 160);
  const providerPref = process.env.SMS_PROVIDER || "auto";
  const useAws = providerPref === "aws" || (providerPref === "auto" && awsConfigured());

  if (!useAws) {
    return { provider: "preview", preview: true, message };
  }

  const senderId = process.env.AWS_SNS_SENDER_ID || "MultiElectric";
  const originationNumber = process.env.AWS_SNS_PHONE_TWO_WAY!;

  const res = await client().send(
    new PublishCommand({
      PhoneNumber: toE164,
      Message: message,
      MessageAttributes: {
        "AWS.SNS.SMS.SenderID": {
          DataType: "String",
          StringValue: senderId,
        },
        "AWS.SNS.SMS.SMSType": {
          DataType: "String",
          StringValue: "Transactional",
        },
        "AWS.MM.SMS.OriginationNumber": {
          DataType: "String",
          StringValue: originationNumber,
        },
      },
    })
  );

  return { provider: "aws", messageId: res.MessageId, message };
}
