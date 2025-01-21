import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lrgqgvmzcjeorhlqgjir.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyZ3Fndm16Y2plb3JobHFnamlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4NTIwMjYsImV4cCI6MjA1MjQyODAyNn0.GxB8cq5y8OPt-Ma5nWgH0IcDTqyCI1UArCVmNDUgKlU'


export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})