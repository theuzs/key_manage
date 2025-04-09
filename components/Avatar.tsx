import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  StyleSheet,
  View,
  Image,
  Text,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { showToast } from '../utils/toast';

interface Props {
  size?: number;
  url: string | null;
  onUpload: (filePath: string) => void;
  userId?: string;
}

export default function Avatar({ url, size = 150, onUpload, userId }: Props) {
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const avatarSize = { height: size, width: size };

  useEffect(() => {
    if (url) downloadImage(url);
  }, [url]);

  async function downloadImage(path: string) {
    try {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      if (!data?.publicUrl) throw new Error('URL pública não disponível');
      setAvatarUrl(data.publicUrl);
    } catch (error) {
      console.log('Erro ao baixar imagem:', error);
      showToast('error', 'Erro ao carregar imagem do avatar.');
    }
  }

  async function uploadAvatar() {
    try {
      setUploading(true);

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast('error', 'Permissão para acessar a galeria negada.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log('Usuário cancelou o seletor de imagem.');
        return;
      }

      const image = result.assets[0];
      if (!image.uri) throw new Error('Imagem sem URI.');

      const fileExt = image.uri.split('.').pop()?.toLowerCase() || 'jpeg';
      const fileName = `${Date.now()}.${fileExt}`;

      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = userId || sessionData?.session?.user?.id;
      if (!currentUserId) throw new Error('Usuário não autenticado');

      const filePath = `${currentUserId}/${fileName}`;
      const response = await fetch(image.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: image.mimeType ?? 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(publicUrlData.publicUrl);
      onUpload(filePath);
      showToast('success', 'Avatar carregado com sucesso!');
    } catch (error) {
      console.log('Erro no upload:', error);
      showToast('error', error instanceof Error ? error.message : 'Erro ao carregar avatar.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={styles.container}>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          accessibilityLabel="Avatar"
          style={[avatarSize, styles.avatar]}
        />
      ) : (
        <View style={[avatarSize, styles.avatar, styles.noImage]}>
          <Text style={styles.noImageText}>Sem Avatar</Text>
        </View>
      )}
      <TouchableOpacity
        style={[styles.uploadButton, uploading && styles.disabledButton]}
        onPress={uploadAvatar}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Carregar Avatar</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    borderRadius: 75,
    borderWidth: 2,
    borderColor: '#2596be',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImage: {
    backgroundColor: '#1e293b',
  },
  noImageText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '500',
  },
  uploadButton: {
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#2596be',
    borderRadius: 10,
    alignItems: 'center',
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
