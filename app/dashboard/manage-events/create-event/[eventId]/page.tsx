import Link from "next/link";
import { ChevronLeft, CircleCheck, MapPin, NotebookPen, Ticket, Upload } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import DashboardShell from "../../../../components/DashboardShell";
import AutoSaveForm from "../../../../components/AutoSaveForm";
import CoverUpload from "../../../../components/CoverUpload";
import QuestionsEditor, { type QuestionDraft } from "../../../../components/QuestionsEditor";
import RichDescriptionEditor from "../../../../components/RichDescriptionEditor";
import ManualPaymentSettings from "../../../../components/ManualPaymentSettings";
import TicketManager, { type TicketDraft } from "../../../../components/TicketManager";
import EventRegistrationQr from "../../../../components/EventRegistrationQr";
import EventModerationPanel from "../../../../components/EventModerationPanel";
import LocationSelector from "../../../../components/LocationSelector";
import { publishEventAction, saveWizardAction } from "../../../../actions";
import { currentUser } from "../../../../lib/auth";
import { getOrganizerEventApprovalTimeline, getOrganizerParticipation, getWizard } from "../../../../lib/db";
import { eventRegistrationPath } from "../../../../lib/event-qr";
import { canEditEventForModeration, effectiveModerationStatus, moderationLabel } from "../../../../lib/moderation";

const steps = [
  ["Basics", "Name, dates & visibility"],
  ["Location", "Venue & address"],
  ["Description", "Tell participants about your event"],
  ["Cover Image", "Upload your event photo"],
  ["Tickets and Pricing", "Categories, pricing & limits"],
  ["Custom Questions", "Collect participant details"],
];

type WizardData = NonNullable<Awaited<ReturnType<typeof getWizard>>>;

export default async function CreateEvent({ params, searchParams }: { params: Promise<{ eventId: string }>; searchParams: Promise<{ step?: string; error?: string; saved?: string; venueSource?: string; calendarVenueId?: string; questionDrafts?: string; questionOrder?: string; removeQuestion?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login?returnTo=%2Fdashboard%2Fmanage-events%2Fcreate-event%2Fnew");
  const { eventId } = await params;
  const query = await searchParams;
  const data = await getWizard(Number(eventId), user.id);
  if (!data) notFound();
  const maximumStep = Math.min(6, Math.max(1, data.event.currentStep));
  const step = Math.min(maximumStep, Math.max(1, Number(query.step) || maximumStep));
  const { event, categories, tickets, questions, venues, venuePresets, venueApprovalRequests, venueConflicts } = data;
  const requestHeaders = await headers(); const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host"); const protocol = requestHeaders.get("x-forwarded-proto") || "https"; const registrationUrl = host ? `${protocol}://${host}${eventRegistrationPath(event.slug)}` : eventRegistrationPath(event.slug); const editable = canEditEventForModeration(event.moderationStatus); const qrAvailable = effectiveModerationStatus({ status: event.status, moderationStatus: event.moderationStatus }) === "approved"; const [organizerParticipation, approvalTimeline] = await Promise.all([getOrganizerParticipation(event.id, user.id), getOrganizerEventApprovalTimeline(event.id, user.id)]);

  return <DashboardShell active="My Events">
    <div className="dash-page-head"><div><Link href="/dashboard/manage-events/events" className="link-arrow"><ChevronLeft size={15} /> My Events</Link><h1 className="page-title" style={{ marginTop: 12 }}>Create Your Event</h1><p>Save each section, then submit your completed event for administrator approval before it can go live.</p>{event.title !== "Untitled event" ? <div className={`draft-saved-chip ${event.moderationStatus === "rejected" ? "pending" : ""}`}><CircleCheck size={14} /> {moderationLabel(event.moderationStatus)} · Step {event.currentStep} of 6</div> : <div className="draft-saved-chip pending">New draft · Start with the basics below</div>}</div></div>
    <div className="wizard-layout">
      <aside className="wizard-side"><h3>Event Details</h3><p>Complete all six steps, then submit your event for administrator approval.</p><div className="wizard-steps">{steps.map(([title, detail], index) => <Link key={title} href={index + 1 <= Math.max(event.currentStep, step) ? `?step=${index + 1}` : "#"} className={`wizard-step ${step === index + 1 ? "active" : ""}`}>{index + 1}. {title}<span>{detail}</span></Link>)}</div></aside>
      <section className="wizard-card">
        {query.error ? <div className="error-note">{query.error}</div> : null}<EventModerationPanel status={event.moderationStatus} note={event.moderationNote} submittedAt={event.submittedAt} reviewedAt={event.reviewedAt} timeline={approvalTimeline} />{organizerParticipation ? <section className="organizer-participation-card" aria-label="Organizer participation details"><span className="eyebrow">Organizer is participant #1</span><h3>Your participation is ready</h3><p>When this event was approved, you were automatically added as its first confirmed participant at no charge.</p><div><span><b>Your user ID</b>{event.organizerPublicId}</span><span><b>Event ID</b>{event.publicId}</span><span><b>Booking reference</b>{organizerParticipation.registration.orderNumber}</span><span><b>Ticket</b>{organizerParticipation.ticket?.name || "Organizer participation"}</span></div></section> : null}
        {query.saved ? <div className="success-note"><CircleCheck size={14} /> Saved successfully. Continue to the next step when ready.</div> : null}
        {editable ? <AutoSaveForm eventId={event.id} step={step} action={saveWizardAction}>
          <input type="hidden" name="eventId" value={event.id} /><input type="hidden" name="step" value={step} />
          {step === 1 && event.title === "Untitled event" ? <div className="new-draft-intro"><div><span>New event setup</span><h3>Start with the essentials</h3><p>Add your event name and dates below. Your draft saves automatically while you work, and the remaining steps unlock as you complete this page.</p></div><ol><li><b>1.</b> Basic details</li><li><b>2.</b> Venue and description</li><li><b>3.</b> Cover, tickets and questions</li></ol></div> : null}
          {step === 1 ? <Basics event={event} categories={categories} /> : null}
          {step === 2 ? <LocationSelector event={event} venues={venues} presets={venuePresets} requests={venueApprovalRequests} venueConflicts={venueConflicts} initialSource={query.venueSource === "directory" ? "directory" : query.venueSource === "manual" ? "manual" : undefined} initialCalendarVenueId={Number(query.calendarVenueId) || undefined} /> : null}
          {step === 3 ? <Description event={event} /> : null}
          {step === 4 ? <Cover event={event} registrationUrl={registrationUrl} qrAvailable={qrAvailable} /> : null}
          {step === 5 ? <Tickets tickets={tickets} event={event} /> : null}
          {step === 6 ? <Questions questions={questions} questionDrafts={query.questionDrafts} questionOrder={query.questionOrder} removeQuestion={query.removeQuestion} /> : null}
          <div className="wizard-bottom"><Link href="/dashboard/manage-events/events" className="btn btn-outline">Exit</Link><span className="step-count">Event Details — step <b>{step}</b>/6</span><button className="btn btn-coral" type="submit">{step === 6 ? "Save Questions" : "Save and Next"}</button></div>
        </AutoSaveForm> : null}
        {step === 6 && editable ? <form action={publishEventAction} style={{ marginTop: 14, textAlign: "right" }}><input type="hidden" name="eventId" value={event.id} /><button className="btn btn-lime" type="submit">Submit for administrator approval</button></form> : null}
      </section>
    </div>
  </DashboardShell>;
}

function Basics({ event, categories }: { event: WizardData["event"]; categories: WizardData["categories"] }) {
  const startsAt = event.startsAt ? new Date(event.startsAt) : null;
  const endsAt = event.endsAt ? new Date(event.endsAt) : null;
  return <><h2>Basic details</h2><p>Add name, visibility, timing, and timezone for your event.</p><div className="card-section"><h3>Event basics</h3><p>These details appear across listings and your event page.</p><div className="two-col"><label className="form-label">Event Name *<input className="input" name="title" defaultValue={event.title === "Untitled event" ? "" : event.title} placeholder="Noida 10 km Running" required /></label><label className="form-label">Event Display Name *<input className="input" name="displayName" maxLength={50} defaultValue={event.displayName === "Untitled event" ? "" : event.displayName} placeholder="Noida 10 km Running" required /></label></div><label className="form-label" style={{ marginTop: 16 }}>Event Visibility *<span className="choice-row">{["public", "private", "external"].map(visibility => <label className="choice" key={visibility}><input type="radio" name="visibility" value={visibility} defaultChecked={event.visibility === visibility} /><span>{visibility[0].toUpperCase() + visibility.slice(1)}</span></label>)}</span></label></div><div className="card-section"><h3>Category</h3><p>Choose the category that best fits your event.</p><label className="form-label">Event category<select className="select" name="categoryId" defaultValue={event.categoryId || ""}><option value="">Choose a category</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label></div><div className="card-section"><h3>Timing</h3><p>Choose when your event starts and ends.</p><div className="two-col"><TimingGroup label="Event Starts from" dateName="startsDate" timeName="startsTime" value={startsAt} /><TimingGroup label="Event Ends at" dateName="endsDate" timeName="endsTime" value={endsAt} /></div><label className="form-label" style={{ marginTop: 16 }}>Event TimeZone *<select className="select" name="timezone" defaultValue={event.timezone}><option value="Asia/Calcutta">Asia/Calcutta (GMT+05:30)</option><option value="Asia/Kolkata">Asia/Kolkata (GMT+05:30)</option><option value="UTC">UTC (GMT+00:00)</option></select></label></div></>;
}

function TimingGroup({ label, dateName, timeName, value }: { label: string; dateName: string; timeName: string; value: Date | null }) { return <div className="timing-group"><b>{label}</b><div className="two-col"><label className="form-label">Date *<input className="input" name={dateName} type="date" defaultValue={value ? value.toISOString().slice(0, 10) : ""} required /></label><label className="form-label">Time *<input className="input" name={timeName} type="time" defaultValue={value ? value.toISOString().slice(11, 16) : ""} required /></label></div></div>; }

function Location({ event }: { event: WizardData["event"] }) { return <><h2>Add Venue Address</h2><p>Choose a location mode and add city. Optionally add full venue address.</p><div className="card-section"><h3><MapPin size={17} /> Location</h3><div className="choice-row location-mode"><label className="choice"><input type="radio" name="locationMode" value="address" defaultChecked={event.locationMode !== "undecided"} /><span>Add Venue Address</span></label><label className="choice"><input type="radio" name="locationMode" value="undecided" defaultChecked={event.locationMode === "undecided"} /><span>Venue not decided</span></label></div><label className="form-label" style={{ marginTop: 16 }}>BIB / expo collection date <small>(optional)</small><input className="input" name="bibExpoDate" type="date" defaultValue={event.bibExpoDate ? new Date(event.bibExpoDate).toISOString().slice(0, 10) : ""} /></label><p className="field-note">Shown on participants’ race-day prep checklist when set.</p><div className="two-col"><label className="form-label">City *<input className="input" name="city" defaultValue={event.city || ""} placeholder="e.g. Mumbai" required /></label><label className="form-label">Venue name<input className="input" name="venueName" defaultValue={event.venueName || ""} placeholder="Central Park" /></label></div><div className="two-col" style={{ marginTop: 14 }}><label className="form-label">Address line 1<input className="input" name="addressLine1" defaultValue={event.addressLine1 || ""} placeholder="123 Main Street" /></label><label className="form-label">Address line 2<input className="input" name="addressLine2" defaultValue={event.addressLine2 || ""} placeholder="Near Metro Station" /></label></div></div></>; }

function Description({ event }: { event: WizardData["event"] }) { return <><h2>Description</h2><p>Write a compelling description, add agenda highlights, and event guidelines.</p><div className="card-section"><h3><NotebookPen size={17} /> Event description</h3><p>This will appear on your event page. Include key highlights, schedule, and important information for attendees.</p><RichDescriptionEditor initialValue={event.description} /></div></>; }
function Cover({ event, registrationUrl, qrAvailable }: { event: WizardData["event"]; registrationUrl: string; qrAvailable: boolean }) { return <><h2>Event Banner</h2><p>Upload the banner used on your event page and discovery listings. Recommended: 1920 × 1080 px (16:9).</p><div className="card-section"><h3><Upload size={17} /> Event Banner and registration QR</h3><p>Choose a banner and save this step to attach it securely to the event. The registration QR is generated only after administrator approval, when participant registration becomes available.</p><CoverUpload initialUrl={event.coverUrl} />{qrAvailable ? <EventRegistrationQr eventName={event.displayName} registrationPath={eventRegistrationPath(event.slug)} registrationUrl={registrationUrl} /> : <div className="notice"><b>Registration QR pending approval.</b> Submit the completed event for administrator approval. The QR, sharing tools, and downloads will appear automatically after approval.</div>}</div></>; }

function Tickets({ tickets, event }: { tickets: WizardData["tickets"]; event: WizardData["event"] }) {
  const initial: TicketDraft[] = tickets.map(ticket => ({ id: ticket.id, name: ticket.name, description: ticket.description || "", ticketCategory: ticket.ticketCategory, price: ticket.pricePaise / 100, gstApplicable: ticket.gstApplicable, gstRatePercent: ticket.gstRatePercent, quantityLimit: ticket.quantityLimit, quantitySold: ticket.quantitySold, minPerBooking: ticket.minPerBooking, maxPerBooking: ticket.maxPerBooking, platformFeePayer: ticket.platformFeePayer, fitizenFeePayer: ticket.fitizenFeePayer, gatewayFeePayer: ticket.gatewayFeePayer, salesStartDate: ticket.salesStartAt ? new Date(ticket.salesStartAt).toISOString().slice(0, 10) : "", salesStartTime: ticket.salesStartAt ? new Date(ticket.salesStartAt).toISOString().slice(11, 16) : "", salesEndDate: ticket.salesEndAt ? new Date(ticket.salesEndAt).toISOString().slice(0, 10) : "", salesEndTime: ticket.salesEndAt ? new Date(ticket.salesEndAt).toISOString().slice(11, 16) : "", attendeeMessage: ticket.attendeeMessage || "" }));
  const startsAt = event.startsAt ? new Date(event.startsAt) : new Date(Date.now() + 24 * 60 * 60 * 1000);
  const saleEndAt = new Date(startsAt.getTime() - 60 * 1000);
  const saleStartAt = new Date(Math.min(saleEndAt.getTime() - 60 * 60 * 1000, Date.now()));
  const saleEnd = saleEndAt.toISOString();
  const saleStart = saleStartAt.toISOString();
  const dateDefaults = { salesStartDate: saleStart.slice(0, 10), salesStartTime: saleStart.slice(11, 16), salesEndDate: saleEnd.slice(0, 10), salesEndTime: saleEnd.slice(11, 16) };
  return <><h2>Tickets and Pricing</h2><p>Create ticket types, GST pricing, capacity, sale windows, and attendee payment instructions.</p><div className="card-section"><TicketManager initial={initial} dateDefaults={dateDefaults} /></div><div className="card-section"><ManualPaymentSettings initial={{ enabled: event.manualPaymentEnabled, method: event.manualPaymentMethod || "upi", upiId: event.upiId, bankAccountName: event.bankAccountName, bankAccountNumber: event.bankAccountNumber, bankIfsc: event.bankIfsc, bankName: event.bankName, manualPaymentNote: event.manualPaymentNote, fillingFastThresholdPercent: event.fillingFastThresholdPercent }} /></div></>;
}
function Questions({ questions, questionDrafts, questionOrder, removeQuestion }: { questions: WizardData["questions"]; questionDrafts?: string; questionOrder?: string; removeQuestion?: string }) {
  const blankCount = Math.max(0, Math.min(20, Number(questionDrafts) || 0));
  const base: QuestionDraft[] = [...questions.map(question => ({ question: question.question, fieldType: question.fieldType, required: question.required })), ...Array.from({ length: blankCount }, () => ({ question: "", fieldType: "short_text" as const, required: false }))];
  const requestedOrder = (questionOrder || "").split(",").map(Number).filter(index => Number.isInteger(index) && index >= 0 && index < base.length);
  const ordered = requestedOrder.length === base.length && new Set(requestedOrder).size === base.length ? requestedOrder.map(index => base[index]) : base;
  const removed = Number(removeQuestion); const visible = Number.isInteger(removed) && removed >= 0 && removed < ordered.length ? ordered.filter((_, index) => index !== removed) : ordered;
  return <><h2>Custom Questions</h2><p>Customize what participants fill out when registering. Add, remove, or reorder fields to collect exactly what you need.</p><QuestionsEditor questions={visible} questionDrafts={blankCount} /></>;
}
