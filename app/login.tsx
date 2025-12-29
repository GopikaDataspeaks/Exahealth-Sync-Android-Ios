import React, { useState } from 'react';
import { Alert, SafeAreaView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card } from '../src/ui/Primitives';
import { emailLogin, sendOtp, verifyOtp } from '../src/network/authClient';

type LoginMode = 'otp' | 'email';

export default function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>('otp');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  const handleSendOtp = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Enter phone number');
      return;
    }
    setSendingOtp(true);
    try {
      await sendOtp(phoneNumber.trim());
      Alert.alert('OTP sent', 'Check your SMS for the code.');
    } catch (err) {
      Alert.alert('Failed to send OTP', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!phoneNumber.trim() || !otp.trim()) {
      Alert.alert('Enter phone number and OTP');
      return;
    }
    setLoading(true);
    try {
      await verifyOtp(phoneNumber.trim(), otp.trim());
      router.replace('/(tabs)/home');
    } catch (err) {
      Alert.alert('OTP login failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Enter email and password');
      return;
    }
    setLoading(true);
    try {
      await emailLogin(email.trim(), password);
      router.replace('/(tabs)/home');
    } catch (err) {
      Alert.alert('Login failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <View style={{ flex: 1, padding: 16, gap: 12, justifyContent: 'center' }}>
        <Text style={{ color: '#e2e8f0', fontSize: 22, fontWeight: '700' }}>
          ExaHealth Login
        </Text>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button
            label="OTP Login"
            onPress={() => setMode('otp')}
            variant={mode === 'otp' ? 'primary' : 'secondary'}
          />
          <Button
            label="Email Login"
            onPress={() => setMode('email')}
            variant={mode === 'email' ? 'primary' : 'secondary'}
          />
        </View>

        {mode === 'otp' ? (
          <Card title="Phone OTP">
            <Text style={{ color: '#cbd5e1' }}>Phone Number</Text>
            <TextInput
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="+91XXXXXXXXXX"
              placeholderTextColor="#64748b"
              style={{
                borderWidth: 1,
                borderColor: '#334155',
                borderRadius: 10,
                padding: 10,
                color: '#e2e8f0',
                marginBottom: 12,
              }}
            />
            <Button
              label={sendingOtp ? 'Sending...' : 'Send OTP'}
              onPress={handleSendOtp}
              disabled={sendingOtp}
              variant="secondary"
              loading={sendingOtp}
            />
            <View style={{ height: 12 }} />
            <Text style={{ color: '#cbd5e1' }}>OTP</Text>
            <TextInput
              value={otp}
              onChangeText={setOtp}
              placeholder="Enter OTP"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              style={{
                borderWidth: 1,
                borderColor: '#334155',
                borderRadius: 10,
                padding: 10,
                color: '#e2e8f0',
                marginBottom: 12,
              }}
            />
            <Button
              label={loading ? 'Verifying...' : 'Verify & Login'}
              onPress={handleVerifyOtp}
              disabled={loading}
              loading={loading}
            />
          </Card>
        ) : (
          <Card title="Email Login">
            <Text style={{ color: '#cbd5e1' }}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              style={{
                borderWidth: 1,
                borderColor: '#334155',
                borderRadius: 10,
                padding: 10,
                color: '#e2e8f0',
                marginBottom: 12,
              }}
            />
            <Text style={{ color: '#cbd5e1' }}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#64748b"
              secureTextEntry
              style={{
                borderWidth: 1,
                borderColor: '#334155',
                borderRadius: 10,
                padding: 10,
                color: '#e2e8f0',
                marginBottom: 12,
              }}
            />
            <Button
              label={loading ? 'Logging in...' : 'Login'}
              onPress={handleEmailLogin}
              disabled={loading}
              loading={loading}
            />
          </Card>
        )}
      </View>
    </SafeAreaView>
  );
}
