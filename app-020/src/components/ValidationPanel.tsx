import type { Pt, RuleSet, ValidationResult } from '../model';
import { useStore } from '../store/store';
import { isValidationStale } from '../lib/engine';

const TYPE_LABELS: Record<string, string> = {
  TRAVEL_EXCEED: '疏散距离超限',
  DEADEND_EXCEED: '袋形走道超限',
  EXIT_COUNT: '安全出口数量',
  EXIT_NOT_CONNECTED: '出口未连通',
  COVERAGE_UNCOVERED: '灭火器覆盖不足',
  CHECK_OVERDUE: '检查过期',
  CHECK_MISSING: '缺检查记录',
  FACILITY_DEFECT: '设施缺陷',
  NO_DOOR: '房间无门',
};

type Props = {
  floorId: string;
  result: ValidationResult | null;
  busy: boolean;
  rules: RuleSet;
  onLocate: (pt: Pt | null, sel?: { type: 'room' | 'facility'; id: string }) => void;
  onRevalidate: () => void;
};

export function ValidationPanel({ floorId, result, busy, rules, onLocate, onRevalidate }: Props) {
  const floor = useStore((s) => s.floors[floorId]);
  const stale = isValidationStale(result, rules);
  const snap = result?.rulesSnapshot;

  const locateCoverage = (pt: Pt) => onLocate(pt);

  return (
    <section className="validation">
      <h4>
        合规校验 {busy && <span className="spinner">校验中…</span>}
      </h4>
      {!result && !busy && <p className="hint">布置房间与设施后自动校验</p>}
      {result && (
        <>
          <div className={`verdict ${result.pass ? 'pass' : 'fail'}`}>
            {result.pass ? '✔ 当前规则下合规' : '✘ 存在不合规项'}
            <span className="hint"> 规则：{snap!.buildingKind} v{snap!.version}</span>
          </div>
          {stale && !busy && (
            <div className="stalebar">
              ⚠ 本结果按「{snap!.buildingKind} v{snap!.version}」校验，当前规则已为「{rules.buildingKind} v{rules.version}」，
              结论可能已变化。
              <button onClick={onRevalidate}>按新版重新校验</button>
            </div>
          )}
          <div className="statgrid">
            <div className="stat">
              <label>疏散最远（沿路径）</label>
              <b className={result.travelWorstM != null && result.travelWorstM > snap!.maxTravelDistanceM ? 'bad' : ''}>
                {result.travelWorstM != null ? `${result.travelWorstM.toFixed(1)}m` : '—'}
              </b>
              <span title={snap!.clauses.travel}>
                限值 {snap!.maxTravelDistanceM}m{snap!.version !== rules.version ? `（现 ${rules.maxTravelDistanceM}m）` : ''}
              </span>
              {result.travelWorstPoint && (
                <button className="ghost" onClick={() => onLocate(result.travelWorstPoint!)}>定位</button>
              )}
            </div>
            <div className="stat">
              <label>袋形走道（死端）</label>
              <b className={result.deadEndM != null && result.deadEndM > snap!.deadEndDistanceM ? 'bad' : ''}>
                {result.deadEndM != null ? `${result.deadEndM.toFixed(1)}m` : '—'}
              </b>
              <span title={snap!.clauses.deadEnd}>
                限值 {snap!.deadEndDistanceM}m{snap!.version !== rules.version ? `（现 ${rules.deadEndDistanceM}m）` : ''}
              </span>
            </div>
            <div className="stat">
              <label>灭火器未覆盖</label>
              <b className={result.coverage && !result.coverage.pass ? 'bad' : ''}>
                {result.coverage ? `${result.coverage.uncoveredM2.toFixed(1)}㎡` : '—'}
              </b>
              <span title={snap!.clauses.extinguisher}>
                半径 {snap!.extinguisherRadiusM}m{snap!.version !== rules.version ? `（现 ${rules.extinguisherRadiusM}m）` : ''}
              </span>
              {result.coverage && result.coverage.samples.length > 0 && (
                <button className="ghost" onClick={() => locateCoverage(result.coverage!.samples[0])}>看未覆盖点</button>
              )}
            </div>
            <div className="stat">
              <label>安全出口</label>
              <b className={result.exits.present < result.exits.required ? 'bad' : ''}>
                {result.exits.present}/{result.exits.required}
              </b>
              <span>现有/需要</span>
            </div>
          </div>
          <div className="items">
            {result.items.length === 0 && <p className="hint">无不合规项</p>}
            {result.items.map((it, i) => (
              <button
                key={i}
                className={`item ${it.severity}`}
                onClick={() => {
                  const sel = it.facilityId
                    ? { type: 'facility' as const, id: it.facilityId }
                    : it.roomId
                      ? { type: 'room' as const, id: it.roomId }
                      : undefined;
                  onLocate(it.point ?? null, sel);
                }}
              >
                <span className={`dot ${it.severity}`} />
                <span>
                  <b>{TYPE_LABELS[it.type] ?? it.type}</b> {it.message}
                  {it.basis && (
                    <span className="basis">
                      依据：{it.basis.clause ?? it.basis.source}（{it.basis.buildingKind} v{it.basis.rulesVersion}）
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
          <p className="hint">
            依据文号：{snap!.source}（结果记录于 {new Date(result.checkedAt).toLocaleString('zh-CN')}）
          </p>
        </>
      )}
      {floor && (
        <p className="hint">
          楼层版本 v{floor.version} · 校验按「{rules.buildingKind}」规则 v{rules.version} 执行
          {stale && ' · 当前结果为旧版规则，请重新校验'}
        </p>
      )}
    </section>
  );
}
