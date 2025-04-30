import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { showToast } from '../utils/toast';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import QRCode from 'react-native-qrcode-svg';

type RootStackParamList = {
  KeyHub: undefined,
  Account: undefined,
  AddKey: undefined
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'AddKey'>;

export default function AddKeyScreen() {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<'disponível' | 'em uso'>('disponível');
  const [loading, setLoading] = useState(false);
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  const navigation = useNavigation<NavigationProp>();
  const qrRef = useRef<any>(null);

  const generateQRCodeData = (keyId: string = '') => {
    return JSON.stringify({ keyId, name, location });
  };

  const generatePDF = async (keyId: string) => {
    const qrData = generateQRCodeData(keyId);
    showToast('info', 'Gerando QR Code e PDF...');
    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
          <h1>Chave: ${name}</h1>
          <p>Local: ${location}</p>
          <p>Escaneie o QR Code abaixo:</p>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}" alt="QR Code" />
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      const pdfName = `${FileSystem.documentDirectory}${name.replace(/\s+/g, '_')}_key.pdf`;
      await FileSystem.moveAsync({ from: uri, to: pdfName });
      setPdfPath(pdfName);
      showToast('success', 'PDF com QR Code gerado com sucesso!');
      return pdfName;
    } catch (error) {
      console.log('Error generating PDF:', error);
      showToast('error', 'Erro ao gerar PDF');
      throw error;
    }
  };

  const sharePDF = async () => {
    if (!pdfPath) {
      showToast('error', 'Nenhum PDF disponível para compartilhar');
      return;
    }

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        showToast('error', 'Compartilhamento não disponível neste dispositivo');
        return;
      }

      await Sharing.shareAsync(pdfPath, {
        mimeType: 'application/pdf',
        dialogTitle: 'Compartilhar PDF da Chave',
        UTI: 'com.adobe.pdf',
      });
      showToast('success', 'PDF compartilhado com sucesso!');
    } catch (error) {
      console.log('Error sharing PDF:', error);
      showToast('error', 'Erro ao compartilhar PDF');
    }
  };

  async function addKey() {
    if (!name || !location) {
      showToast('error', 'Preencha todos os campos!');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('keys')
        .insert([{ name, location, status }])
        .select('id')
        .single();

      if (error) throw error;

      const keyId = data.id;
      await generatePDF(keyId);
      showToast('success', 'Chave adicionada com sucesso!');
      setName('');
      setLocation('');
      setStatus('disponível');

    } catch (error) {
      console.log('Error adding key:', error);
      showToast('error', 'Erro ao adicionar a chave.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Adicionar Nova Chave</Text>
      <TextInput
        style={styles.input}
        placeholder="Nome da chave"
        value={name}
        onChangeText={setName}
        placeholderTextColor="#94a3b8"
      />
      <TextInput
        style={styles.input}
        placeholder="Localização"
        value={location}
        onChangeText={setLocation}
        placeholderTextColor="#94a3b8"
      />
      <View style={styles.statusContainer}>
        <TouchableOpacity
          style={[styles.statusButton, status === 'disponível' && styles.statusButtonActive]}
          onPress={() => setStatus('disponível')}
        >
          <Text style={styles.statusButtonText}>Disponível</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statusButton, status === 'em uso' && styles.statusButtonActive]}
          onPress={() => setStatus('em uso')}
        >
          <Text style={styles.statusButtonText}>Em Uso</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.qrContainer}>
        {(name || location) && (
          <QRCode
            value={generateQRCodeData()}
            size={150}
            color="#ffffff"
            backgroundColor="#1e293b"
            getRef={(ref) => (qrRef.current = ref)}
          />
        )}
      </View>
      <TouchableOpacity style={styles.addButton} onPress={addKey} disabled={loading}>
        {loading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>Adicionar</Text>
        )}
      </TouchableOpacity>
      {pdfPath && (
        <TouchableOpacity style={styles.shareButton} onPress={sharePDF} disabled={loading}>
          <Text style={styles.buttonText}>Compartilhar PDF</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.buttonText}>Voltar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 25,
    backgroundColor: '#0f172a',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#e2e8f0',
    textAlign: 'center',
    marginBottom: 25,
    marginTop: 30,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
  },
  input: {
    width: '100%',
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  statusButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  statusButtonActive: {
    backgroundColor: '#2596be',
    shadowColor: '#2596be',
    shadowOpacity: 0.4,
  },
  statusButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  addButton: {
    backgroundColor: '#2596be',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#2596be',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  shareButton: {
    backgroundColor: '#22d3ee',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  backButton: {
    backgroundColor: '#780603',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#780603',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
