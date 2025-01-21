import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { StyleSheet, View, Alert } from 'react-native'
import { Button, Input } from '@rneui/themed'
import { Session } from '@supabase/supabase-js'
// Importando o componente Avatar
import Avatar from './Avatar'

export default function Account({ session }: { session: Session }) {
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [website, setWebsite] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  useEffect(() => {
    if (session) getProfile()
  }, [session])

  async function getProfile() {
    try {
      setLoading(true)
      if (!session?.user) throw new Error('No user on the session!')

      const { data, error, status } = await supabase
        .from('profiles')
        .select(`username, website, avatar_url`)
        .eq('id', session?.user.id)
        .single()
      if (error && status !== 406) {
        throw error
      }

      if (data) {
        setUsername(data.username)
        setWebsite(data.website)
        setAvatarUrl(data.avatar_url)
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  async function updateProfile({
    username,
    website,
    avatar_url,
  }: {
    username: string
    website: string
    avatar_url: string
  }) {
    try {
      setLoading(true)
      if (!session?.user) throw new Error('No user on the session!')

      const updates = {
        id: session?.user.id,
        username,
        website,
        avatar_url,
        updated_at: new Date(),
      }

      const { error } = await supabase.from('profiles').upsert(updates)

      if (error) {
        throw error
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <View style={[styles.verticallySpaced, styles.mt20]}>
          <Input label="Email" value={session?.user?.email} disabled />
        </View>
        <View style={styles.verticallySpaced}>
          <Input label="Username" value={username || ''} onChangeText={(text) => setUsername(text)} />
        </View>
        <View style={styles.verticallySpaced}>
          <Input label="Website" value={website || ''} onChangeText={(text) => setWebsite(text)} />
        </View>

        <View style={[styles.verticallySpaced, styles.mt20]}>
          <Button
            title={loading ? 'Loading ...' : 'Update'}
            onPress={() => updateProfile({ username, website, avatar_url: avatarUrl })}
            disabled={loading}
            buttonStyle={styles.button}
          />
        </View>

        <View style={styles.verticallySpaced}>
          <Button title="Sign Out" onPress={() => supabase.auth.signOut()} buttonStyle={styles.button} />
        </View>

        <View style={styles.avatarContainer}>
          <Avatar
            size={100}
            url={avatarUrl}
            onUpload={(url: string) => {
              setAvatarUrl(url)
              updateProfile({ username, website, avatar_url: url })
            }}
          />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f6f9',
    padding: 20,
  },
  form: {
    width: '100%',
    maxWidth: 500, // Limita a largura máxima do formulário
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  inputContainer: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 15,
  },
  verticallySpaced: {
    paddingTop: 4,
    paddingBottom: 4,
    alignSelf: 'stretch',
  },
  mt20: {
    marginTop: 20,
  },
  button: {
    backgroundColor: '#1E90FF',
    borderRadius: 8,
    marginBottom: 15,
  },
  avatarContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
})
