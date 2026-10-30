import { useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';

const MAX_FILES = 5;
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Controlled image picker with previews: value = File[], onChange(File[]) */
export default function ImageUploader({ value = [], onChange, label = 'Photos (optional)', max = MAX_FILES }) {
  const inputRef = useRef(null);
  const previews = useMemo(() => value.map((f) => URL.createObjectURL(f)), [value]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const addFiles = (fileList) => {
    const next = [...value];
    for (const file of fileList) {
      if (!TYPES.includes(file.type)) {
        toast.error(`${file.name}: only JPEG, PNG or WebP`);
      } else if (file.size > MAX_BYTES) {
        toast.error(`${file.name} is larger than 5 MB`);
      } else if (next.length >= max) {
        toast.error(`You can add up to ${max} photos`);
        break;
      } else {
        next.push(file);
      }
    }
    onChange(next);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex flex-wrap gap-2">
        {previews.map((src, i) => (
          <div key={src} className="relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200">
            <img src={src} alt={`Upload ${i + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/70 text-xs text-white"
              aria-label="Remove photo"
            >
              ✕
            </button>
          </div>
        ))}
        {value.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-xs text-slate-500 hover:border-brand-500 hover:text-brand-700"
          >
            <span className="text-xl">＋</span>
            Add photo
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={TYPES.join(',')}
        multiple
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />
      <p className="mt-1 text-xs text-slate-500">Up to {max} images, 5 MB each.</p>
    </div>
  );
}
