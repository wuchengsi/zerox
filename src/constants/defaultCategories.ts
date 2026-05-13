export type CategoryKind = 'expense' | 'income';

export interface DefaultExpenseSubcategory {
  name: string;
  icon: string;
}

export interface DefaultExpenseCategory {
  name: string;
  icon: string;
  color: string;
  children: DefaultExpenseSubcategory[];
}

export interface DefaultIncomeCategory {
  name: string;
  icon: string;
  color: string;
}

export const DEFAULT_EXPENSE_CATEGORIES: DefaultExpenseCategory[] = [
  {
    name: '餐饮',
    icon: 'utensils-crossed',
    color: '#6E8E55',
    children: [
      {name: '早餐', icon: 'coffee'},
      {name: '午餐', icon: 'utensils'},
      {name: '晚餐', icon: 'cooking-pot'},
      {name: '零食', icon: 'cookie'},
      {name: '饮料', icon: 'milk'},
      {name: '买菜', icon: 'leafy-green'},
      {name: '水果', icon: 'apple'},
      {name: '酒水', icon: 'wine'},
      {name: '香烟', icon: 'flame'},
    ],
  },
  {
    name: '购物',
    icon: 'shopping-bag',
    color: '#A870A8',
    children: [
      {name: '生活用品', icon: 'package'},
      {name: '服饰', icon: 'shirt'},
      {name: '包包', icon: 'shopping-bag'},
      {name: '鞋子', icon: 'footprints'},
      {name: '淘宝', icon: 'shopping-cart'},
      {name: '护肤彩妆', icon: 'sparkles'},
      {name: '饰品', icon: 'gem'},
      {name: '美容美甲', icon: 'palette'},
      {name: '彩墨', icon: 'paintbrush'},
      {name: '花呗', icon: 'credit-card'},
      {name: '快递', icon: 'package-open'},
      {name: '电子设备', icon: 'smartphone'},
    ],
  },
  {
    name: '出行',
    icon: 'bus',
    color: '#9E8420',
    children: [
      {name: '交通', icon: 'route'},
      {name: '加油', icon: 'fuel'},
      {name: '停车费', icon: 'parking-circle'},
      {name: '打车', icon: 'car'},
      {name: '地铁', icon: 'train'},
      {name: '火车', icon: 'tram-front'},
      {name: '公交车', icon: 'bus'},
      {name: '机票', icon: 'plane'},
      {name: '修车养车', icon: 'wrench'},
      {name: '签证', icon: 'badge-check'},
    ],
  },
  {
    name: '教育',
    icon: 'notebook',
    color: '#9575B8',
    children: [
      {name: '教育', icon: 'graduation-cap'},
      {name: '学习', icon: 'book-open'},
      {name: '书籍', icon: 'book'},
      {name: '文字', icon: 'file-text'},
      {name: '学费', icon: 'school'},
      {name: '考试', icon: 'badge-check'},
      {name: '培训', icon: 'presentation'},
    ],
  },
  {
    name: '娱乐',
    icon: 'gamepad-2',
    color: '#4588BB',
    children: [
      {name: '电影', icon: 'film'},
      {name: '游戏', icon: 'gamepad-2'},
      {name: '谷子', icon: 'gift'},
      {name: '追星', icon: 'star'},
      {name: 'KTV', icon: 'mic'},
      {name: '酒吧', icon: 'beer'},
      {name: '运动健身', icon: 'dumbbell'},
      {name: '旅游', icon: 'luggage'},
      {name: '洗浴', icon: 'bath'},
      {name: '打牌', icon: 'dice-5'},
      {name: '看展', icon: 'ticket'},
      {name: 'VPN', icon: 'shield'},
    ],
  },
  {
    name: '人情',
    icon: 'heart-handshake',
    color: '#7D8225',
    children: [
      {name: '红包', icon: 'gift'},
      {name: '礼物', icon: 'gift'},
      {name: '孝敬', icon: 'heart-handshake'},
      {name: '份子钱', icon: 'hand-coins'},
      {name: '招待费', icon: 'users'},
      {name: '打赏', icon: 'thumbs-up'},
      {name: '借出', icon: 'arrow-up-circle'},
    ],
  },
  {
    name: '住宿',
    icon: 'house',
    color: '#BF6B30',
    children: [
      {name: '房租', icon: 'house'},
      {name: '水费', icon: 'droplet'},
      {name: '电费', icon: 'zap'},
      {name: '燃气费', icon: 'flame'},
      {name: '物业费', icon: 'building-2'},
      {name: '网费', icon: 'wifi'},
      {name: '话费', icon: 'phone'},
      {name: '家居', icon: 'sofa'},
      {name: '酒店', icon: 'building'},
    ],
  },
  {
    name: '医疗',
    icon: 'bandaid',
    color: '#D06850',
    children: [
      {name: '药品', icon: 'pill'},
      {name: '医院', icon: 'hospital'},
      {name: '养生保健', icon: 'heart-pulse'},
    ],
  },
  {
    name: '投资',
    icon: 'trending-up',
    color: '#4F8C75',
    children: [
      {name: '基金', icon: 'piggy-bank'},
      {name: '股票', icon: 'trending-up'},
      {name: '银行理财', icon: 'landmark'},
    ],
  },
  {
    name: '其他',
    icon: 'circle-dot',
    color: '#758595',
    children: [{name: '其他', icon: 'circle-dot'}],
  },
];

export const DEFAULT_INCOME_CATEGORIES: DefaultIncomeCategory[] = [
  {name: '工资', icon: 'wallet', color: '#4F8C75'},
  {name: '收入', icon: 'arrow-down-circle', color: '#6E8E55'},
  {name: '投资收入', icon: 'trending-up', color: '#4588BB'},
  {name: '兼职', icon: 'briefcase', color: '#9575B8'},
  {name: '生活费', icon: 'hand-coins', color: '#9E8420'},
  {name: '红包', icon: 'gift', color: '#D25555'},
  {name: '二手闲置', icon: 'package-open', color: '#A870A8'},
  {name: '借入', icon: 'arrow-down-circle', color: '#BF6B30'},
  {name: '报销', icon: 'receipt', color: '#758595'},
  {name: '退税', icon: 'landmark', color: '#D06850'},
  {name: '理财', icon: 'piggy-bank', color: '#4F8C75'},
];

const DEFAULT_CATEGORY_EN_NAMES: Record<string, string> = {
  餐饮: 'Food',
  早餐: 'Breakfast',
  午餐: 'Lunch',
  晚餐: 'Dinner',
  零食: 'Snacks',
  饮料: 'Drinks',
  买菜: 'Groceries',
  水果: 'Fruit',
  酒水: 'Alcohol',
  香烟: 'Cigarettes',
  购物: 'Shopping',
  生活用品: 'Daily goods',
  服饰: 'Clothing',
  包包: 'Bags',
  鞋子: 'Shoes',
  淘宝: 'Online shopping',
  护肤彩妆: 'Skincare',
  饰品: 'Accessories',
  美容美甲: 'Beauty',
  彩墨: 'Stationery',
  花呗: 'Credit',
  快递: 'Delivery',
  电子设备: 'Electronics',
  出行: 'Transport',
  交通: 'Transit',
  加油: 'Fuel',
  停车费: 'Parking',
  打车: 'Taxi',
  地铁: 'Metro',
  火车: 'Train',
  公交车: 'Bus',
  机票: 'Flights',
  修车养车: 'Car care',
  签证: 'Visa',
  教育: 'Education',
  学习: 'Learning',
  书籍: 'Books',
  文字: 'Writing',
  学费: 'Tuition',
  考试: 'Exams',
  培训: 'Training',
  娱乐: 'Entertainment',
  电影: 'Movies',
  游戏: 'Games',
  谷子: 'Merch',
  追星: 'Fandom',
  酒吧: 'Bar',
  运动健身: 'Fitness',
  旅游: 'Travel',
  洗浴: 'Bath',
  打牌: 'Cards',
  看展: 'Exhibitions',
  人情: 'Social',
  红包: 'Red packets',
  礼物: 'Gifts',
  孝敬: 'Family support',
  份子钱: 'Ceremony gifts',
  招待费: 'Hosting',
  打赏: 'Tips',
  借出: 'Lent out',
  住宿: 'Housing',
  房租: 'Rent',
  水费: 'Water',
  电费: 'Electricity',
  燃气费: 'Gas',
  物业费: 'Property fee',
  网费: 'Internet',
  话费: 'Phone bill',
  家居: 'Home goods',
  酒店: 'Hotel',
  医疗: 'Medical',
  药品: 'Medicine',
  医院: 'Hospital',
  养生保健: 'Wellness',
  投资: 'Investment',
  基金: 'Funds',
  股票: 'Stocks',
  银行理财: 'Bank wealth',
  其他: 'Other',
  工资: 'Salary',
  收入: 'Income',
  投资收入: 'Investment income',
  兼职: 'Part-time',
  生活费: 'Living allowance',
  二手闲置: 'Second-hand',
  借入: 'Borrowed',
  报销: 'Reimbursement',
  退税: 'Tax refund',
  理财: 'Wealth management',
};

const translateDefaultName = (name: string, language: 'zh' | 'en'): string =>
  language === 'en' ? DEFAULT_CATEGORY_EN_NAMES[name] ?? name : name;

export const getDefaultExpenseCategories = (language: 'zh' | 'en' = 'zh'): DefaultExpenseCategory[] =>
  DEFAULT_EXPENSE_CATEGORIES.map(group => ({
    ...group,
    name: translateDefaultName(group.name, language),
    children: group.children.map(child => ({
      ...child,
      name: translateDefaultName(child.name, language),
    })),
  }));

export const getDefaultIncomeCategories = (language: 'zh' | 'en' = 'zh'): DefaultIncomeCategory[] =>
  DEFAULT_INCOME_CATEGORIES.map(category => ({
    ...category,
    name: translateDefaultName(category.name, language),
  }));

export const LEGACY_CATEGORY_MAP: Record<string, {parent: string; child: string}> = {
  餐饮: {parent: '餐饮', child: '午餐'},
  交通: {parent: '出行', child: '交通'},
  娱乐: {parent: '娱乐', child: '电影'},
  医疗: {parent: '医疗', child: '医院'},
  购物: {parent: '购物', child: '生活用品'},
  旅行: {parent: '娱乐', child: '旅游'},
  教育: {parent: '教育', child: '教育'},
  礼物: {parent: '人情', child: '礼物'},
  其他: {parent: '其他', child: '其他'},
};

export const getExpenseCategoryDisplayName = (
  parentName?: string,
  childName?: string,
): string => {
  if (parentName && childName) {
    if (parentName === childName) {
      return parentName;
    }
    return `${parentName}·${childName}`;
  }
  return childName ?? parentName ?? '未知分类';
};

export const simplifyExpenseCategoryDisplayName = (categoryName?: string): string => {
  if (!categoryName) {
    return '';
  }

  const [parentName, childName, ...rest] = categoryName.split('·');
  if (rest.length === 0 && parentName && childName && parentName === childName) {
    return parentName;
  }

  return categoryName;
};
