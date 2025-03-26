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
import { Buffer } from 'buffer';
import ExcelJS from 'exceljs'; // Instale com: npm install exceljs

type KeyHistory = {
  id: string;
  key_id: string;
  user_id: string | null;
  action: 'retirada' | 'devolução';
  timestamp: string;
  key?: { name: string };
  user?: { full_name: string } | null;
};

export default function KeyHistoryScreen() {
  const [history, setHistory] = useState<KeyHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [userFilter, setUserFilter] = useState(''); // Deixe vazio para "todos"

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    try {
      setLoading(true);
      let query = supabase
        .from('key_history')
        .select('id, key_id, user_id, action, timestamp, keys(name), profiles!user_id(full_name)')
        .order('timestamp', { ascending: false });

      if (startDate) query = query.gte('timestamp', startDate);
      if (endDate) query = query.lte('timestamp', `${endDate}T23:59:59Z`);
      if (userFilter) query = query.eq('user_id', userFilter);

      const { data, error } = await query;

      if (error) throw error;

      const formattedData: KeyHistory[] = (data || []).map((item: any) => ({
        id: item.id,
        key_id: item.key_id,
        user_id: item.user_id,
        action: item.action,
        timestamp: item.timestamp,
        key: item.keys ? { name: item.keys.name } : undefined,
        user: item.profiles ? { full_name: item.profiles.full_name } : null,
      }));

      setHistory(formattedData);
    } catch (error) {
      console.log('Error fetching history:', error);
      showToast('error', 'Erro ao carregar o histórico.');
    } finally {
      setLoading(false);
    }
  }

  async function generateExcel() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Relatório de Movimentação');

    worksheet.columns = [
      { header: 'Chave', key: 'key_name', width: 20 },
      { header: 'Usuário', key: 'user_name', width: 20 },
      { header: 'Ação', key: 'action', width: 15 },
      { header: 'Data/Hora', key: 'timestamp', width: 25 },
    ];

    history.forEach((entry) => {
      worksheet.addRow({
        key_name: entry.key?.name || 'Desconhecida',
        user_name: entry.user?.full_name || 'Ninguém',
        action: entry.action,
        timestamp: new Date(entry.timestamp).toLocaleString(),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const fileUri = `${FileSystem.documentDirectory}relatorio_movimentacao.xlsx`;
    await FileSystem.writeAsStringAsync(fileUri, Buffer.from(buffer).toString('base64'), {
      encoding: FileSystem.EncodingType.Base64,
    });

    await Sharing.shareAsync(fileUri);
    showToast('success', 'Relatório gerado e compartilhado!');
  }

  const renderHistoryItem = ({ item }: { item: KeyHistory }) => (
    <View style={styles.historyItem}>
      <Text style={styles.historyText}>Chave: {item.key?.name || 'Desconhecida'}</Text>
      <Text style={styles.historyText}>Usuário: {item.user?.full_name || 'Ninguém'}</Text>
      <Text style={styles.historyText}>Ação: {item.action}</Text>
      <Text style={styles.historyText}>
        Data: {new Date(item.timestamp).toLocaleString()}
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
        placeholderTextColor="#999"
      />
      <TextInput
        style={styles.input}
        placeholder="Data final (YYYY-MM-DD)"
        value={endDate}
        onChangeText={setEndDate}
        placeholderTextColor="#999"
      />
      <TextInput
        style={styles.input}
        placeholder="ID do usuário (ou vazio para todos)"
        value={userFilter}
        onChangeText={setUserFilter}
        placeholderTextColor="#999"
      />

      <TouchableOpacity style={styles.filterButton} onPress={fetchHistory}>
        <Text style={styles.buttonText}>Filtrar</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.exportButton} onPress={generateExcel}>
        <Icon name="file-download" size={20} color="#fff" />
        <Text style={styles.buttonText}>Exportar para Excel</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color="#ffffff" />
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
    backgroundColor: '#1a2a44',
    padding: 20,
    paddingTop: 70,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#2e4066',
    color: '#ffffff',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#3b517a',
  },
  filterButton: {
    backgroundColor: '#34d399',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  exportButton: {
    flexDirection: 'row',
    backgroundColor: '#f87171',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  historyItem: {
    backgroundColor: '#2e4066',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  historyText: {
    color: '#d1d5db',
    fontSize: 14,
    marginBottom: 5,
  },
  emptyText: {
    fontSize: 16,
    color: '#d1d5db',
    textAlign: 'center',
    marginTop: 20,
  },
  listContent: {
    paddingBottom: 20,
  },
});