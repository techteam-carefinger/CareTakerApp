import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import {FONTS} from '../../constants';

export type TakerTabIcon =
  | 'home-outline'
  | 'car-outline'
  | 'car-sport-outline'
  | 'settings-outline'
  | 'wallet-outline'
  | 'time-outline'
  | 'person-outline';

type BottomTabProps = {
  icon: TakerTabIcon;
  label: string;
  active?: boolean;
  activeColor?: string;
  onPress?: () => void;
};

export function BottomTab({
  icon,
  label,
  active,
  activeColor = '#0A7496',
  onPress,
}: BottomTabProps) {
  const color = active ? activeColor : '#6B7280';

  return (
    <Pressable style={styles.tabItem} onPress={onPress}>
      <View style={styles.tabIcon}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text
        style={[styles.tabLabel, active && {color: activeColor}]}
        numberOfLines={1}
        allowFontScaling={false}>
        {label}
      </Text>
      {active ? (
        <View style={[styles.activeIndicator, {backgroundColor: activeColor}]} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabIcon: {
    marginBottom: 4,
  },
  tabLabel: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
  },
  activeIndicator: {
    marginTop: 6,
    width: 26,
    height: 3,
    borderRadius: 6,
  },
});
