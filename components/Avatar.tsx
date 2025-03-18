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
import * as FileSystem from 'expo-file-system';
import { showToast } from '../utils/toast';
import { Button as MuiButton, CircularProgress } from '@mui/material';

interface Props {
  size?: number;
  url: string | null;
  onUpload: (filePath: string) => void;
}

const isWeb = Platform.OS === 'web';

// Componente condicional para botão
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

// Componente condicional para loader
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

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Mantido como fallback
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

      // Lê o arquivo como base64
      const base64Data = await FileSystem.readAsStringAsync(image.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Remove o prefixo "data:image/jpeg;base64," se presente (não deve estar, mas por segurança)
      const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');

      const fileExt = image.uri.split('.').pop()?.toLowerCase() ?? 'jpeg';
      const fileName = `${Date.now()}.${fileExt}`;

      // Envia o base64 diretamente ao Supabase
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, atob(cleanBase64), {
          contentType: image.mimeType ?? 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const newAvatarUrl = publicUrlData.publicUrl;

      setAvatarUrl(newAvatarUrl);
      onUpload(fileName);
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
    backgroundColor: '#333',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgb(200, 200, 200)',
  },
  noImageText: {
    color: '#fff',
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: 10,
  },
  uploadButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#1e90ff',
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});