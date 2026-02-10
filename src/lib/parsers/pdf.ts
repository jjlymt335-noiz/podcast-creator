import * as pdfjsLib from 'pdfjs-dist';
import type { DocumentParseResult } from '@/types/project';

// 设置PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * 解析PDF文件
 * @param file PDF文件
 * @returns 解析结果（文本、语言、元数据）
 */
export async function parsePDF(file: File): Promise<DocumentParseResult> {
  try {
    // 读取文件为ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // 加载PDF文档
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    // 提取元数据
    const metadata = await pdf.getMetadata();
    const title = metadata.info?.Title || file.name.replace('.pdf', '');
    const author = metadata.info?.Author;

    // 提取所有页面的文本
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
    }

    // 清理文本
    const cleanedText = cleanText(fullText);

    // 检测语言
    const language = detectLanguage(cleanedText);

    return {
      text: cleanedText,
      language,
      format: 'pdf',
      title,
      author,
    };
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 清理提取的文本
 */
function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // 多个空格合并为一个
    .replace(/\n{3,}/g, '\n\n') // 多个换行合并为两个
    .trim();
}

/**
 * 简单的语言检测
 */
function detectLanguage(text: string): string {
  // 检测中文字符比例
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
  const chineseRatio = chineseChars.length / text.length;

  if (chineseRatio > 0.3) {
    return 'zh';
  }

  // 默认英文
  return 'en';
}
