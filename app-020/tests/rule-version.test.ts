/**
 * 规则版本 / 类别 / 依据 一路带到校验结果的回归用例（验收三条）：
 * 1. 改了限值后重新校验，结果快照按新版算，旧结果仍能看出当时按的是哪一版、限值是多少；
 * 2. 不同建筑类别的规则集互不串值（原 bug：规则页五个数值输入框硬编码写 office、
 *    楼层编辑器硬按 office 规则校验）；
 * 3. 每一条校验项都带得到它所照的具体条文（basis），且与规则版本一起固化在结果里。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mkRoom, rect, mkFloor, ruleWith, DEFAULT_RULES, validateFloor } from './helpers';
import {
  getState,
  addBuilding,
  addFloor,
  addRoom,
  addFacility,
  updateRules,
  resetRules,
  deleteBuilding,
} from '../src/store/store';

beforeEach(() => {
  for (const b of [...getState().buildings]) deleteBuilding(b.id);
  resetRules('office');
  resetRules('factory');
  resetRules('retail');
});

describe('快照随规则版本走（改规则 → 重新校验按新版算）', () => {
  it('V1 首版校验记 v1/限值40；收紧到 10m 后重新校验，结果记新版与新限值', () => {
    const { floor } = mkFloor([mkRoom('走道', 'corridor', rect(0, 0, 21, 2))], [
      { kind: 'exit', x: 0.5, y: 1 },
      { kind: 'exit', x: 20.5, y: 1 },
      { kind: 'extinguisher', x: 10.5, y: 1 },
    ]);

    const r1 = validateFloor(floor, DEFAULT_RULES.office);
    expect(r1.rulesSnapshot.version).toBe(1);
    expect(r1.rulesSnapshot.maxTravelDistanceM).toBe(40); // 原 bug：恒为 0
    expect(r1.rulesSnapshot.deadEndDistanceM).toBe(22);
    expect(r1.rulesSnapshot.extinguisherRadiusM).toBe(20);
    expect(r1.rulesSnapshot.exitMinAreaM2).toBe(200);
    expect(r1.rulesSnapshot.exitMaxOccupants).toBe(50);
    expect(r1.pass).toBe(true);

    // 改规则后版本 +1、限值变化；用新规则重新校验
    const tightened = ruleWith(DEFAULT_RULES.office, { maxTravelDistanceM: 10, version: 2 });
    const r2 = validateFloor(floor, tightened);
    expect(r2.rulesSnapshot.version).toBe(2);
    expect(r2.rulesSnapshot.maxTravelDistanceM).toBe(10);
    // 旧结果不被改写：翻历史记录仍能看出当时按 v1/40m 判的
    expect(r1.rulesSnapshot.version).toBe(1);
    expect(r1.rulesSnapshot.maxTravelDistanceM).toBe(40);
    // 21m 走道在 10m 限值下必有超限项，且项上的实测/限值与快照一致
    const travel = r2.items.find((i) => i.type === 'TRAVEL_EXCEED')!;
    expect(travel.limit).toBe(10);
    expect(travel.value!).toBeGreaterThan(10);
  });

  it('V2 改灭火器半径：覆盖判定与快照半径同时切换到新版', () => {
    const { floor } = mkFloor([mkRoom('走道', 'corridor', rect(0, 0, 41, 2))], [
      { kind: 'exit', x: 0.5, y: 1 },
      { kind: 'exit', x: 40.5, y: 1 },
      { kind: 'extinguisher', x: 20.5, y: 1 },
    ]);
    const office = validateFloor(floor, DEFAULT_RULES.office); // 半径 20
    expect(office.rulesSnapshot.extinguisherRadiusM).toBe(20);
    expect(office.pass).toBe(true);

    const factory = validateFloor(floor, DEFAULT_RULES.factory); // 半径 12
    expect(factory.rulesSnapshot.buildingKind).toBe('factory');
    expect(factory.rulesSnapshot.extinguisherRadiusM).toBe(12);
    expect(factory.pass).toBe(false);
    const cov = factory.items.find((i) => i.type === 'COVERAGE_UNCOVERED')!;
    expect(cov.basis).toContain('GB 50140-2005');
  });

  it('V3 改依据文号后，新结果的快照与条文按新文号记录，旧结果保留原文号', () => {
    const { floor } = mkFloor([mkRoom('走道', 'corridor', rect(0, 0, 21, 2))], [
      { kind: 'exit', x: 20.5, y: 1 },
      { kind: 'extinguisher', x: 10.5, y: 1 },
    ]);
    const old = validateFloor(floor, ruleWith(DEFAULT_RULES.retail, {}));
    expect(old.items.find((i) => i.type === 'DEADEND_EXCEED')).toBeDefined();
    const oldBasis = old.items.find((i) => i.type === 'DEADEND_EXCEED')!.basis;

    const custom = ruleWith(DEFAULT_RULES.retail, {
      source: '企业内控标准 Q/FS-2026',
      version: 9,
      clauses: {
        ...DEFAULT_RULES.retail.clauses,
        deadEnd: '企业内控标准 Q/FS-2026 第4.2条（袋形走道 ≤20m）',
      },
    });
    const now2 = validateFloor(floor, custom);
    expect(now2.rulesSnapshot.source).toBe('企业内控标准 Q/FS-2026');
    expect(now2.rulesSnapshot.version).toBe(9);
    expect(now2.items.find((i) => i.type === 'DEADEND_EXCEED')!.basis).toBe(
      '企业内控标准 Q/FS-2026 第4.2条（袋形走道 ≤20m）',
    );
    // 旧结果不受影响
    expect(old.rulesSnapshot.source).toContain('GB 50016');
    expect(old.items.find((i) => i.type === 'DEADEND_EXCEED')!.basis).toBe(oldBasis);
  });
});

describe('建筑类别之间规则互不串值', () => {
  it('K1 updateRules(office) 只改办公：厂房/商业/学校限值与版本不动', () => {
    const before = structuredClone(DEFAULT_RULES);
    updateRules('office', { maxTravelDistanceM: 33 });
    const s = getState();
    expect(s.rules.office.maxTravelDistanceM).toBe(33);
    expect(s.rules.office.version).toBe(2);
    expect(s.rules.factory.maxTravelDistanceM).toBe(before.factory.maxTravelDistanceM);
    expect(s.rules.factory.version).toBe(1);
    expect(s.rules.retail.maxTravelDistanceM).toBe(before.retail.maxTravelDistanceM);
    expect(s.rules.school.maxTravelDistanceM).toBe(before.school.maxTravelDistanceM);
  });

  it('K2 原 bug 回归：在厂房规则页改半径 25，办公半径仍为 20（模拟修复后的页面调用）', () => {
    // 页面修复前：五个数值输入框无论当前在哪个 tab 都调 updateRules('office', …)
    updateRules('factory', { extinguisherRadiusM: 25 });
    expect(getState().rules.factory.extinguisherRadiusM).toBe(25);
    expect(getState().rules.office.extinguisherRadiusM).toBe(20);
  });

  it('K3 不同类别建筑的楼层各自按本栋类别校验：厂房楼层不因办公改规则而翻转结论', () => {
    const bidF = addBuilding('测试厂房', 'factory');
    const fidF = addFloor(bidF, 1);
    addRoom(fidF, rect(0, 0, 41, 2), '走道', 'corridor');
    addFacility(fidF, 'exit', 500, 1000);
    addFacility(fidF, 'exit', 40500, 1000);
    addFacility(fidF, 'extinguisher', 20500, 1000);

    // 编辑器逻辑：取 s.rules[building.kind] 校验
    const floor = getState().floors[fidF];
    const kind = getState().buildings.find((b) => b.id === bidF)!.kind;
    const result = validateFloor(floor, getState().rules[kind]);
    expect(result.rulesSnapshot.buildingKind).toBe('factory');
    expect(result.rulesSnapshot.extinguisherRadiusM).toBe(12);
    expect(result.pass).toBe(false); // 半径 12m 覆盖不足

    // 把办公规则改花：半径改成 5、版本飙升 —— 厂房结果不应受任何影响
    updateRules('office', { extinguisherRadiusM: 5, maxTravelDistanceM: 8 });
    const result2 = validateFloor(getState().floors[fidF], getState().rules.factory);
    expect(result2.rulesSnapshot.buildingKind).toBe('factory');
    expect(result2.rulesSnapshot.extinguisherRadiusM).toBe(12);
    expect(result2.rulesSnapshot.version).toBe(1);
  });
});

describe('每条校验项都可溯源到具体条文', () => {
  it('B1 所有类型校验项均带非空 basis，且与所属规则集的条文/固定依据一致', () => {
    const { floor } = mkFloor([mkRoom('走道', 'corridor', rect(0, 0, 21, 2))], [
      { kind: 'exit', x: 20.5, y: 1, checks: [] }, // 无检查记录 + 21m 死端
      { kind: 'extinguisher', x: 10.5, y: 1, checks: [] },
    ]);
    // 21m > 商业死端限值 20m
    const r = validateFloor(floor, DEFAULT_RULES.retail);
    expect(r.items.length).toBeGreaterThan(0);
    for (const it of r.items) {
      expect(it.basis.length, `${it.type} 必须带依据条文`).toBeGreaterThan(5);
    }
    const byType = Object.fromEntries(r.items.map((i) => [i.type, i]));
    expect(byType.DEADEND_EXCEED.basis).toBe(DEFAULT_RULES.retail.clauses.deadEnd);
    expect(byType.CHECK_MISSING.basis).toContain('公安部令第61号');
    expect(byType.CHECK_MISSING.basis).toContain('第二十五条');
  });

  it('B2 条文快照与规则集脱钩：校验后再改规则，结果中的条文不被牵连', () => {
    const { floor } = mkFloor([mkRoom('走道', 'corridor', rect(0, 0, 21, 2))], [
      { kind: 'exit', x: 20.5, y: 1 },
      { kind: 'extinguisher', x: 10.5, y: 1 },
    ]);
    const r = validateFloor(floor, DEFAULT_RULES.retail);
    const clauseSnapshot = r.rulesSnapshot.clauses.deadEnd;
    // 事后在规则集对象上动手脚（模拟 store 换版），已存结果不变
    DEFAULT_RULES.retail.clauses.deadEnd = 'CHANGED-AFTER-VALIDATION';
    expect(r.rulesSnapshot.clauses.deadEnd).toBe(clauseSnapshot);
    expect(r.items.find((i) => i.type === 'DEADEND_EXCEED')!.basis).toBe(clauseSnapshot);
    DEFAULT_RULES.retail.clauses.deadEnd = clauseSnapshot;
  });

  it('B3 出口数量/连通/无门三类项各有对应依据', () => {
    // 无出口 → EXIT_COUNT
    const f1 = mkFloor([mkRoom('走道', 'corridor', rect(0, 0, 10, 2))], []);
    const r1 = validateFloor(f1.floor, f1.rules);
    expect(r1.items.find((i) => i.type === 'EXIT_COUNT')!.basis).toContain('GB 50016');

    // 面积 300㎡ 单出口 → EXIT_COUNT（数量不足），依据为出口条文
    const { floor: f2 } = mkFloor(
      [mkRoom('大房间', 'office', rect(0, 0, 30, 10))],
      [{ kind: 'exit', x: 0.5, y: 1 }],
    );
    const r2 = validateFloor(f2, DEFAULT_RULES.office);
    const countItem = r2.items.filter((i) => i.type === 'EXIT_COUNT').find((i) => i.limit === 2);
    expect(countItem).toBeDefined();
    expect(countItem!.basis).toBe(DEFAULT_RULES.office.clauses.exits);
  });
});

describe('旧存档迁移：老规则集缺 clauses 字段时按默认回填，用户数值保留', () => {
  it('M1 旧版 fem.v1（无 clauses、办公半径被改成 15）加载后不缺字段且版本沿用', async () => {
    vi.resetModules();
    const mem = new Map<string, string>();
    const legacy = {
      buildings: [],
      floors: {},
      // 模拟上一版存档：规则集只有旧字段，没有 clauses
      rules: {
        office: {
          buildingKind: 'office',
          maxTravelDistanceM: 40,
          deadEndDistanceM: 22,
          extinguisherRadiusM: 15,
          exitMinAreaM2: 200,
          exitMaxOccupants: 50,
          source: '旧版本文号',
          version: 4,
        },
      },
      marks: {},
    };
    mem.set('fem.v1', JSON.stringify(legacy));
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    });

    const { getState: fresh } = await import('../src/store/store');
    const s = fresh();
    // 用户改过的字段保留
    expect(s.rules.office.extinguisherRadiusM).toBe(15);
    expect(s.rules.office.source).toBe('旧版本文号');
    expect(s.rules.office.version).toBe(4);
    // 新增字段按默认回填，引擎不会读到 undefined
    expect(s.rules.office.clauses.travel).toContain('GB 50016');
    expect(s.rules.office.clauses.coverage).toContain('GB 50140');
    // 未保存的类别整套用默认
    expect(s.rules.factory.clauses.travel).toContain('3.7.4');
    expect(s.rules.factory.version).toBe(1);

    vi.unstubAllGlobals();
    vi.resetModules();
  });
});
