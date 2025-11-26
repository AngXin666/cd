/**
 * 用户行为追踪器
 * 用于记录用户对各功能模块的访问行为，支持智能数据加载和缓存优化
 */

import { supabase } from '@/db/supabase';
import { getCurrentUserBossId } from '@/db/tenant-utils';

/**
 * 功能模块枚举
 */
export enum FeatureModule {
  // 仪表板
  DASHBOARD = 'dashboard',
  
  // 考勤管理
  ATTENDANCE = 'attendance',
  ATTENDANCE_RULES = 'attendance_rules',
  
  // 请假管理
  LEAVE_APPLICATIONS = 'leave_applications',
  
  // 离职管理
  RESIGNATION_APPLICATIONS = 'resignation_applications',
  
  // 车辆管理
  VEHICLES = 'vehicles',
  VEHICLE_RECORDS = 'vehicle_records',
  
  // 计件管理
  PIECE_WORK = 'piece_work',
  
  // 反馈管理
  FEEDBACK = 'feedback',
  
  // 用户管理
  USER_MANAGEMENT = 'user_management',
  
  // 仓库管理
  WAREHOUSE_MANAGEMENT = 'warehouse_management',
  
  // 通知
  NOTIFICATIONS = 'notifications',
  
  // 个人中心
  PROFILE = 'profile',
}

/**
 * 操作类型枚举
 */
export enum ActionType {
  VIEW = 'view',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  SEARCH = 'search',
  EXPORT = 'export',
}

/**
 * 行为追踪数据
 */
interface BehaviorLog {
  featureModule: FeatureModule | string;
  actionType: ActionType;
  pagePath?: string;
  durationMs?: number;
}

/**
 * 功能权重数据
 */
export interface FeatureWeight {
  feature_module: string;
  weight_score: number;
  cache_ttl: number;
  access_count?: number;
  last_access_at?: string;
}

/**
 * 用户行为追踪器类
 */
class BehaviorTracker {
  private pageStartTime: number | null = null;
  private currentFeature: string | null = null;
  private userId: string | null = null;
  private bossId: string | null = null;

  /**
   * 初始化追踪器
   */
  async init(userId: string) {
    this.userId = userId;
    this.bossId = getCurrentUserBossId();
    console.log('[行为追踪] 初始化完成', { userId, bossId: this.bossId });
  }

  /**
   * 记录页面访问
   */
  async trackPageView(featureModule: FeatureModule | string, pagePath?: string) {
    if (!this.userId || !this.bossId) {
      console.warn('[行为追踪] 未初始化，跳过追踪');
      return;
    }

    // 记录上一个页面的停留时长
    if (this.pageStartTime && this.currentFeature) {
      const durationMs = Date.now() - this.pageStartTime;
      await this.logBehavior({
        featureModule: this.currentFeature,
        actionType: ActionType.VIEW,
        pagePath,
        durationMs
      });
    }

    // 开始记录新页面
    this.pageStartTime = Date.now();
    this.currentFeature = featureModule;

    // 更新功能权重
    await this.updateFeatureWeight(featureModule);

    console.log('[行为追踪] 页面访问', { featureModule, pagePath });
  }

  /**
   * 记录操作行为
   */
  async trackAction(
    featureModule: FeatureModule | string,
    actionType: ActionType,
    pagePath?: string
  ) {
    if (!this.userId || !this.bossId) {
      console.warn('[行为追踪] 未初始化，跳过追踪');
      return;
    }

    await this.logBehavior({
      featureModule,
      actionType,
      pagePath
    });

    // 更新功能权重
    await this.updateFeatureWeight(featureModule);

    console.log('[行为追踪] 操作行为', { featureModule, actionType });
  }

  /**
   * 记录行为日志到数据库
   */
  private async logBehavior(log: BehaviorLog) {
    try {
      const { error } = await supabase
        .from('user_behavior_logs')
        .insert({
          user_id: this.userId,
          boss_id: this.bossId,
          feature_module: log.featureModule,
          action_type: log.actionType,
          page_path: log.pagePath,
          duration_ms: log.durationMs
        });

      if (error) {
        console.error('[行为追踪] 记录失败:', error);
      }
    } catch (error) {
      console.error('[行为追踪] 记录异常:', error);
    }
  }

  /**
   * 更新功能权重
   */
  private async updateFeatureWeight(featureModule: string) {
    try {
      const { error } = await supabase.rpc('update_user_feature_weight', {
        p_user_id: this.userId,
        p_feature_module: featureModule
      });

      if (error) {
        console.error('[行为追踪] 更新权重失败:', error);
      }
    } catch (error) {
      console.error('[行为追踪] 更新权重异常:', error);
    }
  }

  /**
   * 获取用户的高优先级功能列表
   */
  async getHighPriorityFeatures(limit: number = 5): Promise<FeatureWeight[]> {
    if (!this.userId) {
      console.warn('[行为追踪] 未初始化，返回空列表');
      return [];
    }

    try {
      const { data, error } = await supabase.rpc('get_user_high_priority_features', {
        p_user_id: this.userId,
        p_limit: limit
      });

      if (error) {
        console.error('[行为追踪] 获取高优先级功能失败:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[行为追踪] 获取高优先级功能异常:', error);
      return [];
    }
  }

  /**
   * 获取所有功能权重
   */
  async getAllFeatureWeights(): Promise<FeatureWeight[]> {
    if (!this.userId || !this.bossId) {
      console.warn('[行为追踪] 未初始化，返回空列表');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('user_feature_weights')
        .select('*')
        .eq('user_id', this.userId)
        .eq('boss_id', this.bossId)
        .order('weight_score', { ascending: false });

      if (error) {
        console.error('[行为追踪] 获取功能权重失败:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[行为追踪] 获取功能权重异常:', error);
      return [];
    }
  }

  /**
   * 获取功能的缓存时间
   */
  async getFeatureCacheTTL(featureModule: string): Promise<number> {
    if (!this.userId || !this.bossId) {
      return 300000; // 默认5分钟
    }

    try {
      const { data, error } = await supabase
        .from('user_feature_weights')
        .select('cache_ttl')
        .eq('user_id', this.userId)
        .eq('boss_id', this.bossId)
        .eq('feature_module', featureModule)
        .maybeSingle();

      if (error || !data) {
        return 300000; // 默认5分钟
      }

      return data.cache_ttl || 300000;
    } catch (error) {
      console.error('[行为追踪] 获取缓存时间异常:', error);
      return 300000;
    }
  }

  /**
   * 清理追踪器
   */
  cleanup() {
    // 记录最后一个页面的停留时长
    if (this.pageStartTime && this.currentFeature) {
      const durationMs = Date.now() - this.pageStartTime;
      this.logBehavior({
        featureModule: this.currentFeature,
        actionType: ActionType.VIEW,
        durationMs
      });
    }

    this.pageStartTime = null;
    this.currentFeature = null;
    console.log('[行为追踪] 清理完成');
  }
}

// 导出单例
export const behaviorTracker = new BehaviorTracker();

/**
 * React Hook：使用行为追踪
 */
export function useBehaviorTracker() {
  return {
    trackPageView: (featureModule: FeatureModule | string, pagePath?: string) =>
      behaviorTracker.trackPageView(featureModule, pagePath),
    trackAction: (
      featureModule: FeatureModule | string,
      actionType: ActionType,
      pagePath?: string
    ) => behaviorTracker.trackAction(featureModule, actionType, pagePath),
    getHighPriorityFeatures: (limit?: number) =>
      behaviorTracker.getHighPriorityFeatures(limit),
    getAllFeatureWeights: () => behaviorTracker.getAllFeatureWeights(),
    getFeatureCacheTTL: (featureModule: string) =>
      behaviorTracker.getFeatureCacheTTL(featureModule)
  };
}
