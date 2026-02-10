import mammoth from 'mammoth';
import type { DocumentParseResult } from '@/types/project';

/**
 * 解析DOCX文件
 * @param file DOCX文件
 * @returns 解析结果
 */
export async function parseDOCX(file: File): Promise<DocumentParseResult> {
  try {
    // 读取文件为ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // 使用mammoth提取文本
    const result = await mammoth.extractRawText({ arrayBuffer });

    // 清理文本
    const cleanedText = cleanText(result.value);

    // 检测语言
    const language = detectLanguage(cleanedText);

    // DOCX没有内置的title/author元数据，使用文件名
    const title = file.name.replace('.docx', '');

    return {
      text: cleanedText,
      language,
      format: 'docx',
      title,
    };
  } catch (error) {
    console.error('DOCX parsing error:', error);
    throw new Error(`Failed to parse DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 清理文本
 */
function cleanText(text: string): string {
  return text
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
