import type { WrongNote } from '../combat/QuizSystem';
import { freshProfile, sanitizeDex, sanitizeProfile, type Dex, type Profile } from './Progress';
import { sanitizeStageRecords, type StageRecords } from './Stages';
import { emptyInventory, sanitizeInventory, type Inventory } from './Shop';

/** 기기(브라우저)에 저장하는 것. 프로토타입과 같은 키를 쓴다. */
export interface SaveData {
  wrong: WrongNote;
  sound: boolean;
  pixel: boolean;
  answeredQuiz: boolean; // 퀴즈에 ←/→로 직접 답해 본 적 있나 (없으면 답 버튼을 깜빡여 알려줌)
  profile: Profile; // 레벨·EXP·골드·누적 기록 (판이 끝나도 남음)
  dex: Dex; // 단어 도감 (단어별 맞힘·틀림 기록)
  stages: StageRecords; // 스테이지별 클리어 기록 (해금 판단)
  inventory: Inventory; // 상점에서 산 소모품·장비
}

const KEY = 'xinchao-3d-v1';

export const defaultSave = (): SaveData => ({ wrong: {}, sound: true, pixel: true, answeredQuiz: false, profile: freshProfile(), dex: {}, stages: {}, inventory: emptyInventory() });

/** 저장된 글자(JSON)를 SaveData로. 내용이 깨져 있거나 예전 형식이어도 빠진 곳은 기본값으로 채운다 */
export function parseSave(raw: string | null): SaveData {
  const save = defaultSave();
  if (!raw) return save;
  try {
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    if (parsed && typeof parsed === 'object') {
      if (parsed.wrong && typeof parsed.wrong === 'object') save.wrong = parsed.wrong;
      if (typeof parsed.sound === 'boolean') save.sound = parsed.sound;
      if (typeof parsed.pixel === 'boolean') save.pixel = parsed.pixel;
      if (typeof parsed.answeredQuiz === 'boolean') save.answeredQuiz = parsed.answeredQuiz;
      save.profile = sanitizeProfile(parsed.profile);
      save.dex = sanitizeDex(parsed.dex);
      save.stages = sanitizeStageRecords(parsed.stages);
      save.inventory = sanitizeInventory(parsed.inventory);
    }
  } catch {
    /* 깨진 JSON이면 기본값 */
  }
  return save;
}

/** 저장소가 막혀 있거나(사생활 보호 모드 등) 내용이 깨져 있어도 기본값으로 시작한다 */
export function loadSave(): SaveData {
  try {
    return parseSave(localStorage.getItem(KEY));
  } catch {
    return defaultSave();
  }
}

export function persist(save: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* 저장 실패는 게임을 멈추지 않는다 */
  }
}

/** 진행 초기화 (설정은 남긴다) */
export function clearProgress(save: SaveData): SaveData {
  return { ...save, wrong: {}, profile: freshProfile(), dex: {}, stages: {}, inventory: emptyInventory(), answeredQuiz: false };
}
