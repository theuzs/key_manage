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
import { Button as MuiButton, CircularProgress } from '@mui/material';

interface Props {
  size?: number;
  url: string | null;
  onUpload: (filePath: string) => void;
  userId?: string; // Adicionado para receber o ID do usuário
}

const isWeb = Platform.OS === 'web';

type ButtonProps = {
  children: React.ReactNode;
  style?: object;
  onClick: () => void;
  disabled?: boolean;
};

type LoaderProps = { size: number | 'small' };

const AppButton = ({ children, style, onClick, disabled }: ButtonProps) =>
  isWeb ? (
    <MuiButton
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
  isWeb ? <CircularProgress size={size} /> : <ActivityIndicator size={size} color="#2596be" />;

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
      if (!data?.publicUrl) {
        throw new Error('URL pública não disponível');
      }
      setAvatarUrl(data.publicUrl);
    } catch (error) {
      console.log('Error downloading image:', error);
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
        mediaTypes: ImagePicker.MediaType.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log('User cancelled image picker.');
        return;
      }

      const image = result.assets[0];
      console.log('Got image:', image);

      if (!image.uri) {
        throw new Error('No image URI!');
      }

      const fileExt = image.uri.split('.').pop()?.toLowerCase() ?? 'jpeg';
      const fileName = `${Date.now()}.${fileExt}`;
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = userId || sessionData?.session?.user?.id;
      if (!currentUserId) {
        throw new Error('Usuário não autenticado');
      }
      const filePath = `${currentUserId}/${fileName}`;

      const response = await fetch(image.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: image.mimeType ?? 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const newAvatarUrl = publicUrlData.publicUrl;

      setAvatarUrl(newAvatarUrl);
      onUpload(filePath);
      showToast('success', 'Avatar carregado com sucesso!');
    } catch (error) {
      console.log('Error uploading image:', error);
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
          style={[avatarSize, styles.avatar, styles.image]}
        />
      ) : (
        <View style={[avatarSize, styles.avatar, styles.noImage]}>
          <Text style={styles.noImageText}>Sem Avatar</Text>
        </View>
      )}
      <View style={styles.buttonContainer}>
        <AppButton
          style={styles.uploadButton}
          onClick={uploadAvatar}
          disabled={uploading}
        >
          {uploading ? (
            <AppLoader size={isWeb ? 24 : 'small'} />
          ) : (
            <Text style={styles.buttonText}>Carregar Avatar</Text>
          )}
        </AppButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#2596be',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  noImage: {
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonContainer: {
    marginTop: 15,
  },
  uploadButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#2596be',
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#2596be',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});