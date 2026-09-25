import React from 'react';

const flattenStyle = (style: unknown): Record<string, unknown> | undefined => {
  if (!style) return undefined;
  if (Array.isArray(style)) {
    const result: Record<string, unknown> = {};
    for (const item of style) {
      const flat = flattenStyle(item);
      if (flat) {
        Object.assign(result, flat);
      }
    }
    return result;
  }
  if (typeof style === 'object') {
    return style as Record<string, unknown>;
  }
  return undefined;
};

const normalizeProps = (props: Record<string, unknown>) => {
  const {
    testID,
    style,
    accessibilityLabel,
    accessibilityRole,
    activeOpacity,
    horizontal,
    showsHorizontalScrollIndicator,
    showsVerticalScrollIndicator,
    contentContainerStyle,
    accessibilityState,
    trackColor,
    thumbColor,
    animationType,
    transparent,
    ...rest
  } = props;
  const result: Record<string, unknown> = { ...rest };
  if (testID !== undefined) {
    result['data-testid'] = testID;
  }
  if (style !== undefined) {
    result.style = flattenStyle(style);
  }
  if (accessibilityLabel !== undefined) {
    result['aria-label'] = accessibilityLabel;
  }
  if (accessibilityRole !== undefined) {
    result.role = accessibilityRole;
  }
  return result;
};

export const StyleSheet = {
  create: <T extends Record<string, unknown>>(styles: T): T => styles,
  flatten: flattenStyle,
};

export const View = ({
  children,
  ...props
}: {
  children?: React.ReactNode;
  [key: string]: unknown;
}) => React.createElement('div', normalizeProps(props), children);

export const Text = ({
  children,
  ...props
}: {
  children?: React.ReactNode;
  [key: string]: unknown;
}) => React.createElement('span', normalizeProps(props), children);

export const Pressable = ({
  children,
  ...props
}: {
  children?: React.ReactNode | ((state: { pressed: boolean }) => React.ReactNode);
  [key: string]: unknown;
}) =>
  React.createElement(
    'button',
    { type: 'button', ...normalizeProps(props) },
    typeof children === 'function' ? children({ pressed: false }) : children,
  );

export const TouchableOpacity = Pressable;

export const ScrollView = ({
  children,
  ...props
}: {
  children?: React.ReactNode;
  [key: string]: unknown;
}) => React.createElement('div', normalizeProps(props), children);

export const Switch = (props: Record<string, unknown>) =>
  React.createElement('input', { type: 'checkbox', ...normalizeProps(props) });

export const Modal = ({
  children,
  visible = true,
  ...props
}: {
  children?: React.ReactNode;
  visible?: boolean;
  [key: string]: unknown;
}) =>
  visible
    ? React.createElement('div', { 'data-modal': true, ...normalizeProps(props) }, children)
    : null;

export const ActivityIndicator = (props: Record<string, unknown>) =>
  React.createElement('div', { 'data-activity-indicator': true, ...normalizeProps(props) });

export const useWindowDimensions = () => ({
  width: 390,
  height: 844,
  scale: 3,
  fontScale: 1,
});

export const Dimensions = {
  get: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
  addEventListener: () => ({ remove: () => {} }),
};

export const Platform = {
  OS: 'android',
  select: <T>(objs: { android?: T; default?: T }): T | undefined => objs.android ?? objs.default,
};

export default {
  StyleSheet,
  View,
  Text,
  Pressable,
  TouchableOpacity,
  ScrollView,
  Switch,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
  Dimensions,
  Platform,
};
