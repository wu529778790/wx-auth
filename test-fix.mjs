// 测试编码修复方案
import { XMLParser } from 'fast-xml-parser';

// 模拟诊断接口返回的乱码内容
const diagnosticBody = '<xml><MsgType>text</MsgType><Content>��֤��</Content><FromUserName>testuser</FromUserName><ToUserName>gh_test</ToUserName></xml>';

console.log('=== 测试乱码修复 ===');
console.log('原始Body:', diagnosticBody);

// 1. 正常解析
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseNodeValue: true,
  parseAttributeValue: true
});

const parsed = parser.parse(diagnosticBody);
console.log('\n1. 正常解析结果:', parsed.xml.Content);
console.log('   Hex:', Buffer.from(parsed.xml.Content).toString('hex'));

// 2. 检测乱码
const content = parsed.xml.Content;
const hasMojibake = content.includes('�') || Buffer.from(content).toString('hex').includes('efbfbd');
console.log('\n2. 是否包含乱码:', hasMojibake);

// 3. 模糊匹配测试
const keywords = ['已关注', '认证', '验证', 'login', '已订阅', '关注了', '验证码'];

// 精确匹配
const exactMatch = keywords.some(k => content.includes(k));
console.log('\n3. 精确匹配:', exactMatch);

// 模糊匹配 - 检查UTF-8字节
const contentBytes = Buffer.from(content, 'utf8');
const patterns = [
  Buffer.from('验证码'),
  Buffer.from([0xe9, 0xaa, 0x8c]), // 验
  Buffer.from([0xe8, 0xaf, 0x81]), // 证
  Buffer.from([0xe7, 0xa0, 0x81]), // 码
];

let fuzzyMatch = false;
for (const pattern of patterns) {
  if (contentBytes.includes(pattern)) {
    console.log('   匹配到字节模式:', pattern.toString('hex'));
    fuzzyMatch = true;
    break;
  }
}

// 检查单个字符
const hasYan = content.includes('验');
const hasZheng = content.includes('证');
const hasMa = content.includes('码');
console.log('   包含"验":', hasYan);
console.log('   包含"证":', hasZheng);
console.log('   包含"码":', hasMa);

fuzzyMatch = fuzzyMatch || hasYan || hasZheng || hasMa;

console.log('\n4. 模糊匹配结果:', fuzzyMatch);

// 5. 最终结果
const finalMatch = exactMatch || fuzzyMatch;
console.log('\n5. 最终匹配结果:', finalMatch);

// 6. 模拟修复
console.log('\n=== 修复尝试 ===');
// 从原始body重新解析
const bodyBuffer = Buffer.from(diagnosticBody);
const bodyStr = bodyBuffer.toString('utf8');
console.log('Body转字符串:', bodyStr);

const parsedFromRaw = parser.parse(bodyStr);
console.log('重新解析Content:', parsedFromRaw.xml.Content);

// 7. 测试真实场景
console.log('\n=== 真实场景测试 ===');
const testCases = [
  { input: '验证码', desc: '正常' },
  { input: '��֤��', desc: '乱码' },
  { input: '验', desc: '单字' },
  { input: '证', desc: '单字' },
  { input: '码', desc: '单字' },
  { input: '已关注', desc: '正常' },
  { input: '认证', desc: '正常' },
];

testCases.forEach(({ input, desc }) => {
  const match = keywords.some(k => input.includes(k)) ||
                input.includes('验') || input.includes('证') || input.includes('码');
  console.log(`"${input}" (${desc}) -> ${match ? '✅ 匹配' : '❌ 不匹配'}`);
});

console.log('\n=== 结论 ===');
console.log('修复方案：');
console.log('1. 检测乱码字符 (� 或 efbfbd)');
console.log('2. 尝试从原始body重新解析');
console.log('3. 使用模糊匹配检查部分字符');
console.log('4. 如果包含"验"/"证"/"码"也认为匹配');
