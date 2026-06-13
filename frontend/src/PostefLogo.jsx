export default function PostefLogo({ className = 'brand__logo' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 420 92"
      role="img"
      aria-label="POSTEF logo"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="#0b59b6">
        <text
          x="0"
          y="68"
          fontFamily="Arial Black, Arial, sans-serif"
          fontSize="70"
          fontWeight="900"
          letterSpacing="-2"
        >
          POSTEF
        </text>
        <circle cx="404" cy="19" r="14" fill="none" stroke="#0b59b6" strokeWidth="5" />
        <text
          x="397"
          y="26"
          fontFamily="Arial Black, Arial, sans-serif"
          fontSize="18"
          fontWeight="900"
        >
          R
        </text>
      </g>
    </svg>
  );
}
