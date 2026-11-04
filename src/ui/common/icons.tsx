/** Small inline icons. All are decorative: the controls that use them carry their own labels. */

export function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 10 10" aria-hidden="true" className={className}>
      <path
        d="M1.5 1.5l7 7M8.5 1.5l-7 7"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 10 10" aria-hidden="true" className={className}>
      <path
        d="M3 1.5L7 5l-4 3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CaretIcon({
  direction,
  className,
}: {
  direction: 'up' | 'down';
  className?: string;
}) {
  return (
    <svg viewBox="0 0 8 6" aria-hidden="true" className={className}>
      <path
        d={direction === 'up' ? 'M1 5l3-3.5L7 5' : 'M1 1l3 3.5L7 1'}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HeartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M12 21s-8.5-5.2-8.5-11.2C3.5 6.6 5.9 4.5 8.5 4.5c1.6 0 2.8.8 3.5 2 .7-1.2 1.9-2 3.5-2 2.6 0 5 2.1 5 5.3C20.5 15.8 12 21 12 21z"
        fill="#E8344B"
        stroke="#1F1535"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <circle cx="8.3" cy="8.6" r="1.4" fill="#fff" />
    </svg>
  );
}

export function SwordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M19.5 3.5l-1 4.5L9 17.5 6.5 15 16 5.5z"
        fill="#DDE3EA"
        stroke="#1F1535"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 13.5l6 6M7.5 16.5l-3.5 3.5"
        stroke="#1F1535"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path d="M4.5 13.5l6 6" stroke="#C27A3A" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}
