import { CONFIG } from '../config';
import { buildDex, buildWrongList, type BookEntry, type Dex, type WrongEntry } from '../core/Progress';
import { hasVietnameseVoice, speak } from '../audio/Voice';
import { el } from './dom';

type Tab = 'dex' | 'wrong';
interface WordLike {
  vi: string;
  ko: string;
  topic?: string;
}

/**
 * 단어장: 도감(처음 맞힌 단어 모음, 주제별) + 오답노트(아직 덜 익힌 단어).
 * 줄을 누르면 베트남어 발음을 들려준다 (기기에 베트남어 음성이 있을 때).
 */
export class WordBook {
  private tab: Tab = 'dex';
  private words: readonly WordLike[] = [];
  private dex: Dex = {};
  private note: Record<string, number> = {};

  constructor() {
    el('tabDex').addEventListener('click', () => this.show('dex'));
    el('tabWrong').addEventListener('click', () => this.show('wrong'));
    el('btnBookClose').addEventListener('click', () => this.close());
  }

  open(words: readonly WordLike[], dex: Dex, note: Record<string, number>, tab?: Tab): void {
    this.words = words;
    this.dex = dex;
    this.note = note;
    el('bookOv').hidden = false;
    this.show(tab ?? (Object.keys(note).length ? this.tab : 'dex'));
  }

  close(): void {
    el('bookOv').hidden = true;
  }

  private show(tab: Tab): void {
    this.tab = tab;
    const topics = buildDex(this.words, this.dex);
    const wrong = buildWrongList(this.words, this.note);
    const collected = topics.reduce((n, t) => n + t.collected, 0);
    el('tabDexN').textContent = `${collected} / ${this.words.length}`;
    el('tabWrongN').textContent = String(wrong.length);
    el('tabDex').classList.toggle('on', tab === 'dex');
    el('tabWrong').classList.toggle('on', tab === 'wrong');
    const list = el('bookList');
    list.replaceChildren();
    list.scrollTop = 0;
    if (tab === 'dex') {
      for (const t of topics) {
        const h = document.createElement('h3');
        h.className = 'topic';
        h.innerHTML = `<span></span><small>${t.collected} / ${t.total}</small>`;
        (h.firstChild as HTMLElement).textContent = t.topic;
        const bar = document.createElement('i');
        bar.className = 'tbar';
        bar.style.setProperty('--p', String(t.total ? t.collected / t.total : 0));
        h.appendChild(bar);
        list.appendChild(h);
        t.entries.forEach((e) => list.appendChild(this.row(e)));
      }
    } else if (wrong.length) {
      wrong.forEach((w) => list.appendChild(this.wrongRow(w)));
    } else {
      const p = document.createElement('p');
      p.className = 'empty';
      p.textContent = '틀린 단어가 없어요';
      list.appendChild(p);
    }
  }

  /** 도감 한 줄. 아직 못 맞힌 단어는 뜻만 보이고 베트남어는 가려진다 */
  private row(e: BookEntry): HTMLElement {
    const b = this.speakRow(e.collected ? e.vi : null);
    b.classList.toggle('locked', !e.collected);
    const vi = document.createElement('b');
    vi.lang = 'vi';
    vi.textContent = e.collected ? e.vi : '? ? ?';
    const ko = document.createElement('span');
    ko.textContent = e.ko;
    b.append(vi, ko);
    return b;
  }

  /** 오답노트 한 줄: 점(●)은 오답노트에서 빠지기까지 맞힌 횟수 */
  private wrongRow(w: WrongEntry): HTMLElement {
    const b = this.speakRow(w.vi);
    const vi = document.createElement('b');
    vi.lang = 'vi';
    vi.textContent = w.vi;
    const ko = document.createElement('span');
    ko.textContent = w.ko;
    const need = CONFIG.quiz.reviewClearAt - 1;
    const dots = document.createElement('em');
    dots.className = 'dots';
    dots.textContent = '●'.repeat(w.score - 1) + '○'.repeat(Math.max(0, need - (w.score - 1)));
    b.append(vi, ko, dots);
    return b;
  }

  private speakRow(vi: string | null): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'wrow';
    if (vi && hasVietnameseVoice()) {
      b.classList.add('speak');
      b.addEventListener('click', () => speak(vi));
    } else {
      b.disabled = true;
    }
    return b;
  }
}
