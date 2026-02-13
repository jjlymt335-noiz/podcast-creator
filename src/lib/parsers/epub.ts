import ePub from 'epubjs';
import type { DocumentParseResult } from '@/types/project';

/**
 * 解析EPUB文件
 * @param file EPUB文件
 * @returns 解析结果
 */
export async function parseEPUB(file: File): Promise<DocumentParseResult> {
  try {
    // 读取文件为ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // 创建Book实例
    const book = ePub(arrayBuffer);

    // 加载书籍
    await book.ready;

    // 获取元数据
    const metadata = await book.loaded.metadata;
    const title = metadata.title || file.name.replace('.epub', '');
    const author = metadata.creator;

    // 获取所有章节
    const spine = await book.loaded.spine;

    // 提取所有章节的文本
    let fullText = '';
    for (const item of (spine as any).items) {
      try {
        const doc = await book.load(item.href);
        const text = extractTextFromHTML(doc as unknown as Document);
        fullText += text + '\n\n';
      } catch (error) {
        console.warn(`Failed to load chapter ${item.href}:`, error);
      }
    }

    // 清理文本
    const cleanedText = cleanText(fullText);

    // 检测语言（可以从metadata.language获取）
    const language = metadata.language?.startsWith('zh') ? 'zh' : 'en';

    return {
      text: cleanedText,
      language,
      format: 'epub',
      title,
      author,
    };
  } catch (error) {
    console.error('EPUB parsing error:', error);
    throw new Error(`Failed to parse EPUB: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 从HTML文档中提取文本
 */
function extractTextFromHTML(doc: Document): string {
  // 移除script和style标签
  const scripts = doc.querySelectorAll('script, style');
  scripts.forEach((el) => el.remove());

  // 获取body文本
  return doc.body?.textContent || '';
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
