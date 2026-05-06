import {z} from 'zod';
import type {CategoryData} from '../watermelondb/services';
import {formatDate, getISODateTime} from '../utils/dateUtils';
import type {AiSettings} from './aiSettingsService';
import {getMissingAiSettingsFields} from './aiSettingsService';

export type AiExpenseIssueCode =
  | 'missing_amount'
  | 'invalid_amount'
  | 'missing_title'
  | 'missing_category'
  | 'category_fallback'
  | 'invalid_date';

export interface AiExpenseIssue {
  code: AiExpenseIssueCode;
  message: string;
}

export interface AiExpenseCandidate {
  localId: string;
  title: string;
  amount: number | null;
  description: string;
  date: string;
  categoryName: string;
  categoryHint: string;
  categoryId: string | null;
  issues: AiExpenseIssue[];
}

export interface AiParseResult {
  items: AiExpenseCandidate[];
}

export class AiExpenseParserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiExpenseParserError';
  }
}

const rawExpenseSchema = z.object({
  title: z.string().optional().nullable(),
  amount: z.union([z.number(), z.string()]).optional().nullable(),
  categoryName: z.string().optional().nullable(),
  categoryHint: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

const rawResponseSchema = z.union([
  z.object({items: z.array(rawExpenseSchema)}),
  z.array(rawExpenseSchema),
]);

type RawExpense = z.infer<typeof rawExpenseSchema>;

const CATEGORY_ALIASES: Record<string, string[]> = {
  餐饮: ['餐饮', '吃饭', '午饭', '晚饭', '早餐', '咖啡', '奶茶', '麦当劳', '瑞幸', 'food', 'meal', 'coffee'],
  Food: ['餐饮', '吃饭', '午饭', '晚饭', '早餐', '咖啡', '奶茶', '麦当劳', '瑞幸', 'food', 'meal', 'coffee'],
  交通: ['交通', '地铁', '打车', '公交', '出租车', '滴滴', 'taxi', 'uber', 'transport', 'metro', 'bus'],
  Transportation: ['交通', '地铁', '打车', '公交', '出租车', '滴滴', 'taxi', 'uber', 'transport', 'metro', 'bus'],
  娱乐: ['娱乐', '电影', '游戏', '唱歌', '演出', 'entertainment', 'movie', 'game'],
  Entertainment: ['娱乐', '电影', '游戏', '唱歌', '演出', 'entertainment', 'movie', 'game'],
  医疗: ['医疗', '医院', '药', '看病', 'health', 'medical', 'pharmacy'],
  Healthcare: ['医疗', '医院', '药', '看病', 'health', 'medical', 'pharmacy'],
  购物: ['购物', '买', '便利店', '超市', '衣服', 'shopping', 'store', 'market'],
  Shopping: ['购物', '买', '便利店', '超市', '衣服', 'shopping', 'store', 'market'],
  旅行: ['旅行', '机场', '酒店', '机票', '火车票', 'travel', 'hotel', 'flight'],
  Travel: ['旅行', '机场', '酒店', '机票', '火车票', 'travel', 'hotel', 'flight'],
  生活缴费: ['生活缴费', '水电', '话费', '网费', '燃气', 'utility', 'utilities', 'wifi'],
  Utilities: ['生活缴费', '水电', '话费', '网费', '燃气', 'utility', 'utilities', 'wifi'],
  教育: ['教育', '书', '课程', '学费', 'education', 'book', 'course'],
  Education: ['教育', '书', '课程', '学费', 'education', 'book', 'course'],
  礼物: ['礼物', '送礼', 'gift'],
  Gifts: ['礼物', '送礼', 'gift'],
  其他: ['其他', '其它', '杂项', 'other', 'unknown'],
  Other: ['其他', '其它', '杂项', 'other', 'unknown'],
};

const normalizeText = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, '');

export const normalizeChatCompletionsUrl = (apiBaseUrl: string): string => {
  const trimmed = apiBaseUrl.trim().replace(/\/+$/, '');
  if (trimmed.endsWith('/chat/completions')) {
    return trimmed;
  }
  return `${trimmed}/chat/completions`;
};

export const buildAiExpensePrompt = (
  input: string,
  categoryNames: string[],
  currentDateTime: string,
): string => {
  const categories = categoryNames.length > 0 ? categoryNames.join('、') : '其他';

  return [
    '你是 Zero 记账应用的自然语言支出解析器。',
    '只解析支出记录，不要解析收入、转账、预算或理财建议。',
    '用户可能输入一句话、多行文本、带日期上下文的文本，或一句流水式文本。',
    `当前日期时间：${currentDateTime}`,
    `可用分类名称：${categories}`,
    '请只返回 JSON，不要返回 Markdown，不要解释。',
    'JSON 格式必须是：{"items":[{"title":"消费标题","amount":数字或null,"categoryName":"可用分类名称或空字符串","categoryHint":"分类线索","date":"YYYY-MM-DDTHH:mm:ss","description":"备注"}]}',
    '规则：',
    '1. 单条输入也按 items 数组返回。',
    '2. 一行一条、多行多条、昨天/今天/周一等上下文都要拆成独立条目。',
    '3. 没有日期时用当前日期；没有具体时间时用当前时间。',
    '4. 金额无法判断时 amount 必须为 null。',
    '5. 分类只能从可用分类名称中选择；不确定时 categoryName 为空，categoryHint 写判断依据。',
    '6. 支付方式、地点、用途等可放入 description。',
    `用户输入：${input}`,
  ].join('\n');
};

const extractJsonPayload = (content: string): unknown => {
  const withoutFence = content
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch {
    try {
      const firstObject = withoutFence.indexOf('{');
      const lastObject = withoutFence.lastIndexOf('}');
      if (firstObject >= 0 && lastObject > firstObject) {
        return JSON.parse(withoutFence.slice(firstObject, lastObject + 1));
      }

      const firstArray = withoutFence.indexOf('[');
      const lastArray = withoutFence.lastIndexOf(']');
      if (firstArray >= 0 && lastArray > firstArray) {
        return JSON.parse(withoutFence.slice(firstArray, lastArray + 1));
      }
    } catch {
      throw new AiExpenseParserError('LLM 返回格式错误，请重试或调整输入');
    }

    throw new AiExpenseParserError('LLM 返回格式错误，请重试或调整输入');
  }
};

const parseAmount = (amount: RawExpense['amount']): number | null => {
  if (amount === null || amount === undefined || amount === '') {
    return null;
  }

  if (typeof amount === 'number') {
    return Number.isFinite(amount) ? amount : null;
  }

  const normalized = amount.replace(/[^\d.-]/g, '');
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeDate = (dateValue: string | null | undefined, fallbackDateTime: string): {date: string; valid: boolean} => {
  if (!dateValue) {
    return {date: fallbackDateTime, valid: true};
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return {date: fallbackDateTime, valid: false};
  }

  return {date: formatDate(parsed, 'YYYY-MM-DDTHH:mm:ss'), valid: true};
};

const findDefaultCategory = (categories: CategoryData[]): CategoryData | null => {
  const activeCategories = categories.filter(category => category.categoryStatus);
  return (
    activeCategories.find(category => normalizeText(category.name) === normalizeText('其他')) ??
    activeCategories.find(category => normalizeText(category.name) === normalizeText('Other')) ??
    activeCategories[0] ??
    null
  );
};

export const matchCategory = (
  categoryName: string,
  categoryHint: string,
  categories: CategoryData[],
): {category: CategoryData | null; usedFallback: boolean} => {
  const activeCategories = categories.filter(category => category.categoryStatus);
  const joinedHint = normalizeText(`${categoryName} ${categoryHint}`);

  const exact = activeCategories.find(category => normalizeText(category.name) === normalizeText(categoryName));
  if (exact) {
    return {category: exact, usedFallback: false};
  }

  if (joinedHint) {
    const contains = activeCategories.find(category => {
      const name = normalizeText(category.name);
      return joinedHint.includes(name) || name.includes(joinedHint);
    });
    if (contains) {
      return {category: contains, usedFallback: false};
    }
  }

  for (const category of activeCategories) {
    const aliases = CATEGORY_ALIASES[category.name] ?? [];
    if (aliases.some(alias => joinedHint.includes(normalizeText(alias)))) {
      return {category, usedFallback: false};
    }
  }

  return {category: findDefaultCategory(activeCategories), usedFallback: true};
};

export const normalizeAiExpenseItems = (
  rawItems: RawExpense[],
  categories: CategoryData[],
  fallbackDateTime: string = getISODateTime(),
): AiExpenseCandidate[] =>
  rawItems.map((item, index) => {
    const title = (item.title ?? '').trim();
    const description = (item.description ?? item.note ?? '').trim();
    const amount = parseAmount(item.amount);
    const categoryName = (item.categoryName ?? '').trim();
    const categoryHint = (item.categoryHint ?? categoryName ?? '').trim();
    const matchedCategory = matchCategory(categoryName, categoryHint || title, categories);
    const normalizedDate = normalizeDate(item.date, fallbackDateTime);
    const issues: AiExpenseIssue[] = [];

    if (!title) {
      issues.push({code: 'missing_title', message: '缺少标题'});
    }

    if (amount === null) {
      issues.push({code: 'missing_amount', message: '缺少金额'});
    } else if (amount <= 0) {
      issues.push({code: 'invalid_amount', message: '金额必须大于 0'});
    }

    if (!matchedCategory.category) {
      issues.push({code: 'missing_category', message: '没有可用分类'});
    } else if (matchedCategory.usedFallback) {
      issues.push({code: 'category_fallback', message: `已使用默认分类“${matchedCategory.category.name}”，请确认`});
    }

    if (!normalizedDate.valid) {
      issues.push({code: 'invalid_date', message: '日期无效，已使用当前时间'});
    }

    return {
      localId: `ai-expense-${Date.now()}-${index}`,
      title,
      amount,
      description,
      date: normalizedDate.date,
      categoryName,
      categoryHint,
      categoryId: matchedCategory.category?.id ?? null,
      issues,
    };
  });

export const splitAiExpenseItems = (items: AiExpenseCandidate[]): {
  validItems: AiExpenseCandidate[];
  invalidItems: AiExpenseCandidate[];
} => {
  const validItems = items.filter(item => {
    const blockingIssues = item.issues.filter(issue => issue.code !== 'category_fallback' && issue.code !== 'invalid_date');
    return blockingIssues.length === 0 && item.categoryId !== null && item.amount !== null && item.amount > 0 && item.title.length > 0;
  });

  return {
    validItems,
    invalidItems: items.filter(item => !validItems.includes(item)),
  };
};

const parseChatCompletionsContent = async (response: Response): Promise<string> => {
  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new AiExpenseParserError('LLM 服务返回格式错误');
  }
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new AiExpenseParserError('LLM 返回空结果');
  }
  return content;
};

export const parseNaturalLanguageExpenses = async ({
  input,
  settings,
  categories,
  currentDateTime = getISODateTime(),
}: {
  input: string;
  settings: AiSettings;
  categories: CategoryData[];
  currentDateTime?: string;
}): Promise<AiParseResult> => {
  const missingFields = getMissingAiSettingsFields(settings);
  if (missingFields.length > 0) {
    throw new AiExpenseParserError(`请先在设置中填写：${missingFields.join('、')}`);
  }

  const trimmedInput = input.trim();
  if (!trimmedInput) {
    throw new AiExpenseParserError('请输入要解析的消费记录');
  }

  const url = normalizeChatCompletionsUrl(settings.apiBaseUrl);
  const prompt = buildAiExpensePrompt(
    trimmedInput,
    categories.filter(category => category.categoryStatus).map(category => category.name),
    currentDateTime,
  );

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: settings.modelName.trim(),
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: '你只输出可被 JSON.parse 解析的 JSON。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });
  } catch {
    throw new AiExpenseParserError('请求失败，请检查网络或接口地址');
  }

  if (!response.ok) {
    throw new AiExpenseParserError(`LLM 服务返回错误：${response.status}`);
  }

  const content = await parseChatCompletionsContent(response);
  const payload = extractJsonPayload(content);
  const parsed = rawResponseSchema.safeParse(payload);

  if (!parsed.success) {
    throw new AiExpenseParserError('解析结果格式错误，请重试或调整输入');
  }

  const rawItems = Array.isArray(parsed.data) ? parsed.data : parsed.data.items;
  if (rawItems.length === 0) {
    throw new AiExpenseParserError('没有识别到账单，请补充金额或消费内容');
  }

  return {
    items: normalizeAiExpenseItems(rawItems, categories, currentDateTime),
  };
};
