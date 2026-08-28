import React from 'react';
import {
  KeyboardTypeOptions,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';

import {COLORS, FONTS} from '../constants';

type CustomInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  prefix?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  keyboardType?: KeyboardTypeOptions;
  maxLength?: number;
  error?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  secureTextEntry?: boolean;
  multiline?: boolean;
  editable?: boolean;
  variant?: 'default' | 'subtle';
  style?: ViewStyle;
};

export function CustomInput({
  value,
  onChangeText,
  placeholder,
  prefix,
  leftIcon,
  rightIcon,
  keyboardType = 'default',
  maxLength,
  error,
  autoCapitalize = 'none',
  secureTextEntry = false,
  multiline = false,
  editable = true,
  variant = 'default',
  style,
}: CustomInputProps) {
  const hasPrefix = Boolean(prefix);

  return (
    <View>
      <View
        style={[
          styles.inputWrapper,
          variant === 'subtle' && styles.subtleWrapper,
          multiline && styles.multilineWrapper,
          error ? styles.errorBorder : undefined,
          style,
        ]}>
        {hasPrefix ? (
          <Text
            style={[
              styles.prefix,
              variant === 'subtle' && styles.subtlePrefix,
            ]}>
            {prefix}
          </Text>
        ) : null}
        {hasPrefix ? <View style={styles.divider} /> : null}
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textSecondary}
          style={[styles.input, multiline && styles.multilineInput]}
          keyboardType={keyboardType}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          editable={editable}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
        {rightIcon ? <View style={styles.rightIcon}>{rightIcon}</View> : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  inputWrapper: {
    height: 56,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  prefix: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    lineHeight: 18,
    color: COLORS.primary,
    width: 36,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
    marginHorizontal: 10,
  },
  subtleWrapper: {
    borderColor: '#D5DBE3',
    borderRadius: 16,
  },
  subtlePrefix: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  multilineWrapper: {
    height: 92,
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  leftIcon: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: FONTS.regular,
    fontSize: 16,
    lineHeight: 20,
    color: COLORS.textPrimary,
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  multilineInput: {
    height: '100%',
    paddingTop: 2,
  },
  errorBorder: {
    borderColor: COLORS.error,
  },
  errorText: {
    marginTop: 6,
    color: COLORS.error,
    fontFamily: FONTS.regular,
    fontSize: 12,
  },
});
