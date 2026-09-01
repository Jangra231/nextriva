import nodemailer from "nodemailer";

type MailMessage = { to: string; subject: string; text: string; html: string };

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character);

function configuredTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (host && user && pass) {
    return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  }
  return nodemailer.createTransport({ jsonTransport: true });
}

async function deliver(message: MailMessage) {
  const info = await configuredTransport().sendMail({
    from: process.env.SMTP_FROM || "Nexriva Preview <preview@nexriva.local>",
    ...message,
  });
  if (!process.env.SMTP_HOST) {
    console.info("[MailPreview] SMTP is not configured. Email rendered safely as JSON with message ID:", info.messageId);
  }
  return info;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const formatDate = (value: Date | string | null) => {
  if (!value) return "To be confirmed";
  const d = new Date(value);
  const hours = d.getUTCHours();
  const minutes = d.getUTCMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  const timeStr = `${String(displayHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${ampm}`;
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${timeStr}`;
};

export async function sendOrganizerPublicationConfirmation(input: { organizerEmail?: string | null; organizerName?: string | null; eventName: string; startsAt: Date | string | null; eventUrl: string }) {
  if (!input.organizerEmail) return;
  const starts = formatDate(input.startsAt);
  const organizerName = escapeHtml(input.organizerName || "Organizer"); const eventName = escapeHtml(input.eventName);
  await deliver({
    to: input.organizerEmail,
    subject: `Your Nexriva event is live: ${input.eventName}`,
    text: `Hi ${input.organizerName || "Organizer"}, your event ${input.eventName} is now live. It starts ${starts}. View it at ${input.eventUrl}.`,
    html: `<p>Hi ${organizerName},</p><p>Your event <strong>${eventName}</strong> is now live on Nexriva.</p><p><strong>Starts:</strong> ${escapeHtml(starts)}</p><p><a href="${escapeHtml(input.eventUrl)}">View your public event page</a></p>`,
  });
}

export async function sendOrganizerParticipationConfirmation(input: { organizerEmail?: string | null; organizerName?: string | null; eventName: string; startsAt: Date | string | null; eventUrl: string; userPublicId: string; eventPublicId: string; orderNumber: string; ticketName?: string | null }) {
  if (!input.organizerEmail) return;
  const starts = formatDate(input.startsAt);
  const organizerName = escapeHtml(input.organizerName || "Organizer"); const eventName = escapeHtml(input.eventName); const ticketName = escapeHtml(input.ticketName || "Organizer participation");
  await deliver({
    to: input.organizerEmail,
    subject: `Approved: you are participant #1 for ${input.eventName}`,
    text: `Hi ${input.organizerName || "Organizer"}, your event ${input.eventName} has been approved. You were automatically added as its first confirmed participant at no charge. Your user ID: ${input.userPublicId}. Event ID: ${input.eventPublicId}. Booking reference: ${input.orderNumber}. Ticket: ${input.ticketName || "Organizer participation"}. Starts: ${starts}. ${input.eventUrl}`,
    html: `<p>Hi ${organizerName},</p><p>Your event <strong>${eventName}</strong> has been approved and is now live. You were automatically added as its first confirmed participant at no charge.</p><p><strong>Your user ID:</strong> ${escapeHtml(input.userPublicId)}<br/><strong>Event ID:</strong> ${escapeHtml(input.eventPublicId)}<br/><strong>Booking reference:</strong> ${escapeHtml(input.orderNumber)}<br/><strong>Ticket:</strong> ${ticketName}<br/><strong>Starts:</strong> ${escapeHtml(starts)}</p><p><a href="${escapeHtml(input.eventUrl)}">View your event</a></p>`,
  });
}

export async function sendRegistrationConfirmation(input: { attendeeEmail?: string | null; attendeeName?: string | null; eventName: string; ticketName?: string | null; startsAt: Date | string | null; orderNumber: string; eventUrl: string }) {
  if (!input.attendeeEmail) return;
  const starts = formatDate(input.startsAt);
  const attendeeName = escapeHtml(input.attendeeName || "there"); const eventName = escapeHtml(input.eventName); const ticketName = escapeHtml(input.ticketName || "Registration");
  await deliver({
    to: input.attendeeEmail,
    subject: `You are registered for ${input.eventName}`,
    text: `Hi ${input.attendeeName || "there"}, your Nexriva registration is confirmed. ${input.eventName} starts ${starts}. Ticket: ${input.ticketName || "Registration"}. Order: ${input.orderNumber}. ${input.eventUrl}`,
    html: `<p>Hi ${attendeeName},</p><p>Your registration for <strong>${eventName}</strong> is confirmed.</p><p><strong>Ticket:</strong> ${ticketName}<br/><strong>When:</strong> ${escapeHtml(starts)}<br/><strong>Order:</strong> ${escapeHtml(input.orderNumber)}</p><p><a href="${escapeHtml(input.eventUrl)}">View event details</a></p>`,
  });
}

export async function sendEmail(message: { to: string; subject: string; text: string; html: string }): Promise<boolean> {
  try {
    await deliver(message);
    return true;
  } catch (error) {
    console.error("[Email Error]", error);
    return false;
  }
}

export async function sendAttendeeReminder(input: { attendeeEmail?: string | null; attendeeName?: string | null; eventName: string; venue?: string | null; city?: string | null; startsAt: Date | string | null; eventUrl: string }) {
  if (!input.attendeeEmail) return;
  const starts = formatDate(input.startsAt);
  const venue = [input.venue, input.city].filter(Boolean).join(", ") || "Location to be confirmed";
  const attendeeName = escapeHtml(input.attendeeName || "there"); const eventName = escapeHtml(input.eventName);
  await deliver({
    to: input.attendeeEmail,
    subject: `Reminder: ${input.eventName} is tomorrow`,
    text: `Hi ${input.attendeeName || "there"}, ${input.eventName} starts ${starts}. Venue: ${venue}. ${input.eventUrl}`,
    html: `<p>Hi ${attendeeName},</p><p>This is a reminder that <strong>${eventName}</strong> is tomorrow.</p><p><strong>When:</strong> ${escapeHtml(starts)}<br/><strong>Where:</strong> ${escapeHtml(venue)}</p><p><a href="${escapeHtml(input.eventUrl)}">View event details</a></p>`,
  });
}
