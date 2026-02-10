import type { DocumentParseResult } from '@/types/project';

/**
 * 解析HTML文件
 * @param file HTML文件
 * @returns 解析结果
 */
export async function parseHTML(file: File): Promise<DocumentParseResult> {
  try {
    // 读取HTML内容
    const htmlContent = await file.text();

    // 使用DOMParser解析HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    // 移除script和style标签
    const scripts = doc.querySelectorAll('script, style');
    scripts.forEach((el) => el.remove());

    // 提取标题
    const titleElement = doc.querySelector('title');
    const title = titleElement?.textContent || file.name.replace('.html', '');

    // 提取作者（如果有meta标签）
    const authorMeta = doc.querySelector('meta[name="author"]');
    const author = authorMeta?.getAttribute('content') || undefined;

    // 提取body文本
    const text = doc.body?.textContent || '';

    // 清理文本
    const cleanedText = cleanText(text);

    // 检测语言
    const language = doc.documentElement.lang || detectLanguage(cleanedText);

    return {
      text: cleanedText,
      language: language.startsWith('zh') ? 'zh' : 'en',
      format: 'html',
      title,
      author,
    };
  } catch (error) {
    console.error('HTML parsing error:', error);
    throw new Error(`Failed to parse HTML: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
