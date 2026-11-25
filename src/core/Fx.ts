/** 타격 연출 목록. 개발용 "연출 스위치"에서 하나씩 켜고 끈다 (three와 분리한 순수 로직) */
export const FX_LIST = [
  { id: 'flash', name: '맞으면 흰 번쩍' },
  { id: 'knockback', name: '맞으면 밀려남' },
  { id: 'squash', name: '맞으면 찌그러짐' },
  { id: 'hitStop', name: '히트스톱' },
  { id: 'sparks', name: '타격 불꽃' },
  { id: 'numbers', name: '데미지 숫자' },
  { id: 'debris', name: '처치 파편' },
  { id: 'shake', name: '화면 흔들림' },
  { id: 'pitch', name: '효과음 높낮이 변화' },
  { id: 'slowMo', name: '마무리 슬로 모션' },
  { id: 'zoom', name: '마무리 확대' },
  { id: 'shockwave', name: '쇼크웨이브' },
  { id: 'vibrate', name: '진동' },
] as const;

export type FxId = (typeof FX_LIST)[number]['id'];

const IDS: readonly string[] = FX_LIST.map((f) => f.id);

/** 저장은 "꺼 둔 것" 목록으로: 나중에 새 연출이 생겨도 기본은 켜짐 */
export const fxOn = (off: readonly FxId[], id: FxId): boolean => !off.includes(id);

export const toggleFx = (off: readonly FxId[], id: FxId): FxId[] => (off.includes(id) ? off.filter((x) => x !== id) : [...off, id]);

/** 전부 켜기 / 전부 끄기 */
export const setAllFx = (on: boolean): FxId[] => (on ? [] : FX_LIST.map((f) => f.id));

export const sanitizeFxOff = (raw: unknown): FxId[] =>
  Array.isArray(raw) ? [...new Set(raw.filter((x): x is FxId => typeof x === 'string' && IDS.includes(x)))] : [];
