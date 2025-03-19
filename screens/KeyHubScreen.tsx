import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { showToast } from '../utils/toast';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

// Definir o tipo das rotas para o Stack Navigator
type RootStackParamList = {
  KeyHub: undefined;
  Account: undefined;
  AddKey: undefined; // Adicionado
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'KeyHub'>;

type Key = {
  id: string;
  name: string;
  location: string;
  status: 'disponível' | 'em uso';
  user_id?: string | null;
  user?: { full_name: string } | null;
};

export default function KeyHubScreen() {
  const [keys, setKeys] = useState<Key[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    fetchKeys();
  }, []);

  async function fetchKeys() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('keys')
        .select('id, name, location, status, user_id, profiles!user_id(full_name)')
        .order('name', { ascending: true });

      if (error) throw error;

      const formattedData: Key[] = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        location: item.location,
        status: item.status,
        user_id: item.user_id,
        user: item.profiles ? { full_name: item.profiles.full_name } : null,
      }));

      setKeys(formattedData);
    } catch (error) {
      console.log('Error fetching keys:', error);
      showToast('error', 'Erro ao carregar as chaves.');
    } finally {
      setLoading(false);
    }
  }

  const filteredKeys = keys.filter(
    (key) =>
      key.name.toLowerCase().includes(filter.toLowerCase()) ||
      key.location.toLowerCase().includes(filter.toLowerCase()) ||
      key.status.toLowerCase().includes(filter.toLowerCase()) ||
      (key.user?.full_name && key.user.full_name.toLowerCase().includes(filter.toLowerCase()))
  );

  const renderKeyItem = ({ item }: { item: Key }) => (
    <TouchableOpacity
      style={styles.keyItem}
      onPress={() => showToast('info', `Detalhes da chave: ${item.name}`)}
    >
      <Text style={styles.keyName}>{item.name}</Text>
      <Text style={styles.keyDetail}>Local: {item.location}</Text>
      <Text style={styles.keyDetail}>
        Status: <Text style={item.status === 'disponível' ? styles.available : styles.inUse}>{item.status}</Text>
      </Text>
      {item.user_id && item.user?.full_name ? (
        <Text style={styles.keyDetail}>Com: {item.user.full_name}</Text>
      ) : (
        <Text style={styles.keyDetail}>Com: Ninguém</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Barra Lateral */}
      <View style={styles.sidebar}>
        <Text style={styles.sidebarTitle}>Menu</Text>
        <TouchableOpacity
          style={styles.sidebarButton}
          onPress={() => navigation.navigate('AddKey')}
        >
          <Text style={styles.sidebarButtonText}>Adicionar Chave</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sidebarButton}
          onPress={() => navigation.navigate('Account')}
        >
          <Text style={styles.sidebarButtonText}>Configurar Perfil</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sidebarButton} onPress={fetchKeys}>
          <Text style={styles.sidebarButtonText}>Atualizar Lista</Text>
        </TouchableOpacity>
      </View>

      {/* Conteúdo Principal */}
      <View style={styles.mainContent}>
        <Text style={styles.title}>Hub de Chaves - SENAI</Text>
        <TextInput
          style={styles.filterInput}
          placeholder="Filtrar por nome, local, status ou pessoa..."
          value={filter}
          onChangeText={setFilter}
          placeholderTextColor="#999"
        />
        {loading ? (
          <ActivityIndicator size="large" color="#ffffff" />
        ) : (
          <FlatList
            data={filteredKeys}
            renderItem={renderKeyItem}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma chave cadastrada.</Text>}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row', // Para a barra lateral e o conteúdo principal
    backgroundColor: '#1a2a44', // Azul-marinho escuro
  },
  sidebar: {
    width: 200,
    backgroundColor: '#14213d', // Um tom mais escuro para a sidebar
    paddingVertical: 20,
    paddingHorizontal: 15,
    borderRightWidth: 1,
    borderRightColor: '#2e4066',
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  sidebarButton: {
    backgroundColor: '#2e4066',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  sidebarButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  filterInput: {
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
  keyItem: {
    backgroundColor: '#2e4066',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  keyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  keyDetail: {
    fontSize: 14,
    color: '#d1d5db',
    marginTop: 4,
  },
  available: {
    color: '#34d399',
    fontWeight: 'bold',
  },
  inUse: {
    color: '#f87171',
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 16,
    color: '#d1d5db',
    textAlign: 'center',
    marginTop: 20,
  },
  listContent: {
    paddingBottom: 20,
  },
});