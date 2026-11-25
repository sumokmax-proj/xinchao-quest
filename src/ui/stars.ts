/** 별 3칸: 받은 만큼 금색, 나머지는 빈 별 */
export function starRow(stars: number): HTMLSpanElement {
  const row = document.createElement('span');
  row.className = 'starrow';
  row.setAttribute('role', 'img');
  row.setAttribute('aria-label', `별 3개 중 ${stars}개`);
  for (let i = 0; i < 3; i++) {
    const s = document.createElement('i');
    s.className = i < stars ? 'on' : '';
    s.textContent = '★';
    row.appendChild(s);
  }
  return row;
}
