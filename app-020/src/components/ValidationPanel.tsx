import type { Pt, RuleSet, ValidationResult } from '../model';
import { useStore } from '../store/store';

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

const KIND_LABELS: Record<string, string> = {
  office: '办公楼',
  retail: '商业',
  factory: '厂房',
  school: '学校',
};

type Props = {
  floorId: string;
  result: ValidationResult | null;
  busy: boolean;
  rules: RuleSet;
  onLocate: (pt: Pt | null, sel?: { type: 'room' | 'facility'; id: string }) => void;
};

export function ValidationPanel({ floorId, result, busy, rules, onLocate }: Props) {
  const floor = useStore((s) => s.floors[floorId]);

  const locateCoverage = (pt: Pt) => onLocate(pt);

  // 结果是否落后于当前规则（类别或版本对不上）：改完规则到重新校验落盘之间，
  // 以及本次会话规则又被改过的历史结果，都要显式标出，避免拿旧版结论当现状
  const snap = result?.rulesSnapshot;
  const stale =
    !!snap && (snap.buildingKind !== rules.buildingKind || snap.version !== rules.version);

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
            <span className="hint"> 结果按：{KIND_LABELS[snap!.buildingKind] ?? snap!.buildingKind} v{snap!.version}</span>
          </div>
          {stale && (
            <p className="hint stale-warn">
              ⚠ 规则已更新为「{KIND_LABELS[rules.buildingKind] ?? rules.buildingKind} v{rules.version}」，
              {busy ? '正在按新版重新校验…' : '以下结果仍为旧版判定，请以重新校验后的结论为准'}
            </p>
          )}
          <div className="statgrid">
            <div className="stat">
              <label>疏散最远（沿路径）</label>
              <b className={result.travelWorstM != null && result.travelWorstM > snap!.maxTravelDistanceM ? 'bad' : ''}>
                {result.travelWorstM != null ? `${result.travelWorstM.toFixed(1)}m` : '—'}
              </b>
              <span>限值 {snap!.maxTravelDistanceM}m</span>
              {result.travelWorstPoint && (
                <button className="ghost" onClick={() => onLocate(result.travelWorstPoint!)}>定位</button>
              )}
            </div>
            <div className="stat">
              <label>袋形走道（死端）</label>
              <b className={result.deadEndM != null && result.deadEndM > snap!.deadEndDistanceM ? 'bad' : ''}>
                {result.deadEndM != null ? `${result.deadEndM.toFixed(1)}m` : '—'}
              </b>
              <span>限值 {snap!.deadEndDistanceM}m</span>
            </div>
            <div className="stat">
              <label>灭火器未覆盖</label>
              <b className={result.coverage && !result.coverage.pass ? 'bad' : ''}>
                {result.coverage ? `${result.coverage.uncoveredM2.toFixed(1)}㎡` : '—'}
              </b>
              <span>半径 {snap!.extinguisherRadiusM}m</span>
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
                  <span className="hint item-basis">依据：{it.basis}</span>
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
          楼层版本 v{floor.version} · 当前规则：「{KIND_LABELS[rules.buildingKind] ?? rules.buildingKind}」v{rules.version}
        </p>
      )}
    </section>
  );
}
