import {View, ViewStyle} from 'react-native';
import React, {ReactNode} from 'react';
import PrimaryText from './PrimaryText';
import {Colors} from '../../hooks/useThemeColors';
import Icon from './Icons';
import {gs} from '../../styles/globalStyles';
import {IconName} from './IconRegistry';

type EmptyStateType = 'Transactions' | 'Insights' | 'Debts' | 'Categories';

interface EmptyStateProps {
  colors: Colors;
  type: EmptyStateType;
  style?: ViewStyle;
  message?: string;
  actionButton?: ReactNode;
}

const iconMap: Record<EmptyStateType, IconName> = {
  Transactions: 'receipt',
  Insights: 'bar-chart-3',
  Debts: 'hand-coins',
  Categories: 'shapes',
};

const messageMap: Record<EmptyStateType, string> = {
  Transactions: '还没有账单',
  Insights: '还没有统计数据',
  Debts: '还没有债务记录',
  Categories: '还没有分类',
};

const EmptyState: React.FC<EmptyStateProps> = React.memo(({colors, type, style, message, actionButton}) => {
  const displayMessage = message ?? messageMap[type];

  return (
    <View style={[gs.center, gs.mt30p, style]}>
      <View style={[gs.size50, gs.roundedFull, gs.center, {backgroundColor: colors.secondaryAccent}]}>
        <Icon name={iconMap[type]} size={22} color={colors.secondaryText} />
      </View>
      <PrimaryText size={13} color={colors.secondaryText} style={gs.mt10}>
        {displayMessage}
      </PrimaryText>
      {actionButton && <View style={gs.mt15}>{actionButton}</View>}
    </View>
  );
});

export default EmptyState;
