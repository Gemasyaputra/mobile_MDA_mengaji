import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertState {
  title: string;
  message: string;
  buttons: AlertButton[];
}

type Listener = (state: AlertState) => void;
let listener: Listener | null = null;

function alert(title: string, message?: string, buttons?: AlertButton[]) {
  listener?.({
    title,
    message: message || '',
    buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }],
  });
}

export const CustomAlert = { alert };

type Variant = 'success' | 'error' | 'warning' | 'info';

function inferVariant(title: string, message: string, buttons: AlertButton[]): Variant {
  if (buttons.some((b) => b.style === 'destructive')) return 'warning';
  const text = `${title} ${message}`.toLowerCase();
  if (/gagal|error|tidak valid|ditolak|kedaluwarsa|tidak ditemukan|❌/.test(text)) return 'error';
  if (/berhasil|sukses|tersimpan|selamat|🎉|✅/.test(text)) return 'success';
  return 'info';
}

const VARIANT_CONFIG: Record<Variant, { icon: string; color: string; bg: string }> = {
  success: { icon: 'check-circle', color: '#059669', bg: '#ECFDF5' },
  error: { icon: 'x-circle', color: '#DC2626', bg: '#FEF2F2' },
  warning: { icon: 'alert-triangle', color: '#D97706', bg: '#FFFBEB' },
  info: { icon: 'info', color: '#059669', bg: '#ECFDF5' },
};

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<AlertState>({ title: '', message: '', buttons: [] });

  useEffect(() => {
    listener = (s) => {
      setState(s);
      setVisible(true);
    };
    return () => {
      listener = null;
    };
  }, []);

  const close = () => setVisible(false);

  const handlePress = (btn: AlertButton) => {
    close();
    setTimeout(() => btn.onPress?.(), 150);
  };

  const variant = inferVariant(state.title, state.message, state.buttons);
  const config = VARIANT_CONFIG[variant];
  const isColumn = state.buttons.length > 2;

  return (
    <>
      {children}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={[styles.iconCircle, { backgroundColor: config.bg }]}>
              <Feather name={config.icon as any} size={26} color={config.color} />
            </View>
            {!!state.title && <Text style={styles.title}>{state.title}</Text>}
            {!!state.message && <Text style={styles.message}>{state.message}</Text>}
            <View style={[styles.buttonRow, isColumn && styles.buttonColumn]}>
              {state.buttons.map((btn, i) => {
                const isCancel = btn.style === 'cancel';
                const isDestructive = btn.style === 'destructive';
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.button,
                      isColumn ? { width: '100%' } : { flex: 1 },
                      isCancel && styles.buttonCancel,
                      isDestructive && styles.buttonDestructive,
                      !isCancel && !isDestructive && styles.buttonPrimary,
                    ]}
                    onPress={() => handlePress(btn)}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        isCancel && styles.buttonTextCancel,
                        isDestructive && styles.buttonTextDestructive,
                        !isCancel && !isDestructive && styles.buttonTextPrimary,
                      ]}
                    >
                      {btn.text || 'OK'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  message: {
    fontSize: 13.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  buttonColumn: {
    flexDirection: 'column',
  },
  button: {
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: { backgroundColor: '#059669' },
  buttonCancel: { backgroundColor: '#F1F5F9' },
  buttonDestructive: { backgroundColor: '#FEF2F2' },
  buttonText: { fontSize: 14, fontWeight: 'bold' },
  buttonTextPrimary: { color: '#FFFFFF' },
  buttonTextCancel: { color: '#475569' },
  buttonTextDestructive: { color: '#DC2626' },
});
