import { el } from './dom';

export interface EndSummary {
  win: boolean;
  correct: number;
  total: number;
  kills: number;
  level: number;
  seconds: number;
  wrongWords: Map<string, string>; // 베트남어 → 뜻
  learnedWords: Map<string, string>; // 이번 판에 처음 맞혀서 도감에 들어간 단어
}

/** 단어 목록(베트남어 → 뜻)을 <ul>에 채운다. 비어 있으면 empty 문구 한 줄 */
function fillWords(id: string, words: Map<string, string>, empty: string): void {
  const ul = el(id);
  ul.replaceChildren();
  words.forEach((ko, vi) => {
    const li = document.createElement('li');
    const a = document.createElement('b');
    a.lang = 'vi';
    a.textContent = vi;
    const span = document.createElement('span');
    span.textContent = ko;
    li.append(a, span);
    ul.appendChild(li);
  });
  if (!words.size) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = empty;
    ul.appendChild(li);
  }
}

export const isOverlayOpen = (): boolean => !el('startOv').hidden || !el('endOv').hidden;

export function setStartNote(text: string): void {
  el('startNote').textContent = text;
}

export function hideStart(): void {
  el('startOv').hidden = true;
}

export function hideEnd(): void {
  el('endOv').hidden = true;
}

export function showError(): void {
  el('err').hidden = false;
}

/** 클리어 / 쓰러짐 화면 */
export function showEnd(s: EndSummary): void {
  el('endTitle').textContent = s.win ? '풀밭 정화 완료' : '쓰러졌어요';
  el('endSub').textContent = s.win ? '대장 고블린까지 모두 물리쳤어요.' : '다시 도전해 보세요. 틀린 단어는 다음 판에 더 자주 나와요.';
  const acc = s.total ? Math.round((s.correct / s.total) * 100) : 0;
  const rows: [string, string][] = [
    ['퀴즈 정답률', `${acc}% (${s.correct}/${s.total})`],
    ['처치한 고블린', s.kills + '마리'],
    ['레벨', 'Lv ' + s.level],
    ['걸린 시간', Math.floor(s.seconds / 60) + '분 ' + (s.seconds % 60) + '초'],
  ];
  const dl = el('endStats');
  dl.replaceChildren();
  for (const [k, v] of rows) {
    const div = document.createElement('div');
    const dt = document.createElement('dt');
    dt.textContent = k;
    const dd = document.createElement('dd');
    dd.textContent = v;
    div.append(dt, dd);
    dl.appendChild(div);
  }
  el('endLearnedHead').textContent = `새로 배운 단어 ${s.learnedWords.size}개`;
  fillWords('endLearned', s.learnedWords, '이번 판에 새로 배운 단어가 없어요');
  el('endWrongsHead').textContent = `틀린 단어 ${s.wrongWords.size}개`;
  fillWords('endWrongs', s.wrongWords, '틀린 단어가 없어요');
  el('endOv').hidden = false;
}
