// Inline SVGs, one export each. currentColor makes them follow the text.

const EyeIcon = () => (
   <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
         d="M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8Z"
         stroke="currentColor"
         strokeWidth="1.3"
      />

      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
   </svg>
);

const EyeOffIcon = () => (
   <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
         d="M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8Z"
         stroke="currentColor"
         strokeWidth="1.3"
      />

      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
      <path
         d="M2.5 13.5 13.5 2.5"
         stroke="currentColor"
         strokeWidth="1.3"
         strokeLinecap="round"
      />
   </svg>
);

// The solved tick on a problem row. Sized by whatever wraps it.
const CheckIcon = (props) => (
   <svg
      width={props.size || 16}
      height={props.size || 16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
   >
      <path d="M20 6 9 17l-5-5" />
   </svg>
);

export { EyeIcon, EyeOffIcon, CheckIcon };
