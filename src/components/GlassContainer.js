import React from "react";
import { View, Pressable } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "@/utils/theme";

export default function GlassContainer({
  children,
  style = {},
  contentStyle = {},
  onPress,
  blurIntensity,
  borderRadius = 16,
  pressable = false,
  ...pressableProps
}) {
  const { isDark, colors } = useTheme();

  const intensity = blurIntensity || (isDark ? 30 : 20);

  const containerStyle = {
    borderRadius,
    overflow: "hidden",
    ...style,
  };

  const baseContentStyle = {
    backgroundColor: pressable && onPress ? colors.glass : colors.glass,
    borderWidth: 1,
    borderColor: colors.border,
    ...contentStyle,
  };

  if (pressable || onPress) {
    return (
      <View style={containerStyle}>
        <BlurView intensity={intensity} style={{ flex: 1 }}>
          <Pressable
            onPress={onPress}
            style={({ pressed }) => ({
              ...baseContentStyle,
              backgroundColor: pressed ? colors.glassPressed : colors.glass,
            })}
            {...pressableProps}
          >
            {children}
          </Pressable>
        </BlurView>
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <BlurView intensity={intensity} style={{ flex: 1 }}>
        <View style={baseContentStyle}>{children}</View>
      </BlurView>
    </View>
  );
}
