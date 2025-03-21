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
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import Avatar from './Avatar';
import { showToast } from '../utils/toast';
import { TextField, Button as MuiButton } from '@mui/material';
import { useNavigation } from '@react-navigation/native'; // Adicionado para navegação
import { StackNavigationProp } from '@react-navigation/stack';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// Tipos para o Stack Navigator
type RootStackParamList = {
  KeyHub: undefined;
  Account: undefined;
  AddKey: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'Account'>;

// Tipos e componentes condicionais
type TextFieldProps = {
  style?: object;
  value: string;
  onChangeText?: (text: string) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
};
type ButtonProps = {
  children: React.ReactNode;
  style?: object;
  onClick: () => void;
  disabled?: boolean;
};

const AppTextField = ({ style, value, onChange, onChangeText, placeholder }: TextFieldProps) =>
  isWeb ? (
    <TextField
      fullWidth
      variant="outlined"
      margin="normal"
      value={value}
      onChange={onChange}
      style={style}
      placeholder={placeholder}
    />
  ) : (
    <TextInput
      style={style}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#999" // Ajustado para combinar com o tema
    />
  );

const AppButton = ({ children, style, onClick, disabled }: ButtonProps) =>
  isWeb ? (
    <MuiButton
      fullWidth
      variant="contained"
      color="primary"
      style={style}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </MuiButton>
  ) : (
    <TouchableOpacity style={style} onPress={onClick} disabled={disabled}>
      {children}
    </TouchableOpacity>
  );

export default function Account({ session }: { session: Session }) {
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [website, setWebsite] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const navigation = useNavigation<NavigationProp>(); // Adicionado para navegação

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
        username: username,
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
        <Avatar url={avatarUrl} size={100} onUpload={handleAvatarUpload} />
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nome Completo</Text>
          <AppTextField
            style={styles.input}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            onChangeText={(text) => setFullName(text)}
            placeholder="Digite seu nome completo"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nome de Usuário</Text>
          <AppTextField
            style={styles.input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onChangeText={(text) => setUsername(text)}
            placeholder="Digite seu nome de usuário"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Website</Text>
          <AppTextField
            style={styles.input}
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            onChangeText={(text) => setWebsite(text)}
            placeholder="Digite seu website"
          />
        </View>

        <AppButton style={styles.updateButton} onClick={updateProfile} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Atualizando...' : 'Atualizar Perfil'}</Text>
        </AppButton>

        <AppButton style={styles.backButton} onClick={() => navigation.navigate('KeyHub')}>
          <Text style={styles.buttonText}>Voltar ao Hub</Text>
        </AppButton>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#1a2a44', // Azul-marinho escuro do KeyHub
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#14213d', // Tom mais escuro para o header
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: isWeb ? 28 : 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  form: {
    paddingHorizontal: isWeb ? 40 : 20,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    color: '#d1d5db', // Cinza claro do KeyHub
    marginBottom: 5,
    fontWeight: '600',
  },
  input: {
    width: '100%',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#2e4066', // Cor dos inputs do KeyHub
    color: '#ffffff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#3b517a', // Borda do KeyHub
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  updateButton: {
    width: '100%',
    padding: 15,
    backgroundColor: '#34d399', // Verde vibrante para ação principal
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  backButton: {
    width: '100%',
    padding: 15,
    backgroundColor: '#2e4066', // Cor neutra para "Voltar"
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});