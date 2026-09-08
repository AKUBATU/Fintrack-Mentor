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
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    const blockKeyboardInput = (event: KeyboardEvent) => event.preventDefault();
    window.addEventListener('keydown', blockKeyboardInput, true);
    return () => window.removeEventListener('keydown', blockKeyboardInput, true);
  }, []);

  return (
    <div className="processing-overlay fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/25 backdrop-blur-[3px]" role="status" aria-live="polite" aria-busy="true">
      <div className="processing-card w-full max-w-xs rounded-2xl border border-gray-200 bg-white px-6 py-7 text-center shadow-2xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <LoaderCircle className="h-6 w-6 animate-spin" />
        </div>
        <p className="mt-4 font-semibold text-gray-900">{message}</p>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );
}
