import type { CSSProperties } from 'react';

// Converte una stringa CSS inline ("prop:val;prop:val") in un oggetto stile React.
// Permette di riusare quasi alla lettera gli stili inline del prototipo, mantenendo
// la massima fedeltà ai design token.
export function css(str: string): CSSProperties {
  const out: Record<string, string> = {};
  for (const decl of str.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim();
    const val = decl.slice(i + 1).trim();
    if (!prop) continue;
    const camel = prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    out[camel] = val;
  }
  return out as CSSProperties;
}
