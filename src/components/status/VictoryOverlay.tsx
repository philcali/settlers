import { useEffect, useRef, useCallback } from 'react';
import { useGame } from '../../state/game-context';
import { getVictoryPoints } from '../../game/rules';

/**
 * VictoryOverlay renders a full-screen celebration when the game ends.
 * Shows winner name, VP count, confetti animation, and a Play Again button.
 */
export default function VictoryOverlay() {
  const { state, dispatch } = useGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<ConfettiParticle[]>([]);
  const rafRef = useRef<number>(0);

  const winner = state.winner;
  const isEnded = state.phase === 'ended';

  const playAgain = useCallback(() => {
    dispatch({ type: 'RESET_GAME' });
  }, [dispatch]);

  // --- Confetti ---

  useEffect(() => {
    if (!isEnded || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors = ['#d4a543', '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6'];

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Seed particles
    particlesRef.current = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      size: 4 + Math.random() * 6,
      speed: 0.8 + Math.random() * 1.5,
      wobbleAmp: 15 + Math.random() * 25,
      wobbleSpeed: 0.01 + Math.random() * 0.03,
      wobbleOffset: Math.random() * Math.PI * 2,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    let frame = 0;
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particlesRef.current) {
        frame++;
        p.y += p.speed;
        p.x += Math.sin(frame * p.wobbleSpeed + p.wobbleOffset) * 0.8;
        p.rotation += p.rotationSpeed;

        if (p.y > canvas.height + 20) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(animate);
    }
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [isEnded]);

  if (!isEnded || !winner) return null;

  const isHuman = winner === 'human';
  const vp = getVictoryPoints(winner, state.board);

  return (
    <div style={styles.overlay}>
      <canvas ref={canvasRef} style={styles.canvas} />
      <div style={styles.card}>
        <div style={styles.icon}>{isHuman ? '🏆' : '👑'}</div>
        <div style={styles.title}>{isHuman ? 'You Win!' : 'AI Wins!'}</div>
        <div style={styles.subtitle}>
          {isHuman ? 'Your realm dominates the realm!' : 'Your opponent conquers the realm.'}
        </div>
        <div style={styles.vpRow}>
          <span style={styles.vpLabel}>Victory Points</span>
          <span style={styles.vpValue}>{vp} / 10</span>
        </div>
        <button style={styles.button} onClick={playAgain}>
          Play Again
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 1000,
    animation: 'fadeIn 0.4s ease-out',
  },
  canvas: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
  card: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '40px 56px',
    backgroundColor: '#1a1a2e',
    borderRadius: '16px',
    border: '2px solid #d4a543',
    color: '#e8d5b5',
    textAlign: 'center',
    animation: 'glow 2s ease-in-out infinite',
  },
  icon: {
    fontSize: '56px',
    lineHeight: 1,
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#d4a543',
  },
  subtitle: {
    fontSize: '16px',
    color: '#aaa',
    marginBottom: '4px',
  },
  vpRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'baseline',
    marginBottom: '8px',
  },
  vpLabel: {
    fontSize: '14px',
    color: '#999',
  },
  vpValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#4caf50',
  },
  button: {
    marginTop: '8px',
    padding: '12px 32px',
    fontSize: '16px',
    fontWeight: 'bold',
    backgroundImage: 'linear-gradient(135deg, #d4a543, #f0c060)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },
};
