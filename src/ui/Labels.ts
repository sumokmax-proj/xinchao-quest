import * as THREE from 'three';
import { el } from './dom';

const v = new THREE.Vector3();

/** 3D 좌표 → 화면 좌표(px). HTML 라벨을 3D 물체 위에 붙일 때 쓴다 */
export function toScreen(camera: THREE.Camera, x: number, y: number, z: number): { x: number; y: number } {
  const game = el('game');
  v.set(x, y, z).project(camera);
  return { x: ((v.x + 1) / 2) * game.clientWidth, y: ((1 - v.y) / 2) * game.clientHeight };
}

/** 떠오르는 숫자 (데미지, 회복, 보상) */
export function floatText(camera: THREE.Camera, x: number, y: number, z: number, text: string, cls = ''): void {
  const p = toScreen(camera, x, y, z);
  const s = document.createElement('div');
  s.className = 'float ' + cls;
  s.textContent = text;
  s.style.left = p.x + 'px';
  s.style.top = p.y + 'px';
  el('labels').appendChild(s);
  setTimeout(() => s.remove(), 950);
}

/** 고블린 머리 위 HP 바 */
export class HpLabel {
  readonly root: HTMLDivElement;
  private fill: HTMLElement;

  constructor(boss: boolean) {
    this.root = document.createElement('div');
    this.root.className = 'ghp' + (boss ? ' boss' : '');
    this.fill = document.createElement('i');
    this.root.appendChild(this.fill);
    el('labels').appendChild(this.root);
  }

  update(visible: boolean, x: number, y: number, ratio: number): void {
    this.root.style.display = visible ? 'block' : 'none';
    if (!visible) return;
    this.root.style.transform = `translate(${x}px,${y}px)`;
    this.fill.style.width = ratio * 100 + '%';
  }

  remove(): void {
    this.root.remove();
  }
}
