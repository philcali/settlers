import { useEffect, useState } from 'react';

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const randomFace = () => 1 + Math.floor(Math.random() * 6);

function Die({ face, dim }: { face: number; dim: boolean }) {
  const pips = PIPS[face] ?? [];
  return (
    <span className={`die${dim ? ' die--dim' : ''}`} aria-hidden>
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={`pip${pips.includes(i) ? ' pip--on' : ''}`} />
      ))}
    </span>
  );
}

/** Two dice. While `rolling`, faces cycle rapidly; otherwise shows `faces` (or dim blanks). */
export function Dice({ faces, rolling }: { faces: [number, number] | null; rolling: boolean }) {
  const [cycling, setCycling] = useState<[number, number]>([3, 5]);

  useEffect(() => {
    if (!rolling) return;
    const id = setInterval(() => setCycling([randomFace(), randomFace()]), 80);
    return () => clearInterval(id);
  }, [rolling]);

  const shown = rolling ? cycling : faces;
  return (
    <span className={`dice${rolling ? ' dice--rolling' : ''}`}>
      <Die face={shown ? shown[0] : 1} dim={!shown} />
      <Die face={shown ? shown[1] : 1} dim={!shown} />
      <span className="dice__total">{shown ? shown[0] + shown[1] : '–'}</span>
    </span>
  );
}
