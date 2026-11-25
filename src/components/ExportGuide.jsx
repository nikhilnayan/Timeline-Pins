import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function ExportGuide({ defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  const steps = [
    {
      num: '01',
      title: 'Android',
      detail: 'Settings > Location > Location services > Timeline > Export Timeline data',
    },
    {
      num: '02',
      title: 'iPhone',
      detail:
        'Google Maps > profile picture > Your Timeline > three dots > Location and privacy settings > Export Timeline data',
    },
    {
      num: '03',
      title: 'Google Takeout',
      detail:
        'Older Google Takeout "Semantic Location History" monthly JSON files also work. Avoid Records.json, which only contains raw points.',
    },
  ];

  return (
    <div className="rounded-xl border border-moss-900/15 bg-parchment-100/60 dark:border-parchment-200/15 dark:bg-moss-800/60">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-parchment-200/35 dark:hover:bg-moss-800 sm:px-5"
      >
        <span className="font-display text-base font-semibold text-moss-900 dark:text-parchment-200">
          How to export your Timeline
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-moss-700 transition-transform duration-200 dark:text-parchment-200 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="divide-y divide-moss-900/10 border-t border-moss-900/15 px-4 dark:divide-parchment-200/10 dark:border-parchment-200/15 sm:px-5">
          {steps.map((s) => (
            <div key={s.num} className="flex items-start gap-3.5 py-3.5">
              <span className="font-mono text-xs font-semibold text-brass-600 dark:text-brass-300">
                {s.num}
              </span>
              <div>
                <p className="text-sm font-semibold text-moss-900 dark:text-parchment-200">
                  {s.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-moss-700 dark:text-parchment-200/75 sm:text-sm">
                  {s.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
