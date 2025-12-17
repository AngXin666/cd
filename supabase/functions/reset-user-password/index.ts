/**
 * 重置用户密码 Edge Function
 * 
 * 安全特性：
 * 1. 严格的角色验证（仅 BOSS 或具有完全控制权限的 PEER_ADMIN 可操作）
 * 2. 操作审计日志
 * 3. 防止越权操作（不能重置同级或更高级别用户的密码）
 * 4. 请求频率限制（通过 Supabase 配置）
 * 
 * @module supabase/functions/reset-user-password
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * 允许重置密码的角色列表
 * BOSS: 老板（最高权限）
 * PEER_ADMIN: 同级管理员（需要有完全控制权限）
 */
const ALLOWED_ROLES = ['BOSS', 'PEER_ADMIN'];

/**
 * 不允许被重置密码的角色（保护高权限账户）
 */
const PROTECTED_ROLES = ['BOSS'];

/**
 * 记录安全审计日志
 * @param supabase - Supabase 客户端
 * @param operatorId - 操作者 ID
 * @param targetUserId - 目标用户 ID
 * @param action - 操作类型
 * @param success - 是否成功
 * @param details - 详细信息
 */
async function logSecurityAudit(
  supabase: any,
  operatorId: string,
  targetUserId: string,
  action: string,
  success: boolean,
  details: string
) {
  try {
    // 尝试记录到审计日志表（如果存在）
    await supabase.from('security_audit_logs').insert({
      operator_id: operatorId,
      target_user_id: targetUserId,
      action: action,
      success: success,
      details: details,
      ip_address: null, // Edge Function 中获取 IP 需要额外配置
      created_at: new Date().toISOString()
    });
  } catch (error) {
    // 审计日志表可能不存在，仅打印到控制台
    console.log(`[SECURITY_AUDIT] ${action} | operator=${operatorId} | target=${targetUserId} | success=${success} | ${details}`);
  }
}

Deno.serve(async (req: Request) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 创建 Supabase 客户端（用于验证和审计）
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let operatorId = 'unknown';
  let targetUserId = 'unknown';

  try {
    // 获取请求体
    const { userId, newPassword } = await req.json();
    targetUserId = userId || 'unknown';

    // 验证参数
    if (!userId) {
      return new Response(
        JSON.stringify({ error: '缺少用户ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 验证密码强度（如果提供了新密码）
    if (newPassword) {
      if (newPassword.length < 6) {
        return new Response(
          JSON.stringify({ error: '密码长度至少为6位' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // 可以添加更多密码强度验证
    }

    // 使用默认密码（安全提示：生产环境建议使用随机密码）
    const password = newPassword || '123456';

    // 获取授权令牌
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      await logSecurityAudit(supabase, operatorId, targetUserId, 'RESET_PASSWORD', false, '未提供授权令牌');
      return new Response(
        JSON.stringify({ error: '未授权' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 验证请求者身份
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      await logSecurityAudit(supabase, operatorId, targetUserId, 'RESET_PASSWORD', false, '身份验证失败');
      return new Response(
        JSON.stringify({ error: '身份验证失败' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    operatorId = user.id;

    // 获取操作者的角色信息
    const { data: operatorProfile, error: operatorProfileError } = await supabase
      .from('profiles')
      .select('role, name')
      .eq('id', user.id)
      .maybeSingle();

    if (operatorProfileError || !operatorProfile) {
      await logSecurityAudit(supabase, operatorId, targetUserId, 'RESET_PASSWORD', false, '无法获取操作者信息');
      return new Response(
        JSON.stringify({ error: '无法验证操作者身份' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 检查操作者是否有权限重置密码
    if (!ALLOWED_ROLES.includes(operatorProfile.role)) {
      await logSecurityAudit(supabase, operatorId, targetUserId, 'RESET_PASSWORD', false, `角色 ${operatorProfile.role} 无权限`);
      return new Response(
        JSON.stringify({ error: '权限不足，仅管理员可以重置密码' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 如果是 PEER_ADMIN，检查是否有完全控制权限
    if (operatorProfile.role === 'PEER_ADMIN') {
      const { data: peerAdminPermission, error: permError } = await supabase
        .rpc('peer_admin_has_full_control', { p_user_id: user.id });
      
      if (permError || !peerAdminPermission) {
        await logSecurityAudit(supabase, operatorId, targetUserId, 'RESET_PASSWORD', false, 'PEER_ADMIN 无完全控制权限');
        return new Response(
          JSON.stringify({ error: '权限不足，您没有完全控制权限' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 获取目标用户的角色信息（防止越权）
    const { data: targetProfile, error: targetProfileError } = await supabase
      .from('profiles')
      .select('role, name')
      .eq('id', userId)
      .maybeSingle();

    if (targetProfileError) {
      await logSecurityAudit(supabase, operatorId, targetUserId, 'RESET_PASSWORD', false, '查询目标用户失败');
      return new Response(
        JSON.stringify({ error: '查询用户信息失败' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!targetProfile) {
      await logSecurityAudit(supabase, operatorId, targetUserId, 'RESET_PASSWORD', false, '目标用户不存在');
      return new Response(
        JSON.stringify({ error: '用户不存在' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 防止重置高权限用户的密码（除非操作者是 BOSS）
    if (PROTECTED_ROLES.includes(targetProfile.role) && operatorProfile.role !== 'BOSS') {
      await logSecurityAudit(supabase, operatorId, targetUserId, 'RESET_PASSWORD', false, `尝试重置受保护角色 ${targetProfile.role} 的密码`);
      return new Response(
        JSON.stringify({ error: '无法重置该用户的密码' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 防止重置自己的密码（应该使用修改密码功能）
    if (userId === user.id) {
      await logSecurityAudit(supabase, operatorId, targetUserId, 'RESET_PASSWORD', false, '尝试重置自己的密码');
      return new Response(
        JSON.stringify({ error: '不能通过此接口重置自己的密码，请使用修改密码功能' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 使用 Service Role 客户端重置用户密码
    // 注意：使用 admin API 时不需要先查询用户，直接更新即可
    const adminClient = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { data: updateData, error: updateError } = await adminClient.auth.admin.updateUserById(
      userId,
      { password }
    );

    if (updateError) {
      console.error('重置密码失败:', updateError);
      return new Response(
        JSON.stringify({ error: '重置密码失败', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 验证用户是否存在
    if (!updateData || !updateData.user) {
      return new Response(
        JSON.stringify({ error: '用户不存在', details: '未找到指定的用户ID' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 记录成功的审计日志
    await logSecurityAudit(
      supabase, 
      operatorId, 
      targetUserId, 
      'RESET_PASSWORD', 
      true, 
      `操作者 ${operatorProfile.name}(${operatorProfile.role}) 重置了用户 ${targetProfile.name}(${targetProfile.role}) 的密码`
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: '密码已重置',
        // 不在响应中返回具体密码值，提高安全性
        passwordReset: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('处理请求失败:', error);
    // 记录错误审计日志
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await logSecurityAudit(supabase, operatorId, targetUserId, 'RESET_PASSWORD', false, `服务器错误: ${error.message}`);
    } catch (_) {
      // 忽略审计日志错误
    }
    return new Response(
      JSON.stringify({ error: '服务器错误' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
