import { useSyncExternalStore } from 'react';
import DesktopFeishuDocumentReader, {
  type FeishuDocumentReaderProps,
} from './DesktopFeishuDocumentReader';
import MobileEmbeddedDocumentReader from './MobileEmbeddedDocumentReader';

// Keep the existing tablet/desktop reader unchanged. Only phones use the new shell.
const PHONE_QUERY = '(max-width: 639px)';
function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(PHONE_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}
function isPhone(): boolean {
  return window.matchMedia(PHONE_QUERY).matches;
}
export default function FeishuDocumentReader(props: FeishuDocumentReaderProps) {
  const phone = useSyncExternalStore(subscribe, isPhone, () => false);
  return phone ? (
    <MobileEmbeddedDocumentReader {...props} />
  ) : (
    <DesktopFeishuDocumentReader {...props} />
  );
}
