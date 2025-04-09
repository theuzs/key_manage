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

    let keyInfo: { keyId: string; name: string; location: string };
    try {
      const parsedData = JSON.parse(data);
      keyInfo = {
        keyId: parsedData.keyId,
        name: parsedData.name,
        location: parsedData.location,
      };
    } catch (error) {
      Alert.alert('Erro', 'Formato de QR code inválido. Esperado um JSON com keyId, name e location.');
      return;
    }

    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;

    if (!userId) {
      Alert.alert('Erro', 'Usuário não autenticado.');
      return;
    }

    const { data: keyData, error: fetchError } = await supabase
      .from('keys')
      .select('status, user_id, profiles:user_id(full_name)')
      .eq('id', keyInfo.keyId)
      .single();

    if (fetchError || !keyData) {
      Alert.alert('Erro', 'Chave não encontrada ou erro ao verificar status.');
      return;
    }

    if (keyData.status !== 'disponível') {
      const userName = keyData.profiles?.full_name || 'Desconhecido';
      Alert.alert('Erro', `A chave já está reservada por ${userName}.`);
      return;
    }

    Alert.alert(
      'Confirmar Reserva',
      `Deseja reservar a chave?\n\nNome: ${keyInfo.name}\nLocalização: ${keyInfo.location}`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => setScanned(false),
        },
        {
          text: 'Reservar',
          onPress: async () => {
            const { error: updateError } = await supabase
              .from('keys')
              .update({ status: 'em uso', user_id: userId })
              .eq('id', keyInfo.keyId)
              .eq('status', 'disponível');

            if (updateError) {
              Alert.alert('Erro', 'Erro ao reservar a chave. Tente novamente.');
            } else {
              await supabase.from('key_movements').insert({
                key_id: keyInfo.keyId,
                user_id: userId,
                action: 'CHECKOUT',
                movement_date: new Date().toISOString(),
              });
              Alert.alert('Sucesso', 'Chave reservada com sucesso!');
              navigation.goBack();
            }
          },
        },
      ],
      { cancelable: false }
    );
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
          barcodeTypes: ['qr'],
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