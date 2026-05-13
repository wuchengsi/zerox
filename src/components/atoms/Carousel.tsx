import React, {memo} from 'react';
import {View} from 'react-native';
import Swiper from 'react-native-swiper';
import PrimaryText from './PrimaryText';
import useThemeColors from '../../hooks/useThemeColors';
import SvgImage from '../../../assets/images/4.svg';
import SvgImage1 from '../../../assets/images/5.svg';
import SvgImage2 from '../../../assets/images/6.svg';
import {gs} from '../../styles/globalStyles';
import {useLanguage} from '../../context/LanguageContext';

const SLIDES = [
  {
    id: '1',
    title: {zh: '记录支出', en: 'Track expenses'},
    subtitle: {zh: '简单、快速、默认离线', en: 'Simple, fast, offline by default'},
  },
  {
    id: '2',
    title: {zh: '查看统计', en: 'View stats'},
    subtitle: {zh: '了解钱花去了哪里', en: 'See where your money goes'},
  },
  {
    id: '3',
    title: {zh: '管理债务', en: 'Manage debt'},
    subtitle: {zh: '清楚记录谁欠谁', en: 'Know who owes whom'},
  },
] as const;

const SLIDE_IMAGES: Record<string, React.FC<{width: string; height: string}>> = {
  '1': SvgImage,
  '2': SvgImage1,
  '3': SvgImage2,
};

const Carousel = () => {
  const colors = useThemeColors();
  const {language} = useLanguage();

  return (
    <Swiper
      style={gs.mt30p}
      height={300}
      horizontal={true}
      autoplay
      dot={<View style={[gs.m3, gs.rounded4, {backgroundColor: colors.secondaryAccent, width: 6, height: 6}]} />}
      activeDot={<View style={[gs.m3, gs.rounded5, {backgroundColor: colors.primaryText, width: 8, height: 8}]} />}
      paginationStyle={[gs.bottom15p, gs.left0, gs.right0]}
      loop>
      {SLIDES.map(slide => {
        const ImageComponent = SLIDE_IMAGES[slide.id];
        return (
          <View style={gs.center} key={slide.id}>
            <ImageComponent width="220" height="220" />
            <PrimaryText size={16} weight="semibold" style={gs.mt15}>
              {slide.title[language]}
            </PrimaryText>
            <PrimaryText size={12} color={colors.secondaryText} style={gs.mt4}>
              {slide.subtitle[language]}
            </PrimaryText>
          </View>
        );
      })}
    </Swiper>
  );
};

export default memo(Carousel);
