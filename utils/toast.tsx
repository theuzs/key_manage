import { Platform, Text, View, StyleSheet } from 'react-native';
import { toast as webToast } from 'react-toastify';
import Toast, { ToastConfigParams } from 'react-native-toast-message';

const isWeb = Platform.OS === 'web';

// Configuração personalizada para o tipo 'warn'
const toastConfig = {
  warn: ({ text1 }: ToastConfigParams<any>) => (
    <View style={styles.warnContainer}>
      <Text style={styles.warnText}>{text1 || 'Aviso'}</Text>
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

export { toastConfig };

const styles = StyleSheet.create({
  warnContainer: {
    backgroundColor: '#ff9800',
    padding: 10,
    borderRadius: 5,
  },
  warnText: {
    color: 'white',
    fontWeight: 'bold',
  },
});