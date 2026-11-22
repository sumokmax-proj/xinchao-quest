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

/** 바닥의 빨간 예고 칸 */
export function makeTelegraphMesh(x: number, z: number): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  const mesh = new THREE.Mesh(teleGeo, new THREE.MeshBasicMaterial({ color: '#ff3b2b', transparent: true, opacity: 0.2, depthWrite: false }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.02, z);
  return mesh;
}
