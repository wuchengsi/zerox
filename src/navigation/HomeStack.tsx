import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {BackHandler, Platform, Pressable, Text, ToastAndroid, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Icon from '../components/atoms/Icons';
import useThemeColors from '../hooks/useThemeColors';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import ReportsScreen from '../screens/ReportsScreen';
import DebtsScreen from '../screens/DebtsScreen';
import CategoryScreen from '../screens/CategoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AddTransactionsScreen from '../screens/AddTransactionsScreen';
import UpdateTransactionScreen from '../screens/UpdateTransactionScreen';
import AddCategoryScreen from '../screens/AddCategoryScreen';
import UpdateCategoryScreen from '../screens/UpdateCategoryScreen';
import AddDebtorScreen from '../screens/AddDebtorScreen';
import IndividualDebtsScreen from '../screens/IndividualDebtsScreen';
import AddDebtsScreen from '../screens/AddDebtsScreen';
import UpdateDebtScreen from '../screens/UpdateDebtScreen';
import EverydayTransactionScreen from '../screens/EverydayTransactionScreen';
import CategoryTransactionScreen from '../screens/CategoryTransactionScreen';
import UpdateDebtorScreen from '../screens/UpdateDebtorScreen';
import AiQuickExpenseScreen from '../screens/AiQuickExpenseScreen';
import AiSettingsScreen from '../screens/AiSettingsScreen';
import AiExpenseQueueScreen from '../screens/AiExpenseQueueScreen';
import AiExpenseQueueDetailScreen from '../screens/AiExpenseQueueDetailScreen';
import {gs} from '../styles/globalStyles';

const screenOptions = {
  headerShown: false,
};

const ICON_SIZE = 24;

const HomeIcon = ({color}: {color: string}) => (
  <View style={[gs.center, gs.minW70]}>
    <View style={[gs.h26, gs.center]}>
      <Icon name="home" size={ICON_SIZE} color={color} />
    </View>
    <Text style={[gs.text10, gs.fontMedium, gs.noFontPadding, gs.textCenter, gs.mt2, {color}]}>首页</Text>
  </View>
);

const ReportsIcon = ({color}: {color: string}) => (
  <View style={[gs.center, gs.minW70]}>
    <View style={[gs.h26, gs.center]}>
      <Icon name="bar-chart-3" size={ICON_SIZE} color={color} />
    </View>
    <Text style={[gs.text10, gs.fontMedium, gs.noFontPadding, gs.textCenter, gs.mt2, {color}]}>统计</Text>
  </View>
);

const DebtIcon = ({color}: {color: string}) => (
  <View style={[gs.center, gs.minW70]}>
    <View style={[gs.h26, gs.center]}>
      <Icon name="credit-card" size={ICON_SIZE} color={color} />
    </View>
    <Text style={[gs.text10, gs.fontMedium, gs.noFontPadding, gs.textCenter, gs.mt2, {color}]}>债务</Text>
  </View>
);

const CategoriesIcon = ({color}: {color: string}) => (
  <View style={[gs.center, gs.minW70]}>
    <View style={[gs.h26, gs.center]}>
      <Icon name="shapes" size={ICON_SIZE} color={color} />
    </View>
    <Text style={[gs.text10, gs.fontMedium, gs.noFontPadding, gs.textCenter, gs.mt2, {color}]}>分类</Text>
  </View>
);

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TabBarButton = (props: any) => (
  <Pressable {...props} android_ripple={{color: 'transparent'}} />
);

const TabStack = () => {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const lastBackPressRef = React.useRef(0);

  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS !== 'android') {
        return undefined;
      }

      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        const now = Date.now();
        if (now - lastBackPressRef.current < 2000) {
          BackHandler.exitApp();
          return true;
        }

        lastBackPressRef.current = now;
        ToastAndroid.show('再按一次退出', ToastAndroid.SHORT);
        return true;
      });

      return () => subscription.remove();
    }, []),
  );

  const bottomPadding = Math.max(insets.bottom, 8);

  const tabBarStyle = {
    backgroundColor: colors.containerColor,
    height: 65 + bottomPadding - (Platform.OS === 'ios' ? 20 : 0),
    paddingTop: 8,
    paddingBottom: bottomPadding,
    borderTopWidth: 0,
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accentGreen,
        tabBarInactiveTintColor: colors.primaryText,
        tabBarShowLabel: false,
        tabBarStyle: tabBarStyle,
        tabBarButton: TabBarButton,
      }}>
      <Tab.Screen name="HomeScreen" component={HomeScreen} options={{headerShown: false, tabBarIcon: HomeIcon}} />
      <Tab.Screen
        name="ReportsScreen"
        component={ReportsScreen}
        options={{headerShown: false, tabBarIcon: ReportsIcon}}
      />
      <Tab.Screen
        name="CategoryScreen"
        component={CategoryScreen}
        options={{headerShown: false, tabBarIcon: CategoriesIcon}}
      />
      <Tab.Screen name="DebtsScreen" component={DebtsScreen} options={{headerShown: false, tabBarIcon: DebtIcon}} />
    </Tab.Navigator>
  );
};

const HomeStack = () => {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="TabStack" component={TabStack} />
      <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
      <Stack.Screen name="AddTransactionsScreen" component={AddTransactionsScreen} />
      <Stack.Screen name="CategoryScreen" component={CategoryScreen} />
      <Stack.Screen name="UpdateTransactionScreen" component={UpdateTransactionScreen} />
      <Stack.Screen name="AddCategoryScreen" component={AddCategoryScreen} />
      <Stack.Screen name="UpdateCategoryScreen" component={UpdateCategoryScreen} />
      <Stack.Screen name="EverydayTransactionScreen" component={EverydayTransactionScreen} />
      <Stack.Screen name="CategoryTransactionScreen" component={CategoryTransactionScreen} />
      <Stack.Screen name="AddDebtorScreen" component={AddDebtorScreen} />
      <Stack.Screen name="IndividualDebtsScreen" component={IndividualDebtsScreen} />
      <Stack.Screen name="AddDebtsScreen" component={AddDebtsScreen} />
      <Stack.Screen name="UpdateDebtScreen" component={UpdateDebtScreen} />
      <Stack.Screen name="UpdateDebtorScreen" component={UpdateDebtorScreen} />
      <Stack.Screen name="AiQuickExpenseScreen" component={AiQuickExpenseScreen} />
      <Stack.Screen name="AiSettingsScreen" component={AiSettingsScreen} />
      <Stack.Screen name="AiExpenseQueueScreen" component={AiExpenseQueueScreen} />
      <Stack.Screen name="AiExpenseQueueDetailScreen" component={AiExpenseQueueDetailScreen} />
    </Stack.Navigator>
  );
};

export default HomeStack;
