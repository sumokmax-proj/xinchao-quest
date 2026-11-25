import * as THREE from 'three';
import { rand, defaultRng } from '../core/random';

const particleGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
const teleGeo = new THREE.PlaneGeometry(0.92, 0.92);

interface Particle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
}

/** 처치 때 튀는 조각들 */
export class Particles {
  private list: Particle[] = [];
  constructor(private scene: THREE.Scene) {}

  burst(x: number, z: number, n: number, color: THREE.ColorRepresentation): void {
    const m = new THREE.MeshLambertMaterial({ color });
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(particleGeo, m);
      mesh.position.set(x, 0.5, z);
      this.scene.add(mesh);
      const a = rand(defaultRng, 0, Math.PI * 2);
      const sp = rand(defaultRng, 1.5, 3.5);
      this.list.push({ mesh, vx: Math.cos(a) * sp, vy: rand(defaultRng, 2.5, 5), vz: Math.sin(a) * sp, life: rand(defaultRng, 0.6, 1) });
    }
  }

  /** 때린 자리에서 튀는 작은 불꽃 (빛나는 재질, 짧게) */
  spark(x: number, z: number, n: number, color: THREE.ColorRepresentation): void {
    const m = new THREE.MeshBasicMaterial({ color });
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(particleGeo, m);
      mesh.position.set(x, 0.6, z);
      mesh.scale.setScalar(0.6);
      this.scene.add(mesh);
      const a = rand(defaultRng, 0, Math.PI * 2);
      const sp = rand(defaultRng, 2.5, 4.5);
      this.list.push({ mesh, vx: Math.cos(a) * sp, vy: rand(defaultRng, 1.5, 3.5), vz: Math.sin(a) * sp, life: rand(defaultRng, 0.18, 0.32) });
    }
  }

  update(dt: number): void {
    this.list = this.list.filter((p) => {
      p.life -= dt;
      p.vy -= 12 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y = Math.max(0.06, p.mesh.position.y + p.vy * dt);
      p.mesh.position.z += p.vz * dt;
      p.mesh.rotation.x += dt * 8;
      p.mesh.scale.setScalar(Math.max(0.01, p.life));
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        return false;
      }
      return true;
    });
  }

  clear(): void {
    this.list.forEach((p) => this.scene.remove(p.mesh));
    this.list = [];
  }
}

const waveGeo = new THREE.RingGeometry(0.82, 1, 40);

interface Wave {
  mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  t: number;
  radius: number;
  duration: number;
}

/** 바닥으로 퍼지는 원 띠. 빨간 예고와 헷갈리지 않게 밝은 금색·흰색만 쓴다 (셰이더 없이 메시 하나) */
export class Shockwaves {
  private list: Wave[] = [];
  constructor(private scene: THREE.Scene) {}

  get count(): number {
    return this.list.length;
  }

  add(x: number, z: number, radius: number, duration: number, color: THREE.ColorRepresentation): void {
    const mesh = new THREE.Mesh(waveGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.05, z);
    mesh.scale.setScalar(0.2);
    this.scene.add(mesh);
    this.list.push({ mesh, t: 0, radius, duration });
  }

  update(dt: number): void {
    this.list = this.list.filter((w) => {
      w.t += dt;
      const k = Math.min(1, w.t / w.duration);
      const ease = 1 - (1 - k) * (1 - k);
      w.mesh.scale.setScalar(Math.max(0.2, w.radius * ease));
      w.mesh.material.opacity = 0.9 * (1 - k);
      if (k >= 1) {
        this.remove(w);
        return false;
      }
      return true;
    });
  }

  clear(): void {
    this.list.forEach((w) => this.remove(w));
    this.list = [];
  }

  private remove(w: Wave): void {
    this.scene.remove(w.mesh);
    w.mesh.material.dispose();
  }
}

/** 바닥의 빨간 예고 칸 */
export function makeTelegraphMesh(x: number, z: number): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  const mesh = new THREE.Mesh(teleGeo, new THREE.MeshBasicMaterial({ color: '#ff3b2b', transparent: true, opacity: 0.2, depthWrite: false }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.02, z);
  return mesh;
}
