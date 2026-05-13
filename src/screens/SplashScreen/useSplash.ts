import {useCallback} from 'react';
import useThemeColors from '../../hooks/useThemeColors';
import {navigate} from '../../utils/navigationUtils';

const useSplash = () => {
  const handleClick = useCallback(() => {
    navigate('OnboardingScreen');
  }, []);

  const colors = useThemeColors();
  return {
    handleClick,
    colors,
  };
};

export default useSplash;
