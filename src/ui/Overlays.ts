import { el } from './dom';
import { starRow } from './stars';

export interface EndSummary {
  win: boolean;
  stageName: string;
  stars: number; // 이번 판의 별 (0 = 짐)
  starHint: string; // 다음 별을 받는 조건 한 줄 (다 받았으면 '')
  tip: string; // 쓰러졌을 때만: 마을에서 할 수 있는 것 한 줄. 있으면 "마을" 버튼이 깜빡임
  hasNext: boolean; // 이겼고 다음 스테이지가 있음 → 큰 버튼이 "다음 스테이지"
  isLast: boolean;
  /** 마지막 스테이지를 깼을 때: 지금까지의 전체 기록 */
  ending: { totalSeconds: number; collected: number; totalWords: number; accuracy: number; kills: number } | null;
  correct: number;
  total: number;
  kills: number;
  level: number;
  seconds: number;
  wrongWords: Map<string, string>; // 베트남어 → 뜻
  learnedWords: Map<string, string>; // 이번 판에 처음 맞혀서 도감에 들어간 단어
  /** 새로 배운 단어 옆에 붙는 마을 재건 소식 (예: "분수 광장까지 2개"). 마을을 보기 전이면 '' */
  rebuildNote: string;
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

export const isOverlayOpen = (): boolean =>
  !el('startOv').hidden || !el('endOv').hidden || !el('bookOv').hidden || !el('stageOv').hidden || !el('shopOv').hidden || !el('setOv').hidden || !el('fxOv').hidden;

export function showStart(): void {
  el('startOv').hidden = false;
}

/** 시작 화면: 저장된 진행 (처음 하는 사람에게는 안 보임) */
export function setStartProfile(p: { level: number; gold: number; runs: number }, collected: number, total: number, wrongCount: number, goldText: string): void {
  const box = el('startProfile');
  box.hidden = p.runs === 0;
  // 처음 하는 사람에게는 단어장을 보여주지 않는다 (한 판이라도 해 본 뒤에 의미가 생김)
  el('btnBook').hidden = p.runs === 0;
  box.innerHTML = `<b>Lv ${p.level}</b> · <span class="g"></span>`;
  (box.querySelector('.g') as HTMLElement).textContent = goldText;
  el('bookCount').textContent = `${collected} / ${total}`;
  const badge = el('bookBadge');
  badge.hidden = wrongCount === 0;
  badge.textContent = String(wrongCount);
}

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
  el('endTitle').textContent = s.win ? '스테이지 클리어' : '쓰러졌어요';
  el('endSub').textContent = s.win ? `${s.stageName} 정화 완료` : `${s.stageName} · 틀린 단어는 다음 판에 더 자주 나와요`;
  el('btnRetry').textContent = s.hasNext ? '다음 스테이지 ▶' : '다시 하기';
  el('endOv').classList.toggle('ending', !!s.ending);
  if (s.ending) {
    el('endTitle').textContent = '고블린 왕을 물리쳤어요!';
    el('endSub').textContent = '마을 앞부터 요새까지, 베트남어로 길을 열었어요';
  }
  el('endTip').hidden = !s.tip;
  el('endTip').textContent = s.tip;
  el('btnMenu').classList.toggle('urge', !!s.tip);
  const box = el('endStars');
  box.hidden = !s.stars;
  const hint = document.createElement('small');
  hint.textContent = s.starHint;
  box.replaceChildren(starRow(s.stars), hint);
  const acc = s.total ? Math.round((s.correct / s.total) * 100) : 0;
  const time = (sec: number) => Math.floor(sec / 60) + '분 ' + (sec % 60) + '초';
  const rows: [string, string][] = s.ending
    ? [
        ['모은 단어', `${s.ending.collected} / ${s.ending.totalWords}`],
        ['전체 정답률', s.ending.accuracy + '%'],
        ['물리친 몬스터', s.ending.kills + '마리'],
        ['총 플레이 시간', time(s.ending.totalSeconds)],
      ]
    : [
        ['퀴즈 정답률', `${acc}% (${s.correct}/${s.total})`],
        ['처치한 몬스터', s.kills + '마리'],
        ['레벨', 'Lv ' + s.level],
        ['걸린 시간', time(s.seconds)],
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
  el('endLearnedHead').textContent = `새로 배운 단어 ${s.learnedWords.size}개` + (s.rebuildNote ? ` · ${s.rebuildNote}` : '');
  fillWords('endLearned', s.learnedWords, '이번 판에 새로 배운 단어가 없어요');
  el('endWrongsHead').textContent = `틀린 단어 ${s.wrongWords.size}개`;
  fillWords('endWrongs', s.wrongWords, '틀린 단어가 없어요');
  el('endOv').hidden = false;
  // 목록이 길어 잘리면 아래쪽을 흐리게 → "더 있으니 밀어 보라"는 표시. 끝까지 밀면 사라진다
  for (const id of ['endLearned', 'endWrongs']) {
    const ul = el(id);
    const mark = () => ul.classList.toggle('more', ul.scrollTop + ul.clientHeight < ul.scrollHeight - 2);
    ul.scrollTop = 0;
    ul.onscroll = mark;
    mark();
  }
}
