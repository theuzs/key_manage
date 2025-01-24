import { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import Account from './components/Account';
import { View, StyleSheet, Text, ScrollView, StatusBar, Animated } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current; // Opacidade da imagem atual
  const nextFadeAnim = useRef(new Animated.Value(0)).current; // Opacidade da próxima imagem

  const images = [
    require('./assets/background_1.png'),
    require('./assets/background_2.png'),
    require('./assets/background_3.png'),
  ];

  // Alterna imagens em um ciclo com animação suave
  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (currentImageIndex + 1) % images.length;

      // Controla a transição entre as imagens
      Animated.sequence([
        Animated.timing(nextFadeAnim, {
          toValue: 1, // A próxima imagem aparece
          duration: 2000, // Duração do fade in
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0, // A imagem atual desaparece
          duration: 2000, // Duração do fade out
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentImageIndex(nextIndex); // Atualiza o índice
        fadeAnim.setValue(1); // Reseta a opacidade da imagem atual
        nextFadeAnim.setValue(0); // Reseta a opacidade da próxima imagem
      });
    }, 4000); // Troca a cada 4 segundos

    return () => clearInterval(interval);
  }, [currentImageIndex, fadeAnim, nextFadeAnim]);

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
      {/* Imagens de fundo com transição suave */}
      <Animated.Image
        source={images[currentImageIndex]}
        style={[styles.background, { opacity: fadeAnim }]}
        resizeMode="cover"
      />
      <Animated.Image
        source={images[(currentImageIndex + 1) % images.length]}
        style={[styles.background, { opacity: nextFadeAnim }]}
        resizeMode="cover"
      />

      {/* Conteúdo do App */}
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        {/* Cabeçalho fixo */}
        <LinearGradient colors={['#1e90ff', '#4682b4']} style={styles.header}>
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
        <LinearGradient colors={['#4682b4', '#1e90ff']} style={styles.footer}>
          <Text style={styles.footerText}>© 2025 M. Fag - Todos os direitos reservados</Text>
        </LinearGradient>
      </View>

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
    flex: 1,
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Para contraste
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
    paddingHorizontal: 55,
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
