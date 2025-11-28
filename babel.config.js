// babel-preset-taro 更多选项和默认值：
// https://github.com/NervJS/taro/blob/next/packages/babel-preset-taro/README.md
module.exports = {
  presets: [
    [
      'taro',
      {
        framework: 'react',
        ts: true
      }
    ]
  ],
  plugins: [],
  // 确保 Babel 正确转译 ES2020+ 特性
  assumptions: {
    // 启用更宽松的转译以提高性能
    setPublicClassFields: true,
    privateFieldsAsProperties: true
  }
}
