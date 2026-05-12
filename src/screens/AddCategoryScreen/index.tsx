import React from 'react';
import {useRoute} from '@react-navigation/native';
import CategoryEntry from '../../components/molecules/CategoryEntry';

const AddCategoryScreen = () => {
  const route = useRoute();
  return <CategoryEntry type={'Add'} route={route} />;
};

export default AddCategoryScreen;
