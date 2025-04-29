import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Platform,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import Avatar from './Avatar';
import { showToast } from '../utils/toast';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

type RootStackParamList = {
  KeyHub: undefined;
  Account: undefined;
  AddKey: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'Account'>;

type AppTextFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: object;
};

const AppTextField = ({ value, onChangeText, placeholder, style }: AppTextFieldProps) => (
  <TextInput
    style={[styles.input, style]}
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder}
    placeholderTextColor="#94a3b8"
  />
);

type AppButtonProps = {
  onPress: () => void;
  children: React.ReactNode;
  style?: object;
  disabled?: boolean;
};

const AppButton = ({ onPress, children, style, disabled }: AppButtonProps) => (
  <TouchableOpacity style={[style, disabled && styles.disabledButton]} onPress={onPress} disabled={disabled}>
    {disabled ? <ActivityIndicator color="#ffffff" /> : children}
  </TouchableOpacity>
);

export default function Account({ session }: { session: Session }) {
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [website, setWebsite] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    if (session) getProfile();
  }, [session]);

  async function getProfile() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, username, website, avatar_url')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;

      if (data) {
        setFullName(data.full_name || '');
        setUsername(data.username || '');
        setWebsite(data.website || '');
        setAvatarUrl(data.avatar_url || '');
      }
    } catch (error) {
      showToast('error', 'Erro ao carregar perfil.');
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile() {
    try {
      setLoading(true);
      const updates = {
        id: session.user.id,
        full_name: fullName, 
        website: website,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;
      showToast('success', 'Perfil atualizado com sucesso!');
    } catch (error) {
      showToast('error', 'Erro ao atualizar perfil.');
    } finally {
      setLoading(false);
    }
  }

  const handleAvatarUpload = (filePath: string) => {
    setAvatarUrl(filePath);
    updateProfile();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Editar Perfil</Text>
        <Avatar url={avatarUrl} size={120} onUpload={handleAvatarUpload} />
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nome Completo</Text>
          <AppTextField
            value={fullName}
            onChangeText={setFullName}
            placeholder="Digite seu nome completo"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nome de Usuário</Text>
          <AppTextField
            value={username}
            onChangeText={setUsername}
            placeholder="Digite seu nome de usuário"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Website</Text>
          <AppTextField
            value={website}
            onChangeText={setWebsite}
            placeholder="Digite seu website"
          />
        </View>

        <AppButton style={styles.updateButton} onPress={updateProfile} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Atualizando...' : 'Atualizar Perfil'}</Text>
        </AppButton>

        <AppButton style={styles.backButton} onPress={() => navigation.navigate('KeyHub')}>
          <Text style={styles.buttonText}>Voltar ao Hub</Text>
        </AppButton>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0f172a',
    paddingVertical: 30,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 25,
    backgroundColor: '#1e293b',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  title: {
    fontSize: isWeb ? 32 : 28,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
  },
  form: {
    paddingHorizontal: isWeb ? 50 : 25,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 8,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  input: {
    width: '100%',
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    color: '#ffffff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  updateButton: {
    width: '100%',
    padding: 16,
    backgroundColor: '#2596be',
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 25,
    shadowColor: '#2596be',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  backButton: {
    width: '100%',
    padding: 16,
    backgroundColor: '#64748b',
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
