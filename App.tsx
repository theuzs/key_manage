import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import Account from './components/Account';
import { View, StyleSheet, Text, ScrollView, StatusBar, ImageBackground } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        toast.success('Sessão iniciada com sucesso!');
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        toast.info('Estado de autenticação alterado!');
      } else {
        toast.warn('Usuário deslogado.');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <>
      <ImageBackground
        source={require('./assets/background_1.png')} // Substitua pelo caminho da sua imagem
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

          {/* Cabeçalho fixo */}
          <LinearGradient
            colors={['#1e90ff', '#4682b4']}
            style={styles.header}
          >
            <Text style={styles.headerText}>Gerenciador de Chave</Text>
          </LinearGradient>

          {/* Conteúdo com rolagem */}
          <ScrollView contentContainerStyle={styles.content}>
            {session && session.user ? (
              <Account key={session.user.id} session={session} />
            ) : (
              <Auth />
            )}
          </ScrollView>

          {/* Rodapé */}
          <LinearGradient
            colors={['#4682b4', '#1e90ff']}
            style={styles.footer}
          >
            <Text style={styles.footerText}>© 2025 Meu App - Todos os direitos reservados</Text>
          </LinearGradient>
        </View>
      </ImageBackground>

      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        style={{ zIndex: 1000 }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 2,
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Deixa o fundo levemente escurecido para melhor contraste
  },
  header: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingTop: StatusBar.currentHeight,
  },
  headerText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 1.2,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  content: {
    flexGrow: 1,
    marginTop: 100,
    marginBottom: 80,
    paddingHorizontal: 15,
  },
  footer: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  footerText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
  },
});
