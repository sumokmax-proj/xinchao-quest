import { dexProgress, type Dex } from '../core/Progress';
import { isUnlocked, stageWords, type StageData, type StageRecords } from '../core/Stages';
import { el } from './dom';

/**
 * 스테이지 목록. 깬 스테이지는 ★, 아직 못 여는 스테이지는 잠김.
 * 카드마다 그 스테이지 주제의 도감 진행(모은 단어 / 전체)을 보여준다.
 */
export class StageSelect {
  constructor(private onPick: (index: number) => void) {
    el('btnStageClose').addEventListener('click', () => this.close());
  }

  open(stages: readonly StageData[], records: StageRecords, dex: Dex, words: readonly { vi: string; topic?: string }[]): void {
    const list = el('stageList');
    list.replaceChildren();
    let focus: HTMLButtonElement | null = null;
    stages.forEach((st, i) => {
      const unlocked = isUnlocked(stages, records, i);
      const rec = records[st.id];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'stage' + (unlocked ? '' : ' locked') + (rec?.clears ? ' cleared' : '');
      b.disabled = !unlocked;
      const num = document.createElement('span');
      num.className = 'num';
      num.textContent = unlocked ? String(i + 1) : '';
      const body = document.createElement('span');
      body.className = 'body';
      const name = document.createElement('b');
      name.textContent = st.name;
      const topics = document.createElement('small');
      const { main } = stageWords(words, stages, i);
      const prog = dexProgress(dex, main);
      topics.textContent = (st.topics.length ? st.topics.join(' · ') : '모든 단어') + ` · 단어 ${prog.collected}/${prog.total}`;
      body.append(name, topics);
      const star = document.createElement('span');
      star.className = 'star';
      star.textContent = rec?.clears ? '★' : '';
      b.append(num, body, star);
      if (unlocked) {
        b.addEventListener('click', () => this.onPick(i));
        focus = b;
      }
      list.appendChild(b);
    });
    el('stageOv').hidden = false;
    // 가장 뒤의 열린 스테이지가 보이게
    (focus as HTMLButtonElement | null)?.scrollIntoView({ block: 'nearest' });
  }

  close(): void {
    el('stageOv').hidden = true;
  }
}
