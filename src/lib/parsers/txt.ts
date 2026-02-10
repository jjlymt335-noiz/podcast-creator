import type { DocumentParseResult } from '@/types/project';

/**
 * 解析TXT文件
 * @param file TXT文件
 * @returns 解析结果
 */
export async function parseTXT(file: File): Promise<DocumentParseResult> {
  try {
    // 读取文本内容
    const text = await file.text();

    // 清理文本
    const cleanedText = cleanText(text);

    // 检测语言
    const language = detectLanguage(cleanedText);

    const title = file.name.replace('.txt', '');

    return {
      text: cleanedText,
      language,
      format: 'txt',
      title,
    };
  } catch (error) {
    console.error('TXT parsing error:', error);
    throw new Error(`Failed to parse TXT: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 清理文本
 */
function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n') // Windows换行符转Unix
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * 简单的语言检测
 */
function detectLanguage(text: string): string {
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
  const chineseRatio = chineseChars.length / text.length;

  if (chineseRatio > 0.3) {
    return 'zh';
  }

  return 'en';
}
