import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {RootStackParamList} from '../../navigation/types';
import {BottomTab, TakerTabIcon} from './BottomTab';

const TABS: Array<{
  icon: TakerTabIcon;
  label: string;
  route: 'Home' | 'Earnings' | 'JobHistory' | 'Profile';
}> = [
  {icon: 'home-outline', label: 'Home', route: 'Home'},
  {icon: 'wallet-outline', label: 'Earnings', route: 'Earnings'},
  {icon: 'time-outline', label: 'Jobs', route: 'JobHistory'},
  {icon: 'person-outline', label: 'Profile', route: 'Profile'},
];

type Props = {
  active: 'Home' | 'Earnings' | 'Jobs' | 'Profile';
};

export function TakerTabBar({active}: Props) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.bottomBar}>
      {TABS.map(tab => (
        <BottomTab
          key={tab.label}
          icon={tab.icon}
          label={tab.label}
          active={tab.label === active}
          onPress={() => navigation.navigate(tab.route)}
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
    shadowColor: '#111827',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: -4},
    elevation: 10,
  },
});
