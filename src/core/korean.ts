/**
 * 한국어 조사 고르기 (순수 함수). 이름 끝 글자에 받침이 있으면 a("이"), 없으면 b("가").
 * 끝의 괄호 설명은 빼고 읽는다. 예: "마을 축제 (등불)" → "축제" → 받침 없음 → "가"
 */
const DIGIT_HAS_FINAL = '013678'.split(''); // 영(o) 일(l) 삼(m) 육(k) 칠(l) 팔(l) → 받침 있음. 이·사·오·구는 없음

export function hasFinal(word: string): boolean {
  const s = word.replace(/\([^)]*\)\s*$/, '').trim() || word;
  for (let i = s.length - 1; i >= 0; i--) {
    const ch = s[i];
    const code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0;
    if (ch >= '0' && ch <= '9') return DIGIT_HAS_FINAL.includes(ch);
  }
  return false;
}

/** josa("분수 광장", "이", "가") → "분수 광장이" */
export function josa(word: string, a: string, b: string): string {
  return word + (hasFinal(word) ? a : b);
}
