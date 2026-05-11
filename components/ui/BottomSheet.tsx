import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface BottomSheetHandle {
  present: () => void;
  dismiss: () => void;
}

interface BottomSheetProps {
  children: React.ReactNode;
  snapHeight?: number;
}

export const BottomSheet = forwardRef<BottomSheetHandle, BottomSheetProps>(
  ({ children, snapHeight = SCREEN_HEIGHT * 0.78 }, ref) => {
    const [visible, setVisible] = useState(false);
    const translateY = useSharedValue(snapHeight);
    const backdropOpacity = useSharedValue(0);

    useEffect(() => {
      if (visible) {
        translateY.value = snapHeight;
        backdropOpacity.value = withTiming(1, { duration: 220 });
        translateY.value = withSpring(0, { damping: 22, stiffness: 300 });
      }
    }, [visible]);

    const dismiss = () => {
      backdropOpacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(snapHeight, { duration: 260 }, (done) => {
        if (done) runOnJS(setVisible)(false);
      });
    };

    useImperativeHandle(ref, () => ({
      present: () => setVisible(true),
      dismiss,
    }));

    const sheetStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: translateY.value }],
    }));

    const backdropStyle = useAnimatedStyle(() => ({
      opacity: backdropOpacity.value,
    }));

    return (
      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={dismiss}
      >
        <TouchableWithoutFeedback onPress={dismiss}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </TouchableWithoutFeedback>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
          pointerEvents="box-none"
        >
          <Animated.View style={[styles.sheet, { height: snapHeight }, sheetStyle]}>
            <View style={styles.handle} />
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  flex: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 8,
  },
});
