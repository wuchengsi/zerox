import {useCallback} from 'react';
import {useDispatch} from 'react-redux';
import useThemeColors from '../../hooks/useThemeColors';
import {deleteAllData} from '../../watermelondb/services';
import {navigate} from '../../utils/navigationUtils';
import {resetAppState} from '../../redux/rootReducer';
import {AppDispatch} from '../../redux/store';

const useWelcome = () => {
  const colors = useThemeColors();
  const dispatch = useDispatch<AppDispatch>();

  const handleAllreadyUser = useCallback(async () => {
    try {
      await deleteAllData();
      dispatch(resetAppState());
    } catch (error) {
      if (__DEV__) {
        console.error('Error deleting data for existing user:', error);
      }
    }
    navigate('ExistingUserScreen');
  }, [dispatch]);

  const handleNewUser = useCallback(async () => {
    try {
      await deleteAllData();
      dispatch(resetAppState());
    } catch (error) {
      if (__DEV__) {
        console.error('Error deleting data for new user:', error);
      }
    }
    navigate('PersonalizeScreen');
  }, [dispatch]);

  return {
    colors,
    handleAllreadyUser,
    handleNewUser,
  };
};

export default useWelcome;
