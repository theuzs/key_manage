import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TextField, Button, Container, Paper, Typography, CircularProgress } from '@mui/material';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
      toast.error(`Erro: ${error.message}`);
    } else {
      toast.success('Login realizado com sucesso!');
    }
    setLoading(false);
  }

  async function signUpWithEmail() {
    setLoading(true);

    // Verifica se o e-mail já está cadastrado
    const { data: existingUser, error: fetchError } = await supabase
      .from('auth.users')
      .select('email')
      .eq('email', email)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      toast.error('Erro ao verificar usuário existente!');
      setLoading(false);
      return;
    }

    if (existingUser) {
      toast.warn('Este e-mail já está cadastrado. Faça login ou redefina sua senha.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      toast.error(`Erro: ${error.message}`);
    } else {
      toast.success('Verifique seu e-mail para confirmar o cadastro!');
    }
    setLoading(false);
  }

  async function resetPassword() {
    if (!email) {
      toast.warn('Digite seu e-mail para recuperar a senha.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      toast.error(`Erro: ${error.message}`);
    } else {
      toast.success('E-mail de recuperação enviado. Verifique sua caixa de entrada!');
    }
    setLoading(false);
  }

  return (
    <Container maxWidth="xs">
      <ToastContainer />
      <Paper elevation={3} style={{ padding: 24, textAlign: 'center', marginTop: 50 }}>
        <Typography variant="h5" gutterBottom>
          Acesso ao Sistema
        </Typography>
        <TextField
          fullWidth
          label="Email"
          variant="outlined"
          margin="normal"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          fullWidth
          label="Senha"
          type="password"
          variant="outlined"
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button
          fullWidth
          variant="contained"
          color="primary"
          onClick={signInWithEmail}
          disabled={loading || !email || !password}
          style={{ marginTop: 16 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Acessar'}
        </Button>
        <Button
          fullWidth
          variant="outlined"
          color="primary"
          onClick={signUpWithEmail}
          disabled={loading || !email || !password}
          style={{ marginTop: 8 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Primeiro Acesso'}
        </Button>
        <Button
          fullWidth
          variant="text"
          color="secondary"
          onClick={resetPassword}
          disabled={loading}
          style={{ marginTop: 8 }}
        >
          Esqueci minha senha
        </Button>
      </Paper>
    </Container>
  );
}
