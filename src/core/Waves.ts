import type { EnemyKind } from '../config';

export interface WaveData {
  label: string;
  enemies: EnemyKind[];
}

export type WaveEvent = { kind: 'next'; index: number } | { kind: 'clear' };

/**
 * 웨이브 진행. 남은 적이 0이 되면 딱 한 번만 "다음 웨이브" 또는 "클리어"를 알려준다.
 * 다음 웨이브를 실제로 내보낸 뒤 advance()를 불러야 다시 검사한다.
 */
export class WaveProgress {
  index = 0;
  private busy = false;

  constructor(readonly total: number) {
    if (total < 1) throw new Error('웨이브가 하나도 없음');
  }

  check(enemiesLeft: number): WaveEvent | null {
    if (this.busy || enemiesLeft > 0) return null;
    this.busy = true;
    return this.index + 1 < this.total ? { kind: 'next', index: this.index + 1 } : { kind: 'clear' };
  }

  advance(): void {
    this.index++;
    this.busy = false;
  }

  reset(): void {
    this.index = 0;
    this.busy = false;
  }
}
