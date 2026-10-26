/** 線画アイコン(24×24, stroke=currentColor)。中身は固定の文字列なので innerHTML で組む。 */
const PATHS: Record<string, string> = {
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  compass: '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  truck: '<path d="M2.5 16.5V8h11v8.5M13.5 10.5h4l3 3v3h-7.5"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>',
  sigma: '<path d="M17.5 5h-11l6 7-6 7h11"/>',
  back: '<path d="M14.5 5.5L8 12l6.5 6.5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  chevron: '<path d="M9.5 5.5L16 12l-6.5 6.5"/>',
  pin: '<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0113 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  logo: '<path d="M12 2.5l8 3v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6z"/><path d="M8 9h8M8 12h8M8 15h8"/>',
  救急: '<path d="M9.5 4h5v5.5H20v5h-5.5V20h-5v-5.5H4v-5h5.5z"/>',
  'ロープ・器具': '<path d="M8 4.5h6a4 4 0 014 4v7a4 4 0 01-4 4H10a4 4 0 01-4-4v-9"/><path d="M6 10.5l3-3"/>',
  消火: '<path d="M12 3s6 6.4 6 11a6 6 0 01-12 0c0-4.6 6-11 6-11z"/>',
  '照明・電源': '<path d="M13 2.5L5.5 13.5H12L11 21.5 18.5 10.5H12z"/>',
  救助: '<path d="M4 20l9-9M13 11l2.5-6.5L20 9z"/><path d="M8.5 15.5l-2-2"/>',
  工具: '<path d="M14.5 6.5a4 4 0 00-5.2 5.2L4 17l3 3 5.3-5.3a4 4 0 005.2-5.2l-2.5 2.5-2.5-.5-.5-2.5z"/>',
  '書類・通信': '<rect x="6" y="3.5" width="12" height="17" rx="2"/><path d="M9 8h6M9 11.5h6M9 15h3.5"/>',
  その他: '<circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/>',
};

export function icon(name: string, size = 22): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = PATHS[name] ?? PATHS['その他'];
  return svg;
}

/** 車両の側面シルエット(前が右)。 */
const SILHOUETTES: Record<string, string> = {
  タンク: '<path d="M6 34V14h58v20zM64 34V16h14l10 9v9z"/><path d="M10 10h50" stroke-dasharray="3 3"/><path d="M14 18v12M24 18v12M34 18v12M44 18v12M54 18v12" opacity=".5"/>',
  ポンプ: '<path d="M10 34V16h52v18zM62 34V16h14l10 9v9z"/><path d="M16 12h40" stroke-dasharray="3 3"/><path d="M20 20v10M32 20v10M44 20v10" opacity=".5"/>',
  指揮: '<path d="M14 34V22l8-8h40l14 10v10z"/><path d="M26 16v8M44 16v8M60 16l8 6" opacity=".5"/>',
  救急: '<path d="M8 34V12h56v22zM64 34V18h12l10 8v8z"/><path d="M33 19h6v4.5h4.5v6H39V34h-6v-4.5h-4.5v-6H33z" opacity=".7"/>',
};

export function silhouette(type: string): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 96 44');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.6');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `${SILHOUETTES[type] ?? SILHOUETTES['ポンプ']}<circle cx="24" cy="36" r="5"/><circle cx="72" cy="36" r="5"/><path d="M2 41h92" opacity=".35"/>`;
  return svg;
}
