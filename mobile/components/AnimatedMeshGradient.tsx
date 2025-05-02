import { ThemedText } from "@/components/ThemedText";
import { MeshGradientView } from "expo-mesh-gradient";
import { useEffect, useRef } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const SCREEN_SIZE = Dimensions.get("screen");

const AnimatedMeshGradientView =
  Animated.createAnimatedComponent(MeshGradientView);

Animated.addWhitelistedNativeProps({
  points: true,
});

export default function AnimatedMeshGradient({
  children,
}: {
  children: React.ReactNode;
}) {
  const point = useSharedValue({ x: 0.5, y: 0.5 });
  const verticalPosition = useSharedValue(0.1);
  const horizontalPosition = useSharedValue(0.5);

  useEffect(() => {
    verticalPosition.value = withRepeat(
      withTiming(0.8, {
        duration: 3000,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    horizontalPosition.value = withRepeat(
      withTiming(0.3, {
        duration: 3000,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );
  }, []);

  const panGesture = Gesture.Pan()
    .minDistance(1)
    .onUpdate((event) => {
      point.value = {
        x: event.absoluteX / SCREEN_SIZE.width,
        y: event.absoluteY / SCREEN_SIZE.height,
      };
    })
    .onEnd(() => {
      point.value = withSpring(
        { x: 0.5, y: 0.5 },
        {
          restDisplacementThreshold: 0.0001,
          restSpeedThreshold: 0.02,
        }
      );
    });

  const animatedProps = useAnimatedProps(() => {
    return {
      points: [
        [0.0, 0.0],
        [0.5, 0.0],
        [1.0, 0.0],
        [0.0, 0.5],
        // [point.value.x, point.value.y],
        [horizontalPosition.value, verticalPosition.value],
        [1.0, 0.5],
        [0.0, 1.0],
        [0.5, 1.0],
        [1.0, 1.0],
      ],
    };
  });

  const buttonStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: (point.value.x - 0.5) * SCREEN_SIZE.width },
        { translateY: (point.value.y - 0.5) * SCREEN_SIZE.height },
      ],
    };
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AnimatedMeshGradientView
        style={{ flex: 1 }}
        columns={3}
        rows={3}
        colors={[
          "#3100CD",
          "#3500C4",
          "#3900BE",
          "#0000C4",
          "#3100AA",
          "#AB005C",
          "#0000B6",
          "#0000CD",
          "#3D00B3",
        ]}
        smoothsColors={true}
        ignoresSafeArea={true}
        animatedProps={animatedProps}
      >
        {children}
      </AnimatedMeshGradientView>
      {/* <GestureDetector gesture={panGesture}> */}
      {/* <View style={styles.container}>
        <Animated.View style={[styles.button, buttonStyle]} />
      </View> */}
      {/* </GestureDetector> */}
    </GestureHandlerRootView>
  );
}
