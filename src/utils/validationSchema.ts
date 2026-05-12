import {z} from 'zod';

export const nameSchema = z
  .string()
  .refine(value => /^[A-Za-z\u4e00-\u9fa5\s]+$/.test(value), {
    message: '昵称只能包含中文、英文字母和空格。',
  })
  .refine(value => value.length >= 3, {
    message: '昵称至少需要 3 个字符。',
  })
  .refine(value => value.length <= 50, {
    message: '昵称不能超过 50 个字符。',
  });

export const expenseSchema = z
  .string()
  .min(1, '标题至少需要 1 个字符。')
  .max(25, '标题不能超过 25 个字符。');

export const expenseAmountSchema = z
  .number()
  .min(0.01, '金额必须大于 0。')
  .max(1000000, '金额不能超过 1000000。');

export const categorySchema = z
  .string()
  .refine(value => /^[A-Za-z0-9\u4e00-\u9fa5\s]+$/.test(value), {
    message: '分类名称只能包含中文、英文字母、数字和空格。',
  })
  .refine(value => value.length >= 1, {
    message: '分类名称至少需要 1 个字符。',
  })
  .refine(value => value.length <= 18, {
    message: '分类名称不能超过 18 个字符。',
  });
