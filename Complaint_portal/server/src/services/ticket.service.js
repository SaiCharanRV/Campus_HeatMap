import { Counter } from '../models/index.js';
import { CATEGORY_CODES } from '../utils/constants.js';

/** Returns the next ticket id, e.g. IITR-2026-W-00123 (sequence resets each year). */
export async function nextTicketId(category) {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { _id: `ticket-${year}` },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return `IITR-${year}-${CATEGORY_CODES[category]}-${String(counter.seq).padStart(5, '0')}`;
}
