import { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js'
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { ToastContainer, toast } from 'react-toastify';
import React from 'react';

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
        setFullName(data.full_name);
        setUsername(data.username);
        setWebsite(data.website);
        setAvatarUrl(data.avatar_url);
        if (data.avatar_url) {
          downloadAvatar(data.avatar_url);
        }
      }
    } catch (error) {
      toast.error('Erro ao carregar perfil.');
    } finally {
      setLoading(false);
    }
  }

  async function downloadAvatar(path: string) {
    try {
      const { data, error } = await supabase.storage
        .from('avatars') // Nome do bucket
        .download(path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      setAvatar(url);
    } catch (error) {
      toast.error('Erro ao carregar avatar.');
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
      toast.success('Avatar atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar avatar.');
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

      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar perfil.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Editar Perfil</Text>

        <View style={styles.avatarContainer}>
          {avatar && (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          )}
          <TouchableOpacity style={styles.editIcon} onPress={pickImage}>
            <Feather name="edit-2" size={20} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nome Completo</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Digite seu nome completo"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nome de Usuário</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Digite seu nome de usuário"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Website</Text>
          <TextInput
            style={styles.input}
            value={website}
            onChangeText={setWebsite}
            placeholder="Digite seu website"
            keyboardType="url"
          />
        </View>

        <Button title={loading ? 'Carregando...' : 'Atualizar Perfil'} 
        onPress={updateProfile} 
        disabled={loading} 
        />

<View style={styles.buttonContainer}>
  <TouchableOpacity 
    style={styles.signOutButton} 
    onPress={() => supabase.auth.signOut()}
  >
    <Text style={styles.signOutButtonText}>Sign Out</Text>
  </TouchableOpacity>
</View>



      </ScrollView>

      {/* Toast Container */}
      <ToastContainer />
    </>
  );
}

const styles = StyleSheet.create({
  container: {

    flexGrow: 1,
    paddingHorizontal: 400,
    paddingVertical: 100,
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
  buttonContainer: {
    marginTop: 15,
  },
  signOutButton: {
    backgroundColor: 'red',
    borderRadius: 5,
    paddingVertical: 10,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
