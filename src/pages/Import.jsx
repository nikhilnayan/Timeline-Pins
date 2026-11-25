import { Shield } from 'lucide-react';
import DropZone from '../components/DropZone.jsx';
import ExportGuide from '../components/ExportGuide.jsx';

export default function Import({ onGoToMap }) {
  return (
    <main className="atlas-grid-bg min-h-[calc(100vh-3.5rem)] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl space-y-5">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-moss-900 dark:text-parchment-200">
          Import Timeline
        </h1>

        <DropZone onGoToMap={onGoToMap} />

        <ExportGuide defaultOpen={false} />

        <p className="flex items-center gap-2 text-xs text-moss-700/80 dark:text-parchment-300/75">
          <Shield className="h-3.5 w-3.5 shrink-0 text-brass-600 dark:text-brass-300" aria-hidden="true" />
          <span>Parsed locally in your browser — raw files are never uploaded.</span>
        </p>
      </div>
    </main>
  );
}
