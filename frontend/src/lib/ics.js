import { INTERVIEW_TYPES, labelOf } from './constants.js';

const pad = (n) => String(n).padStart(2, '0');
const stamp = (d) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Downloads a single interview as an .ics file (works with Google, Apple and Outlook calendars). */
export function downloadIcs(i) {
  const start = new Date(i.scheduledAt);
  const end = new Date(start.getTime() + i.durationMins * 60000);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Hiring Pipeline//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${i._id}@hiring-pipeline`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(`${labelOf(INTERVIEW_TYPES, i.type)} interview: ${i.candidate.name}`)}`,
    `LOCATION:${esc(i.location)}`,
    `DESCRIPTION:${esc(`Interviewer: ${i.interviewer.name}. ${i.notes || ''}`)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `interview-${i.candidate.name.replace(/\s+/g, '-').toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
