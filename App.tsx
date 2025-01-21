import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import Account from './components/Account'
import { View, StyleSheet, Text, ScrollView, StatusBar, Image } from 'react-native'
import { Session } from '@supabase/supabase-js'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f4f6f9" />

      {/* Cabeçalho fixo */}
      <View style={styles.header}>
      {/* <Image
          source={{ uri: 'https://senaigoias.com.br/portal-aluno/static/media/logo_branco.1a65760c.png' }}
          style={{
            borderColor: '#f4f6f9',
            borderWidth: 5,
            height: 100,
            width: 300,
          }}
        /> */}
        <Text style={styles.headerText}>Gerenciador de Chave</Text>
      </View>

      {/* Conteúdo com rolagem */}
      <ScrollView contentContainerStyle={styles.content}>
        {session && session.user ? (
          <Account key={session.user.id} session={session} />
        ) : (
          <Auth />
        )}
      </ScrollView>

      {/* Rodapé */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2025 Meu App - Todos os direitos reservados</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f9',
  },
  header: {
    height: 60,
    backgroundColor: 'rgba(30, 144, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  logo: {
    width: 10, // Largura da imagem
    height: 10, // Altura da imagem
    marginRight: 1000, // Espaço entre a imagem e o texto
  },
  headerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    paddingTop: 80, // Espaço abaixo do cabeçalho
    paddingBottom: 80, // Espaço acima do rodapé
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    height: 60,
    backgroundColor: 'rgba(30, 144, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    // position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  footerText: {
    color: 'white',
    fontSize: 14,
  },
})
