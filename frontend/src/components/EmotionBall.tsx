/**
 * Shared EmotionBall — used in JournalPsychology, JournalIdea, TradeDetailPanel, Reports
 * Inside-Out style SVG balls with facial expressions
 */

export const EMOTIONS = [
  { id: 'joy',       label: 'Joy',       color: '#f5c842', glow: 'rgba(245,200,66,0.45)',   eyes: 'smile'   },
  { id: 'calm',      label: 'Calm',      color: '#5bc4d4', glow: 'rgba(91,196,212,0.45)',   eyes: 'neutral' },
  { id: 'confident', label: 'Confident', color: '#4ebe96', glow: 'rgba(78,190,150,0.45)',   eyes: 'content' },
  { id: 'sadness',   label: 'Sadness',   color: '#6fa3e0', glow: 'rgba(111,163,224,0.45)',  eyes: 'sad'     },
  { id: 'anxiety',   label: 'Anxiety',   color: '#e8965a', glow: 'rgba(232,150,90,0.45)',   eyes: 'nervous' },
  { id: 'anger',     label: 'Anger',     color: '#d65a5a', glow: 'rgba(214,90,90,0.45)',    eyes: 'angry'   },
  { id: 'fearful',   label: 'Fear',      color: '#b49fcc', glow: 'rgba(180,159,204,0.45)',  eyes: 'scared'  },
  { id: 'greedy',    label: 'Greed',     color: '#d4a044', glow: 'rgba(212,160,68,0.45)',   eyes: 'smirk'   },
  { id: 'revenge',   label: 'Revenge',   color: '#c8746a', glow: 'rgba(200,116,106,0.45)',  eyes: 'angry'   },
] as const;

export type EmotionId = typeof EMOTIONS[number]['id'];
export type EmotionDef = typeof EMOTIONS[number];
export const emotionMap = Object.fromEntries(EMOTIONS.map(e => [e.id, e])) as Record<string, EmotionDef>;

const EYE_PAIRS: Record<string, [string, string]> = {
  smile:   ['M10 12 Q12 14 14 12', 'M7 10 Q7.5 9 8.5 10 M15.5 10 Q16.5 9 17 10'],
  neutral: ['M9 13 L15 13',        'M8 10 H9 M15 10 H16'],
  content: ['M9.5 13 Q12 14.5 14.5 13', 'M8 10 H9 M15 10 H16'],
  sad:     ['M9.5 15 Q12 13.5 14.5 15', 'M8 9.5 Q8.5 11 9.5 10 M14.5 10 Q15.5 11 16 9.5'],
  nervous: ['M9 13 L15 13',        'M7.5 9.5 L8.5 10.5 M15.5 10.5 L16.5 9.5'],
  angry:   ['M9 15 Q12 13 15 15',  'M7.5 11 L9.5 10 M14.5 10 L16.5 11'],
  scared:  ['M10 14 Q12 12.5 14 14', 'M8 9 Q9 8 10 10 M14 10 Q15 8 16 9'],
  smirk:   ['M9 13 Q11 14 13 12',  'M8 10 H9 M15 10 H16'],
};

/** Interactive button-style ball (for selectors in Psychology / JournalIdea) */
export function EmotionBall({
  emotion, size = 52, selected, onClick,
}: { emotion: EmotionDef; size?: number; selected?: boolean; onClick?: () => void }) {
  const { color, eyes } = emotion;
  const [mouth, eyebrows] = EYE_PAIRS[eyes] ?? EYE_PAIRS.neutral;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'none', border: 'none', cursor: onClick ? 'pointer' : 'default',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
        padding: '6px 4px', borderRadius: 10,
        outline: selected ? `2px solid ${color}` : '2px solid transparent',
        outlineOffset: 2,
        transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
        transform: selected ? 'scale(1.12)' : 'scale(1)',
      }}
    >
      <EmotionSVG id={emotion.id} color={color} eyes={eyes} mouth={mouth} eyebrows={eyebrows} size={size} glow={selected ? emotion.glow : undefined} />
      <span style={{ fontSize: 9, fontWeight: 600, color: selected ? color : '#868f97', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
        {emotion.label}
      </span>
    </button>
  );
}

/** Inline display ball (smaller, in cards / rows) */
export function EmotionDisplay({ emotionId, size = 32, showLabel = true }: { emotionId: string; size?: number; showLabel?: boolean }) {
  const em = emotionMap[emotionId];
  if (!em) return <span style={{ fontSize: 13, color: '#868f97' }}>—</span>;
  const [mouth, eyebrows] = EYE_PAIRS[em.eyes] ?? EYE_PAIRS.neutral;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <EmotionSVG id={em.id} color={em.color} eyes={em.eyes} mouth={mouth} eyebrows={eyebrows} size={size} />
      {showLabel && (
        <div>
          <div style={{ fontWeight: 600, color: em.color, fontSize: 13 }}>{em.label}</div>
          <div style={{ fontSize: 11, color: 'rgba(205,205,205,0.42)' }}>Cảm xúc</div>
        </div>
      )}
    </div>
  );
}

/** Inline chip pill (for tables / detail panels) */
export function EmotionChip({ emotionId }: { emotionId: string }) {
  const em = emotionMap[emotionId];
  if (!em) return <span style={{ color: 'rgba(180,180,180,0.35)', fontSize: 12 }}>—</span>;
  const [mouth, eyebrows] = EYE_PAIRS[em.eyes] ?? EYE_PAIRS.neutral;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px 3px 6px', borderRadius: 20, background: `${em.color}15`, border: `1px solid ${em.color}35`, fontSize: 12, fontWeight: 600, color: em.color }}>
      <EmotionSVG id={em.id} color={em.color} eyes={em.eyes} mouth={mouth} eyebrows={eyebrows} size={20} />
      {em.label}
    </span>
  );
}

function EmotionSVG({ id, color, mouth, eyebrows, size, glow }: { id: string; color: string; eyes: string; mouth: string; eyebrows: string; size: number; glow?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`bg-${id}`} cx="35%" cy="28%" r="70%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="1" />
        </radialGradient>
        {glow && (
          <filter id={`glow-${id}`}>
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        )}
      </defs>
      <circle cx="12" cy="12" r="10" fill={`url(#bg-${id})`} filter={glow ? `url(#glow-${id})` : undefined} />
      <ellipse cx="9" cy="8" rx="2.5" ry="1.5" fill="rgba(255,255,255,0.22)" />
      <circle cx="9"  cy="10.5" r="1.1" fill="rgba(0,0,0,0.7)" />
      <circle cx="15" cy="10.5" r="1.1" fill="rgba(0,0,0,0.7)" />
      <path d={eyebrows} stroke="rgba(0,0,0,0.6)" strokeWidth="0.9" fill="none" strokeLinecap="round" />
      <path d={mouth}    stroke="rgba(0,0,0,0.65)" strokeWidth="1.1" fill="none" strokeLinecap="round" />
    </svg>
  );
}
