/**
 * 司机信息验证属性测试
 * 使用 fast-check 进行属性测试，验证司机信息更新的正确性
 * 
 * **Feature: manager-page-alignment, Property 3: 司机信息更新一致性**
 * **Validates: Requirements 1.3**
 * 
 * @module utils/__tests__/driverInfoValidation.pbt.test
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validateDriverName,
  validateDriverPhone,
  validateDriverInfoUpdate,
  formatDriverName,
  formatDriverPhone,
} from '../validation/driverInfoValidation';

/**
 * 生成有效中文姓名的 Arbitrary
 * 生成 1-20 个字符的中文姓名
 */
const validChineseNameArb = fc.array(
  fc.constantFrom(
    '张', '王', '李', '赵', '刘', '陈', '杨', '黄', '周', '吴',
    '三', '四', '五', '明', '华', '强', '伟', '芳', '娜', '敏'
  ),
  { minLength: 1, maxLength: 10 }
).map(chars => chars.join(''));

/**
 * 生成有效手机号的 Arbitrary
 * 生成符合中国大陆手机号格式的号码
 */
const validPhoneArb = fc.tuple(
  fc.constantFrom('3', '4', '5', '6', '7', '8', '9'), // 第二位
  fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 9, maxLength: 9 })
).map(([second, rest]) => `1${second}${rest}`);

/**
 * 生成无效手机号的 Arbitrary
 */
const invalidPhoneArb = fc.oneof(
  // 太短
  fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 1, maxLength: 10 }),
  // 太长
  fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 12, maxLength: 15 }),
  // 不以1开头
  fc.tuple(
    fc.constantFrom('2', '3', '4', '5', '6', '7', '8', '9', '0'),
    fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 10, maxLength: 10 })
  ).map(([first, rest]) => `${first}${rest}`),
  // 包含非数字字符
  fc.string({ minLength: 11, maxLength: 11 }).filter(s => /[^0-9]/.test(s))
);

describe('司机信息验证属性测试', () => {
  /**
   * Property 3: 司机信息更新一致性
   * *For any* 有效的司机信息，验证应该通过
   * **Validates: Requirements 1.3**
   */
  describe('Property 3: 司机信息更新一致性', () => {
    it('有效的中文姓名应该通过验证', () => {
      fc.assert(
        fc.property(validChineseNameArb, (name) => {
          const result = validateDriverName(name);
          return result.valid === true && result.errors.length === 0;
        }),
        { numRuns: 100 }
      );
    });

    it('空姓名应该验证失败', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', '   ', '\t', '\n', '  \t  '),
          (name) => {
            const result = validateDriverName(name);
            return result.valid === false && result.errors.length > 0;
          }
        ),
        { numRuns: 10 }
      );
    });

    it('超长姓名应该验证失败', () => {
      fc.assert(
        fc.property(
          // 生成不包含空白字符的超长字符串，确保 trim 后仍然超过 20 个字符
          fc.stringOf(
            fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz张王李赵刘陈杨黄周吴'.split('')),
            { minLength: 21, maxLength: 50 }
          ),
          (name) => {
            const result = validateDriverName(name);
            // 如果姓名超过20个字符，应该验证失败
            return result.valid === false;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('有效的手机号应该通过验证', () => {
      fc.assert(
        fc.property(validPhoneArb, (phone) => {
          const result = validateDriverPhone(phone);
          return result.valid === true && result.errors.length === 0;
        }),
        { numRuns: 100 }
      );
    });

    it('空手机号应该通过验证（可选字段）', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', undefined, '   ', null as unknown as string),
          (phone) => {
            const result = validateDriverPhone(phone);
            return result.valid === true;
          }
        ),
        { numRuns: 10 }
      );
    });

    it('无效的手机号应该验证失败', () => {
      fc.assert(
        fc.property(invalidPhoneArb, (phone) => {
          const result = validateDriverPhone(phone);
          // 无效手机号应该验证失败
          return result.valid === false;
        }),
        { numRuns: 100 }
      );
    });

    it('完整的司机信息更新应该正确验证', () => {
      fc.assert(
        fc.property(
          validChineseNameArb,
          fc.option(validPhoneArb, { nil: undefined }),
          (name, phone) => {
            const result = validateDriverInfoUpdate({ name, phone });
            return result.valid === true && result.errors.length === 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('无效姓名的司机信息更新应该验证失败', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', '   '),
          fc.option(validPhoneArb, { nil: undefined }),
          (name, phone) => {
            const result = validateDriverInfoUpdate({ name, phone });
            return result.valid === false && result.errors.some(e => e.includes('姓名'));
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('格式化函数属性测试', () => {
    it('格式化姓名应该去除首尾空白', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.stringOf(fc.constant(' '), { minLength: 0, maxLength: 3 }),
            validChineseNameArb,
            fc.stringOf(fc.constant(' '), { minLength: 0, maxLength: 3 })
          ),
          ([prefix, name, suffix]) => {
            const input = `${prefix}${name}${suffix}`;
            const result = formatDriverName(input);
            return result === name;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('格式化手机号应该去除所有空白', () => {
      fc.assert(
        fc.property(validPhoneArb, (phone) => {
          // 在手机号中随机插入空格
          const withSpaces = phone.split('').join(' ');
          const result = formatDriverPhone(withSpaces);
          return result === phone;
        }),
        { numRuns: 100 }
      );
    });

    it('格式化空值应该返回空字符串', () => {
      expect(formatDriverName('')).toBe('');
      expect(formatDriverPhone('')).toBe('');
      expect(formatDriverPhone(undefined)).toBe('');
    });
  });
});

/**
 * 具体示例测试
 * 验证常见的司机信息验证场景
 */
describe('司机信息验证示例测试', () => {
  describe('姓名验证', () => {
    it('张三应该通过验证', () => {
      const result = validateDriverName('张三');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('空字符串应该验证失败', () => {
      const result = validateDriverName('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('姓名不能为空');
    });

    it('只有空格应该验证失败', () => {
      const result = validateDriverName('   ');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('姓名不能为空');
    });

    it('超过20个字符应该验证失败', () => {
      const longName = '张'.repeat(21);
      const result = validateDriverName(longName);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('20'))).toBe(true);
    });
  });

  describe('手机号验证', () => {
    it('13800138000应该通过验证', () => {
      const result = validateDriverPhone('13800138000');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('空字符串应该通过验证（可选字段）', () => {
      const result = validateDriverPhone('');
      expect(result.valid).toBe(true);
    });

    it('undefined应该通过验证（可选字段）', () => {
      const result = validateDriverPhone(undefined);
      expect(result.valid).toBe(true);
    });

    it('10位数字应该验证失败', () => {
      const result = validateDriverPhone('1380013800');
      expect(result.valid).toBe(false);
    });

    it('12位数字应该验证失败', () => {
      const result = validateDriverPhone('138001380001');
      expect(result.valid).toBe(false);
    });

    it('不以1开头应该验证失败', () => {
      const result = validateDriverPhone('23800138000');
      expect(result.valid).toBe(false);
    });
  });

  describe('完整信息验证', () => {
    it('有效的姓名和手机号应该通过验证', () => {
      const result = validateDriverInfoUpdate({
        name: '张三',
        phone: '13800138000',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('有效的姓名和空手机号应该通过验证', () => {
      const result = validateDriverInfoUpdate({
        name: '张三',
        phone: '',
      });
      expect(result.valid).toBe(true);
    });

    it('空姓名应该验证失败', () => {
      const result = validateDriverInfoUpdate({
        name: '',
        phone: '13800138000',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('姓名'))).toBe(true);
    });

    it('无效手机号应该验证失败', () => {
      const result = validateDriverInfoUpdate({
        name: '张三',
        phone: '12345',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('手机号'))).toBe(true);
    });
  });
});
