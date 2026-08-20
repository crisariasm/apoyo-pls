export type MascotState = 'idle' | 'asking'

export function AssistantMascot({ state = 'idle' }: { state?: MascotState }) {
  return (
    <svg className={`staff-assistant-mascot is-${state}`} viewBox="0 0 120 150" aria-hidden="true" focusable="false">
      <ellipse className="mascot-shadow" cx="60" cy="141" rx="30" ry="6" />
      <g className="mascot-legs">
        <rect className="mascot-skin" x="46" y="106" width="10" height="24" rx="5" />
        <rect className="mascot-skin" x="64" y="106" width="10" height="24" rx="5" />
        <rect className="mascot-boot" x="43" y="124" width="16" height="15" rx="5" />
        <rect className="mascot-boot" x="61" y="124" width="16" height="15" rx="5" />
        <rect className="mascot-boot-sole" x="42.5" y="133" width="17" height="6" rx="3" />
        <rect className="mascot-boot-sole" x="60.5" y="133" width="17" height="6" rx="3" />
      </g>
      <g className="mascot-hips">
        <path className="mascot-skin" d="M42 96h36a6 6 0 0 1 6 6v3a9 9 0 0 1-9 9H45a9 9 0 0 1-9-9v-3a6 6 0 0 1 6-6z" />
        <path className="mascot-thong" d="M44 100h32l-4 9a12 8 0 0 1-24 0z" />
        <rect className="mascot-thong" x="38" y="99" width="44" height="6" rx="3" />
      </g>
      <g className="mascot-torso">
        <g className="mascot-arm mascot-arm-left">
          <rect className="mascot-skin" x="28" y="62" width="10" height="30" rx="5" />
          <circle className="mascot-skin" cx="33" cy="93" r="6" />
        </g>
        <g className="mascot-arm mascot-arm-right">
          <rect className="mascot-skin" x="82" y="62" width="10" height="30" rx="5" />
          <circle className="mascot-skin" cx="87" cy="93" r="6" />
        </g>
        <path className="mascot-skin" d="M60 50c13 0 21 6 23 16l2 12-5 18a4 4 0 0 1-4 3H44a4 4 0 0 1-4-3l-5-18 2-12c2-10 10-16 23-16z" />
        <path className="mascot-shape" d="M47 68a13 9 0 0 0 26 0" />
        <path className="mascot-shape" d="M60 78v14" />
        <g className="mascot-bowtie">
          <path d="M60 58l-10-5v11z" />
          <path d="M60 58l10-5v11z" />
          <circle cx="60" cy="58" r="3.2" />
        </g>
        <g className="mascot-head">
          <rect className="mascot-skin" x="54" y="46" width="12" height="11" rx="6" />
          <circle className="mascot-skin" cx="60" cy="30" r="24" />
          <path className="mascot-hair" d="M36.8 24a24 24 0 0 1 46.4 0z" />
          <g className="mascot-glasses">
            <rect x="36" y="33" width="9" height="3" rx="1.5" />
            <rect x="75" y="33" width="9" height="3" rx="1.5" />
            <rect x="43" y="30" width="15" height="11" rx="5" />
            <rect x="62" y="30" width="15" height="11" rx="5" />
            <rect x="56" y="33" width="8" height="3" rx="1.5" />
          </g>
          <circle className="mascot-cheek" cx="44" cy="44" r="4" />
          <circle className="mascot-cheek" cx="76" cy="44" r="4" />
          <path className="mascot-smile" d="M52 45a9 9 0 0 0 16 0" />
        </g>
      </g>
      <g className="mascot-sparkles">
        <circle cx="18" cy="40" r="3" />
        <circle cx="102" cy="52" r="2.4" />
        <circle cx="98" cy="24" r="1.8" />
      </g>
    </svg>
  )
}
