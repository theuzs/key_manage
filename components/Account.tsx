import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Image, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { showToast } from '../utils/toast'; // Importa do novo arquivo
import { Button as MuiButton, TextField, CircularProgress } from '@mui/material';

// Definindo tipos para suportar web e mobile
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
type LoaderProps = { size: number | 'small' };

const isWeb = Platform.OS === 'web';

// Componentes condicionais como funções
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

const AppLoader = ({ size }: LoaderProps) =>
  isWeb ? <CircularProgress size={size} /> : <ActivityIndicator size={size} />;

export default function Account({ session }: { session: Session }) {
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [website, setWebsite] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      getProfile();
    }
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
        if (data.avatar_url) {
          downloadAvatar(data.avatar_url);
        }
      }
    } catch (error) {
      showToast('error', 'Erro ao carregar perfil.');
    } finally {
      setLoading(false);
    }
  }

  async function downloadAvatar(path: string) {
    try {
      const { data, error } = await supabase.storage.from('avatars').download(path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      setAvatar(url);
    } catch (error) {
      showToast('error', 'Erro ao carregar avatar.');
    }
  }

  async function updateAvatar(file: File) {
    try {
      setLoading(true);

      const fileName = `${session.user.id}-${Date.now()}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const newAvatarUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: fileName })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      setAvatarUrl(newAvatarUrl);
      downloadAvatar(fileName);
      showToast('success', 'Avatar atualizado com sucesso!');
    } catch (error) {
      showToast('error', 'Erro ao atualizar avatar.');
    } finally {
      setLoading(false);
    }
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      const file = await fetch(result.assets[0].uri).then((res) => res.blob());
      updateAvatar(file as File);
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.formWrapper}>
        <Text style={styles.title}>Editar Perfil</Text>

        <View style={styles.avatarContainer}>
          {avatar && <Image source={{ uri: avatar }} style={styles.avatar} />}
          <TouchableOpacity style={styles.editIcon} onPress={pickImage}>
            <Feather name="edit-2" size={20} color="white" />
          </TouchableOpacity>
        </View>

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

        <AppButton
          style={styles.updateButton}
          onClick={updateProfile}
          disabled={loading}
        >
          {loading ? (
            <AppLoader size={isWeb ? 24 : 'small'} />
          ) : (
            <Text style={styles.buttonText}>Atualizar Perfil</Text>
          )}
        </AppButton>

        <View style={styles.buttonContainer}>
          <AppButton
            style={styles.signOutButton}
            onClick={() => supabase.auth.signOut()}
          >
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </AppButton>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 50,
    backgroundColor: '#f5f5f5',
  },
  formWrapper: {
    backgroundColor: 'white',
    borderRadius: 50,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e90ff',
    textAlign: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    alignSelf: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1e90ff',
    borderRadius: 15,
    padding: 5,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'white',
    fontSize: 16,
  },
  updateButton: {
    width: '100%',
    padding: 12,
    backgroundColor: '#1e90ff',
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonContainer: {
    marginTop: 15,
  },
  signOutButton: {
    width: '100%',
    padding: 12,
    backgroundColor: 'red',
    borderRadius: 5,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});