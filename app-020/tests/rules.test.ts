/**
 * 规则切换验收用例（验收标准：同一图纸在不同建筑类别规则下结论不同）+
 * 规则版本化快照（校验结果记录当时使用的规则版本与依据文号）
 */
import { describe, it, expect } from 'vitest';
import { isValidationStale, normalizeValidationResult } from '../src/lib/engine';
import { mkRoom, rect, mkFloor, ruleWith, DEFAULT_RULES, validateFloor } from './helpers';

describe('规则切换（同一图纸，结论不同）', () => {
  it('R1 办公楼（r20）合格 vs 厂房（r12）覆盖不合格', () => {
    const { floor } = mkFloor([mkRoom('走道', 'corridor', rect(0, 0, 41, 2))], [
      { kind: 'exit', x: 0.5, y: 1 },
      { kind: 'exit', x: 40.5, y: 1 },
      { kind: 'extinguisher', x: 20.5, y: 1 },
    ]);
    const office = validateFloor(floor, DEFAULT_RULES.office);
    expect(office.pass).toBe(true);
    const factory = validateFloor(floor, DEFAULT_RULES.factory);
    expect(factory.pass).toBe(false);
    expect(factory.items.some((i) => i.type === 'COVERAGE_UNCOVERED')).toBe(true);
  });

  it('R2 死端限值 22（办公）vs 20（商业）：21m 袋形走道结论不同', () => {
    const { floor } = mkFloor([mkRoom('走道', 'corridor', rect(0, 0, 21, 2))], [
      { kind: 'exit', x: 20.5, y: 1 },
      { kind: 'extinguisher', x: 10.5, y: 1 },
    ]);
    const office = validateFloor(floor, DEFAULT_RULES.office);
    expect(office.items.some((i) => i.type === 'DEADEND_EXCEED')).toBe(false);
    expect(office.pass).toBe(true);
    const retail = validateFloor(floor, DEFAULT_RULES.retail);
    expect(retail.items.some((i) => i.type === 'DEADEND_EXCEED')).toBe(true);
    expect(retail.pass).toBe(false);
  });

  it('R3 修改规则后版本 +1 且校验快照记录版本与依据文号', () => {
    const { floor } = mkFloor([mkRoom('走道', 'corridor', rect(0, 0, 21, 2))], [
      { kind: 'exit', x: 20.5, y: 1 },
      { kind: 'extinguisher', x: 10.5, y: 1 },
    ]);
    const tightened = ruleWith(DEFAULT_RULES.office, {
      maxTravelDistanceM: 10,
      version: 7,
      source: '测试依据文件 X-001',
    });
    const r = validateFloor(floor, tightened);
    expect(r.rulesSnapshot.version).toBe(7);
    expect(r.rulesSnapshot.source).toBe('测试依据文件 X-001');
    expect(r.rulesSnapshot.buildingKind).toBe('office');
    expect(r.rulesSnapshot.maxTravelDistanceM).toBe(10);
    // 实测值也记录在项中，报告可打印「凭什么判超标」
    const exceed = r.items.find((i) => i.type === 'TRAVEL_EXCEED');
    expect(exceed).toBeDefined();
    expect(exceed!.value).not.toBeNull();
    expect(exceed!.limit).toBe(10);
  });

  it('R4 默认规则集：各类别限值与依据文号完整', () => {
    expect(DEFAULT_RULES.office.maxTravelDistanceM).toBe(40);
    expect(DEFAULT_RULES.office.deadEndDistanceM).toBe(22);
    expect(DEFAULT_RULES.retail.extinguisherRadiusM).toBe(20);
    expect(DEFAULT_RULES.factory.maxTravelDistanceM).toBe(30);
    expect(DEFAULT_RULES.factory.extinguisherRadiusM).toBe(12);
    expect(DEFAULT_RULES.school.maxTravelDistanceM).toBe(35);
    for (const k of ['office', 'retail', 'factory', 'school'] as const) {
      expect(DEFAULT_RULES[k].buildingKind).toBe(k);
      expect(DEFAULT_RULES[k].source.length).toBeGreaterThan(5);
      expect(DEFAULT_RULES[k].version).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('规则版本 / 类别 / 依据随结果留痕', () => {
  const makeFloor = () =>
    mkFloor([mkRoom('走道', 'corridor', rect(0, 0, 21, 2))], [
      { kind: 'exit', x: 20.5, y: 1 },
      { kind: 'extinguisher', x: 10.5, y: 1 },
    ]);

  it('R5 快照记录当版全部限值，不再是 0（旧 bug：改了半径/疏散距离，记录里仍是 0/上一版）', () => {
    const { floor } = makeFloor();
    const v2 = ruleWith(DEFAULT_RULES.factory, {
      maxTravelDistanceM: 25,
      deadEndDistanceM: 18,
      extinguisherRadiusM: 15,
      exitMinAreaM2: 180,
      exitMaxOccupants: 40,
      version: 3,
    });
    const r = validateFloor(floor, v2);
    expect(r.rulesSnapshot.maxTravelDistanceM).toBe(25);
    expect(r.rulesSnapshot.deadEndDistanceM).toBe(18);
    expect(r.rulesSnapshot.extinguisherRadiusM).toBe(15);
    expect(r.rulesSnapshot.exitMinAreaM2).toBe(180);
    expect(r.rulesSnapshot.exitMaxOccupants).toBe(40);
    expect(r.rulesSnapshot.version).toBe(3);
  });

  it('R6 每条超限项都带有「类别+版本+文号+具体条文」，可逐条追溯判据', () => {
    const { floor } = makeFloor(); // 21m 走道在 office v1 下死端 22 以内，收紧到 10 后触发
    const tightened = ruleWith(DEFAULT_RULES.office, {
      maxTravelDistanceM: 10,
      deadEndDistanceM: 10,
      version: 9,
      source: '自定义文号 Z-2026',
      clauses: { ...DEFAULT_RULES.office.clauses, deadEnd: '自定义条文 第D条', travel: '自定义条文 第T条' },
    });
    const r = validateFloor(floor, tightened);
    const ruleItems = r.items.filter((i) =>
      ['TRAVEL_EXCEED', 'DEADEND_EXCEED', 'COVERAGE_UNCOVERED', 'EXIT_COUNT', 'CHECK_OVERDUE', 'CHECK_MISSING', 'FACILITY_DEFECT', 'EXIT_NOT_CONNECTED'].includes(i.type),
    );
    expect(ruleItems.length).toBeGreaterThan(0);
    for (const it of ruleItems) {
      expect(it.basis, `${it.type} 必须带依据`).toBeDefined();
      expect(it.basis!.rulesVersion).toBe(9);
      expect(it.basis!.buildingKind).toBe('office');
      expect(it.basis!.source).toBe('自定义文号 Z-2026');
      expect(it.basis!.clause, `${it.type} 必须落到具体条文`).toBeTruthy();
    }
    expect(r.items.find((i) => i.type === 'DEADEND_EXCEED')!.basis!.clause).toBe('自定义条文 第D条');
    expect(r.items.find((i) => i.type === 'TRAVEL_EXCEED')!.basis!.clause).toBe('自定义条文 第T条');
  });

  it('R7 结果按旧版生成后规则升版：isValidationStale 判为过期；按新版重新校验后过期消失', () => {
    const { floor } = makeFloor();
    const oldResult = validateFloor(floor, ruleWith(DEFAULT_RULES.office, { version: 1 }));
    const newRules = ruleWith(DEFAULT_RULES.office, { extinguisherRadiusM: 25, version: 2 });
    expect(isValidationStale(oldResult, newRules)).toBe(true);
    expect(isValidationStale(oldResult, ruleWith(DEFAULT_RULES.office, { version: 1 }))).toBe(false);
    const fresh = validateFloor(floor, newRules);
    expect(isValidationStale(fresh, newRules)).toBe(false);
  });

  it('R8 楼栋切换类别（版本号恰好相同）也必须判为过期，按新类别重算', () => {
    const { floor } = makeFloor();
    const officeResult = validateFloor(floor, DEFAULT_RULES.office); // office v1
    expect(isValidationStale(officeResult, DEFAULT_RULES.retail)).toBe(true); // retail v1，同号不同类
    const retailResult = validateFloor(floor, DEFAULT_RULES.retail);
    expect(isValidationStale(retailResult, DEFAULT_RULES.retail)).toBe(false);
  });

  it('R9 旧版本结果（快照限值为 0、无 clauses）加载时按当前规则补结构，不丢历史结论', () => {
    const legacy = {
      checkedAt: '2026-01-01T00:00:00.000Z',
      pass: true,
      items: [],
      travelWorstM: 12,
      deadEndM: null,
      coverage: null,
      exits: { present: 2, required: 1 },
      rulesSnapshot: { buildingKind: 'factory', version: 1, source: '旧文号' },
    };
    const fixed = normalizeValidationResult(legacy, DEFAULT_RULES)!;
    expect(fixed.pass).toBe(true);
    expect(fixed.rulesSnapshot.extinguisherRadiusM).toBe(12); // 旧值 0 被当前 factory 默认补齐
    expect(fixed.rulesSnapshot.maxTravelDistanceM).toBe(30);
    expect(fixed.rulesSnapshot.clauses.travel).toContain('3.7.4');
    // 版本号仍保留为 1，相对当前 factory v1 不算过期；若用户改过规则（v2）则自然判过期
    expect(fixed.rulesSnapshot.version).toBe(1);
    expect(normalizeValidationResult(null, DEFAULT_RULES)).toBeUndefined();
  });
});
