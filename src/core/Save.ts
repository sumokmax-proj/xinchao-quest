import type { WrongNote } from '../combat/QuizSystem';

/** 기기(브라우저)에 저장하는 것. 프로토타입과 같은 키를 쓴다. */
export interface SaveData {
  wrong: WrongNote;
  sound: boolean;
  pixel: boolean;
  answeredQuiz: boolean; // 퀴즈에 ←/→로 직접 답해 본 적 있나 (없으면 답 버튼을 깜빡여 알려줌)
}

const KEY = 'xinchao-3d-v1';

const defaults = (): SaveData => ({ wrong: {}, sound: true, pixel: true, answeredQuiz: false });

/** 저장소가 막혀 있거나(사생활 보호 모드 등) 내용이 깨져 있어도 기본값으로 시작한다 */
export function loadSave(): SaveData {
  const save = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      if (parsed && typeof parsed === 'object') {
        if (parsed.wrong && typeof parsed.wrong === 'object') save.wrong = parsed.wrong;
        if (typeof parsed.sound === 'boolean') save.sound = parsed.sound;
        if (typeof parsed.pixel === 'boolean') save.pixel = parsed.pixel;
        if (typeof parsed.answeredQuiz === 'boolean') save.answeredQuiz = parsed.answeredQuiz;
      }
    }
  } catch {
    /* 저장소를 못 읽으면 기본값 */
  }
  return save;
}

export function persist(save: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* 저장 실패는 게임을 멈추지 않는다 */
  }
}
