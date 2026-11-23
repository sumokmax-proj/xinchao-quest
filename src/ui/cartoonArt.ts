/**
 * 카툰 컷 그림 (낙서풍 SVG). 외부 그림 파일 없이 코드로 그린다.
 * 모든 그림은 viewBox 0 0 300 190. 굵은 선(#2a2018), 평평한 색.
 */
const INK = '#2a2018';
const S = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;

/** 주인공 (직장인 → 이세계에서는 검사). x,y = 발 위치 */
function hero(x: number, y: number, o: { sword?: boolean; tie?: boolean; mood?: 'ok' | 'shock' | 'happy' | 'dizzy'; flip?: boolean } = {}): string {
  const f = o.flip ? -1 : 1;
  const face =
    o.mood === 'shock'
      ? `<circle cx="${x - 5}" cy="${y - 62}" r="3" fill="${INK}"/><circle cx="${x + 5}" cy="${y - 62}" r="3" fill="${INK}"/><ellipse cx="${x}" cy="${y - 52}" rx="4" ry="6" fill="${INK}"/>`
      : o.mood === 'dizzy'
        ? `<path d="M${x - 9} ${y - 65}l6 6m0-6l-6 6M${x + 3} ${y - 65}l6 6m0-6l-6 6" ${S}/><path d="M${x - 5} ${y - 52}q5 4 10 0" ${S} fill="none"/>`
        : o.mood === 'happy'
          ? `<path d="M${x - 9} ${y - 62}q3-4 6 0M${x + 3} ${y - 62}q3-4 6 0" ${S} fill="none"/><path d="M${x - 7} ${y - 54}q7 8 14 0" ${S} fill="#fff"/>`
          : `<circle cx="${x - 5}" cy="${y - 62}" r="2.5" fill="${INK}"/><circle cx="${x + 5}" cy="${y - 62}" r="2.5" fill="${INK}"/><path d="M${x - 5} ${y - 53}h10" ${S}/>`;
  return `
  <rect x="${x - 13}" y="${y - 44}" width="26" height="30" rx="6" fill="${o.tie ? '#5a6b8a' : '#3d8a84'}" ${S}/>
  ${o.tie ? `<path d="M${x} ${y - 44}l-4 8 4 14 4-14z" fill="#c8463a" ${S}/>` : ''}
  <path d="M${x - 8} ${y - 14}v14M${x + 8} ${y - 14}v14" ${S}/>
  <circle cx="${x}" cy="${y - 60}" r="17" fill="#f2d2b0" ${S}/>
  <path d="M${x - 17} ${y - 64}q4-18 17-17q14 0 17 15q-10-8-34 2z" fill="#3a2a20" ${S}/>
  ${face}
  ${o.sword ? `<path d="M${x + 16 * f} ${y - 30}l${18 * f} -34" stroke="#cfd6dc" stroke-width="5" stroke-linecap="round"/><path d="M${x + 12 * f} ${y - 34}l${10 * f} 6" ${S}/>` : ''}
  ${o.tie && !o.sword ? `<rect x="${x + 14 * f - (f < 0 ? 14 : 0)}" y="${y - 30}" width="14" height="11" rx="2" fill="#7a5a3a" ${S}/>` : ''}`;
}

/** Lord Banh-mi-sh: 반미 모양 왕관, 콧수염, 망토 */
function lord(x: number, y: number, talk = true): string {
  return `
  <path d="M${x - 30} ${y}q4-50 30-52q26 2 30 52z" fill="#7a2f3a" ${S}/>
  <circle cx="${x}" cy="${y - 62}" r="20" fill="#f2d2b0" ${S}/>
  <path d="M${x - 26} ${y - 82}q26-22 52 0q-4 6-26 6t-26-6z" fill="#e8b46a" ${S}/>
  <path d="M${x - 16} ${y - 84}l4 4m8-7l4 4m8-5l4 4" ${S}/>
  <circle cx="${x - 7}" cy="${y - 64}" r="2.5" fill="${INK}"/><circle cx="${x + 7}" cy="${y - 64}" r="2.5" fill="${INK}"/>
  <path d="M${x - 14} ${y - 52}q7-8 14-2q7-6 14 2q-7 2-14-1q-7 3-14 1z" fill="#5a3a24" ${S}/>
  ${talk ? `<path d="M${x - 5} ${y - 47}q5 4 10 0" ${S} fill="none"/>` : ''}
  <path d="M${x + 30} ${y - 40}v40" stroke="#c8a040" stroke-width="4"/><circle cx="${x + 30}" cy="${y - 44}" r="6" fill="#f2c84b" ${S}/>`;
}

function goblinKing(x: number, y: number, down = false): string {
  if (down)
    return `<ellipse cx="${x}" cy="${y - 14}" rx="54" ry="18" fill="#4f8a2e" ${S}/>
  <circle cx="${x - 40}" cy="${y - 24}" r="20" fill="#5fa03a" ${S}/>
  <path d="M${x - 50} ${y - 30}l6 6m0-6l-6 6M${x - 36} ${y - 30}l6 6m0-6l-6 6" ${S}/>
  <path d="M${x - 70} ${y - 46}l8-14 6 10 6-12 6 12 6-10 4 14z" fill="#f2c84b" ${S} transform="rotate(-25 ${x - 50} ${y - 46})"/>
  <text x="${x - 60}" y="${y - 58}" font-size="18">✦ ✦</text>`;
  return `
  <path d="M${x - 40} ${y}q2-60 40-62q38 2 40 62z" fill="#7a1f2a" ${S}/>
  <circle cx="${x}" cy="${y - 70}" r="30" fill="#5fa03a" ${S}/>
  <path d="M${x - 30} ${y - 74}l-24-10 20 18M${x + 30} ${y - 74}l24-10-20 18" fill="#5fa03a" ${S}/>
  <path d="M${x - 24} ${y - 96}l8-20 8 14 8-18 8 18 8-14 8 20z" fill="#f2c84b" ${S}/>
  <path d="M${x - 16} ${y - 78}l10 4M${x + 16} ${y - 78}l-10 4" ${S}/>
  <circle cx="${x - 10}" cy="${y - 70}" r="4" fill="#ffe06b" ${S}/><circle cx="${x + 10}" cy="${y - 70}" r="4" fill="#ffe06b" ${S}/>
  <path d="M${x - 14} ${y - 54}q14-10 28 0" ${S} fill="#fff"/>`;
}

const sky = (c1: string, c2: string) =>
  `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="300" height="190" fill="url(#g)"/>`;
const ground = (c: string, y = 150) => `<rect y="${y}" width="300" height="${190 - y}" fill="${c}"/>`;

export const ART: Record<string, string> = {
  /** 퇴근길 하노이: 노을, 오토바이, 지친 직장인 */
  office: `${sky('#f2a46a', '#f6d29a')}
  <rect x="10" y="40" width="50" height="110" fill="#c98a5a" ${S}/><rect x="62" y="60" width="40" height="90" fill="#e0b070" ${S}/>
  <rect x="230" y="50" width="60" height="100" fill="#b87850" ${S}/>
  <path d="M10 70h50M10 100h50M230 80h60M230 110h60" ${S}/>
  ${ground('#8a8478')}
  <g transform="translate(170 158)"><circle cx="-22" cy="0" r="9" fill="#333" ${S}/><circle cx="22" cy="0" r="9" fill="#333" ${S}/><path d="M-22 0h44l-10-18h-22z" fill="#d6453a" ${S}/></g>
  ${hero(120, 172, { tie: true, mood: 'ok' })}
  <path d="M146 96q30-20 60-6" ${S} fill="none" stroke-dasharray="4 6"/>
  <text x="168" y="86" font-size="22">💭</text>`,
  /** 이세계 버스: 경적, 헤드라이트 */
  bus: `${sky('#3a3550', '#6a5a7a')}
  ${ground('#5a5660', 150)}
  <rect x="120" y="50" width="170" height="100" rx="14" fill="#2f8a5a" ${S}/>
  <rect x="134" y="64" width="46" height="34" rx="4" fill="#cfe8ff" ${S}/><rect x="188" y="64" width="46" height="34" rx="4" fill="#cfe8ff" ${S}/><rect x="242" y="64" width="38" height="34" rx="4" fill="#cfe8ff" ${S}/>
  <rect x="120" y="110" width="170" height="12" fill="#f2c84b" ${S}/>
  <circle cx="160" cy="152" r="14" fill="#333" ${S}/><circle cx="256" cy="152" r="14" fill="#333" ${S}/>
  <path d="M120 130l-90-30v60z" fill="#fff7b0" opacity=".75"/>
  <circle cx="124" cy="130" r="8" fill="#fff7b0" ${S}/>
  ${hero(64, 168, { tie: true, mood: 'shock' })}
  <text x="150" y="40" font-size="26" font-weight="900" fill="#fff" stroke="${INK}" stroke-width="1.5">빠앙—!!</text>`,
  /** 눈을 떠 보니 풀밭, 손에는 검 */
  wake: `${sky('#8fd0f0', '#d8f0ff')}
  <circle cx="250" cy="40" r="20" fill="#ffe680" ${S}/>
  <path d="M0 120q60-30 120-10t180-10v80H0z" fill="#7cc05a" ${S}/>
  ${ground('#64a04a', 160)}
  <path d="M30 120l10-34 10 34zM260 112l12-40 12 40z" fill="#2f6b34" ${S}/>
  ${hero(150, 176, { sword: true, mood: 'dizzy' })}
  <text x="114" y="96" font-size="16">⭐ ✨ ⭐</text>`,
  /** Lord Banh-mi-sh의 부탁 */
  lord: `${sky('#f0e0c0', '#e8c890')}
  <path d="M0 40h300M0 40l20-30h260l20 30" fill="#c8a070" ${S}/>
  <rect x="20" y="40" width="20" height="120" fill="#a8805a" ${S}/><rect x="260" y="40" width="20" height="120" fill="#a8805a" ${S}/>
  ${ground('#9a6a4a', 160)}
  <path d="M100 160h100l-10-10H110z" fill="#c63a3a" ${S}/>
  ${lord(150, 160)}
  ${hero(60, 178, { sword: true, mood: 'shock' })}`,
  /** 고블린이 휩쓸고 간 마을 */
  ruin: `${sky('#9aa0a8', '#c8c0b0')}
  ${ground('#7a8a5a', 150)}
  <path d="M30 150v-50l40-30 40 30v50z" fill="#b89a7a" ${S}/><path d="M50 150v-26h20v26" fill="#5a4030" ${S}/>
  <path d="M30 100l20 10 10-20 20 14" ${S} fill="none"/>
  <path d="M180 150v-40l30-26 20 18-6 8 18 10v30z" fill="#a88a6a" ${S}/>
  <path d="M60 60q-10-20 6-30q-6 16 10 18q-4-24 14-28q-6 20 8 30" fill="#8a8a8a" opacity=".7"/>
  <path d="M120 150l8-12 10 6 6-10 12 16z" fill="#8d918c" ${S}/>
  <g transform="translate(260 152) scale(.6)">${hero(0, 0, { sword: true, mood: 'shock', flip: true })}</g>`,
  /** 고블린 왕 등장 */
  king: `${sky('#3a1a2a', '#7a2f3a')}
  ${ground('#4a4250', 160)}
  <rect x="20" y="60" width="40" height="100" fill="#56535c" ${S}/><rect x="240" y="60" width="40" height="100" fill="#56535c" ${S}/>
  <path d="M30 50l10-20 10 20z M250 50l10-20 10 20z" fill="#ffb040" ${S}/>
  ${goblinKing(150, 168)}
  <text x="190" y="40" font-size="20" font-weight="900" fill="#ffd84a" stroke="${INK}" stroke-width="1">쿵!</text>`,
  /** 고블린 왕이 쓰러졌다 */
  kingDown: `${sky('#f2c8a0', '#ffe8c8')}
  ${ground('#7c7884', 150)}
  ${goblinKing(170, 172, true)}
  ${hero(60, 172, { sword: true, mood: 'happy' })}
  <text x="20" y="40" font-size="22">✨</text><text x="250" y="60" font-size="22">✨</text>`,
  /** 다시 하노이 카페 */
  cafe: `${sky('#f6d29a', '#fbe8c8')}
  <rect x="0" y="0" width="300" height="34" fill="#d6453a" ${S}/><path d="M0 34q15 12 30 0t30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0" fill="#d6453a" ${S}/>
  ${ground('#c8a070', 150)}
  <rect x="150" y="110" width="110" height="10" fill="#7a5232" ${S}/><path d="M160 120v40M250 120v40" ${S}/>
  <path d="M196 92h22l-3 18h-16z" fill="#fff" ${S}/><path d="M199 92h16v8h-16z" fill="#6a3a1a"/>
  <path d="M200 84q4-8 0-14M210 84q4-8 0-14" ${S} fill="none" opacity=".6"/>
  ${hero(100, 172, { tie: true, mood: 'happy' })}
  <rect x="122" y="56" width="150" height="26" rx="13" fill="#fff" ${S}/><text x="132" y="74" font-size="12" font-weight="700" fill="${INK}">Cho tôi một cà phê sữa đá!</text>`,
  /** 처음으로 한 번에 통했다 */
  smile: `${sky('#fbe8c8', '#f6d29a')}
  ${ground('#c8a070', 150)}
  ${hero(100, 172, { tie: true, mood: 'happy' })}
  <g transform="translate(200 172)"><rect x="-14" y="-44" width="28" height="30" rx="6" fill="#e8b43a" ${S}/><path d="M-8 -14v14M8 -14v14" ${S}/><circle cx="0" cy="-60" r="16" fill="#e8c49a" ${S}/><path d="M-18 -64q18-16 36 0z" fill="#f0e0b0" ${S}/><path d="M-7 -54q7 6 14 0" ${S} fill="none"/><circle cx="-5" cy="-62" r="2" fill="${INK}"/><circle cx="5" cy="-62" r="2" fill="${INK}"/><path d="M14 -34l14-10v-8" ${S}/></g>
  <text x="208" y="96" font-size="13" font-weight="800" fill="${INK}">Có ngay! 👍</text>
  <text x="80" y="40" font-size="20">✨</text>`,
};
