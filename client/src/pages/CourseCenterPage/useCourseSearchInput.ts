import { useEffect, useRef, useState } from 'react';

/** Keep composition and trailing spaces local; only settled input updates the URL. */
export function useCourseSearchInput(
  search: string,
  commit: (value: string) => void,
) {
  const [value, setValue] = useState(search);
  const composing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const commitRef = useRef(commit);
  commitRef.current = commit;

  useEffect(() => {
    clearTimeout(timer.current);
    setValue(search);
  }, [search]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const update = (next: string): void => {
    setValue(next);
    clearTimeout(timer.current);
    if (!composing.current) {
      timer.current = setTimeout(() => commitRef.current(next), 200);
    }
  };

  return {
    value,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      update(event.target.value),
    onCompositionStart: () => {
      composing.current = true;
      clearTimeout(timer.current);
    },
    onCompositionEnd: (event: React.CompositionEvent<HTMLInputElement>) => {
      composing.current = false;
      update(event.currentTarget.value);
    },
  };
}
