import React from 'react';
import {RouteProp, useRoute} from '@react-navigation/native';
import IncomeEntry from '../../components/molecules/IncomeEntry';

export type UpdateIncomeScreenRouteProp = RouteProp<
  {
    UpdateIncomeScreen: {
      incomeId: string;
      incomeTitle: string;
      incomeAmount: number;
      incomeDate: string;
      category?: {
        id: string;
        name: string;
        icon?: string;
        color: string;
      };
    };
  },
  'UpdateIncomeScreen'
>;

const UpdateIncomeScreen = () => {
  const route = useRoute<UpdateIncomeScreenRouteProp>();
  return <IncomeEntry type="Update" route={route} />;
};

export default UpdateIncomeScreen;
