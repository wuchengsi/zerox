import {z} from 'zod';
import type {CategoryData} from '../watermelondb/services';
import {formatDate, getISODateTime} from '../utils/dateUtils';
import type {AiSettings} from './aiSettingsService';
import {getMissingAiSettingsFields} from './aiSettingsService';

export type AiRecordType = 'expense' | 'income';

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
  type: AiRecordType;
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
  type: z.string().optional().nullable(),
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
  工资: ['工资', '薪资', '薪水', '发薪', 'salary', 'payroll'],
  收入: ['收入', '进账', '到账', '收款', 'income'],
  投资收入: ['投资', '收益', '分红', '股票', '基金', 'interest', 'dividend'],
  兼职: ['兼职', '副业', '外快', 'part-time', 'freelance'],
  生活费: ['生活费', '家里给', '父母给', 'allowance'],
  红包: ['红包', '转红包', 'red packet'],
  二手闲置: ['二手', '闲置', '卖出', '卖掉', 'resale'],
  借入: ['借入', '借款', 'borrow'],
  报销: ['报销', ' reimbursement', 'reimburse'],
  退税: ['退税', 'tax refund'],
  理财: ['理财', '利息', '理财收益'],
  其他: ['其他', '其它', '杂项', 'other', 'unknown'],
  Other: ['其他', '其它', '杂项', 'other', 'unknown'],
};

const normalizeText = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, '');

const getCategoryDisplayName = (category: CategoryData): string =>
  category.parent?.name ? `${category.parent.name}·${category.name}` : category.name;

export const normalizeChatCompletionsUrl = (apiBaseUrl: string): string => {
  const trimmed = apiBaseUrl.trim().replace(/\/+$/, '');
  if (trimmed.endsWith('/chat/completions')) {
    return trimmed;
  }
  return `${trimmed}/chat/completions`;
};

export const buildAiExpensePrompt = (
  input: string,
  categories:
    | string[]
    | {
        expenseCategoryNames: string[];
        incomeCategoryNames: string[];
      },
  referenceDateTime: string,
): string => {
  const expenseCategoryNames = Array.isArray(categories) ? categories : categories.expenseCategoryNames;
  const incomeCategoryNames = Array.isArray(categories) ? [] : categories.incomeCategoryNames;
  const expenseCategories = expenseCategoryNames.length > 0 ? expenseCategoryNames.join('、') : '其他·其他';
  const incomeCategories = incomeCategoryNames.length > 0 ? incomeCategoryNames.join('、') : '收入';

  return [
    '你是 Zero 记账应用的自然语言账单解析器。',
    '只解析支出和收入记录，不要解析转账、预算或理财建议。',
    '用户可能输入一句话、多行文本、带日期上下文的文本，或一句流水式文本。',
    `用户提交时间：${referenceDateTime}`,
    `可用支出分类名称：${expenseCategories}`,
    `可用收入分类名称：${incomeCategories}`,
    '请只返回 JSON，不要返回 Markdown，不要解释。',
    'JSON 格式必须是：{"items":[{"type":"expense或income","title":"标题","amount":数字或null,"categoryName":"可用分类名称或空字符串","categoryHint":"分类线索","date":"YYYY-MM-DDTHH:mm:ss"}]}',
    '规则：',
    '1. 单条输入也按 items 数组返回。',
    '2. 一行一条、多行多条、昨天/今天/周一等上下文都要拆成独立条目。',
    '3. 今天、昨天、昨晚、周一等相对日期都以用户提交时间为基准。',
    '4. 没有日期时用用户提交当天；没有具体时间时用用户提交时间。',
    '5. 金额无法判断时 amount 必须为 null。',
    '6. type 只能是 expense 或 income。',
    '7. 消费、付款、买东西、吃饭、交通、购物等为 expense。',
    '8. 工资、报销、退款、红包收入、兼职、投资收益、生活费、二手闲置收入等为 income。',
    '9. categoryName 只能从对应 type 的可用分类名称中选择；不要创造不存在的分类名称。',
    '10. 支出分类应优先选择最精细的“大类·小类”，不要只选大类。',
    '11. 收入分类只从可用收入分类中选择。',
    '12. 不确定分类时 categoryName 为空，categoryHint 写判断依据。',
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

const normalizeRecordType = (type: string | null | undefined): AiRecordType => {
  const normalized = normalizeText(type ?? '');
  return normalized === 'income' || normalized === '收入' ? 'income' : 'expense';
};

const getTypeCategories = (categories: CategoryData[], type: AiRecordType): CategoryData[] =>
  categories.filter(category => {
    if (!category.categoryStatus || category.kind !== type) {
      return false;
    }
    if (type === 'income') {
      return !category.parentId;
    }
    return !!category.parentId;
  });

const findDefaultCategory = (categories: CategoryData[], type: AiRecordType): CategoryData | null => {
  const activeCategories = getTypeCategories(categories, type);
  if (type === 'income') {
    return (
      activeCategories.find(category => normalizeText(category.name) === normalizeText('收入')) ??
      activeCategories[0] ??
      null
    );
  }

  return (
    activeCategories.find(category => normalizeText(getCategoryDisplayName(category)) === normalizeText('其他·其他')) ??
    activeCategories.find(category => normalizeText(category.name) === normalizeText('其他')) ??
    activeCategories.find(category => normalizeText(category.name) === normalizeText('Other')) ??
    activeCategories[0] ??
    null
  );
};

export const matchCategory = (
  type: AiRecordType,
  categoryName: string,
  categoryHint: string,
  categories: CategoryData[],
): {category: CategoryData | null; usedFallback: boolean} => {
  const activeCategories = getTypeCategories(categories, type);
  const joinedHint = normalizeText(`${categoryName} ${categoryHint}`);

  const exact = activeCategories.find(category => {
    const normalizedName = normalizeText(category.name);
    const normalizedDisplayName = normalizeText(getCategoryDisplayName(category));
    const normalizedCategoryName = normalizeText(categoryName);
    return normalizedName === normalizedCategoryName || normalizedDisplayName === normalizedCategoryName;
  });
  if (exact) {
    return {category: exact, usedFallback: false};
  }

  if (joinedHint) {
    const contains = activeCategories.find(category => {
      const name = normalizeText(category.name);
      const displayName = normalizeText(getCategoryDisplayName(category));
      return joinedHint.includes(name) || name.includes(joinedHint) || joinedHint.includes(displayName);
    });
    if (contains) {
      return {category: contains, usedFallback: false};
    }
  }

  for (const category of activeCategories) {
    const aliases = [
      ...(CATEGORY_ALIASES[category.name] ?? []),
      ...(category.parent?.name ? CATEGORY_ALIASES[category.parent.name] ?? [] : []),
    ];
    if (aliases.some(alias => joinedHint.includes(normalizeText(alias)))) {
      return {category, usedFallback: false};
    }
  }

  return {category: findDefaultCategory(categories, type), usedFallback: true};
};

export const normalizeAiExpenseItems = (
  rawItems: RawExpense[],
  categories: CategoryData[],
  fallbackDateTime: string = getISODateTime(),
): AiExpenseCandidate[] =>
  rawItems.map((item, index) => {
    const type = normalizeRecordType(item.type);
    const title = (item.title ?? '').trim();
    const description = (item.description ?? item.note ?? '').trim();
    const amount = parseAmount(item.amount);
    const categoryName = (item.categoryName ?? '').trim();
    const categoryHint = (item.categoryHint ?? categoryName ?? '').trim();
    const matchedCategory = matchCategory(type, categoryName, categoryHint || title, categories);
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
      type,
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
    throw new AiExpenseParserError('请输入要解析的账单记录');
  }

  const url = normalizeChatCompletionsUrl(settings.apiBaseUrl);
  const prompt = buildAiExpensePrompt(
    trimmedInput,
    {
      expenseCategoryNames: getTypeCategories(categories, 'expense').map(getCategoryDisplayName),
      incomeCategoryNames: getTypeCategories(categories, 'income').map(getCategoryDisplayName),
    },
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
    throw new AiExpenseParserError('没有识别到账单，请补充金额或内容');
  }

  return {
    items: normalizeAiExpenseItems(rawItems, categories, currentDateTime),
  };
};
