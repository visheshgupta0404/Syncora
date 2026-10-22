import { useEffect, useState } from "react";

export default function MemoryScene() {
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return (
    <div
      className="memory-scene"
      data-motion={paused || reduced ? "paused" : "playing"}
    >
      <div className="memory-art" aria-hidden="true">
        <svg viewBox="0 0 560 246" fill="none" focusable="false">
          <defs>
            <linearGradient
              id="memory-lavender"
              x1="80"
              y1="25"
              x2="235"
              y2="200"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#414367" />
              <stop offset="1" stopColor="#292E48" />
            </linearGradient>
            <linearGradient
              id="memory-peach"
              x1="320"
              y1="30"
              x2="475"
              y2="205"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#5A414B" />
              <stop offset="1" stopColor="#302A3E" />
            </linearGradient>
          </defs>
          <ellipse
            cx="280"
            cy="204"
            rx="222"
            ry="18"
            fill="#0D1220"
            opacity=".5"
          />
          <path
            className="memory-connection"
            d="M195 118C239 47 286 192 359 105"
            stroke="#AEBBEF"
            strokeWidth="2"
            strokeDasharray="4 8"
            opacity=".6"
          />
          <g className="memory-card memory-card-left">
            <rect
              x="68"
              y="20"
              width="172"
              height="196"
              rx="13"
              fill="#D4D9EF"
            />
            <rect
              x="77"
              y="29"
              width="154"
              height="151"
              rx="7"
              fill="url(#memory-lavender)"
            />
            <circle cx="110" cy="58" r="19" fill="#B9C6FF" opacity=".12" />
            <path
              d="M93 180C95 139 117 129 153 129C192 129 213 143 217 180"
              fill="#A6B4EC"
            />
            <rect
              x="143"
              y="117"
              width="23"
              height="27"
              rx="9"
              fill="#C78D76"
            />
            <ellipse cx="154" cy="94" rx="31" ry="38" fill="#E3AD90" />
            <path
              d="M123 94C116 52 142 43 160 49C185 44 193 67 184 86L177 74C163 81 140 72 135 68L123 94Z"
              fill="#23283C"
            />
            <path
              d="M119 95V82C119 35 191 36 191 84V97"
              stroke="#DBE2FF"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <rect x="115" y="85" width="13" height="28" rx="6" fill="#7488CA" />
            <rect x="182" y="85" width="13" height="28" rx="6" fill="#7488CA" />
            <path
              d="M139 98L144 99M165 99L170 98"
              stroke="#6C443E"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M146 114Q154 120 162 113"
              stroke="#A15D56"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M121 159L144 170M186 158L169 169"
              stroke="#7C8DC4"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <text
              x="154"
              y="201"
              textAnchor="middle"
              fill="#414B69"
              fontSize="12"
              fontFamily="DM Sans, sans-serif"
            >
              Miles apart.
            </text>
          </g>
          <g className="memory-card memory-card-right">
            <rect
              x="321"
              y="29"
              width="172"
              height="196"
              rx="13"
              fill="#E8D6CE"
            />
            <rect
              x="330"
              y="38"
              width="154"
              height="151"
              rx="7"
              fill="url(#memory-peach)"
            />
            <circle cx="457" cy="68" r="22" fill="#FFD2B5" opacity=".12" />
            <path
              d="M371 145C352 114 363 66 389 59C435 45 456 94 440 148"
              fill="#292338"
            />
            <path
              d="M345 189C350 151 370 138 405 138C440 138 465 156 470 189"
              fill="#C98F88"
            />
            <rect
              x="395"
              y="126"
              width="23"
              height="24"
              rx="9"
              fill="#A56A55"
            />
            <ellipse cx="405" cy="105" rx="30" ry="37" fill="#BD8266" />
            <path
              d="M375 101C367 61 396 49 417 62C438 61 446 87 434 104L426 82Q400 94 391 77Z"
              fill="#292338"
            />
            <path
              d="M370 107V94C370 48 442 47 442 96V109"
              stroke="#F2D2BE"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <rect x="365" y="98" width="13" height="27" rx="6" fill="#D5A993" />
            <rect x="433" y="98" width="13" height="27" rx="6" fill="#D5A993" />
            <path
              d="M390 107Q394 111 398 107M413 107Q417 111 421 107"
              stroke="#59392F"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M397 122Q405 129 414 121"
              stroke="#744239"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M375 171L395 179M439 170L422 179"
              stroke="#A76F72"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <text
              x="407"
              y="210"
              textAnchor="middle"
              fill="#70535C"
              fontSize="12"
              fontFamily="DM Sans, sans-serif"
            >
              Still here.
            </text>
          </g>
          <g className="memory-heart">
            <circle cx="279" cy="94" r="23" fill="#343C58" stroke="#5D6B92" />
            <path
              d="M269 92C269 83 279 84 279 90C279 84 289 83 289 92C289 98 279 104 279 104C279 104 269 98 269 92Z"
              fill="#E9B9B2"
            />
          </g>
          <g className="memory-note" fill="#C5CEFF">
            <path
              d="M35 104V80L51 76V99"
              stroke="#C5CEFF"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <ellipse cx="31" cy="105" rx="5" ry="3.5" />
            <ellipse cx="47" cy="100" rx="5" ry="3.5" />
          </g>
          <g
            className="memory-star"
            stroke="#EDC4AC"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M516 133V147M509 140H523M283 191V201M278 196H288" />
          </g>
          <g
            className="memory-wave"
            stroke="#BAC8F4"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <path d="M254 161V174M264 152V183M274 158V177M284 148V186M294 156V179M304 162V173" />
          </g>
        </svg>
      </div>
      <div className="memory-caption">
        <span>One little moment. A memory together.</span>
        {!reduced ? (
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            aria-label={
              paused
                ? "Play decorative scene motion"
                : "Pause decorative scene motion"
            }
          >
            {paused ? "▷ Play scene" : "Ⅱ Pause scene"}
          </button>
        ) : (
          <span className="motion-static">Still moments</span>
        )}
      </div>
    </div>
  );
}
