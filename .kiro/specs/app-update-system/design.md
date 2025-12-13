# 应用更新系统设计文档

## Overview

应用更新系统是一个轻量级的版本管理和强制更新解决方案，利用现有的Supabase后台实现零成本的应用更新功能。系统在用户登录后自动检查版本，如果发现新版本，将显示更新对话框引导用户下载安装新的APK。

核心特点：
- 完全免费，利用Supabase Storage和Database
- 强制更新机制，确保用户使用最新版本
- 简单的版本管理，通过Supabase Dashboard操作
- 无需修改原生代码，纯前端实现

## Architecture

### 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        用户登录流程                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      版本检查服务                            │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │ 获取本地版本  │ ───▶ │ 查询服务器版本 │                    │
│  └──────────────┘      └──────────────┘                    │
│                              │                              │
│                              ▼                              │
│                      ┌──────────────┐                       │
│                      │  版本比较     │                       │
│                      └──────────────┘                       │
│                              │                              │
│                    ┌─────────┴─────────┐                   │
│                    ▼                   ▼                   │
│            ┌──────────────┐    ┌──────────────┐           │
│            │ 需要更新      │    │ 无需更新      │           │
│            └──────────────┘    └──────────────┘           │
│                    │                   │                   │
└────────────────────┼───────────────────┼───────────────────┘
                     │                   │
                     ▼                   ▼
          ┌──────────────────┐   ┌──────────────┐
          │  显示更新对话框   │   │  进入应用     │
          └──────────────────┘   └──────────────┘
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
  ┌──────────────┐      ┌──────────────┐
  │  强制更新     │      │  可选更新     │
  └──────────────┘      └──────────────┘
          │                     │
          ▼                     ▼
  ┌──────────────┐      ┌──────────────┐
  │ 打开下载链接  │      │ 稍后提醒/更新 │
  └──────────────┘      └──────────────┘
```

### 数据流

1. **版本检查流程**
   ```
   用户登录 → 读取本地版本 → 查询Supabase最新版本 → 比较版本号 → 决定是否更新
   ```

2. **更新流程**
   ```
   显示对话框 → 用户点击更新 → 打开浏览器下载APK → 用户安装 → 重启应用
   ```

3. **版本管理流程**
   ```
   构建APK → 上传到Supabase Storage → 在app_versions表创建记录 → 用户检查到更新
   ```

## Components and Interfaces

### 1. 数据库表结构

#### app_versions 表

```sql
CREATE TABLE app_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version VARCHAR(20) NOT NULL,           -- 版本号，如 "1.0.0"
  version_code INTEGER NOT NULL,          -- 版本代码，用于比较，如 100
  release_notes TEXT,                     -- 更新说明
  apk_url TEXT NOT NULL,                  -- APK下载URL
  is_force_update BOOLEAN DEFAULT false,  -- 是否强制更新
  is_active BOOLEAN DEFAULT true,         -- 是否激活
  min_supported_version VARCHAR(20),      -- 最低支持版本
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_app_versions_active ON app_versions(is_active);
CREATE INDEX idx_app_versions_version_code ON app_versions(version_code DESC);
```

### 2. Supabase Storage Bucket

```typescript
// Bucket配置
{
  name: 'apk-files',
  public: true,  // 允许公开访问
  fileSizeLimit: 100 * 1024 * 1024,  // 100MB
  allowedMimeTypes: ['application/vnd.android.package-archive']
}
```

### 3. 核心服务接口

#### VersionService

```typescript
interface VersionInfo {
  version: string;           // "1.0.0"
  versionCode: number;       // 100
  releaseNotes: string;      // 更新说明
  apkUrl: string;           // 下载URL
  isForceUpdate: boolean;   // 是否强制更新
  minSupportedVersion?: string;
}

interface VersionService {
  // 获取当前应用版本
  getCurrentVersion(): string;
  
  // 获取服务器最新版本
  getLatestVersion(): Promise<VersionInfo | null>;
  
  // 比较版本号
  compareVersions(v1: string, v2: string): number;
  
  // 检查是否需要更新
  checkForUpdate(): Promise<{
    needsUpdate: boolean;
    versionInfo?: VersionInfo;
  }>;
}
```

#### UpdateService

```typescript
interface UpdateService {
  // 显示更新对话框
  showUpdateDialog(versionInfo: VersionInfo): Promise<void>;
  
  // 打开APK下载链接
  openDownloadLink(url: string): Promise<void>;
  
  // 记录用户跳过更新（仅可选更新）
  skipUpdate(version: string): void;
  
  // 检查用户是否跳过了某个版本
  hasSkippedVersion(version: string): boolean;
}
```

### 4. React组件

#### UpdateDialog 组件

```typescript
interface UpdateDialogProps {
  visible: boolean;
  versionInfo: VersionInfo;
  onUpdate: () => void;
  onCancel?: () => void;  // 强制更新时为undefined
}

const UpdateDialog: React.FC<UpdateDialogProps> = ({
  visible,
  versionInfo,
  onUpdate,
  onCancel
}) => {
  // 渲染更新对话框
  // 显示版本号、更新说明、操作按钮
};
```

## Data Models

### 版本号格式

使用语义化版本（Semantic Versioning）：`major.minor.patch`

- **major**: 主版本号，不兼容的API修改
- **minor**: 次版本号，向下兼容的功能性新增
- **patch**: 修订号，向下兼容的问题修正

示例：`1.2.3`
- major = 1
- minor = 2  
- patch = 3

### 版本代码（Version Code）

为了简化版本比较，使用整数版本代码：

```
versionCode = major * 10000 + minor * 100 + patch
```

示例：
- `1.0.0` → 10000
- `1.2.3` → 10203
- `2.0.0` → 20000

### 本地存储数据

```typescript
interface LocalVersionData {
  skippedVersions: string[];  // 用户跳过的版本列表
  lastCheckTime: number;      // 上次检查时间戳
}
```

## 
Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 版本比较的传递性

*For any* three version strings v1, v2, v3, if compareVersions(v1, v2) > 0 and compareVersions(v2, v3) > 0, then compareVersions(v1, v3) > 0

**Validates: Requirements 5.4**

### Property 2: 版本比较的反对称性

*For any* two version strings v1 and v2, if compareVersions(v1, v2) > 0, then compareVersions(v2, v1) < 0

**Validates: Requirements 5.4**

### Property 3: 相同版本比较结果为零

*For any* version string v, compareVersions(v, v) should equal 0

**Validates: Requirements 5.4**

### Property 4: 版本检查决策一致性

*For any* local version and server version, if server version is higher, then checkForUpdate should return needsUpdate = true

**Validates: Requirements 2.3**

### Property 5: 强制更新对话框不可关闭

*For any* version info where isForceUpdate = true, the update dialog should not provide a cancel option

**Validates: Requirements 7.1, 7.2, 7.3**

### Property 6: APK URL格式验证

*For any* version record with an APK URL, the URL should match the pattern `^https?://.*\.apk$` or be a valid Supabase storage URL

**Validates: Requirements 1.4**

### Property 7: 版本代码单调性

*For any* two versions v1 and v2, if v1 is semantically greater than v2, then versionCode(v1) > versionCode(v2)

**Validates: Requirements 5.3, 5.4**

## Error Handling

### 1. 网络错误处理

```typescript
try {
  const latestVersion = await getLatestVersion();
} catch (error) {
  // 记录错误但不阻止用户使用应用
  console.error('版本检查失败:', error);
  // 允许用户继续使用
  return { needsUpdate: false };
}
```

**策略**: 版本检查失败时，允许用户继续使用应用，避免因网络问题导致无法登录。

### 2. 无效版本数据处理

```typescript
if (!versionInfo || !versionInfo.apkUrl) {
  console.error('版本信息无效');
  return { needsUpdate: false };
}

// 验证URL格式
if (!isValidUrl(versionInfo.apkUrl)) {
  console.error('APK下载链接无效');
  showToast({ title: '更新链接无效，请联系管理员', icon: 'none' });
  return { needsUpdate: false };
}
```

**策略**: 验证服务器返回的数据完整性，防止无效数据导致应用崩溃。

### 3. 下载链接打开失败

```typescript
try {
  await openDownloadLink(apkUrl);
} catch (error) {
  console.error('打开下载链接失败:', error);
  showToast({ 
    title: '无法打开下载链接，请手动访问', 
    icon: 'none',
    duration: 3000
  });
}
```

**策略**: 如果无法自动打开下载链接，提示用户手动操作。

### 4. 版本号解析错误

```typescript
function parseVersion(version: string): { major: number; minor: number; patch: number } | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    console.error('无效的版本号格式:', version);
    return null;
  }
  return {
    major: parseInt(match[1]),
    minor: parseInt(match[2]),
    patch: parseInt(match[3])
  };
}
```

**策略**: 严格验证版本号格式，返回null表示解析失败。

## Testing Strategy

### 单元测试

#### 版本比较测试

```typescript
describe('VersionService.compareVersions', () => {
  it('should correctly compare major versions', () => {
    expect(compareVersions('2.0.0', '1.0.0')).toBeGreaterThan(0);
    expect(compareVersions('1.0.0', '2.0.0')).toBeLessThan(0);
  });

  it('should correctly compare minor versions', () => {
    expect(compareVersions('1.2.0', '1.1.0')).toBeGreaterThan(0);
    expect(compareVersions('1.1.0', '1.2.0')).toBeLessThan(0);
  });

  it('should correctly compare patch versions', () => {
    expect(compareVersions('1.0.2', '1.0.1')).toBeGreaterThan(0);
    expect(compareVersions('1.0.1', '1.0.2')).toBeLessThan(0);
  });

  it('should return 0 for equal versions', () => {
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
  });
});
```

#### 版本代码生成测试

```typescript
describe('VersionService.getVersionCode', () => {
  it('should generate correct version codes', () => {
    expect(getVersionCode('1.0.0')).toBe(10000);
    expect(getVersionCode('1.2.3')).toBe(10203);
    expect(getVersionCode('2.0.0')).toBe(20000);
  });

  it('should maintain ordering', () => {
    const v1 = getVersionCode('1.0.0');
    const v2 = getVersionCode('1.0.1');
    const v3 = getVersionCode('1.1.0');
    expect(v2).toBeGreaterThan(v1);
    expect(v3).toBeGreaterThan(v2);
  });
});
```

### 属性测试（Property-Based Testing）

使用 `fast-check` 库进行属性测试：

#### Property 1: 版本比较传递性

```typescript
import fc from 'fast-check';

describe('Version comparison properties', () => {
  it('should satisfy transitivity', () => {
    fc.assert(
      fc.property(
        fc.tuple(versionArbitrary(), versionArbitrary(), versionArbitrary()),
        ([v1, v2, v3]) => {
          const cmp12 = compareVersions(v1, v2);
          const cmp23 = compareVersions(v2, v3);
          const cmp13 = compareVersions(v1, v3);
          
          // 如果 v1 > v2 且 v2 > v3，则 v1 > v3
          if (cmp12 > 0 && cmp23 > 0) {
            return cmp13 > 0;
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// 生成有效版本号的arbitrary
function versionArbitrary() {
  return fc.tuple(
    fc.integer({ min: 0, max: 99 }),
    fc.integer({ min: 0, max: 99 }),
    fc.integer({ min: 0, max: 99 })
  ).map(([major, minor, patch]) => `${major}.${minor}.${patch}`);
}
```

#### Property 2: 版本比较反对称性

```typescript
it('should satisfy antisymmetry', () => {
  fc.assert(
    fc.property(
      fc.tuple(versionArbitrary(), versionArbitrary()),
      ([v1, v2]) => {
        const cmp12 = compareVersions(v1, v2);
        const cmp21 = compareVersions(v2, v1);
        
        // 如果 v1 > v2，则 v2 < v1
        if (cmp12 > 0) {
          return cmp21 < 0;
        }
        // 如果 v1 < v2，则 v2 > v1
        if (cmp12 < 0) {
          return cmp21 > 0;
        }
        // 如果 v1 == v2，则 v2 == v1
        return cmp21 === 0;
      }
    ),
    { numRuns: 100 }
  );
});
```

#### Property 7: 版本代码单调性

```typescript
it('should maintain version code monotonicity', () => {
  fc.assert(
    fc.property(
      fc.tuple(versionArbitrary(), versionArbitrary()),
      ([v1, v2]) => {
        const cmp = compareVersions(v1, v2);
        const code1 = getVersionCode(v1);
        const code2 = getVersionCode(v2);
        
        // 如果 v1 > v2，则 code1 > code2
        if (cmp > 0) {
          return code1 > code2;
        }
        // 如果 v1 < v2，则 code1 < code2
        if (cmp < 0) {
          return code1 < code2;
        }
        // 如果 v1 == v2，则 code1 == code2
        return code1 === code2;
      }
    ),
    { numRuns: 100 }
  );
});
```

### 集成测试

#### 完整更新流程测试

```typescript
describe('Update flow integration', () => {
  it('should show update dialog when new version available', async () => {
    // Mock服务器返回新版本
    mockSupabase.from('app_versions').select.mockResolvedValue({
      data: [{
        version: '1.1.0',
        version_code: 10100,
        apk_url: 'https://example.com/app-1.1.0.apk',
        is_force_update: true
      }]
    });

    // 设置当前版本为1.0.0
    mockGetCurrentVersion.mockReturnValue('1.0.0');

    const result = await checkForUpdate();
    
    expect(result.needsUpdate).toBe(true);
    expect(result.versionInfo?.version).toBe('1.1.0');
    expect(result.versionInfo?.isForceUpdate).toBe(true);
  });

  it('should not show dialog when version is up to date', async () => {
    mockSupabase.from('app_versions').select.mockResolvedValue({
      data: [{
        version: '1.0.0',
        version_code: 10000
      }]
    });

    mockGetCurrentVersion.mockReturnValue('1.0.0');

    const result = await checkForUpdate();
    
    expect(result.needsUpdate).toBe(false);
  });
});
```

### 测试覆盖目标

- 单元测试覆盖率：> 90%
- 属性测试：所有核心算法（版本比较、版本代码生成）
- 集成测试：覆盖主要用户流程
- 边界测试：版本号边界值、网络错误、无效数据

## Implementation Notes

### 1. 版本号获取

从 `package.json` 读取版本号：

```typescript
import packageJson from '../../package.json';

export function getCurrentVersion(): string {
  return packageJson.version;
}
```

### 2. Capacitor App插件

使用Capacitor的App插件获取应用信息：

```typescript
import { App } from '@capacitor/app';

export async function getAppInfo() {
  const info = await App.getInfo();
  return {
    version: info.version,
    build: info.build
  };
}
```

### 3. 浏览器打开链接

使用Capacitor的Browser插件：

```typescript
import { Browser } from '@capacitor/browser';

export async function openDownloadLink(url: string) {
  await Browser.open({ url });
}
```

### 4. 登录后触发检查

在登录成功回调中添加版本检查：

```typescript
const handleLoginSuccess = async () => {
  // 原有登录逻辑
  removeStorageCompat('loginSourcePage');
  
  // 添加版本检查
  try {
    const updateResult = await checkForUpdate();
    if (updateResult.needsUpdate && updateResult.versionInfo) {
      await showUpdateDialog(updateResult.versionInfo);
      // 如果是强制更新，不继续跳转
      if (updateResult.versionInfo.isForceUpdate) {
        return;
      }
    }
  } catch (error) {
    console.error('版本检查失败:', error);
  }
  
  // 跳转到首页
  switchTab({ url: '/pages/index/index' });
};
```

### 5. Supabase RLS策略

```sql
-- 允许所有人读取激活的版本信息
CREATE POLICY "Allow public read active versions"
ON app_versions FOR SELECT
USING (is_active = true);

-- 只允许管理员插入和更新
CREATE POLICY "Allow admin insert versions"
ON app_versions FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Allow admin update versions"
ON app_versions FOR UPDATE
USING (auth.jwt() ->> 'role' = 'admin');
```

### 6. 版本发布流程

1. 构建新版本APK
2. 上传APK到Supabase Storage的 `apk-files` bucket
3. 获取公开访问URL
4. 在Supabase Dashboard中插入新版本记录到 `app_versions` 表
5. 用户登录时自动检测到更新

## Security Considerations

1. **APK文件验证**: 虽然Supabase Storage是可信的，但建议在上传时验证APK签名
2. **URL验证**: 验证APK URL来自可信域名（Supabase Storage）
3. **版本信息完整性**: 使用Supabase RLS确保只有管理员能修改版本信息
4. **下载安全**: 使用HTTPS确保APK下载过程安全

## Performance Considerations

1. **版本检查时机**: 仅在登录后检查一次，避免频繁请求
2. **缓存策略**: 可以缓存最后检查时间，避免短时间内重复检查
3. **异步加载**: 版本检查不阻塞登录流程，失败时允许用户继续使用
4. **APK文件大小**: 建议APK文件小于50MB，确保下载速度

## Future Enhancements

1. **增量更新**: 未来可以考虑使用差分更新减少下载大小
2. **下载进度**: 显示APK下载进度条
3. **自动安装**: 探索自动安装APK的可能性（需要特殊权限）
4. **版本回滚**: 支持回滚到之前的版本
5. **A/B测试**: 支持灰度发布，部分用户先体验新版本
