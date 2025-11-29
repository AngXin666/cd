#!/usr/bin/env node

/**
 * 测试创建租户 API
 */

require('dotenv').config();

const supabaseUrl = process.env.TARO_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.TARO_APP_SUPABASE_ANON_KEY;

async function testCreateTenant() {
  const url = `${supabaseUrl}/functions/v1/create-tenant`;
  
  const requestBody = {
    company_name: '测试租户1',
    boss_name: '老板1',
    boss_phone: '13900000001',
    boss_account: 'admin1',
    boss_password: '123456'
  };

  console.log('📤 发送请求到:', url);
  console.log('📝 请求体:', JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey
      },
      body: JSON.stringify(requestBody)
    });

    console.log('\n📥 响应状态:', response.status, response.statusText);
    console.log('📋 响应头:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('\n📄 响应内容（原始）:', responseText);

    try {
      const responseJson = JSON.parse(responseText);
      console.log('\n📄 响应内容（JSON）:', JSON.stringify(responseJson, null, 2));
    } catch (e) {
      console.log('\n⚠️ 响应不是有效的 JSON');
    }

  } catch (error) {
    console.error('\n❌ 请求失败:', error);
  }
}

testCreateTenant();
