import useThemeColors from '../../hooks/useThemeColors';
import {useCallback} from 'react';
import {navigate} from '../../utils/navigationUtils';
import {useLanguage} from '../../context/LanguageContext';

const useOnboarding = () => {
  const colors = useThemeColors();
  const {language, setLanguage, t} = useLanguage();

  const handleContinue = useCallback(async () => {
    navigate('WelcomeScreen');
  }, []);

  return {
    colors,
    language,
    setLanguage,
    t,
    handleContinue,
  };
};

export default useOnboarding;
