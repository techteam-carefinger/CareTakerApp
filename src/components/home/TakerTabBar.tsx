import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {COLORS} from '../../constants';
import {RootStackParamList} from '../../navigation/types';
import {BottomTab, TakerTabIcon} from './BottomTab';

export type TakerTabKey = 'Home' | 'Active' | 'Jobs' | 'Settings';

const TABS: Array<{
  icon: TakerTabIcon;
  label: string;
  key: TakerTabKey;
  route: keyof RootStackParamList;
  activeColor: string;
}> = [
  {
    icon: 'home-outline',
    label: 'Home',
    key: 'Home',
    route: 'Home',
    activeColor: '#22C55E',
  },
  {
    icon: 'car-outline',
    label: 'Active Care Services',
    key: 'Active',
    route: 'ActiveCareServices',
    activeColor: COLORS.primary,
  },
  {
    icon: 'car-sport-outline',
    label: 'My Care Services',
    key: 'Jobs',
    route: 'JobHistory',
    activeColor: COLORS.primary,
  },
  {
    icon: 'settings-outline',
    label: 'Setting',
    key: 'Settings',
    route: 'Profile',
    activeColor: COLORS.primary,
  },
];

type Props = {
  active?: TakerTabKey;
};

export function TakerTabBar({active}: Props) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.bottomBar}>
      {TABS.map(tab => (
        <BottomTab
          key={tab.key}
          icon={tab.icon}
          label={tab.label}
          active={tab.key === active}
          activeColor={tab.activeColor}
          onPress={() => navigation.navigate(tab.route as never)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 78,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
    shadowColor: '#111827',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: -4},
    elevation: 10,
  },
});
