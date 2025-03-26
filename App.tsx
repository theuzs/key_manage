import 'react-native-gesture-handler'; // Necessário para o stack navigator
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import Account from './components/Account';
import KeyHubScreen from './screens/KeyHubScreen';
import AddKeyScreen from './screens/AddKeyScreen'; // Verifique se o caminho está correto
import KeyHistoryScreen from './screens/KeyHistoryScreen'; // Adicionei a nova tela
import {
  View,
  StyleSheet,
  Text,
  StatusBar,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Session } from '@supabase/supabase-js';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { LinearGradient, LinearGradientProps } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { showToast, toastConfig } from './utils/toast';

const isWeb = Platform.OS === 'web';
const { height } = Dimensions.get('window');
const Stack = createStackNavigator();

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const nextFadeAnim = useRef(new Animated.Value(0)).current;

  const images = [
    require('./assets/background_1.png'),
    // require('./assets/background_2.png'),
    // require('./assets/background_3.png'),
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) showToast('success', 'Sessão iniciada com sucesso!');
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) showToast('info', 'Estado de autenticação alterado!');
      else showToast('warn', 'Usuário deslogado.');
    });
  }, []);

  useEffect(() => {
    if (!isWeb && !session) { // Carrossel só na tela de login
      const interval = setInterval(() => {
        const nextIndex = (currentImageIndex + 1) % images.length;

        Animated.sequence([
          Animated.timing(nextFadeAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setCurrentImageIndex(nextIndex);
          fadeAnim.setValue(1);
          nextFadeAnim.setValue(0);
        });
      }, 4000);

      return () => clearInterval(interval);
    }
  }, [currentImageIndex, fadeAnim, nextFadeAnim, session]);

  const Background = () => {
    if (isWeb) {
      return (
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backgroundImage: `url(${images[currentImageIndex].default})`,
            backgroundSize: 'cover',
            opacity: 1,
            zIndex: -1,
          }}
        />
      );
    } else if (!session) { // Fundo animado só na tela de login
      return (
        <>
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
        </>
      );
    } else {
      return (
        <View style={[styles.background, { backgroundColor: '#1a2a44' }]} /> // Azul-marinho escuro
      );
    }
  };

  const Gradient = ({
    children,
    colors,
    style,
  }: {
    children: React.ReactNode;
    colors: LinearGradientProps['colors'];
    style?: object;
  }) =>
    isWeb ? (
      <div style={{ ...style, background: `linear-gradient(to bottom, ${colors.join(', ')})` }}>
        {children}
      </div>
    ) : (
      <LinearGradient colors={colors} style={style}>
        {children}
      </LinearGradient>
    );

  const AuthScreen = () => (
    <>
      <Background />
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <Gradient colors={['#1e90ff', '#4682b4']} style={styles.header}>
          <Text style={styles.headerText}>Gerenciador de Chave</Text>
        </Gradient>
        <View style={styles.content}>
          <Auth />
        </View>
        <Gradient colors={['#4682b4', '#1e90ff']} style={styles.footer}>
          <Text style={styles.footerText}>© 2025 M. Fag - Todos os direitos reservados</Text>
        </Gradient>
      </View>
    </>
  );

  return (
    <>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {session ? (
            <>
              <Stack.Screen name="KeyHub" component={KeyHubScreen} />
              <Stack.Screen name="Account">
                {(props) => <Account {...props} session={session} />}
              </Stack.Screen>
              <Stack.Screen name="AddKey" component={AddKeyScreen} />
              <Stack.Screen name="KeyHistory" component={KeyHistoryScreen} /> {/* Adicionei a nova tela */}
            </>
          ) : (
            <Stack.Screen name="Auth" component={AuthScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
      {isWeb && (
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
      )}
      {!isWeb && <Toast config={toastConfig} />}
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  header: {
    height: isWeb ? 80 : 60,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingTop: StatusBar.currentHeight || 0,
  },
  headerText: {
    color: 'white',
    fontSize: isWeb ? 22 : 18,
    fontWeight: 'bold',
    letterSpacing: 1.2,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  content: {
    flex: 1,
    marginTop: isWeb ? 100 : 80,
    marginBottom: isWeb ? 80 : 60,
    paddingHorizontal: isWeb ? 55 : 20,
  },
  footer: {
    height: isWeb ? 80 : 60,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  footerText: {
    color: 'white',
    fontSize: isWeb ? 14 : 12,
    textAlign: 'center',
  },
});