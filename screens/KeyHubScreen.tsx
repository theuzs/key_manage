import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Animated,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { showToast } from '../utils/toast';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Definir o tipo das rotas para o Stack Navigator
type RootStackParamList = {
  KeyHub: undefined;
  Account: undefined;
  AddKey: undefined;
  KeyHistory: undefined; // Adicionei a nova tela
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
  const [menuVisible, setMenuVisible] = useState(false);
  const navigation = useNavigation<NavigationProp>();
  const slideAnim = React.useRef(new Animated.Value(-250)).current;

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
      <View style={styles.keyRow}>
        <Icon name="vpn-key" size={24} color="#ffffff" style={styles.keyIcon} />
        <View style={styles.keyInfo}>
          <Text style={styles.keyName}>{item.name}</Text>
          <Text style={styles.keyDetail}>Local: {item.location}</Text>
          <View style={styles.statusContainer}>
            <Text style={styles.keyDetail}>Status: </Text>
            <Text
              style={[
                styles.statusText,
                item.status === 'disponível' ? styles.available : styles.inUse,
              ]}
            >
              {item.status}
            </Text>
          </View>
          {item.user_id && item.user?.full_name ? (
            <Text style={styles.keyDetail}>Com: {item.user.full_name}</Text>
          ) : (
            <Text style={styles.keyDetail}>Com: Ninguém</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const toggleMenu = () => {
    const toValue = menuVisible ? -250 : 0;
    Animated.timing(slideAnim, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setMenuVisible(!menuVisible);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      showToast('success', 'Logout realizado com sucesso!');
      toggleMenu();
    } catch (error) {
      console.log('Error signing out:', error);
      showToast('error', 'Erro ao fazer logout.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Botão de Menu */}
      <TouchableOpacity style={styles.menuButton} onPress={toggleMenu}>
        <Text style={styles.menuButtonText}>{menuVisible ? '✕' : '☰'}</Text>
      </TouchableOpacity>

      {/* Menu Lateral */}
      <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
        <Text style={styles.sidebarTitle}>Menu</Text>
        <TouchableOpacity
          style={styles.sidebarButton}
          onPress={() => {
            navigation.navigate('AddKey');
            toggleMenu();
          }}
        >
          <Text style={styles.sidebarButtonText}>Adicionar Chave</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sidebarButton}
          onPress={() => {
            navigation.navigate('Account');
            toggleMenu();
          }}
        >
          <Text style={styles.sidebarButtonText}>Configurar Perfil</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sidebarButton}
          onPress={() => {
            fetchKeys();
            toggleMenu();
          }}
        >
          <Text style={styles.sidebarButtonText}>Atualizar Lista</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sidebarButton} // Novo botão para KeyHistory
          onPress={() => {
            navigation.navigate('KeyHistory');
            toggleMenu();
          }}
        >
          <Text style={styles.sidebarButtonText}>Relatório de Movimentação</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.signOutButton} // Estilo diferente para destacar
          onPress={handleSignOut}
        >
          <Text style={styles.sidebarButtonText}>Sair</Text>
        </TouchableOpacity>
      </Animated.View>

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
    backgroundColor: '#1a2a44',
  },
  menuButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
    backgroundColor: '#2e4066',
    padding: 10,
    borderRadius: 8,
  },
  menuButtonText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 250,
    height: '100%',
    backgroundColor: '#14213d',
    paddingVertical: 60,
    paddingHorizontal: 20,
    zIndex: 5,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  sidebarTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 30,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  sidebarButton: {
    backgroundColor: '#2e4066',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3b517a',
  },
  signOutButton: {
    backgroundColor: '#f87171', // Vermelho para destacar o "Sair"
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f87171',
  },
  sidebarButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
    padding: 20,
    paddingTop: 70,
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
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  keyIcon: {
    marginRight: 10,
  },
  keyInfo: {
    flex: 1,
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
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    color: '#ffffff',
  },
  available: {
    backgroundColor: '#34d399',
  },
  inUse: {
    backgroundColor: '#f87171',
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