import { useEffect, useState } from 'react';

/**
 * Subscribes to a CSS media query. Reads the initial value synchronously so the
 * first paint already matches the viewport, rather than rendering the desktop
 * layout and swapping to mobile a frame later.
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  );

  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = (event) => setMatches(event.matches);
    // Re-read on subscribe: the query may have changed since the initial state.
    setMatches(list.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

// Below this the controls become bottom sheets and the top bar is replaced by
// floating buttons. Chosen so a landscape phone still gets the compact layout.
export const COMPACT_QUERY = '(max-width: 900px)';

/** True when a real pointer can hover, which excludes touch screens. */
export const HOVER_QUERY = '(hover: hover) and (pointer: fine)';
