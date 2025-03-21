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
}

const isWeb = Platform.OS === 'web';

type ButtonProps = {
  children: React.ReactNode;
  style?: object;
  onClick: () => void;
  disabled?: boolean;
};

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

type LoaderProps = { size: number | 'small' };
const AppLoader = ({ size }: LoaderProps) =>
  isWeb ? <CircularProgress size={size} /> : <ActivityIndicator size={size} />;

export default function Avatar({ url, size = 150, onUpload }: Props) {
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

      // Verificar permissões
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast('error', 'Permissão para acessar a galeria negada.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
        exif: false,
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
      const filePath = `public/${fileName}`; // Adicionando pasta "public" para organização

      // Preparar o arquivo para upload
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
      onUpload(filePath); // Passa o filePath relativo (ex.: "public/123456.jpeg")
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
            <Text style={styles.buttonText}>Upload</Text>
          )}
        </AppButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  avatar: {
    borderRadius: 75,
    overflow: 'hidden',
    maxWidth: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    objectFit: 'cover',
    paddingTop: 0,
  },
  noImage: {
    backgroundColor: '#2e4066', // Alinhado com o tema do KeyHub
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#3b517a',
  },
  noImageText: {
    color: '#ffffff',
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: 10,
  },
  uploadButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#34d399', // Verde vibrante do KeyHub
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});