import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { StyleSheet, View, Image, Text, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { showToast } from '../utils/toast'; // Importa do novo arquivo
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
      const { data, error } = await supabase.storage.from('avatars').download(path);

      if (error) {
        throw error;
      }

      const fr = new FileReader();
      fr.readAsDataURL(data);
      fr.onload = () => {
        setAvatarUrl(fr.result as string);
      };
    } catch (error) {
      if (error instanceof Error) {
        console.log('Error downloading image: ', error.message);
        showToast('error', `Erro ao baixar imagem: ${error.message}`);
      }
    }
  }

  async function uploadAvatar() {
    try {
      setUploading(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        allowsEditing: true,
        quality: 1,
        exif: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log('User cancelled image picker.');
        return;
      }

      const image = result.assets[0];
      console.log('Got image', image);

      if (!image.uri) {
        throw new Error('No image uri!');
      }

      let arraybuffer: ArrayBuffer;
      if (image.uri.startsWith('file://')) {
        // Para mobile
        arraybuffer = await fetch(image.uri).then((res) => res.arrayBuffer());
      } else {
        // Para web
        const response = await fetch(image.uri);
        const blob = await response.blob();
        arraybuffer = await blob.arrayBuffer();
      }

      const fileExt = image.uri?.split('.').pop()?.toLowerCase() ?? 'jpeg';
      const path = `${Date.now()}.${fileExt}`;
      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, arraybuffer, {
          contentType: image.mimeType ?? 'image/jpeg',
        });

      if (uploadError) {
        throw uploadError;
      }

      onUpload(data.path);
      showToast('success', 'Avatar carregado com sucesso!');
    } catch (error) {
      if (error instanceof Error) {
        showToast('error', error.message);
      } else {
        console.error('Unknown error:', error);
        showToast('error', 'Erro desconhecido ao carregar avatar.');
      }
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
        <View style={[avatarSize, styles.avatar, styles.noImage]} />
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
    borderRadius: 5,
    overflow: 'hidden',
    maxWidth: '100%',
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
    borderRadius: 5,
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