import { useEffect } from 'react';
import { LoaderCircle } from 'lucide-react';

interface ProcessingOverlayProps {
  message?: string;
  description?: string;
}

export default function ProcessingOverlay({
  message = 'Sedang memproses…',
  description = 'Mohon tunggu dan jangan tutup halaman ini.',
}: ProcessingOverlayProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  return (
    <div className="processing-overlay fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/25 backdrop-blur-[3px]" role="dialog" aria-modal="true" aria-labelledby="processing-title" aria-describedby="processing-description" aria-busy="true">
      <div className="processing-card w-full max-w-xs rounded-2xl border border-gray-200 bg-white px-6 py-7 text-center shadow-2xl" tabIndex={-1}>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <LoaderCircle className="h-6 w-6 animate-spin" />
        </div>
        <p id="processing-title" className="mt-4 font-semibold text-gray-900">{message}</p>
        <p id="processing-description" className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );
}
