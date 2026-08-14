import { Icon } from "@/components/Icon";
import { buttonClass } from "@/components/admin/AdminShell";

export function AdminLocationDetail({
  location,
  onClose,
}: {
  location: { latitude: number; longitude: number; accuracy: number | null; updated_at: string };
  onClose: () => void;
}) {
  if (!location) return null;

  const mapUrl = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant/60 shadow-xl p-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between mb-6">
          <h2 className="font-headline-sm text-primary">Customer Location</h2>
          <button
            onClick={onClose}
            className="p-2 text-on-surface-variant hover:text-primary transition-colors"
          >
            <Icon name="close" className="text-[24px]" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-surface-container p-4">
            <p className="font-label-caps text-xs text-on-surface-variant uppercase tracking-widest mb-1">
              Coordinates
            </p>
            <p className="font-body-md text-primary font-mono">
              {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
            </p>
          </div>

          <div className="bg-surface-container p-4">
            <p className="font-label-caps text-xs text-on-surface-variant uppercase tracking-widest mb-1">
              Accuracy
            </p>
            <p className="font-body-md text-primary">
              {location.accuracy ? `±${Math.round(location.accuracy)} meters` : "Unknown"}
            </p>
          </div>

          <div className="bg-surface-container p-4">
            <p className="font-label-caps text-xs text-on-surface-variant uppercase tracking-widest mb-1">
              Last Updated
            </p>
            <p className="font-body-md text-primary">
              {new Date(location.updated_at).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-outline-variant/60 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className={`${buttonClass} bg-transparent text-primary hover:bg-surface-container-highest border border-outline-variant`}
          >
            Close
          </button>
          <a href={mapUrl} target="_blank" rel="noreferrer" className={buttonClass}>
            Open in Maps
          </a>
        </div>
      </div>
    </div>
  );
}
