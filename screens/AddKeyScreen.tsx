import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { showToast } from '../utils/toast';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  KeyHub: undefined;
  Account: undefined;
  AddKey: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'AddKey'>;

export default function AddKeyScreen() {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<'disponível' | 'em uso'>('disponível');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<NavigationProp>();

  async function addKey() {
    if (!name || !location) {
      showToast('error', 'Preencha todos os campos!');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('keys')
        .insert([{ name, location, status }]);

      if (error) throw error;

      showToast('success', 'Chave adicionada com sucesso!');
      navigation.goBack(); // Volta para KeyHubScreen
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
        placeholderTextColor="#999"
      />
      <TextInput
        style={styles.input}
        placeholder="Localização"
        value={location}
        onChangeText={setLocation}
        placeholderTextColor="#999"
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
      <TouchableOpacity style={styles.addButton} onPress={addKey} disabled={loading}>
        {loading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>Adicionar</Text>
        )}
      </TouchableOpacity>
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
    padding: 20,
    backgroundColor: '#1a2a44',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 30,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  input: {
    width: '100%',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#2e4066',
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#3b517a',
    marginBottom: 20,
    fontSize: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statusButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2e4066',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  statusButtonActive: {
    backgroundColor: '#34d399',
  },
  statusButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#34d399',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  backButton: {
    backgroundColor: '#f87171',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});