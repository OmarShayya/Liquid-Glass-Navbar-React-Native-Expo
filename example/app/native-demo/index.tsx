import { StyleSheet, Text, View } from 'react-native';
export default function Screen() {
  return <View style={styles.c}><Text style={styles.t}>Home</Text></View>;
}
const styles = StyleSheet.create({ c: { flex: 1, alignItems: 'center', justifyContent: 'center' }, t: { fontSize: 22, fontWeight: '700' } });
