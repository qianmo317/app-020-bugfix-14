import type { BuildingKind, RuleClauseKey, RuleSet } from '../model';

/**
 * 默认规则集（参考值，均标注依据，可在 /rules 页面按项目实际调整；修改后版本号 +1）。
 * 说明：
 * - 疏散距离：GB 50016-2014(2018年版) 表 5.5.17（民用建筑）与 3.7.4（厂房）；
 *   袋形走道两侧或尽端的疏散门至最近安全出口距离按同一表取值。
 * - 灭火器保护半径：GB 50140-2005 按火灾类别与危险等级的最大保护距离折算，此处为可配置参考值。
 * 每个限值在 clauses 中标注具体表/条号，校验时随结果逐条留痕。
 */

type RuleSeed = Omit<RuleSet, 'buildingKind' | 'updatedAt' | 'clauses'> & {
  clauses: Partial<Record<RuleClauseKey, string>>;
};

const SEEDS: Record<BuildingKind, RuleSeed> = {
  office: {
    maxTravelDistanceM: 40,
    deadEndDistanceM: 22,
    extinguisherRadiusM: 20,
    exitMinAreaM2: 200,
    exitMaxOccupants: 50,
    source: 'GB 50016-2014(2018年版) 表5.5.17；GB 50140-2005',
    version: 1,
    clauses: {
      travel: 'GB 50016-2014(2018年版) 表5.5.17（直通疏散走道的房间疏散门至最近安全出口的直线距离，其他建筑 40m）',
      deadEnd: 'GB 50016-2014(2018年版) 表5.5.17（袋形走道两侧或尽端的疏散门 22m）',
      extinguisher: 'GB 50140-2005 表5.2.1、表6.2.1（A类火灾中危险级场所手提式灭火器最大保护距离 20m）',
      exitArea: 'GB 50016-2014(2018年版) 5.5.15（公共建筑内每个防火分区或一个防火分区的每个楼层，安全出口不应少于2个）',
      exitOccupants: 'GB 50016-2014(2018年版) 5.5.15（安全出口数量按疏散人数确定）',
      connection: 'GB 50016-2014(2018年版) 5.5.17（疏散路径应连续连通至安全出口）',
      check: 'GB 50444-2008《建筑灭火器配置验收及检查规范》（灭火器定期检查周期）；本单位设施巡检制度',
    },
  },
  retail: {
    maxTravelDistanceM: 30,
    deadEndDistanceM: 20,
    extinguisherRadiusM: 20,
    exitMinAreaM2: 200,
    exitMaxOccupants: 50,
    source: 'GB 50016-2014(2018年版) 表5.5.17（商店建筑）；GB 50140-2005',
    version: 1,
    clauses: {
      travel: 'GB 50016-2014(2018年版) 表5.5.17（商店建筑，直通疏散走道的房间疏散门至最近安全出口 30m）',
      deadEnd: 'GB 50016-2014(2018年版) 表5.5.17（商店建筑袋形走道 20m）',
      extinguisher: 'GB 50140-2005 表5.2.1、表6.2.1（A类火灾中危险级场所手提式灭火器最大保护距离 20m）',
      exitArea: 'GB 50016-2014(2018年版) 5.5.15（公共建筑每个防火分区/楼层安全出口不应少于2个）',
      exitOccupants: 'GB 50016-2014(2018年版) 5.5.15（安全出口数量按疏散人数确定）',
      connection: 'GB 50016-2014(2018年版) 5.5.17（疏散路径应连续连通至安全出口）',
      check: 'GB 50444-2008《建筑灭火器配置验收及检查规范》（灭火器定期检查周期）；本单位设施巡检制度',
    },
  },
  factory: {
    maxTravelDistanceM: 30,
    deadEndDistanceM: 20,
    extinguisherRadiusM: 12,
    exitMinAreaM2: 200,
    exitMaxOccupants: 50,
    source: 'GB 50016-2014(2018年版) 3.7.4（厂房疏散距离）；GB 50140-2005',
    version: 1,
    clauses: {
      travel: 'GB 50016-2014(2018年版) 3.7.4（厂房内任一点至最近安全出口的直线距离不应大于表3.7.4限值）',
      deadEnd: 'GB 50016-2014(2018年版) 3.7.4（厂房袋形走道/尽端距离按表3.7.4从严取值 20m）',
      extinguisher: 'GB 50140-2005 表5.2.1、表6.2.1（厂房按严重危险级，手提式灭火器最大保护距离 12m）',
      exitArea: 'GB 50016-2014(2018年版) 3.7.2（厂房每个防火分区或一个防火分区的每个楼层安全出口数量不应少于2个）',
      exitOccupants: 'GB 50016-2014(2018年版) 3.7.2、3.7.5（厂房安全出口数量按疏散人数确定）',
      connection: 'GB 50016-2014(2018年版) 3.7.4（疏散路径应连续连通至安全出口）',
      check: 'GB 50444-2008《建筑灭火器配置验收及检查规范》（灭火器定期检查周期）；本单位设施巡检制度',
    },
  },
  school: {
    maxTravelDistanceM: 35,
    deadEndDistanceM: 22,
    extinguisherRadiusM: 20,
    exitMinAreaM2: 200,
    exitMaxOccupants: 50,
    source: 'GB 50099-2011、GB 50016-2014(2018年版) 表5.5.17；GB 50140-2005',
    version: 1,
    clauses: {
      travel: 'GB 50016-2014(2018年版) 表5.5.17（教学建筑，直通疏散走道的房间疏散门至最近安全出口 35m）',
      deadEnd: 'GB 50016-2014(2018年版) 表5.5.17（教学建筑袋形走道 22m）',
      extinguisher: 'GB 50140-2005 表5.2.1、表6.2.1（A类火灾中危险级场所手提式灭火器最大保护距离 20m）',
      exitArea: 'GB 50099-2011《中小学校设计规范》8.2.2（每教学楼层安全出口不应少于2个）；GB 50016-2014(2018年版) 5.5.15',
      exitOccupants: 'GB 50099-2011 8.2.2；GB 50016-2014(2018年版) 5.5.15（安全出口数量按疏散人数确定）',
      connection: 'GB 50016-2014(2018年版) 5.5.17（疏散路径应连续连通至安全出口）',
      check: 'GB 50444-2008《建筑灭火器配置验收及检查规范》（灭火器定期检查周期）；本单位设施巡检制度',
    },
  },
};

/** 条文兜底：老数据（无 clauses）迁移时按类别补默认条文 */
export function buildDefaultRules(): Record<BuildingKind, RuleSet> {
  const out = {} as Record<BuildingKind, RuleSet>;
  (Object.keys(SEEDS) as BuildingKind[]).forEach((kind) => {
    const seed = SEEDS[kind];
    out[kind] = {
      buildingKind: kind,
      maxTravelDistanceM: seed.maxTravelDistanceM,
      deadEndDistanceM: seed.deadEndDistanceM,
      extinguisherRadiusM: seed.extinguisherRadiusM,
      exitMinAreaM2: seed.exitMinAreaM2,
      exitMaxOccupants: seed.exitMaxOccupants,
      source: seed.source,
      version: seed.version,
      updatedAt: new Date(0).toISOString(),
      clauses: { ...seed.clauses } as Record<RuleClauseKey, string>,
    };
  });
  return out;
}

export const DEFAULT_RULES: Record<BuildingKind, RuleSet> = buildDefaultRules();

/** 把任意可能缺字段的规则集补全为当前结构（老版本 localStorage 数据迁移） */
export function normalizeRules(kind: BuildingKind, raw: Partial<RuleSet> | undefined | null): RuleSet {
  const d = DEFAULT_RULES[kind];
  if (!raw) return structuredClone(d);
  return {
    buildingKind: kind,
    maxTravelDistanceM: raw.maxTravelDistanceM ?? d.maxTravelDistanceM,
    deadEndDistanceM: raw.deadEndDistanceM ?? d.deadEndDistanceM,
    extinguisherRadiusM: raw.extinguisherRadiusM ?? d.extinguisherRadiusM,
    exitMinAreaM2: raw.exitMinAreaM2 ?? d.exitMinAreaM2,
    exitMaxOccupants: raw.exitMaxOccupants ?? d.exitMaxOccupants,
    source: raw.source ?? d.source,
    version: typeof raw.version === 'number' && raw.version >= 1 ? raw.version : d.version,
    updatedAt: raw.updatedAt ?? d.updatedAt,
    clauses: { ...d.clauses, ...(raw.clauses ?? {}) },
  };
}

/** 人员密度估算（㎡/人），未填写人数的房间按此估算 —— 仅用于出口数量校验 */
export const OCCUPANCY_DENSITY_M2_PER_PERSON: Record<string, number> = {
  office: 10,
  retail: 3,
  storage: 50,
  ward: 8,
  corridor: 0, // 走道不计停留人数
  other: 20,
};

/** 检查周期（天），用于「下次检查日期」与过期判定 */
export const CHECK_INTERVAL_DAYS: Record<string, number> = {
  extinguisher: 30,
  hydrant: 30,
  exit_sign: 90,
  emergency_light: 90,
  exit: 180,
  sprinkler: 180,
};
