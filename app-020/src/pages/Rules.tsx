import { useState } from 'react';
import type { BuildingKind, RuleClauseKey } from '../model';
import { resetRules, updateRuleClause, updateRules, useStore } from '../store/store';

const KINDS: { key: BuildingKind; label: string }[] = [
  { key: 'office', label: '办公楼' },
  { key: 'retail', label: '商业' },
  { key: 'factory', label: '厂房' },
  { key: 'school', label: '学校' },
];

/** 每个可配置限值对应一条可编辑条文 */
const CLAUSE_FIELDS: { key: RuleClauseKey; label: string }[] = [
  { key: 'travel', label: '疏散距离条文' },
  { key: 'deadEnd', label: '袋形走道条文' },
  { key: 'extinguisher', label: '灭火器半径条文' },
  { key: 'exitArea', label: '出口数量（面积）条文' },
  { key: 'exitOccupants', label: '出口数量（人数）条文' },
  { key: 'connection', label: '出口连通性条文' },
  { key: 'check', label: '设施检查依据' },
];

export function RulesPage() {
  const rules = useStore((s) => s.rules);
  const [openKind, setOpenKind] = useState<BuildingKind>('office');

  return (
    <div className="page">
      <h2>校验规则配置</h2>
      <p className="hint">
        按建筑类别分别维护规则集，各类别互不影响；修改数值或条文后版本号自动 +1，
        此后重新校验的结果会逐项记录当时使用的规则版本、依据文号与具体条文（打印报告可见）。
        数值为参考值，请结合项目实际与当地规范调整。
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
            <h3>
              {k.label} · 规则 v{r.version}
              <span className="hint">
                {' '}最近修改：{new Date(r.updatedAt).getTime() <= 0 ? '默认值' : new Date(r.updatedAt).toLocaleString('zh-CN')}
              </span>
            </h3>
            <label className="row">
              疏散距离限值（m，沿路径）
              <input type="number" min={5} step={1} value={r.maxTravelDistanceM}
                onChange={(e) => updateRules(k.key, { maxTravelDistanceM: Number(e.target.value) })} />
            </label>
            <label className="row">
              袋形走道限值（m）
              <input type="number" min={5} step={1} value={r.deadEndDistanceM}
                onChange={(e) => updateRules(k.key, { deadEndDistanceM: Number(e.target.value) })} />
            </label>
            <label className="row">
              灭火器保护半径（m）
              <input type="number" min={3} step={1} value={r.extinguisherRadiusM}
                onChange={(e) => updateRules(k.key, { extinguisherRadiusM: Number(e.target.value) })} />
            </label>
            <label className="row">
              需 2 个出口的最小面积（㎡）
              <input type="number" min={0} step={50} value={r.exitMinAreaM2}
                onChange={(e) => updateRules(k.key, { exitMinAreaM2: Number(e.target.value) })} />
            </label>
            <label className="row">
              需 2 个出口的最小人数
              <input type="number" min={0} step={5} value={r.exitMaxOccupants}
                onChange={(e) => updateRules(k.key, { exitMaxOccupants: Number(e.target.value) })} />
            </label>
            <label className="row">
              依据文号（打印在报告上）
              <input value={r.source} onChange={(e) => updateRules(k.key, { source: e.target.value })} style={{ flex: 1 }} />
            </label>

            <h4>逐项判定条文（随校验结果逐条留痕）</h4>
            {CLAUSE_FIELDS.map((f) => (
              <label className="row clause-row" key={f.key}>
                {f.label}
                <textarea
                  rows={2}
                  value={r.clauses[f.key]}
                  onChange={(e) => updateRuleClause(k.key, f.key, e.target.value)}
                  style={{ flex: 1 }}
                />
              </label>
            ))}

            <button className="ghost" onClick={() => resetRules(k.key)}>恢复默认值</button>
          </div>
        );
      })}
    </div>
  );
}
