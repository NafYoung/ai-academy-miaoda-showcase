import { useSyncExternalStore } from 'react';
const PHONE_QUERY = '(max-width: 639px)';
function subscribe(onChange: () => void): () => void {
  const query: MediaQueryList = window.matchMedia(PHONE_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}
export function usePhoneDocumentViewport(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(PHONE_QUERY).matches,
    () => false,
  );
}
