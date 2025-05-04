import * as React from "react";
import { Image, StyleSheet, View } from "react-native";

const Tingting = ({ size = 100 }) => {
  return (
    <View style={styles.container}>
      <Image
        style={[
          styles.avatar,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
        source={require("../../assets/images/tingting.png")}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  avatar: {
    borderWidth: 2,
    borderColor: "white",
  },
});

export default Tingting;
