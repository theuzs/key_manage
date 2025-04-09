// screens/QRCodeScannerScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, Button } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';

export default function QRCodeScannerScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setScanned(true);

    const keyId = data;
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;

    if (!userId) {
      Alert.alert('Erro', 'Usuário não autenticado.');
      return;
    }

    const { error } = await supabase
      .from('keys')
      .update({ status: 'em uso', user_id: userId })
      .eq('id', keyId)
      .eq('status', 'disponível');

    if (error) {
      Alert.alert('Erro', 'Erro ao reservar chave ou chave já em uso.');
    } else {
      await supabase.from('key_movements').insert({
        key_id: keyId,
        user_id: userId,
        action: 'CHECKOUT',
        movement_date: new Date().toISOString(),
      });
      Alert.alert('Sucesso', 'Chave reservada com sucesso!');
    }

    navigation.goBack();
  };

  if (hasPermission === null) {
    return <Text>Solicitando permissão da câmera...</Text>;
  }
  if (hasPermission === false) {
    return <Text>Sem acesso à câmera.</Text>;
  }

  return (
    <View style={styles.container}>
      <CameraView
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'], // adicione outros tipos se precisar
        }}
        style={StyleSheet.absoluteFillObject}
      />
      {scanned && (
        <View style={styles.overlay}>
          <Text style={styles.text}>Chave escaneada!</Text>
          <Button title="Escanear novamente" onPress={() => setScanned(false)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 10,
  },
});
