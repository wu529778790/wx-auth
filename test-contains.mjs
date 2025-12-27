// 测试 containsAuthKeyword 函数

function containsAuthKeyword(content) {
  const keywords = ['已关注', '认证', '验证', 'login', '已订阅', '关注了', '验证码', '1'];
  return keywords.some(k => content.includes(k));
}

const testCases = ['1', '验证码', '已关注', '认证', '验证', 'login', '已订阅', '关注了', 'test', '2', ''];

console.log('测试 containsAuthKeyword:');
testCases.forEach(tc => {
  const result = containsAuthKeyword(tc);
  console.log(`"${tc}" -> ${result}`);
});
