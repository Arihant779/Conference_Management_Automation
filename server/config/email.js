import "dotenv/config";
import nodemailer from "nodemailer";

export const DEFAULT_SENDER = {
  email:        process.env.DEFAULT_SENDER_EMAIL        || "",
  name:         process.env.DEFAULT_SENDER_NAME         || "Conference Hub",
  clientId:     process.env.DEFAULT_GMAIL_CLIENT_ID     || "",
  clientSecret: process.env.DEFAULT_GMAIL_CLIENT_SECRET || "",
  refreshToken: process.env.DEFAULT_GMAIL_REFRESH_TOKEN || "",
};

export function createDefaultTransporter() {
  if (!DEFAULT_SENDER.email || !DEFAULT_SENDER.clientId || !DEFAULT_SENDER.refreshToken) {
    throw new Error(
      "Gmail not configured. Add DEFAULT_SENDER_EMAIL, DEFAULT_GMAIL_CLIENT_ID, " +
      "DEFAULT_GMAIL_CLIENT_SECRET, DEFAULT_GMAIL_REFRESH_TOKEN to your environment variables."
    );
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      type:         "OAuth2",
      user:         DEFAULT_SENDER.email,
      clientId:     DEFAULT_SENDER.clientId,
      clientSecret: DEFAULT_SENDER.clientSecret,
      refreshToken: DEFAULT_SENDER.refreshToken,
    },
  });
}