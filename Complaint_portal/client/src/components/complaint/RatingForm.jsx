import { useState } from 'react';
import Button from '../common/Button.jsx';

export function Stars({ value, onChange, size = 'text-2xl' }) {
  return (
    <div className="flex gap-1" role={onChange ? 'radiogroup' : undefined} aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={`${size} leading-none ${n <= value ? 'text-amber-400' : 'text-slate-300'} ${onChange ? 'hover:scale-110' : 'cursor-default'}`}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          role={onChange ? 'radio' : undefined}
          aria-checked={onChange ? n === value : undefined}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function RatingForm({ onSubmit, submitLabel = 'Confirm & rate' }) {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSubmit({ rating, feedback: feedback.trim() || undefined });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <Stars value={rating} onChange={setRating} />
      <textarea
        className="input min-h-20"
        placeholder="Any feedback for the team? (optional)"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        maxLength={500}
      />
      <Button type="submit" loading={busy} disabled={!rating} className="w-full">
        {submitLabel}
      </Button>
    </form>
  );
}
