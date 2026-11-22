/** "몇 초 뒤에 이거 해줘" 목록. 게임 시간(dt)으로 흐르므로 일시정지와 함께 멈춘다. */
export class Timers {
  private list: { t: number; fn: () => void }[] = [];

  after(seconds: number, fn: () => void): void {
    this.list.push({ t: seconds, fn });
  }

  update(dt: number): void {
    const due: (() => void)[] = [];
    this.list = this.list.filter((x) => {
      x.t -= dt;
      if (x.t <= 0) {
        due.push(x.fn);
        return false;
      }
      return true;
    });
    due.forEach((f) => f());
  }

  clear(): void {
    this.list = [];
  }

  get size(): number {
    return this.list.length;
  }
}
