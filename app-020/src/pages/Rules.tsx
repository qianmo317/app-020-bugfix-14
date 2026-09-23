import { useState } from 'react';
import type { BuildingKind } from '../model';
import { resetRules, updateRules, useStore } from '../store/store';

const KINDS: { key: BuildingKind; label: string }[] = [
  { key: 'office', label: '办公楼' },
  { key: 'retail', label: '商业' },
  { key: 'factory', label: '厂房' },
  { key: 'school', label: '学校' },
];

/** 每个限值输入框旁标注该值所照的具体条文，避免规则页只写整份文号、落不到单项 */
function ClauseHint({ text }: { text: string }) {
  return <span className="hint clause">依据：{text}</span>;
}

export function RulesPage() {
  const rules = useStore((s) => s.rules);
  const [openKind, setOpenKind] = useState<BuildingKind>('office');

  return (
    <div className="page">
      <h2>校验规则配置</h2>
      <p className="hint">
        按建筑类别切换规则集；各类别独立保存，互不影响。修改数值后版本号自动 +1，此后的校验按新版重新计算，
        结果中逐条记录当时使用的规则版本、依据文号与具体条文（打印报告可见）。数值为参考值，请结合项目实际与当地规范调整。
      </p>
      <div className="ruletabs">
        {KINDS.map((k) => (
          <button key={k.key} className={openKind === k.key ? 'on' : ''} onClick={() => setOpenKind(k.key)}>
            {k.label}
          </button>
        ))}
      </div>
      {KINDS.map((k) => {
        const r = rules[k.key];
        if (k.key !== openKind) return null;
        return (
          <div className="section ruleform" key={k.key}>
            <h3>{k.label} · 规则 v{r.version}</h3>
            <label className="row">
              疏散距离限值（m，沿路径）
              <input type="number" min={5} step={1} value={r.maxTravelDistanceM}
                onChange={(e) => updateRules(k.key, { maxTravelDistanceM: Number(e.target.value) })} />
              <ClauseHint text={r.clauses.travel} />
            </label>
            <label className="row">
              袋形走道限值（m）
              <input type="number" min={5} step={1} value={r.deadEndDistanceM}
                onChange={(e) => updateRules(k.key, { deadEndDistanceM: Number(e.target.value) })} />
              <ClauseHint text={r.clauses.deadEnd} />
            </label>
            <label className="row">
              灭火器保护半径（m）
              <input type="number" min={3} step={1} value={r.extinguisherRadiusM}
                onChange={(e) => updateRules(k.key, { extinguisherRadiusM: Number(e.target.value) })} />
              <ClauseHint text={r.clauses.coverage} />
            </label>
            <label className="row">
              需 2 个出口的最小面积（㎡）
              <input type="number" min={0} step={50} value={r.exitMinAreaM2}
                onChange={(e) => updateRules(k.key, { exitMinAreaM2: Number(e.target.value) })} />
              <ClauseHint text={r.clauses.exits} />
            </label>
            <label className="row">
              需 2 个出口的最小人数
              <input type="number" min={0} step={5} value={r.exitMaxOccupants}
                onChange={(e) => updateRules(k.key, { exitMaxOccupants: Number(e.target.value) })} />
              <ClauseHint text={r.clauses.exits} />
            </label>
            <label className="row">
              依据文号（打印在报告上）
              <input value={r.source} onChange={(e) => updateRules(k.key, { source: e.target.value })} style={{ flex: 1 }} />
            </label>
            <button className="ghost" onClick={() => resetRules(k.key)}>恢复默认值</button>
          </div>
        );
      })}
    </div>
  );
}
