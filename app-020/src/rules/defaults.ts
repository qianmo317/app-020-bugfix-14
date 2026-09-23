import type { BuildingKind, RuleSet } from '../model';

/**
 * 默认规则集（参考值，均标注依据，可在 /rules 页面按项目实际调整；修改后版本号 +1）。
 * 说明：
 * - 疏散距离：GB 50016-2014(2018年版) 表 5.5.17（民用建筑）与 3.7.4（厂房）；
 *   袋形走道两侧或尽端的疏散门至最近安全出口距离按同一表取值。
 * - 安全出口数量：GB 50016-2014(2018年版) 第 5.5.8 条（公共建筑每个楼层）。
 * - 灭火器保护距离/配置：GB 50140-2005 第 6.2 条（A 类火灾场所灭火器最大保护距离，
 *   严重危险级 15m / 中危险级 20m / 轻危险级 25m），覆盖不足判定为本应用近似算法。
 * - 设施例行检查：《机关、团体、企业、事业单位消防安全管理规定》（公安部令第61号）
 *   第二十五条（防火巡查每月至少一次、定期检验维修）。
 * 每条规则除整份 source 文号外，还在 clauses 中给出该类校验项所照的具体条文，
 * 校验时一路盖到每一条 ValidationItem 上。
 */

/** 非限值类校验项（出口连通、无门、设施检查台账）的固定依据，不受规则页配置影响 */
export const FIXED_BASIS: Record<string, string> = {
  EXIT_NOT_CONNECTED: 'GB 50016-2014(2018年版) 第5.5.8条（安全出口应与疏散走道连通）',
  EXIT_COUNT_NO_EXIT: 'GB 50016-2014(2018年版) 第5.5.8条（每个楼层应设置安全出口）',
  NO_DOOR: 'GB 50016-2014(2018年版) 第5.5.17条（房间疏散门应直通安全区域或疏散走道）',
  FACILITY_CHECK: '《机关、团体、企业、事业单位消防安全管理规定》（公安部令第61号）第二十五条（防火巡查、设施定期检验维修）',
};

export const DEFAULT_RULES: Record<BuildingKind, RuleSet> = {
  office: {
    buildingKind: 'office',
    maxTravelDistanceM: 40,
    deadEndDistanceM: 22,
    extinguisherRadiusM: 20,
    exitMinAreaM2: 200,
    exitMaxOccupants: 50,
    source: 'GB 50016-2014(2018年版) 表5.5.17；GB 50140-2005',
    clauses: {
      travel: 'GB 50016-2014(2018年版) 表5.5.17（其他民用建筑，位于两个安全出口之间的疏散门 ≤40m）',
      deadEnd: 'GB 50016-2014(2018年版) 表5.5.17（位于袋形走道两侧或尽端的疏散门 ≤22m）',
      coverage: 'GB 50140-2005 第6.2.1条（A类火灾场所中危险级手提式灭火器最大保护距离 20m）',
      exits: 'GB 50016-2014(2018年版) 第5.5.8条（公共建筑内每个防火分区/楼层安全出口不少于2个的面积与人数条件）',
    },
    version: 1,
  },
  retail: {
    buildingKind: 'retail',
    maxTravelDistanceM: 30,
    deadEndDistanceM: 20,
    extinguisherRadiusM: 20,
    exitMinAreaM2: 200,
    exitMaxOccupants: 50,
    source: 'GB 50016-2014(2018年版) 表5.5.17（商店建筑）；GB 50140-2005',
    clauses: {
      travel: 'GB 50016-2014(2018年版) 表5.5.17（商店建筑，两个安全出口之间的疏散门 ≤30m（一类高层 ≤30m））',
      deadEnd: 'GB 50016-2014(2018年版) 表5.5.17（商店建筑袋形走道尽端疏散门 ≤20m）',
      coverage: 'GB 50140-2005 第6.2.1条（A类火灾场所中危险级手提式灭火器最大保护距离 20m）',
      exits: 'GB 50016-2014(2018年版) 第5.5.8条（公共建筑内每个防火分区/楼层安全出口不少于2个的面积与人数条件）',
    },
    version: 1,
  },
  factory: {
    buildingKind: 'factory',
    maxTravelDistanceM: 30,
    deadEndDistanceM: 20,
    extinguisherRadiusM: 12,
    exitMinAreaM2: 200,
    exitMaxOccupants: 50,
    source: 'GB 50016-2014(2018年版) 3.7.4（厂房疏散距离）；GB 50140-2005',
    clauses: {
      travel: 'GB 50016-2014(2018年版) 第3.7.4条（厂房内任一点至最近安全出口的直线距离限值）',
      deadEnd: 'GB 50016-2014(2018年版) 第3.7.4条（厂房袋形走道/尽端疏散距离限值）',
      coverage: 'GB 50140-2005 第6.2.1条（A类火灾场所严重危险级手提式灭火器最大保护距离 15m；本项目按现场风险取 12m）',
      exits: 'GB 50016-2014(2018年版) 第3.7.2条（厂房每个防火分区安全出口不少于2个的面积与人数条件）',
    },
    version: 1,
  },
  school: {
    buildingKind: 'school',
    maxTravelDistanceM: 35,
    deadEndDistanceM: 22,
    extinguisherRadiusM: 20,
    exitMinAreaM2: 200,
    exitMaxOccupants: 50,
    source: 'GB 50099-2011、GB 50016-2014(2018年版) 表5.5.17；GB 50140-2005',
    clauses: {
      travel: 'GB 50016-2014(2018年版) 表5.5.17（教学建筑，两个安全出口之间的疏散门 ≤35m）；GB 50099-2011 第8.2节',
      deadEnd: 'GB 50016-2014(2018年版) 表5.5.17（教学建筑袋形走道尽端疏散门 ≤22m）；GB 50099-2011 第8.2节',
      coverage: 'GB 50140-2005 第6.2.1条（A类火灾场所中危险级手提式灭火器最大保护距离 20m）',
      exits: 'GB 50016-2014(2018年版) 第5.5.8条（公共建筑教学楼层安全出口不少于2个的面积与人数条件）；GB 50099-2011 第8.2节',
    },
    version: 1,
  },
};

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
