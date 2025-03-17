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
import {
  TextField,
  Button,
  Container,
  Paper,
  Typography,
  CircularProgress,
  TypographyProps as MuiTypographyProps,
} from '@mui/material';
import { ToastContainer, toast as webToast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Toast from 'react-native-toast-message';

// Definindo tipos para suportar web e mobile
type ContainerProps = {
  children: React.ReactNode;
  style?: object;
  maxWidth?: 'xs' | false;
};
type PaperProps = { children: React.ReactNode; style?: object; elevation?: number };
type TypographyProps = {
  children: React.ReactNode;
  style?: object;
  variant?: MuiTypographyProps['variant']; // Tipagem correta do MUI
};
type TextFieldProps = {
  style?: object;
  value: string;
  onChangeText?: (text: string) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
};
type ButtonProps = {
  children: React.ReactNode;
  style?: object;
  onClick: () => void;
  disabled?: boolean;
};
type LoaderProps = { size: number | 'small' };

// Componentes condicionais como funções
const AppContainer = ({ children, style, maxWidth }: ContainerProps) =>
  isWeb ? (
    <Container maxWidth={maxWidth} style={style}>
      {children}
    </Container>
  ) : (
    <View style={style}>{children}</View>
  );

const AppPaper = ({ children, style, elevation }: PaperProps) =>
  isWeb ? (
    <Paper elevation={elevation} style={style}>
      {children}
    </Paper>
  ) : (
    <View style={style}>{children}</View>
  );

const AppTypography = ({ children, style, variant }: TypographyProps) =>
  isWeb ? (
    <Typography variant={variant} style={style}>
      {children}
    </Typography>
  ) : (
    <Text style={style}>{children}</Text>
  );

const AppTextField = ({
  style,
  value,
  onChange,
  onChangeText,
  placeholder,
  secureTextEntry,
}: TextFieldProps) =>
  isWeb ? (
    <TextField
      fullWidth
      variant="outlined"
      margin="normal"
      value={value}
      onChange={onChange}
      style={style}
    />
  ) : (
    <TextInput
      style={style}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      secureTextEntry={secureTextEntry}
    />
  );

const AppButton = ({ children, style, onClick, disabled }: ButtonProps) =>
  isWeb ? (
    <Button fullWidth variant="contained" color="primary" style={style} onClick={onClick} disabled={disabled}>
      {children}
    </Button>
  ) : (
    <TouchableOpacity style={style} onPress={onClick} disabled={disabled}>
      {children}
    </TouchableOpacity>
  );

const AppLoader = ({ size }: LoaderProps) =>
  isWeb ? <CircularProgress size={size} /> : <ActivityIndicator size={size} />;

const isWeb = Platform.OS === 'web';

// Função para exibir toasts de forma condicional
const showToast = (type: 'success' | 'error' | 'info' | 'warn', message: string) => {
  if (isWeb) {
    switch (type) {
      case 'success':
        webToast.success(message);
        break;
      case 'error':
        webToast.error(message);
        break;
      case 'info':
        webToast.info(message);
        break;
      case 'warn':
        webToast.warn(message);
        break;
    }
  } else {
    Toast.show({
      type,
      text1: message,
      position: 'top',
      visibilityTime: 3000,
    });
  }
};

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        console.log('User signed out');
      }
    });

    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
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

  async function signUpWithEmail() {
    setLoading(true);

    const { data: existingUser, error: fetchError } = await supabase
      .from('auth.users')
      .select('email')
      .eq('email', email)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      showToast('error', 'Erro ao verificar usuário existente!');
      setLoading(false);
      return;
    }

    if (existingUser) {
      showToast('warn', 'Este e-mail já está cadastrado. Faça login ou redefina sua senha.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      showToast('error', `Erro: ${error.message}`);
    } else {
      showToast('success', 'Verifique seu e-mail para confirmar o cadastro!');
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
    <AppContainer style={styles.container} maxWidth={isWeb ? 'xs' : false}>
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
        />
      )}
      <AppPaper style={styles.paper} elevation={isWeb ? 3 : 0}>
        <AppTypography style={styles.title} variant={isWeb ? 'h5' : undefined}>
          Acesso ao Sistema
        </AppTypography>
        <AppTextField
          style={styles.textField}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onChangeText={(text) => setEmail(text)}
          placeholder="Email"
        />
        <AppTextField
          style={styles.textField}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onChangeText={(text) => setPassword(text)}
          placeholder="Senha"
          secureTextEntry={true}
        />
        <AppButton style={styles.button} onClick={signInWithEmail} disabled={loading || !email || !password}>
          {loading ? <AppLoader size={isWeb ? 24 : 'small'} /> : <Text style={styles.buttonText}>Acessar</Text>}
        </AppButton>
        <AppButton style={styles.button} onClick={signUpWithEmail} disabled={loading || !email || !password}>
          {loading ? <AppLoader size={isWeb ? 24 : 'small'} /> : <Text style={styles.buttonText}>Primeiro Acesso</Text>}
        </AppButton>
        <AppButton style={styles.linkButton} onClick={resetPassword} disabled={loading}>
          <Text style={styles.linkText}>Esqueci minha senha</Text>
        </AppButton>
      </AppPaper>
    </AppContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: Platform.OS === 'web' ? undefined : 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paper: {
    padding: 24,
    width: Platform.OS === 'web' ? undefined : '90%',
    backgroundColor: Platform.OS === 'web' ? undefined : '#fff',
    borderRadius: 8,
    elevation: Platform.OS === 'web' ? undefined : 3,
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