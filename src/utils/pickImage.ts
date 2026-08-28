import {Alert} from 'react-native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';

import {UploadFile} from '../services/api';

const OPTIONS = {
  mediaType: 'photo' as const,
  quality: 0.8,
  selectionLimit: 1,
};

const toUploadFile = (
  uri?: string,
  fileName?: string,
  type?: string,
): UploadFile | null => {
  if (!uri) {
    return null;
  }
  return {
    uri,
    name: fileName || 'document.jpg',
    type: type || 'image/jpeg',
  };
};

const openPicker = async (source: 'camera' | 'gallery') => {
  const result =
    source === 'camera'
      ? await launchCamera(OPTIONS)
      : await launchImageLibrary(OPTIONS);

  if (result.didCancel || result.errorCode) {
    return null;
  }

  const asset = result.assets?.[0];
  return toUploadFile(asset?.uri, asset?.fileName, asset?.type);
};

export const pickImage = (
  title = 'Upload document',
): Promise<UploadFile | null> =>
  new Promise(resolve => {
    Alert.alert(title, 'Choose a source', [
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: () => resolve(null),
      },
      {
        text: 'Camera',
        onPress: () => {
          void openPicker('camera').then(resolve);
        },
      },
      {
        text: 'Gallery',
        onPress: () => {
          void openPicker('gallery').then(resolve);
        },
      },
    ]);
  });
