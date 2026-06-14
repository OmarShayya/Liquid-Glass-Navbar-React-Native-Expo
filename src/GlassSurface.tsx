import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ColorSchemePref } from './types';

interface Props {
  children: React.ReactNode;
  borderRadius: number;
  style?: StyleProp<ViewStyle>;
  tintColor?: string;
  colorScheme?: ColorSchemePref;
  testID?: string;
}

/**
 * Rounded glass background. Uses the real iOS 26 material via expo-glass-effect
 * when available; otherwise approximates it with a blur + gradient border + top highlight.
 */
export function GlassSurface({
  children,
  borderRadius,
  style,
  tintColor,
  colorScheme = 'system',
  testID,
}: Props) {
  const native = isLiquidGlassAvailable();

  if (native) {
    return (
      <GlassView
        testID={testID ? `${testID}-glass` : undefined}
        glassEffectStyle="regular"
        isInteractive
        tintColor={tintColor}
        colorScheme={colorScheme === 'system' ? 'auto' : colorScheme}
        style={[{ borderRadius, overflow: 'hidden' }, style]}
      >
        {children}
      </GlassView>
    );
  }

  const blurTint = colorScheme === 'dark' ? 'dark' : 'light';
  return (
    <View
      testID={testID ? `${testID}-blur-fallback` : undefined}
      style={[{ borderRadius, overflow: 'hidden' }, styles.fallbackShadow, style]}
    >
      <BlurView intensity={50} tint={blurTint} style={StyleSheet.absoluteFill} />
      {/* top highlight fill */}
      <LinearGradient
        colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.08)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {tintColor ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tintColor }]} />
      ) : null}
      {/* premium 1px gradient border: mask a vertical gradient to a 1px ring */}
      <MaskedView
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        maskElement={<View style={{ flex: 1, borderWidth: 1, borderColor: 'black', borderRadius }} />}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.7)', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.25)']}
          start={{ x: 0.49, y: 0 }}
          end={{ x: 0.51, y: 1 }}
          locations={[0, 0.5, 1]}
          style={{ flex: 1 }}
        />
      </MaskedView>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fallbackShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});
