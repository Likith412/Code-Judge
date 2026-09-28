// Inline SVGs, one named export each. They inherit the text colour through
// currentColor, so a button's own colour carries into its icon.
//
// 16px on a 16 viewBox, 1.3 stroke — the weight the design uses for icons.

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

export { EyeIcon, EyeOffIcon };
