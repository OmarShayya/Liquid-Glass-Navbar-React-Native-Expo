import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function Home() {
  return (
    <View style={styles.c}>
      <Text style={styles.h}>Liquid Glass Navbar</Text>
      <Link href="/custom-demo" style={styles.link}>Custom bar (iOS + Android)</Link>
      <Link href="/native-demo" style={styles.link}>Native Apple bar (iOS 26)</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, backgroundColor: '#fff' },
  h: { fontSize: 24, fontWeight: '700' },
  link: { fontSize: 17, color: '#0A84FF' },
});
