import { Tabs } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ProductLayout = () => {
  return (
    <SafeAreaView>
      <Tabs>
        <Tabs.Screen
          name="[slug]"
          options={({ navigation }) => ({
            headerShown: false,
            headerLeft: () => (
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color="black" />
              </TouchableOpacity>
            ),
          })}
        />
      </Tabs>
    </SafeAreaView>
  );
};

export default ProductLayout;
