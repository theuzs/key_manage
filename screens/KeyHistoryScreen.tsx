import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { showToast } from '../utils/toast';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

type KeyHistory = {
  id: string;
  key_id: string;
  user_id: string | null;
  action: 'CHECKOUT' | 'CHECKIN';
  movement_date: string;
  key?: { name: string };
  user?: { full_name: string } | null;
};

export default function KeyHistoryScreen() {
  const [history, setHistory] = useState<KeyHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [userFilter, setUserFilter] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    try {
      setLoading(true);
      let query = supabase
        .from('key_movements')
        .select('id, key_id, user_id, action, movement_date, keys:key_id(name)')
        .order('movement_date', { ascending: false });

      if (startDate) query = query.gte('movement_date', `${startDate}T00:00:00Z`);
      if (endDate) query = query.lte('movement_date', `${endDate}T23:59:59Z`);

      const { data, error } = await query;

      if (error) throw error;

      // Buscar metadados dos usuários separadamente
      const userIds = [...new Set(data.map((item: any) => item.user_id).filter(Boolean))];
      const usersData: { [key: string]: { full_name: string } } = {};
      if (userIds.length > 0) {
        const { data: users, error: userError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        if (userError) throw userError;
        users.forEach((user: any) => {
          usersData[user.id] = { full_name: user.full_name };
        });
      }

      const formattedData: KeyHistory[] = (data || []).map((item: any) => ({
        id: item.id,
        key_id: item.key_id,
        user_id: item.user_id,
        action: item.action,
        movement_date: item.movement_date,
        key: item.keys ? { name: item.keys.name } : undefined,
        user: item.user_id && usersData[item.user_id] ? { full_name: usersData[item.user_id].full_name } : null,
      }));

      // Aplicar filtro de usuário localmente, se fornecido
      if (userFilter) {
        const filteredData = formattedData.filter(
          (item) => item.user?.full_name?.toLowerCase().includes(userFilter.toLowerCase())
        );
        setHistory(filteredData);
      } else {
        setHistory(formattedData);
      }
    } catch (error) {
      console.log('Error fetching history:', error);
      showToast('error', 'Erro ao carregar o histórico.');
    } finally {
      setLoading(false);
    }
  }

  async function generateExcel() {
    try {
      const headers = ['Chave', 'Usuário', 'Ação', 'Data/Hora'];
      const rows = history.map(entry => [
        entry.key?.name || 'Desconhecida',
        entry.user?.full_name || 'Ninguém',
        entry.action === 'CHECKOUT' ? 'Retirada' : 'Devolução',
        new Date(entry.movement_date).toLocaleString(),
      ]);

      const worksheetData = [headers, ...rows];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Movimentações');

      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
      const fileUri = `${FileSystem.documentDirectory}relatorio_movimentacao.xlsx`;
      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await Sharing.shareAsync(fileUri);
      showToast('success', 'Relatório XLSX gerado e compartilhado!');
    } catch (error) {
      console.log('Error generating XLSX:', error);
      showToast('error', 'Erro ao gerar o relatório XLSX.');
    }
  }

  const renderHistoryItem = ({ item }: { item: KeyHistory }) => (
    <View style={styles.historyItem}>
      <Text style={styles.historyText}>Chave: {item.key?.name || 'Desconhecida'}</Text>
      <Text style={styles.historyText}>Usuário: {item.user?.full_name || 'Ninguém'}</Text>
      <Text style={styles.historyText}>Ação: {item.action === 'CHECKOUT' ? 'Retirada' : 'Devolução'}</Text>
      <Text style={styles.historyText}>
        Data: {new Date(item.movement_date).toLocaleString()}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Relatório de Movimentação</Text>

      <TextInput
        style={styles.input}
        placeholder="Data inicial (YYYY-MM-DD)"
        value={startDate}
        onChangeText={setStartDate}
        placeholderTextColor="#94a3b8"
      />
      <TextInput
        style={styles.input}
        placeholder="Data final (YYYY-MM-DD)"
        value={endDate}
        onChangeText={setEndDate}
        placeholderTextColor="#94a3b8"
      />
      <TextInput
        style={styles.input}
        placeholder="Nome do usuário (ou vazio para todos)"
        value={userFilter}
        onChangeText={setUserFilter}
        placeholderTextColor="#94a3b8"
      />

      <TouchableOpacity style={styles.filterButton} onPress={fetchHistory}>
        <Text style={styles.buttonText}>Filtrar</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.exportButton} onPress={generateExcel}>
        <Icon name="file-download" size={20} color="#fff" />
        <Text style={styles.buttonText}> Exportar para XLSX</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color="#22d3ee" />
      ) : (
        <FlatList
          data={history}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.emptyText}>Nenhum registro encontrado.</Text>}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 25,
    paddingTop: 80,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#e2e8f0',
    textAlign: 'center',
    marginBottom: 30,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
  },
  input: {
    width: '100%',
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    color: '#ffffff',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#334155',
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  filterButton: {
    backgroundColor: '#22d3ee',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  exportButton: {
    flexDirection: 'row',
    backgroundColor: '#f43f5e',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
    shadowColor: '#f43f5e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  historyItem: {
    backgroundColor: '#1e293b',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  historyText: {
    color: '#cbd5e1',
    fontSize: 15,
    marginBottom: 6,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 18,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 30,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 30,
  },
});