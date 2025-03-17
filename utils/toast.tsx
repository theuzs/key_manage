import { Platform, Text, View } from 'react-native';
import { toast as webToast } from 'react-toastify';
import Toast from 'react-native-toast-message';

const isWeb = Platform.OS === 'web';

// Configuração personalizada para o tipo 'warn'
const toastConfig = {
  warn: ({ text1, props }: { text1: string; props?: any }) => (
    <View style={{ backgroundColor: '#ff9800', padding: 10, borderRadius: 5 }}>
      <Text style={{ color: 'white', fontWeight: 'bold' }}>{text1}</Text>
    </View>
  ),
};

export const showToast = (type: 'success' | 'error' | 'info' | 'warn', message: string) => {
  if (isWeb) {
    switch (type) {
      case 'success':
        webToast.success(message);
        break;
      case 'error':
        webToast.error(message);
        break;
      case 'info':
        webToast.info(message);
        break;
      case 'warn':
        webToast.warn(message);
        break;
    }
  } else {
    Toast.show({
      type,
      text1: message,
      position: 'top',
      visibilityTime: 3000,
    });
  }
};

// Exporta a configuração para ser usada no App.tsx
export { toastConfig };