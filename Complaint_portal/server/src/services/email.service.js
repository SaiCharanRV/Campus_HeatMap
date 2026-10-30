import { sendMail } from '../config/mailer.js';
import { env } from '../config/env.js';
import { CATEGORY_LABELS, STATUS_LABELS } from '../utils/constants.js';

const escape = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function layout(title, bodyHtml, cta) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
    <div style="background:#7b1113;color:#fff;padding:16px 20px;font-size:18px;font-weight:bold">IIT Roorkee Complaint Portal</div>
    <div style="padding:20px;color:#111827;font-size:14px;line-height:1.6">
      <h2 style="margin:0 0 12px;font-size:17px">${escape(title)}</h2>
      ${bodyHtml}
      ${cta ? `<p style="margin-top:20px"><a href="${cta.href}" style="background:#7b1113;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">${escape(cta.label)}</a></p>` : ''}
    </div>
  </div>`;
}

const row = (label, value) =>
  value ? `<tr><td style="padding:4px 12px 4px 0;color:#6b7280">${label}</td><td>${escape(value)}</td></tr>` : '';

function complaintTable(c, locationName) {
  return `<table style="font-size:14px">
    ${row('Ticket', c.ticketId)}
    ${row('Category', CATEGORY_LABELS[c.category])}
    ${row('Location', locationName)}
    ${row('Exact spot', c.exactSpot)}
    ${row('Priority', c.priority)}
    ${row('Title', c.title)}
  </table>`;
}

export function sendOtpEmail(email, code, purpose) {
  const action = purpose === 'reset' ? 'reset your password' : 'verify your email';
  return sendMail({
    to: email,
    subject: `Your OTP: ${code}`,
    text: `Your OTP to ${action} is ${code}. It expires in 10 minutes.`,
    html: layout(
      'Your one-time password',
      `<p>Use this code to ${action}:</p>
       <p style="font-size:28px;letter-spacing:6px;font-weight:bold">${code}</p>
       <p style="color:#6b7280">It expires in 10 minutes. If you did not request it, ignore this email.</p>`
    ),
  });
}

export function sendNewComplaintEmail(to, complaint, locationName) {
  const href = `${env.clientUrl}/staff/complaints/${complaint._id}`;
  return sendMail({
    to,
    subject: `[${complaint.ticketId}] New ${CATEGORY_LABELS[complaint.category]} complaint at ${locationName}`,
    text: `New complaint ${complaint.ticketId}: ${complaint.title} at ${locationName}. ${href}`,
    html: layout(
      'A new complaint needs your attention',
      `${complaintTable(complaint, locationName)}
       <p>${escape(complaint.description)}</p>
       ${complaint.images?.[0] ? `<p><img src="${complaint.images[0]}" alt="photo" style="max-width:100%;border-radius:6px"/></p>` : ''}`,
      { href, label: 'Open in staff dashboard' }
    ),
  });
}

export function sendStatusEmail(to, complaint, status, note, forStaff = false) {
  const href = `${env.clientUrl}/${forStaff ? 'staff/' : ''}complaints/${complaint._id}`;
  return sendMail({
    to,
    subject: `[${complaint.ticketId}] ${STATUS_LABELS[status]}`,
    text: `${complaint.ticketId} is now "${STATUS_LABELS[status]}". ${note || ''} ${href}`,
    html: layout(
      `Your complaint is now: ${STATUS_LABELS[status]}`,
      `<p><b>${escape(complaint.title)}</b> (${complaint.ticketId})</p>
       ${note ? `<p style="background:#f3f4f6;padding:10px;border-radius:6px">${escape(note)}</p>` : ''}`,
      { href, label: 'View progress' }
    ),
  });
}

export function sendRecurringEmail(to, issue, locationName) {
  const href = `${env.clientUrl}/staff`;
  const what = `${issue.count} ${CATEGORY_LABELS[issue.category]} complaints at ${locationName}`;
  return sendMail({
    to,
    subject: `[Recurring problem] ${what}`,
    text: `${what} since ${new Date(issue.firstSeenAt).toDateString()}. This may need a permanent fix. ${href}`,
    html: layout(
      'The same problem keeps coming back',
      `<p><b>${escape(what)}</b> since ${new Date(issue.firstSeenAt).toDateString()}.</p>
       <p>Individual fixes don't seem to last. Please check for a root cause (old pipes, a faulty access point, drainage…).</p>`,
      { href, label: 'Open dashboard' }
    ),
  });
}

export function sendEscalationEmail(to, complaint, locationName, reason) {
  const href = `${env.clientUrl}/staff/complaints/${complaint._id}`;
  return sendMail({
    to,
    subject: `[ESCALATED] ${complaint.ticketId} has missed its deadline`,
    text: `${complaint.ticketId} at ${locationName} is overdue: ${reason}. ${href}`,
    html: layout(
      'Complaint escalated: deadline missed',
      `<p style="color:#b91c1c">${escape(reason)}</p>${complaintTable(complaint, locationName)}`,
      { href, label: 'Take action' }
    ),
  });
}
