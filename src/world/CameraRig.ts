import * as THREE from 'three';
import { CONFIG } from '../config';
import { rand, defaultRng } from '../core/random';

/** 직교 카메라. 회전 없이 플레이어를 부드럽게 따라가고, 맞거나 때리면 흔들린다. */
export class CameraRig {
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  private readonly offset = new THREE.Vector3(CONFIG.camera.offset.x, CONFIG.camera.offset.y, CONFIG.camera.offset.z);
  private readonly target = new THREE.Vector3();
  private readonly tmp = new THREE.Vector3();
  private shakeAmount = 0;

  snapTo(x: number, z: number): void {
    this.target.set(x, 0, z - CONFIG.camera.lookAhead);
  }

  shake(amount: number): void {
    this.shakeAmount = Math.max(this.shakeAmount, amount);
  }

  update(dt: number, follow: { x: number; z: number } | null): void {
    const cam = CONFIG.camera;
    if (follow) this.target.lerp(this.tmp.set(follow.x, 0, follow.z - cam.lookAhead), Math.min(1, dt * cam.followSpeed));
    this.shakeAmount = Math.max(0, this.shakeAmount - dt * cam.shakeDecay);
    this.camera.position.copy(this.target).add(this.offset);
    if (this.shakeAmount > 0) {
      this.camera.position.add(this.tmp.set(rand(defaultRng, -1, 1) * this.shakeAmount, 0, rand(defaultRng, -1, 1) * this.shakeAmount));
    }
    this.camera.lookAt(this.camera.position.x - this.offset.x, 0, this.camera.position.z - this.offset.z);
  }

  /** 화면 가로에 7.6칸이 보이도록 */
  resize(width: number, height: number): void {
    const viewW = CONFIG.camera.viewWidth;
    const viewH = (viewW * height) / width;
    Object.assign(this.camera, { left: -viewW / 2, right: viewW / 2, top: viewH / 2, bottom: -viewH / 2 });
    this.camera.updateProjectionMatrix();
  }
}
