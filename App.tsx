import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import Account from './components/Account';
import KeyHubScreen from './screens/KeyHubScreen';
import AddKeyScreen from './screens/AddKeyScreen';
import KeyHistoryScreen from './screens/KeyHistoryScreen';
import QRCodeScannerScreen from './screens/QRCodeScannerScreen';

import {
  View,
  StyleSheet,
  Text,
  StatusBar,
  Animated,
  Platform,
  Dimensions,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { NavigationContainer, useNavigation, NavigationProp } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Session } from '@supabase/supabase-js';
import 'react-toastify/dist/ReactToastify.css';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { showToast, toastConfig } from './utils/toast';
const isWeb = Platform.OS === 'web';
const { height } = Dimensions.get('window');
const Stack = createStackNavigator();

type GradientProps = {
  children: ReactNode;
  colors: readonly [string, string, ...string[]];
  style: any;
};

type RootStackParamList = {
  Auth: undefined;
  Register: undefined;
  KeyHub: undefined;
  Account: undefined;
  AddKey: undefined;
  KeyHistory: undefined;
  QRCodeScanner: undefined;
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const nextFadeAnim = useRef(new Animated.Value(0)).current;

  const images = [require('./assets/background_1.png')];

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session) showToast('success', 'Sessão iniciada com sucesso!');
      } catch (error) {
        console.error('Error fetching session:', error);
        showToast('error', 'Erro ao carregar sessão');
      }
    };
    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) showToast('info', 'Estado de autenticação alterado!');
      else showToast('warn', 'Usuário deslogado.');
    });

    return () => {
      authListener?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!isWeb && !session && images.length > 1) {
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
        <View
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backgroundColor: '#0f172a',
            zIndex: -1,
          }}
        />
      );
    } else if (!session && images.length > 1) {
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
      return <View style={[styles.background, { backgroundColor: '#0f172a' }]} />;
    }
  };

  const Gradient = ({ children, colors, style }: GradientProps) => (
    isWeb ? (
      <View style={{ ...style, backgroundColor: colors[0] }}>
        {children}
      </View>
    ) : (
      <LinearGradient colors={colors} style={style}>
        {children}
      </LinearGradient>
    )
  );

  const AuthScreen = () => (
    <>
      <Background />
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <Gradient colors={['#1e3a8a', '#3b82f6']} style={styles.header}>
          <Text style={styles.headerText}>Gerenciador de Chave</Text>
        </Gradient>
        <View style={styles.content}>
          <Auth />
        </View>
        <Gradient colors={['#3b82f6', '#1e3a8a']} style={styles.footer}>
          <Text style={styles.footerText}>© 2025 M. Fag - Todos os direitos reservados</Text>
        </Gradient>
      </View>
    </>
  );



function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // NOVO
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  async function signUp() {
    if (password !== confirmPassword) {
      showToast('warn', 'As senhas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      const { data: userData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined,
          data: {
            username,
            full_name: fullName
          }
        }
      });

      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (signInError) {
            showToast('warn', 'Este e-mail já está cadastrado. A senha informada está incorreta.');
          } else {
            showToast('warn', 'Este e-mail já está cadastrado. Você foi conectado com sucesso.');
            navigation.navigate('KeyHub');
          }

          setLoading(false);
          return;
        } else {
          showToast('error', `Erro: ${signUpError.message}`);
          setLoading(false);
          return;
        }
      }

      if (userData.user) {
        showToast('success', 'Cadastro realizado com sucesso!');
        navigation.navigate('KeyHub');
      } else {
        showToast('error', 'Erro ao criar usuário: dados do usuário não retornados');
      }
    } catch (error) {
      showToast('error', 'Erro inesperado durante o cadastro');
      console.error('Sign up error:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Background />
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <Gradient colors={['#1e3a8a', '#3b82f6']} style={styles.header}>
          <Text style={styles.headerText}>Registrar Novo Usuário</Text>
        </Gradient>
        <View style={styles.content}>
          <View style={registerStyles.paper}>
            <TextInput
              style={registerStyles.textField}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              autoCapitalize="none"
            />
            <TextInput
              style={registerStyles.textField}
              value={password}
              onChangeText={setPassword}
              placeholder="Senha"
              secureTextEntry
            />
            <TextInput
              style={registerStyles.textField}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirmar Senha"
              secureTextEntry
            />
            {/* 
            Se quiser voltar a usar username futuramente:
            <TextInput
              style={registerStyles.textField}
              value={username}
              onChangeText={setUsername}
              placeholder="Nome de usuário"
              autoCapitalize="none"
            /> 
            */}
            <TextInput
              style={registerStyles.textField}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Nome completo"
            />
            <TouchableOpacity
              style={[
                registerStyles.button,
                (!email || !password || !confirmPassword || !fullName) && { opacity: 0.5 },
              ]}
              onPress={signUp}
              disabled={loading || !email || !password || !confirmPassword || !fullName}
            >
              <Text style={registerStyles.buttonText}>
                {loading ? 'Carregando...' : 'Cadastrar'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={registerStyles.linkButton}
              onPress={() => navigation.navigate('Auth')}
            >
              <Text style={registerStyles.linkText}>Voltar para Login</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Gradient colors={['#3b82f6', '#1e3a8a']} style={styles.footer}>
          <Text style={styles.footerText}>© 2025 M. Fag - Todos os direitos reservados</Text>
        </Gradient>
      </View>
    </>
  );
}


return (
  <NavigationContainer>
    <Stack.Navigator initialRouteName={session ? "KeyHub" : "Auth"} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="KeyHub" component={KeyHubScreen} />
      <Stack.Screen name="Account">
  {(props) => <Account {...props} session={session!} />}
</Stack.Screen>
      <Stack.Screen name="AddKey" component={AddKeyScreen} />
      <Stack.Screen name="KeyHistory" component={KeyHistoryScreen} />
      <Stack.Screen name="QRCodeScanner" component={QRCodeScannerScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Auth" component={AuthScreen} />
    </Stack.Navigator>
    <Toast config={toastConfig} />
  </NavigationContainer>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  header: {
    height: isWeb ? 90 : 70,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingTop: StatusBar.currentHeight || 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  headerText: {
    color: '#ffffff',
    fontSize: isWeb ? 26 : 22,
    fontWeight: '700',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
  },
  content: {
    flex: 1,
    marginTop: isWeb ? 110 : 90,
    marginBottom: isWeb ? 90 : 70,
    paddingHorizontal: isWeb ? 60 : 25,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 15,
  },
  footer: {
    height: isWeb ? 90 : 70,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  footerText: {
    color: '#e2e8f0',
    fontSize: isWeb ? 16 : 14,
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});

const registerStyles = StyleSheet.create({
  paper: {
    padding: 24,
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 3,
    marginTop: 50,
    alignSelf: 'center',
  },
  textField: {
    width: '100%',
    marginVertical: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
  },
  button: {
    width: '100%',
    padding: 12,
    backgroundColor: '#1976d2',
    borderRadius: 4,
    marginTop: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  linkButton: {
    width: '100%',
    padding: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  linkText: {
    color: '#d32f2f',
    fontSize: 14,
  },
});