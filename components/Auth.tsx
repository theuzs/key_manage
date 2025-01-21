import React, { useState } from 'react'
import { Alert, StyleSheet, View, AppState, Platform } from 'react-native'
import { supabase } from '../lib/supabase'
import { Button, Input } from '@rneui/themed'

// Tells Supabase Auth to continuously refresh the session automatically if
// the app is in the foreground. When this is added, you will continue to receive
// `onAuthStateChange` events with the `TOKEN_REFRESHED` or `SIGNED_OUT` event
// if the user's session is terminated. This should only be registered once.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function signInWithEmail() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (error) Alert.alert(error.message)
    setLoading(false)
  }

  async function signUpWithEmail() {
    setLoading(true)
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email: email,
      password: password,
    })

    if (error) Alert.alert(error.message)
    if (!session) Alert.alert('Please check your inbox for email verification!')
    setLoading(false)
  }

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <Input
          label="Email"
          leftIcon={{ type: 'font-awesome', name: 'envelope' }}
          onChangeText={(text) => setEmail(text)}
          value={email}
          placeholder="email@address.com"
          autoCapitalize="none"
          inputContainerStyle={styles.inputContainer}
        />
        <Input
          label="Password"
          leftIcon={{ type: 'font-awesome', name: 'lock' }}
          onChangeText={(text) => setPassword(text)}
          value={password}
          secureTextEntry
          placeholder="Password"
          autoCapitalize="none"
          inputContainerStyle={styles.inputContainer}
        />
        <Button
          title="Acessar"
          buttonStyle={styles.button}
          disabled={loading}
          onPress={signInWithEmail}
        />
        <Button
          title="Primeiro Acesso"
          type="outline"
          buttonStyle={[styles.button, styles.outlineButton]}
          disabled={loading}
          onPress={signUpWithEmail}
        />
      </View>
    </View>
  );
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
    maxWidth: 400, // Limita a largura máxima para não ficar esticado no desktop
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5, // Para Android, dá um efeito de sombra
  },
  inputContainer: {
    backgroundColor: '#f0f0f0', // Cor de fundo dos inputs
    borderRadius: 8,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#1E90FF',
    borderRadius: 8,
    marginBottom: 15,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderColor: '#1E90FF',
    borderWidth: 2,
  },
});