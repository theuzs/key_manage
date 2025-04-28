import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { StyleSheet, View, Alert, Image, Pressable, ActivityIndicator } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Feather } from '@expo/vector-icons' // Adicionado aqui

interface Props {
  size: number
  url: string | null
  onUpload: (filePath: string) => void
}

export default function Avatar({ url, size = 150, onUpload }: Props) {
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const avatarSize = { height: size, width: size, borderRadius: size / 2 }

  useEffect(() => {
    if (url) {
      downloadImage(url)
    }
  }, [url])

  async function downloadImage(path: string) {
    try {
      const { data, error } = await supabase.storage.from('avatars').download(path)
      if (error) throw error

      const base64 = await blobToBase64(data)
      setAvatarUrl(base64)
    } catch (error) {
      console.error('Error downloading image:', error)
    }
  }

  async function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  async function uploadAvatar() {
    try {
      setUploading(true)

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        allowsEditing: true,
        quality: 1,
        exif: false,
      })

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log('User cancelled image picker.')
        return
      }

      const image = result.assets[0]
      if (!image.uri) throw new Error('No image uri!')

      const response = await fetch(image.uri)
      const arraybuffer = await response.arrayBuffer()

      const fileExt = image.uri.split('.').pop()?.toLowerCase() ?? 'jpeg'
      const path = `${Date.now()}.${fileExt}`

      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, arraybuffer, {
          contentType: image.mimeType ?? 'image/jpeg',
          upsert: true,
        })

      if (uploadError) throw uploadError

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error('Usuário não autenticado.')
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: path })
        .eq('id', user.id)
      
      if (updateError) throw updateError

      onUpload(path)
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Upload failed', error.message)
      } else {
        throw error
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={uploadAvatar} disabled={uploading}>
        <View>
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              accessibilityLabel="Avatar"
              style={[avatarSize, styles.avatar]}
            />
          ) : (
            <View style={[avatarSize, styles.placeholder]}>
              {uploading ? <ActivityIndicator color="#fff" /> : null}
            </View>
          )}

          {/* Ícone do lápis */}
          <View style={styles.iconContainer}>
            <Feather name="edit-2" size={20} color="#fff" />
          </View>
        </View>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  avatar: {
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: '#ccc',
    objectFit: 'cover',
  },
  placeholder: {
    backgroundColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: '#ccc',
  },
  iconContainer: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#000',
    borderRadius: 15,
    padding: 4,
    opacity: 0.8,
  },
})
