import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Animated } from 'react-native';
import { supabase } from '../lib/supabase';
import { showToast } from '../utils/toast';
import { Image } from 'react-native'; 
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Easing } from 'react-native';
import { TouchableWithoutFeedback, Keyboard } from 'react-native';



type RootStackParamList = {
  KeyHub: undefined;
  Account: undefined;
  Auth: undefined;
  AddKey: undefined;
  KeyHistory: undefined;
  QRCodeScanner: undefined;
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
  const rotateAnim = React.useRef(new Animated.Value(0)).current;


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

  useFocusEffect(
    React.useCallback(() => {
      fetchKeys();
    }, [])
  );

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

      if (updateError) {
        if (updateError.code === '23514') {
          showToast('error', 'A chave já foi reservada por outro usuário.');
        }
        throw updateError;
      }

      const { error: historyError } = await supabase
        .from('key_movements')
        .insert({
          key_id: keyId,
          user_id: userId,
          action: 'CHECKOUT',
          movement_date: new Date().toISOString(),
        });

      if (historyError) throw historyError;

      showToast('success', 'Chave reservada com sucesso!');
      fetchKeys();
    } catch (error) {
      console.log('Error reserving key:', error);
      if (error instanceof Error && !error.message.includes('23514')) {
        showToast('error', 'Erro ao reservar a chave.');
      }
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

      const userId = session.session.user.id;

      const { data: keyData, error: fetchError } = await supabase
        .from('keys')
        .select('user_id')
        .eq('id', keyId)
        .single();

      if (fetchError) throw fetchError;
      if (keyData.user_id !== userId) {
        showToast('error', 'Você não pode devolver uma chave que não reservou.');
        return;
      }

      const { error: updateError } = await supabase
        .from('keys')
        .update({ status: 'disponível', user_id: null })
        .eq('id', keyId)
        .eq('status', 'em uso');

      if (updateError) throw updateError;

      const { error: historyError } = await supabase
        .from('key_movements')
        .insert({
          key_id: keyId,
          user_id: userId,
          action: 'CHECKIN',
          movement_date: new Date().toISOString(),
        });

      if (historyError) throw historyError;

      showToast('success', 'Chave devolvida com sucesso!');
      fetchKeys();
    } catch (error) {
      console.log('Error returning key:', error);
      if (error instanceof Error && !error.message.includes('Você não pode devolver')) {
        showToast('error', 'Erro ao devolver a chave.');
      }
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
        <Icon name="vpn-key" size={26} color="#2596be" style={styles.keyIcon} />
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
          {item.status === 'em uso' && item.user && (
            <Text style={styles.keyDetail}>Em uso por: {item.user.full_name}</Text>
          )}
        </View>
      </View>
      <View style={styles.actionButtons}>
        {item.status === 'disponível' ? (
          <TouchableOpacity
            style={styles.reserveButton}
            onPress={() => reserveKey(item.id)}
            disabled={loading}
          >
            <Icon name="lock-open" size={20} color="#fff" />
            <Text style={styles.buttonText}> Reservar</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.returnButton}
            onPress={() => returnKey(item.id)}
            disabled={loading}
          >
            <Icon name="lock" size={20} color="#fff" />
            <Text style={styles.buttonText}> Devolver</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );

  const toggleMenu = () => {
    const toSlide = menuVisible ? -300 : 0;
    const toRotate = menuVisible ? 0 : 1;
  
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: toSlide,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: toRotate,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => setMenuVisible(!menuVisible));
  };
  

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      showToast('success', 'Logout realizado com sucesso!');
      toggleMenu();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      });
    } catch (error) {
      console.log('Error signing out:', error);
      showToast('error', 'Erro ao fazer logout.');
    }
  };
  

  return (
    <View style={styles.container}>
<TouchableOpacity style={styles.menuButton} onPress={toggleMenu}>
  <Animated.View
    style={{
      transform: [
        {
          rotate: rotateAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', '90deg'], // Gira 90 graus
          }),
        },
      ],
    }}
  >
    <Icon name={menuVisible ? 'close' : 'menu'} size={32} color="#2596be" />
  </Animated.View>
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
          <Icon name="add-circle-outline" size={26} color="#fff" />
          <Text style={styles.sidebarButtonText}> Adicionar Chave</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sidebarButton}
          onPress={() => {
            navigation.navigate('Account');
            toggleMenu();
          }}
        >
          <Icon name="person-outline" size={26} color="#fff" />
          <Text style={styles.sidebarButtonText}> Configurar Perfil</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sidebarButton}
          onPress={() => {
            navigation.navigate('KeyHistory');
            toggleMenu();
          }}
        >
          <Icon name="history" size={26} color="#fff" />
          <Text style={styles.sidebarButtonText}> Relatório de Movimentação</Text>
        </TouchableOpacity>
        {/* <TouchableOpacity
          style={styles.sidebarButton}
          onPress={() => {
            navigation.navigate('QRCodeScanner');
            toggleMenu();
          }}
        >
          <Icon name="qr-code-scanner" size={26} color="#fff" />
          <Text style={styles.sidebarButtonText}> Leitor de QR Code</Text>
        </TouchableOpacity> */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <Icon name="logout" size={26} color="#fff" />
          <Text style={styles.sidebarButtonText}> Sair</Text>
        </TouchableOpacity>
      </Animated.View>

      <TouchableWithoutFeedback onPress={() => menuVisible && toggleMenu()}>
  <Animated.View style={[styles.mainContent, { opacity: fadeAnim }]}>

        <Image
          source={require('../assets/senai.png')}
          style={styles.logo}
          resizeMode="center"
        />
        {/* <Text style={styles.title}>Hub de Chaves - SENAI</Text> */}
        <TextInput
          style={styles.filterInput}
          placeholder="Filtrar por nome, local, status ou pessoa..."
          value={filter}
          onChangeText={setFilter}
          placeholderTextColor="#94a3b8"
        />
        <TouchableOpacity style={styles.refreshButton} onPress={fetchKeys} disabled={loading}>
          <Icon name="refresh" size={26} color="#fff" />
          <Text style={styles.buttonText}> Atualizar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickAccessButton}
          onPress={() => navigation.navigate('QRCodeScanner')}
        >
          <Icon name="qr-code-scanner" size={26} color="#fff" />
          <Text style={styles.buttonText}> Reserva Rápida Chave</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" color="#2596be" />
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
</TouchableWithoutFeedback>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  menuButton: {
    position: 'absolute',
    top: 25,
    left: 25,
    zIndex: 20,
    backgroundColor: '#1e293b',
    padding: 14,
    borderRadius: 50,
    shadowColor: '#000',
    marginTop: 25,
    marginBottom: 60,
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
    backgroundColor: '#1e293b',
    paddingVertical: 90,
    paddingHorizontal: 25,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  logo: {
    width: 280,
    height: 60,
    alignSelf: 'center',
    marginBottom: 60,
    marginTop: -40,
    marginLeft: 65,
  },
  
  sidebarTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 50,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
  },
  sidebarButton: {
    flexDirection: 'row',
    backgroundColor: '#2596be',
    padding: 18,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2596be',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  signOutButton: {
    flexDirection: 'row',
    backgroundColor: '#780603',
    padding: 18,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#780603',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  sidebarButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
    letterSpacing: 0.5,
  },
  mainContent: {
    flex: 1,
    padding: 25,
    paddingTop: 90,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#e2e8f0',
    textAlign: 'center',
    marginBottom: 30,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
  },
  filterInput: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
    marginTop: -30,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  refreshButton: {
    flexDirection: 'row',
    backgroundColor: '#2596be',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    shadowColor: '#2596be',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  quickAccessButton: {
    flexDirection: 'row',
    backgroundColor: '#2596be',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
    shadowColor: '#2596be',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  keyItem: {
    backgroundColor: '#1e293b',
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
    fontSize: 22,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 6,
  },
  keyDetail: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 5,
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  available: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#2596be',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  inUse: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#780603',
    paddingVertical: 5,
    paddingHorizontal: 12,
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
    backgroundColor: '#2596be',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#2596be',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  returnButton: {
    flexDirection: 'row',
    backgroundColor: '#780603',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#780603',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  emptyText: {
    fontSize: 18,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 30,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 30,
  },
});