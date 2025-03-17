import { useState, useEffect } from 'react';
import { View, Text, StatusBar } from 'react-native';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import Account from './components/Account';
import { Session } from '@supabase/supabase-js';
import Toast from 'react-native-toast-message';
import { showToast } from './utils/toast';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) showToast('success', 'Sessão iniciada!');
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) showToast('info', 'Autenticação alterada!');
      else showToast('warn', 'Usuário deslogado.');
    });

    return () => subscription?.unsubscribe();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <StatusBar barStyle="light-content" />
      {session && session.user ? (
        <Account key={session.user.id} session={session} />
      ) : (
        <Auth />
      )}
      <Toast />
    </View>
  );
}