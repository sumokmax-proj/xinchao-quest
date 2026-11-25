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
  private zoomTarget = 1;
  private zoomLeft = 0;

  /** 잠깐 확대했다가 돌아온다 (마무리 일격) */
  punch(zoom: number, seconds: number): void {
    this.zoomTarget = zoom;
    this.zoomLeft = seconds;
  }

  /** 새 판: 남은 흔들림·확대를 지운다 */
  resetFx(): void {
    this.shakeAmount = 0;
    this.zoomLeft = 0;
    this.setZoom(1);
  }

  private setZoom(zoom: number): void {
    if (this.camera.zoom === zoom) return;
    this.camera.zoom = zoom;
    this.camera.updateProjectionMatrix();
  }

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
    const want = this.zoomLeft > 0 ? this.zoomTarget : 1;
    this.zoomLeft -= dt;
    const zoom = this.camera.zoom + (want - this.camera.zoom) * Math.min(1, dt * 12);
    this.setZoom(Math.abs(zoom - want) < 0.001 ? want : zoom);
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
