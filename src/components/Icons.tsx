// Shared Material Symbols inline SVG icons — path data sourced from
// https://fonts.google.com/icons. Kept as a single module so the bundle only
// ships one copy per shape and no emoji glyphs leak into the markup (per
// ~/.claude/rules/no-emoji.md).

import type { ScoreTier, AiMode } from '@/lib/types';

type IconProps = { className?: string };

function Svg({
  className = 'h-4 w-4',
  children,
  viewBox = '0 -960 960 960',
}: IconProps & { children: React.ReactNode; viewBox?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      fill="currentColor"
      className={className}
      aria-hidden
      focusable={false}
    >
      {children}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Score tier — filled circle, size-stable, color comes from parent
// ---------------------------------------------------------------------------

export function ScoreIcon({ tier, className }: { tier: ScoreTier; className?: string }) {
  // Dense circle for high/mid, ring for low so the "leaning out" tier reads
  // as quieter even when rendered in monochrome.
  if (tier === 'low') {
    return (
      <Svg className={className}>
        <path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z" />
      </Svg>
    );
  }
  return (
    <Svg className={className}>
      <path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z" />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// AI mode — one icon per mode
// ---------------------------------------------------------------------------

function BoltIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M400-80v-304H240l320-496v304h160L400-80Z" />
    </Svg>
  );
}

export function LightbulbIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M480-80q-33 0-56.5-23.5T400-160h160q0 33-23.5 56.5T480-80ZM320-200v-80h320v80H320Zm10-120q-69-41-109.5-110T180-580q0-125 87.5-212.5T480-880q125 0 212.5 87.5T780-580q0 81-40.5 150T630-320H330Z" />
    </Svg>
  );
}

function EditNoteIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M120-280v-80h360v80H120Zm0-160v-80h560v80H120Zm0-160v-80h560v80H120Zm440 480v-123l221-220q9-9 20-13t22-4q12 0 23 4.5t20 13.5l37 37q8 9 12.5 20t4.5 22q0 11-4 22.5T903-340L683-120H560Zm300-263-37-37 37 37ZM620-180h38l121-122-18-19-19-18-122 121v38Zm141-141-19-18 37 37-18-19Z" />
    </Svg>
  );
}

function TuneIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M440-120v-240h80v80h320v80H520v80h-80Zm-320-80v-80h240v80H120Zm160-160v-80H120v-80h160v-80h80v240h-80Zm160-80v-80h400v80H440Zm160-160v-240h80v80h160v80H680v80h-80Zm-480-80v-80h400v80H120Z" />
    </Svg>
  );
}

function EcoIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M160-80q-33 0-56.5-23.5T80-160v-240q0-75 28.5-140.5t77-114Q234-703 299.5-731.5T440-760v80q-21 0-41.5 2.5T357-670q38 24 67.5 56.5T476-540q-57 2-108.5-14T270-605q15 73 62 128t115 81q-4 42-20.5 80T384-250q14 8 29.5 14.5T446-226q-22 52-62 96.5T292-63q-16-9-32-12t-34-5H160Z" />
    </Svg>
  );
}

const MODE_ICONS: Record<AiMode, (p: IconProps) => React.ReactNode> = {
  pounce: BoltIcon,
  suggest: LightbulbIcon,
  expand: EditNoteIcon,
  tune: TuneIcon,
  nurture: EcoIcon,
};

export function AiModeIcon({ mode, className }: { mode: AiMode; className?: string }) {
  const C = MODE_ICONS[mode];
  return <C className={className} />;
}

// ---------------------------------------------------------------------------
// Generic section-header glyphs (ContextPanel, BukkakuPipeline, ContextPanel
// tabs). Exported by role, not by emoji, so consumers don't need to know which
// Material Symbol maps to each section.
// ---------------------------------------------------------------------------

export function BrainIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M247-760q-20 0-35 13.5T194-712q-3 19 6 35.5t25 25.5q2 1 4 2t3 2l1-1q-7 11-10 24t-3 26q0 44 30.5 74.5T325-493h94v-180h-20q-17 20-40.5 31T307-631q-25 0-46.5-11T224-673q-5 9-8 17.5t-3 18.5q-7-12-10.5-25.5T199-695q0-20 8.5-37.5T231-761q-5 4-8 10t-3 13q0 15 10 25t25 10q8 0 15-3.5t12-9.5q5-6 7-13.5t1-14.5q-5 1-11 2t-12 1q-6 0-11-1Zm286 0q-1 7-1 14t1 14q8 6 15 9.5t15 3.5q15 0 25-10t10-25q0-7-3-13t-8-10q15 11 23.5 28.5T618-695q0 13-3.5 26.5T604-643q-5-10-8.5-18.5T588-679q-15 21-36.5 32T505-636q-28 0-51.5-11T413-678v185h94q37 0 67-30.5t30-74.5q0-13-3-26t-10-24l1 1q1-1 3-2t4-2q16-9 25-25.5t6-35.5q-3-21-18-34.5T581-760q-6 0-12 1t-12 1q-6-1-12-1t-12-1Z" />
    </Svg>
  );
}

export function MailIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm320-280L160-640v400h640v-400L480-440Zm0-80 320-200H160l320 200ZM160-640v-80 480-400Z" />
    </Svg>
  );
}

export function TargetIcon({ className }: IconProps) {
  // Material "track_changes" — bullseye; reads as "target" without cultural freight.
  return (
    <Svg className={className}>
      <path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q39 0 76 7t72 21l-62 63q-22-6-43-8.5t-43-2.5q-133 0-226.5 93.5T160-480q0 133 93.5 226.5T480-160q133 0 226.5-93.5T800-480q0-22-2.5-43t-8.5-42l63-63q14 35 21 71.5t7 76.5q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm-44-198L244-470l56-58 136 136 434-434 58 56-492 492Z" />
    </Svg>
  );
}

export function TimelineIcon({ className }: IconProps) {
  // Material "timeline" for behavior log.
  return (
    <Svg className={className}>
      <path d="M120-120v-80l80-80v160h-80Zm160 0v-240l80-80v320h-80Zm160 0v-320l80 81v239h-80Zm160 0v-239l80-80v319h-80Zm160 0v-400l80-80v480h-80ZM120-327v-113l280-280 160 160 280-280v113L560-447 400-607 120-327Z" />
    </Svg>
  );
}

export function HouseIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M160-120v-480l320-240 320 240v480H560v-280H400v280H160Z" />
    </Svg>
  );
}

export function LocationIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M480-480q33 0 56.5-23.5T560-560q0-33-23.5-56.5T480-640q-33 0-56.5 23.5T400-560q0 33 23.5 56.5T480-480Zm0 294q122-112 181-203.5T720-552q0-109-69.5-178.5T480-800q-101 0-170.5 69.5T240-552q0 71 59 162.5T480-186Zm0 106Q319-217 239.5-334.5T160-552q0-150 96.5-239T480-880q127 0 223.5 89T800-552q0 100-79.5 217.5T480-80Zm0-480Z" />
    </Svg>
  );
}

export function CheckCircleIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m424-296 282-282-56-56-226 226-114-114-56 56 170 170Zm56 216q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z" />
    </Svg>
  );
}

export function ApartmentIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M80-120v-720h400v160h400v560H80Zm80-80h160v-80H160v80Zm0-160h160v-80H160v80Zm0-160h160v-80H160v80Zm0-160h160v-80H160v80Zm240 480h160v-80H400v80Zm0-160h160v-80H400v80Zm0-160h160v-80H400v80Zm0-160h160v-80H400v80Zm240 480h160v-80H640v80Zm0-160h160v-80H640v80Zm0-160h160v-80H640v80Z" />
    </Svg>
  );
}

export function DescriptionIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-560h200L520-840v200Z" />
    </Svg>
  );
}

export function BlockIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q54 0 104-17.5t92-50.5L228-676q-33 42-50.5 92T160-480q0 134 93 227t227 93Zm252-124q33-42 50.5-92T800-480q0-134-93-227t-227-93q-54 0-104 17.5T284-732l448 448Z" />
    </Svg>
  );
}

export function ScheduleIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m612-292 56-56-148-148v-184h-80v216l172 172ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z" />
    </Svg>
  );
}

export function ChatBubbleIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M240-400h320v-80H240v80Zm0-120h480v-80H240v80Zm0-120h480v-80H240v80ZM80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240L80-80Z" />
    </Svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z" />
    </Svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
    </Svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z" />
    </Svg>
  );
}

export function PaletteIcon({ className }: IconProps) {
  // Reused by Obikae launcher (帯替え).
  return (
    <Svg className={className}>
      <path d="M480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 32.5-156t88-127Q256-817 330-848.5T488-880q80 0 151 27.5t124.5 76q53.5 48.5 85 115T880-518q0 115-70 176.5T640-280h-74q-9 0-12.5 5t-3.5 11q0 12 15 34.5t15 51.5q0 50-27.5 74T480-80Z" />
    </Svg>
  );
}
