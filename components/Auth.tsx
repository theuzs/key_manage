import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Platform,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { showToast, toastConfig } from '../utils/toast';
import { useNavigation } from '@react-navigation/native';

const isWeb = Platform.OS === 'web';

const AppContainer = ({ children, style }: any) => (
  <View style={style}>{children}</View>
);

const AppPaper = ({ children, style }: any) => (
  <View style={[style, isWeb && { boxShadow: '0px 4px 10px rgba(0,0,0,0.1)' }]}>
    {children}
  </View>
);

const AppTypography = ({ children, style }: any) => (
  <Text style={style}>{children}</Text>
);

const AppTextField = ({ style, value, onChangeText, placeholder, secureTextEntry }: any) => (
  <TextInput
    style={[styles.textField, style]}
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder}
    secureTextEntry={secureTextEntry}
  />
);

const AppButton = ({ children, style, onClick, disabled }: any) => (
  <TouchableOpacity
    style={[style, disabled && { opacity: 0.5 }]}
    onPress={onClick}
    disabled={disabled}
  >
    {children}
  </TouchableOpacity>
);

const AppLoader = ({ size }: any) =>
  isWeb ? <ActivityIndicator size="large" /> : <ActivityIndicator size={size} />;

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<any>();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        console.log('User signed out');
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      showToast('error', `Erro: ${error.message}`);
    } else {
      showToast('success', 'Login realizado com sucesso!');
    }
    setLoading(false);
  }

  async function resetPassword() {
    if (!email) {
      showToast('warn', 'Digite seu e-mail para recuperar a senha.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      showToast('error', `Erro: ${error.message}`);
    } else {
      showToast('success', 'E-mail de recuperação enviado. Verifique sua caixa de entrada!');
    }
    setLoading(false);
  }

  return (
    <AppContainer style={styles.container}>
      {isWeb && <ToastContainer />}
      <AppPaper style={styles.paper}>
        <AppTypography style={styles.title}>Acesso ao Sistema</AppTypography>

        <AppTextField
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          autoCapitalize="none"
        />
        <AppTextField
          value={password}
          onChangeText={setPassword}
          placeholder="Senha"
          secureTextEntry={true}
        />

        <AppButton
          style={styles.button}
          onClick={signInWithEmail}
          disabled={loading || !email || !password}
        >
          {loading ? <AppLoader size="small" /> : <Text style={styles.buttonText}>Acessar</Text>}
        </AppButton>

        <AppButton
          style={styles.button}
          onClick={() => navigation.navigate('Register')}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Registrar</Text>
        </AppButton>

        <AppButton style={styles.linkButton} onClick={resetPassword} disabled={loading}>
          <Text style={styles.linkText}>Esqueci minha senha</Text>
        </AppButton>
      </AppPaper>
      {!isWeb && <Toast config={toastConfig} />}
    </AppContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: Platform.OS === 'web' ? undefined : 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  paper: {
    padding: 24,
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 3,
    marginTop: 50,
  },
  title: {
    fontSize: 24,
    marginBottom: 16,
    textAlign: 'center',
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