/**
 * 拼音搜索工具函数模块
 * 提供中文拼音首字母匹配功能
 * @module utils/pinyin
 * 
 * Requirements: 3.2
 */

/**
 * 常用汉字拼音首字母映射表
 * 包含常见姓名用字的拼音首字母
 * 这是一个精确映射，比基于 Unicode 范围的方法更准确
 * 注意：已去除重复的键，保留第一次出现的映射
 */
const PINYIN_MAP: Record<string, string> = {
  // 常见姓氏
  '张': 'Z', '王': 'W', '李': 'L', '赵': 'Z', '刘': 'L',
  '陈': 'C', '杨': 'Y', '黄': 'H', '周': 'Z', '吴': 'W',
  '徐': 'X', '孙': 'S', '马': 'M', '朱': 'Z', '胡': 'H',
  '郭': 'G', '何': 'H', '高': 'G', '林': 'L', '罗': 'L',
  '郑': 'Z', '梁': 'L', '谢': 'X', '宋': 'S', '唐': 'T',
  '许': 'X', '韩': 'H', '冯': 'F', '邓': 'D', '曹': 'C',
  '彭': 'P', '曾': 'Z', '萧': 'X', '田': 'T', '董': 'D',
  '袁': 'Y', '潘': 'P', '于': 'Y', '蒋': 'J', '蔡': 'C',
  '余': 'Y', '杜': 'D', '叶': 'Y', '程': 'C', '苏': 'S',
  '魏': 'W', '吕': 'L', '丁': 'D', '任': 'R', '沈': 'S',
  '姚': 'Y', '卢': 'L', '姜': 'J', '崔': 'C', '钟': 'Z',
  '谭': 'T', '陆': 'L', '汪': 'W', '范': 'F', '金': 'J',
  '石': 'S', '廖': 'L', '贾': 'J', '夏': 'X', '韦': 'W',
  '付': 'F', '方': 'F', '白': 'B', '邹': 'Z', '孟': 'M',
  '熊': 'X', '秦': 'Q', '邱': 'Q', '江': 'J', '尹': 'Y',
  '薛': 'X', '闫': 'Y', '段': 'D', '雷': 'L', '侯': 'H',
  '龙': 'L', '史': 'S', '陶': 'T', '黎': 'L', '贺': 'H',
  '顾': 'G', '毛': 'M', '郝': 'H', '龚': 'G', '邵': 'S',
  '万': 'W', '钱': 'Q', '严': 'Y', '覃': 'Q', '武': 'W',
  '戴': 'D', '莫': 'M', '孔': 'K', '向': 'X', '汤': 'T',
  
  // 常见名字用字（已去除与姓氏重复的字）
  '三': 'S', '四': 'S', '五': 'W', '六': 'L', '七': 'Q',
  '八': 'B', '九': 'J', '十': 'S', '一': 'Y', '二': 'E',
  '明': 'M', '华': 'H', '强': 'Q', '伟': 'W', '芳': 'F',
  '娜': 'N', '敏': 'M', '静': 'J', '丽': 'L', '军': 'J',
  '勇': 'Y', '杰': 'J', '涛': 'T', '超': 'C', '秀': 'X',
  '英': 'Y', '兰': 'L', '霞': 'X', '平': 'P', '刚': 'G',
  '建': 'J', '国': 'G', '文': 'W', '辉': 'H', '玲': 'L',
  '桂': 'G', '春': 'C', '燕': 'Y', '红': 'H', '梅': 'M',
  '云': 'Y', '海': 'H', '飞': 'F', '虎': 'H',
  '鹏': 'P', '波': 'B', '磊': 'L', '峰': 'F', '亮': 'L',
  '志': 'Z', '成': 'C', '东': 'D', '西': 'X', '南': 'N',
  '北': 'B', '中': 'Z', '大': 'D', '小': 'X', '新': 'X',
  '旧': 'J', '长': 'C', '永': 'Y', '安': 'A', '康': 'K',
  '健': 'J', '宁': 'N', '福': 'F', '禄': 'L', '寿': 'S',
  '喜': 'X', '财': 'C', '富': 'F', '贵': 'G', '荣': 'R',
  '德': 'D', '仁': 'R', '义': 'Y', '礼': 'L', '智': 'Z',
  '信': 'X', '忠': 'Z', '孝': 'X', '廉': 'L', '耻': 'C',
  '美': 'M', '善': 'S', '真': 'Z', '诚': 'C', '正': 'Z',
  '清': 'Q', '洁': 'J', '雅': 'Y', '俊': 'J', '帅': 'S',
  '婷': 'T', '倩': 'Q', '琳': 'L', '瑶': 'Y', '莹': 'Y',
  '晶': 'J', '颖': 'Y', '慧': 'H', '思': 'S', '怡': 'Y',
  '欣': 'X', '悦': 'Y', '乐': 'L', '欢': 'H', '爱': 'A',
  '心': 'X', '情': 'Q', '意': 'Y', '念': 'N', '想': 'X',
  '梦': 'M', '幻': 'H', '奇': 'Q', '妙': 'M', '神': 'S',
  '圣': 'S', '灵': 'L', '魂': 'H', '魄': 'P', '气': 'Q',
  '力': 'L', '能': 'N', '量': 'L', '光': 'G', '电': 'D',
  '火': 'H', '水': 'S', '土': 'T', '木': 'M',
  '银': 'Y', '铜': 'T', '铁': 'T', '钢': 'G',
  '玉': 'Y', '珠': 'Z', '宝': 'B', '贝': 'B', '珍': 'Z',
  '琴': 'Q', '棋': 'Q', '书': 'S', '画': 'H', '诗': 'S',
  '词': 'C', '歌': 'G', '舞': 'W', '曲': 'Q',
  '天': 'T', '地': 'D', '人': 'R', '日': 'R', '月': 'Y',
  '星': 'X', '辰': 'C', '风': 'F', '雨': 'Y', '雪': 'X',
  '冰': 'B', '霜': 'S', '露': 'L', '雾': 'W', '虹': 'H',
  '山': 'S', '河': 'H', '湖': 'H', '溪': 'X',
  '泉': 'Q', '瀑': 'P', '潭': 'T', '池': 'C', '塘': 'T',
  '花': 'H', '草': 'C', '树': 'S', '森': 'S',
  '竹': 'Z', '松': 'S', '柏': 'B', '柳': 'L',
  '桃': 'T', '杏': 'X', '梨': 'L', '枣': 'Z',
  '鸟': 'N', '鱼': 'Y', '虫': 'C', '兽': 'S', '龟': 'G',
  '蛇': 'S', '牛': 'N', '羊': 'Y', '猪': 'Z',
  '狗': 'G', '猫': 'M', '鸡': 'J', '鸭': 'Y', '鹅': 'E',
  '凤': 'F', '鹤': 'H', '鹰': 'Y', '雁': 'Y',
}

/**
 * 获取单个汉字的拼音首字母
 * 
 * @param char - 单个汉字字符
 * @returns 拼音首字母（大写），如果不是汉字则返回原字符
 * 
 * @example
 * getCharPinyinFirstLetter('张') // 'Z'
 * getCharPinyinFirstLetter('A') // 'A'
 */
function getCharPinyinFirstLetter(char: string): string {
  // 如果不是单个字符，返回空
  if (!char || char.length !== 1) return ''
  
  const charCode = char.charCodeAt(0)
  
  // 如果是英文字母，直接返回大写
  if ((charCode >= 65 && charCode <= 90) || (charCode >= 97 && charCode <= 122)) {
    return char.toUpperCase()
  }
  
  // 如果是数字，直接返回
  if (charCode >= 48 && charCode <= 57) {
    return char
  }
  
  // 查找拼音映射表
  if (PINYIN_MAP[char]) {
    return PINYIN_MAP[char]
  }
  
  // 如果不在映射表中，返回原字符
  return char
}

/**
 * 获取字符串的拼音首字母序列
 * 
 * @param text - 要转换的字符串
 * @returns 拼音首字母序列（大写）
 * 
 * @example
 * getPinyinFirstLetters('张三') // 'ZS'
 * getPinyinFirstLetters('李四') // 'LS'
 * getPinyinFirstLetters('王五') // 'WW'
 */
export function getPinyinFirstLetters(text: string): string {
  if (!text) return ''
  
  let result = ''
  for (let i = 0; i < text.length; i++) {
    result += getCharPinyinFirstLetter(text[i])
  }
  
  return result
}

/**
 * 拼音首字母匹配
 * 支持以下匹配方式：
 * 1. 直接文本匹配（包含关系）
 * 2. 拼音首字母匹配
 * 
 * @param text - 要匹配的文本（如姓名）
 * @param keyword - 搜索关键词
 * @returns 是否匹配
 * 
 * @example
 * matchWithPinyin('张三', '张') // true - 直接匹配
 * matchWithPinyin('张三', 'zs') // true - 拼音首字母匹配
 * matchWithPinyin('张三', 'ZS') // true - 拼音首字母匹配（不区分大小写）
 * matchWithPinyin('张三', '李') // false - 不匹配
 * matchWithPinyin('张三', 'ls') // false - 不匹配
 */
export function matchWithPinyin(text: string, keyword: string): boolean {
  // 空关键词匹配所有
  if (!keyword || keyword.trim() === '') {
    return true
  }
  
  // 空文本不匹配任何关键词
  if (!text) {
    return false
  }
  
  const normalizedKeyword = keyword.toLowerCase().trim()
  const normalizedText = text.toLowerCase()
  
  // 1. 直接文本匹配（包含关系）
  if (normalizedText.includes(normalizedKeyword)) {
    return true
  }
  
  // 2. 拼音首字母匹配
  const pinyinLetters = getPinyinFirstLetters(text).toLowerCase()
  if (pinyinLetters.includes(normalizedKeyword)) {
    return true
  }
  
  // 3. 拼音首字母前缀匹配
  if (pinyinLetters.startsWith(normalizedKeyword)) {
    return true
  }
  
  return false
}

/**
 * 在列表中搜索匹配的项
 * 
 * @param list - 要搜索的列表
 * @param keyword - 搜索关键词
 * @param getTextField - 获取文本字段的函数
 * @returns 匹配的项列表
 * 
 * @example
 * const users = [{ name: '张三' }, { name: '李四' }]
 * searchWithPinyin(users, 'zs', item => item.name) // [{ name: '张三' }]
 */
export function searchWithPinyin<T>(
  list: T[],
  keyword: string,
  getTextField: (item: T) => string
): T[] {
  if (!keyword || keyword.trim() === '') {
    return list
  }
  
  return list.filter(item => matchWithPinyin(getTextField(item), keyword))
}
