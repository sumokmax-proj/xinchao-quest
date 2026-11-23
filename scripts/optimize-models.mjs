/**
 * 받은 glTF 모델(.glb)을 게임용으로 줄인다 (Claude 자율 개발용 도구).
 * - 쓰지 않는 애니메이션을 지우고, 안 쓰게 된 데이터를 정리해서 용량을 줄인다 (모바일 로딩)
 * - 결과는 public/models/<이름>.glb
 *
 * 사용: node scripts/optimize-models.mjs <원본 폴더>
 * 원본은 git에 넣지 않는다 (용량). 출처·라이선스는 public/models/CREDITS.md
 */
import { NodeIO } from '@gltf-transform/core';
import { prune, dedup, resample, quantize } from '@gltf-transform/functions';
import { statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = process.argv[2];
if (!SRC) {
  console.error('사용: node scripts/optimize-models.mjs <원본 폴더>');
  process.exit(1);
}

/** 모델별로 남길 애니메이션 */
const HERO = ['Idle', 'Walking_A', '1H_Melee_Attack_Slice_Horizontal', '1H_Melee_Attack_Chop', 'Hit_A', 'Death_A', 'Cheer'];
const NPC = ['Idle', 'Interact', 'Cheer'];
const JOBS = [
  { src: 'Knight.glb', out: 'hero.glb', keep: HERO },
  { src: 'Barbarian.glb', out: 'npc-barbarian.glb', keep: NPC },
  { src: 'Mage.glb', out: 'npc-mage.glb', keep: NPC },
  { src: 'Rogue_Hooded.glb', out: 'npc-rogue.glb', keep: NPC },
];

const io = new NodeIO();
for (const job of JOBS) {
  const doc = await io.read(join(SRC, job.src));
  for (const anim of doc.getRoot().listAnimations()) {
    if (job.keep.includes(anim.getName())) continue;
    // 애니메이션만 지우면 그 안의 키프레임 데이터가 남아서 같이 지운다
    anim.listChannels().forEach((c) => c.dispose());
    anim.listSamplers().forEach((s) => s.dispose());
    anim.dispose();
  }
  await doc.transform(dedup(), resample(), quantize(), prune());
  const out = join('public', 'models', job.out);
  await io.write(out, doc);
  const kept = doc.getRoot().listAnimations().map((a) => a.getName());
  console.log(`${job.out}: ${Math.round(statSync(out).size / 1024)}KB, 애니메이션 ${kept.join(', ')}`);
}
