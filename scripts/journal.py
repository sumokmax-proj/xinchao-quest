"""일지 도우미 (Claude 자율 개발용): 사이클 항목을 '오너에게' 섹션 앞에 넣고, '오너에게' 섹션을 통째로 바꾼다.
사용: python scripts/journal.py <cycle.md> <owner.md>   (둘 중 필요 없는 쪽은 '-')
"""
import sys
p = 'docs/dev-journal.md'
s = open(p, encoding='utf-8').read()
MARK = '\n## 오너에게'
head, _, tail = s.partition(MARK)
owner = MARK + tail if tail else ''
cyc, own = sys.argv[1], sys.argv[2]
if cyc != '-':
    head = head.rstrip('\n') + '\n\n' + open(cyc, encoding='utf-8').read().strip('\n') + '\n'
if own != '-':
    owner = '\n' + open(own, encoding='utf-8').read().strip('\n') + '\n'
open(p, 'w', encoding='utf-8').write(head.rstrip('\n') + '\n' + owner)
