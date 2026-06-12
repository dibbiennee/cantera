import type { ReactNode } from 'react';
import type { Girl, AccType } from './types';

// Accessorio (fiocco/cappello/beanie/corona/fiore/orecchie/cerchietto). Port fedele di acc().
function acc(type: AccType, col: string): ReactNode[] {
  const a: ReactNode[] = [];
  if (type === 'bow') {
    a.push(<polygon key={1} points="24,18 24,34 40,26" fill={col} stroke="#15131a" strokeWidth={2} />);
    a.push(<polygon key={2} points="56,18 56,34 40,26" fill={col} stroke="#15131a" strokeWidth={2} />);
    a.push(<circle key={3} cx={40} cy={26} r={4.5} fill={col} stroke="#15131a" strokeWidth={2} />);
  } else if (type === 'cap') {
    a.push(<path key={1} d="M25 32 Q50 5 75 32 Z" fill={col} stroke="#15131a" strokeWidth={2} />);
    a.push(<path key={2} d="M50 32 Q82 30 88 41 Q66 35 50 35 Z" fill={col} stroke="#15131a" strokeWidth={2} />);
    a.push(<circle key={3} cx={50} cy={12} r={3.2} fill="#15131a" />);
  } else if (type === 'beanie') {
    a.push(<path key={1} d="M23 33 Q50 3 77 33 Z" fill={col} stroke="#15131a" strokeWidth={2} />);
    a.push(<rect key={2} x={21} y={29} width={58} height={9} rx={4} fill={col} stroke="#15131a" strokeWidth={2} />);
    a.push(<circle key={3} cx={50} cy={7} r={6} fill="#fff" stroke="#15131a" strokeWidth={2} />);
  } else if (type === 'crown') {
    a.push(<polygon key={1} points="28,31 34,11 42,24 50,7 58,24 66,11 72,31" fill={col} stroke="#15131a" strokeWidth={2} />);
    a.push(<circle key={2} cx={50} cy={9} r={2.4} fill="#ff4d9d" />);
  } else if (type === 'flower') {
    const cx = 30, cy = 23;
    for (let k = 0; k < 5; k++) {
      const ang = (k / 5) * 6.283;
      a.push(<circle key={'f' + k} cx={cx + Math.cos(ang) * 6} cy={cy + Math.sin(ang) * 6} r={4.4} fill={col} stroke="#15131a" strokeWidth={1.5} />);
    }
    a.push(<circle key="fc" cx={cx} cy={cy} r={3.4} fill="#ffd23f" stroke="#15131a" strokeWidth={1.5} />);
  } else if (type === 'catears') {
    a.push(<polygon key={1} points="27,30 31,7 47,26" fill={col} stroke="#15131a" strokeWidth={2} />);
    a.push(<polygon key={2} points="73,30 69,7 53,26" fill={col} stroke="#15131a" strokeWidth={2} />);
  } else if (type === 'headband') {
    a.push(<path key={1} d="M23 35 Q50 16 77 35" fill="none" stroke={col} strokeWidth={6} strokeLinecap="round" />);
    a.push(<polygon key={2} points="64,17 64,29 76,23" fill={col} stroke="#15131a" strokeWidth={1.5} />);
    a.push(<polygon key={3} points="80,17 80,29 76,23" fill={col} stroke="#15131a" strokeWidth={1.5} />);
  }
  return a;
}

// Avatar SVG parametrico. Port fedele di avatar().
export function Avatar({ g, size = 64 }: { g: Girl; size?: number }) {
  const p: ReactNode[] = [];
  const hair = g.hair;
  const style = g.style;
  if (style === 'long' || style === 'wavy') {
    p.push(<rect key="hb" x={18} y={36} width={64} height={58} rx={28} fill={hair} />);
  }
  if (style === 'wavy') {
    p.push(<circle key="w1" cx={20} cy={84} r={11} fill={hair} />);
    p.push(<circle key="w2" cx={80} cy={84} r={11} fill={hair} />);
  }
  if (style === 'bun') {
    p.push(<circle key="bun" cx={50} cy={17} r={12} fill={hair} />);
  }
  p.push(<circle key="f" cx={50} cy={52} r={29} fill={g.skin} />);
  p.push(<path key="ht" d="M20 50 Q22 20 50 20 Q78 20 80 50 Q72 37 50 37 Q28 37 20 50 Z" fill={hair} />);
  if (g.ear) {
    p.push(<circle key="e1" cx={21} cy={60} r={3.4} fill="#ffd23f" stroke="#15131a" strokeWidth={1.5} />);
    p.push(<circle key="e2" cx={79} cy={60} r={3.4} fill="#ffd23f" stroke="#15131a" strokeWidth={1.5} />);
  }
  if (g.gl) {
    p.push(<circle key="g1" cx={40} cy={52} r={8} fill="rgba(255,255,255,.3)" stroke="#15131a" strokeWidth={3} />);
    p.push(<circle key="g2" cx={60} cy={52} r={8} fill="rgba(255,255,255,.3)" stroke="#15131a" strokeWidth={3} />);
    p.push(<line key="br" x1={48} y1={52} x2={52} y2={52} stroke="#15131a" strokeWidth={3} />);
    p.push(<circle key="p1" cx={40} cy={52} r={2.6} fill="#15131a" />);
    p.push(<circle key="p2" cx={60} cy={52} r={2.6} fill="#15131a" />);
  } else {
    p.push(<ellipse key="ew1" cx={40} cy={51} rx={5} ry={6} fill="#fff" stroke="#15131a" strokeWidth={1.5} />);
    p.push(<ellipse key="ew2" cx={60} cy={51} rx={5} ry={6} fill="#fff" stroke="#15131a" strokeWidth={1.5} />);
    p.push(<circle key="p1" cx={41} cy={52} r={2.8} fill="#15131a" />);
    p.push(<circle key="p2" cx={61} cy={52} r={2.8} fill="#15131a" />);
    p.push(<circle key="h1" cx={39.5} cy={49.5} r={1.2} fill="#fff" />);
    p.push(<circle key="h2" cx={59.5} cy={49.5} r={1.2} fill="#fff" />);
  }
  p.push(<circle key="b1" cx={35} cy={62} r={3.6} fill="#ff5d8f" opacity={0.5} />);
  p.push(<circle key="b2" cx={65} cy={62} r={3.6} fill="#ff5d8f" opacity={0.5} />);
  p.push(<path key="sm" d="M43 65 Q50 72 57 65" fill="none" stroke="#15131a" strokeWidth={3} strokeLinecap="round" />);
  if (g.acc && g.acc !== 'none') {
    acc(g.acc, g.accC).forEach((el, i) => p.push(<g key={'a' + i}>{el}</g>));
  }
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: 'block' }}>
      {p}
    </svg>
  );
}
