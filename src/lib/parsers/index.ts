import { parsePDF } from './pdf';
import { parseEPUB } from './epub';
import { parseDOCX } from './docx';
import { parseTXT } from './txt';
import { parseHTML } from './html';
import type { DocumentParseResult } from '@/types/project';

/**
 * 统一的文档解析入口
 * @param file 文件对象
 * @returns 解析结果（文本、语言、格式、元数据）
 * @throws 不支持的文件格式或解析失败
 */
export async function parseDocument(file: File): Promise<DocumentParseResult> {
  // 获取文件扩展名
  const ext = file.name.split('.').pop()?.toLowerCase();

  // 根据扩展名选择解析器
  switch (ext) {
    case 'pdf':
      return parsePDF(file);

    case 'epub':
      return parseEPUB(file);

    case 'docx':
    case 'doc':
      return parseDOCX(file);

    case 'txt':
      return parseTXT(file);

    case 'html':
    case 'htm':
      return parseHTML(file);

    default:
      throw new Error(`Unsupported file format: .${ext}`);
  }
}

/**
 * 检查文件格式是否支持
 * @param filename 文件名
 * @returns 是否支持
 */
export function isSupportedFormat(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ['pdf', 'epub', 'docx', 'doc', 'txt', 'html', 'htm'].includes(ext || '');
}

/**
 * 获取支持的文件格式列表
 */
export function getSupportedFormats(): string[] {
  return ['.pdf', '.epub', '.docx', '.doc', '.txt', '.html', '.htm'];
}

/**
 * 获取文件选择器的accept属性
 */
export function getAcceptAttribute(): string {
  return getSupportedFormats().join(',');
}

// 导出单个解析器（供高级用户使用）
export { parsePDF, parseEPUB, parseDOCX, parseTXT, parseHTML };
