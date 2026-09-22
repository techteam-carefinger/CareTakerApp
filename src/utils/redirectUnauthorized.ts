import {Alert} from 'react-native';

import {ApiError, authService} from '../services';

type LoginReset = {
  reset: (state: {index: number; routes: Array<{name: 'Login'}>}) => void;
};

export async function redirectIfUnauthorized(
  error: unknown,
  navigation: LoginReset,
): Promise<boolean> {
  if (!(error instanceof ApiError) || error.status !== 401) {
    return false;
  }

  const message = error.message || 'Please log in again.';
  Alert.alert(message, undefined, [
    {
      text: 'OK',
      onPress: () => {
        void (async () => {
          await authService.logout();
          navigation.reset({
            index: 0,
            routes: [{name: 'Login'}],
          });
        })();
      },
    },
  ]);
  return true;
}
