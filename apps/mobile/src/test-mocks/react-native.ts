import React from 'react';

export const StyleSheet = {
  create: <T extends Record<string, unknown>>(styles: T): T => styles,
  flatten: (style: unknown) => style,
};

export const View = ({
  children,
  ...props
}: {
  children?: React.ReactNode;
  [key: string]: unknown;
}) => React.createElement('div', props, children);

export const Text = ({
  children,
  ...props
}: {
  children?: React.ReactNode;
  [key: string]: unknown;
}) => React.createElement('span', props, children);

export const Pressable = ({
  children,
  ...props
}: {
  children?: React.ReactNode | ((state: { pressed: boolean }) => React.ReactNode);
  [key: string]: unknown;
}) =>
  React.createElement(
    'button',
    { type: 'button', ...props },
    typeof children === 'function' ? children({ pressed: false }) : children,
  );

export const ScrollView = ({
  children,
  ...props
}: {
  children?: React.ReactNode;
  [key: string]: unknown;
}) => React.createElement('div', props, children);

export const Switch = (props: Record<string, unknown>) =>
  React.createElement('input', { type: 'checkbox', ...props });

export const Platform = {
  OS: 'android',
  select: <T>(objs: { android?: T; default?: T }): T | undefined => objs.android ?? objs.default,
};

export default {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  Platform,
};
