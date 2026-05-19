import { createPalette } from '@/lib/platform';
import type { ToastManager } from 'heroui-native';
import { CircleAlert, CircleCheck } from 'lucide-react-native';
import { createElement } from 'react';
import { View } from 'react-native';

const SUCCESS_DURATION_MS = 3200;

const successIconColor = createPalette('dark').positive;
const dangerIconColor = createPalette('dark').negative;

function successToastIcon() {
  return createElement(
    View,
    { className: 'flex-1 justify-center' },
    createElement(CircleCheck, {
      size: 22,
      color: successIconColor,
      strokeWidth: 2.5,
    })
  );
}

function errorToastIcon() {
  return createElement(
    View,
    { className: 'flex-1 justify-center' },
    createElement(CircleAlert, {
      size: 22,
      color: dangerIconColor,
      strokeWidth: 2.5,
    })
  );
}

/** Non-blocking success feedback; uses global toast defaults from HeroUINativeProvider. */
export function notifySuccess(toast: ToastManager, label: string, description?: string) {
  toast.show({
    variant: 'success',
    label,
    ...(description ? { description } : {}),
    duration: SUCCESS_DURATION_MS,
    icon: successToastIcon(),
  });
}

export function notifyError(toast: ToastManager, label: string, description?: string) {
  toast.show({
    variant: 'danger',
    label,
    ...(description ? { description } : {}),
    duration: SUCCESS_DURATION_MS,
    icon: errorToastIcon(),
  });
}
