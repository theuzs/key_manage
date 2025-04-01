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

type RootStackParamList = {
  KeyHub: undefined;
  Account: undefined;
  AddKey: undefined;
  KeyHistory: undefined;
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
  const slideAnim = React.useRef(new Animated.Value(-300)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchKeys();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  async function fetchKeys() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('keys')
        .select('id, name, location, status, user_id, profiles:user_id(full_name)')
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

  async function reserveKey(keyId: string) {
    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        showToast('error', 'Usuário não autenticado.');
        return;
      }

      const userId = session.session.user.id;

      const { error: updateError } = await supabase
        .from('keys')
        .update({ status: 'em uso', user_id: userId })
        .eq('id', keyId)
        .eq('status', 'disponível');

      if (updateError) throw updateError;

      const { error: historyError } = await supabase
        .from('key_history')
        .insert({
          key_id: keyId,
          user_id: userId,
          action: 'retirada',
          timestamp: new Date().toISOString(),
        });

      if (historyError) throw historyError;

      showToast('success', 'Chave reservada com sucesso!');
      fetchKeys();
    } catch (error) {
      console.log('Error reserving key:', error);
      showToast('error', 'Erro ao reservar a chave.');
    } finally {
      setLoading(false);
    }
  }

  async function returnKey(keyId: string) {
    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        showToast('error', 'Usuário não autenticado.');
        return;
      }

      const { error: updateError } = await supabase
        .from('keys')
        .update({ status: 'disponível', user_id: null })
        .eq('id', keyId)
        .eq('status', 'em uso');

      if (updateError) throw updateError;

      const { error: historyError } = await supabase
        .from('key_history')
        .insert({
          key_id: keyId,
          user_id: session.session.user.id,
          action: 'devolução',
          timestamp: new Date().toISOString(),
        });

      if (historyError) throw historyError;

      showToast('success', 'Chave devolvida com sucesso!');
      fetchKeys();
    } catch (error) {
      console.log('Error returning key:', error);
      showToast('error', 'Erro ao devolver a chave.');
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
    <Animated.View style={[styles.keyItem, { opacity: fadeAnim }]}>
      <View style={styles.keyRow}>
        <Icon name="vpn-key" size={24} color="#a3bffa" style={styles.keyIcon} />
        <View style={styles.keyInfo}>
          <Text style={styles.keyName}>{item.name}</Text>
          <Text style={styles.keyDetail}>Local: {item.location}</Text>
          <View style={styles.statusContainer}>
            <Text style={styles.keyDetail}>Status: </Text>
            <Text
              style={item.status === 'disponível' ? styles.available : styles.inUse}
            >
              {item.status}
            </Text>
          </View>
          <Text style={styles.keyDetail}>
            Com: {item.user?.full_name || 'Ninguém'}
          </Text>
        </View>
      </View>
      <View style={styles.actionButtons}>
        {item.status === 'disponível' ? (
          <TouchableOpacity
            style={styles.reserveButton}
            onPress={() => reserveKey(item.id)}
            disabled={loading}
          >
            <Icon name="lock-open" size={18} color="#fff" />
            <Text style={styles.buttonText}> Reservar</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.returnButton}
            onPress={() => returnKey(item.id)}
            disabled={loading}
          >
            <Icon name="lock" size={18} color="#fff" />
            <Text style={styles.buttonText}> Devolver</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );

  const toggleMenu = () => {
    const toValue = menuVisible ? -300 : 0;
    Animated.spring(slideAnim, {
      toValue,
      tension: 80,
      friction: 10,
      useNativeDriver: true,
    }).start(() => setMenuVisible(!menuVisible));
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
      <TouchableOpacity style={styles.menuButton} onPress={toggleMenu}>
        <Icon name={menuVisible ? 'close' : 'menu'} size={30} color="#a3bffa" />
      </TouchableOpacity>

      <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
        <Text style={styles.sidebarTitle}>Menu</Text>
        <TouchableOpacity
          style={styles.sidebarButton}
          onPress={() => {
            navigation.navigate('AddKey');
            toggleMenu();
          }}
        >
          <Icon name="add-circle-outline" size={24} color="#fff" />
          <Text style={styles.sidebarButtonText}> Adicionar Chave</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sidebarButton}
          onPress={() => {
            navigation.navigate('Account');
            toggleMenu();
          }}
        >
          <Icon name="person-outline" size={24} color="#fff" />
          <Text style={styles.sidebarButtonText}> Configurar Perfil</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sidebarButton}
          onPress={() => {
            navigation.navigate('KeyHistory');
            toggleMenu();
          }}
        >
          <Icon name="history" size={24} color="#fff" />
          <Text style={styles.sidebarButtonText}> Relatório de Movimentação</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <Icon name="logout" size={24} color="#fff" />
          <Text style={styles.sidebarButtonText}> Sair</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View style={[styles.mainContent, { opacity: fadeAnim }]}>
        <Text style={styles.title}>Hub de Chaves - SENAI</Text>
        <TextInput
          style={styles.filterInput}
          placeholder="Filtrar por nome, local, status ou pessoa..."
          value={filter}
          onChangeText={setFilter}
          placeholderTextColor="#a3bffa"
        />
        <TouchableOpacity style={styles.refreshButton} onPress={fetchKeys} disabled={loading}>
          <Icon name="refresh" size={24} color="#fff" />
          <Text style={styles.buttonText}> Atualizar</Text>
        </TouchableOpacity>
        {loading ? (
          <ActivityIndicator size="large" color="#a3bffa" />
        ) : (
          <FlatList
            data={filteredKeys}
            renderItem={renderKeyItem}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma chave cadastrada.</Text>}
            contentContainerStyle={styles.listContent}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1b2a',
  },
  menuButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 20,
    backgroundColor: '#1e3a8a',
    padding: 12,
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 300,
    height: '100%',
    backgroundColor: '#1e3a8a',
    paddingVertical: 80,
    paddingHorizontal: 20,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  sidebarTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 40,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  sidebarButton: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  signOutButton: {
    flexDirection: 'row',
    backgroundColor: '#dc2626',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  sidebarButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  mainContent: {
    flex: 1,
    padding: 20,
    paddingTop: 80,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#a3bffa',
    textAlign: 'center',
    marginBottom: 25,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
  },
  filterInput: {
    width: '100%',
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#3b82f6',
    marginBottom: 20,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  refreshButton: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  keyItem: {
    backgroundColor: '#1e3a8a',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  keyIcon: {
    marginRight: 15,
  },
  keyInfo: {
    flex: 1,
  },
  keyName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 5,
  },
  keyDetail: {
    fontSize: 16,
    color: '#a3bffa',
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  available: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#10b981',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  inUse: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#ef4444',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  actionButtons: {
    marginTop: 15,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  reserveButton: {
    flexDirection: 'row',
    backgroundColor: '#10b981',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  returnButton: {
    flexDirection: 'row',
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyText: {
    fontSize: 18,
    color: '#a3bffa',
    textAlign: 'center',
    marginTop: 30,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 30,
  },
});