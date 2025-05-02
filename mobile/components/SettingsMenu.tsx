import { ContextMenu, Submenu } from "@expo/ui/swift-ui";
import { Button } from '@expo/ui/swift-ui';
import { Picker } from "@expo/ui/swift-ui";
import { Voice } from "@/types";
import { Linking, Platform } from "react-native";

// Helper function to handle platform-specific icons
const getSystemImage = (ios: string, android: string): string => {
  return Platform.OS === 'ios' ? ios : android;
};

export default function SettingsMenu({
  voice,
  setVoice,
}: {
  voice: Voice;
  setVoice: (voice: Voice) => void;
}) {
  return (
    <ContextMenu
      style={{
        position: "absolute",
        top: 0,
        right: 16,
        width: 50,
        height: 50,
      }}
    >
      <ContextMenu.Items>
        <Submenu
          button={
            <Button systemImage={getSystemImage("speaker.wave.3.fill", "volume_up")}>Voice</Button>
          }
        >
          {Object.values(Voice).map((v) => (
            <Button
              key={v}
              onPress={() => setVoice(v)}
              systemImage={v === voice ? getSystemImage("checkmark", "check") : ""}
            >
              {v}
            </Button>
          ))}
        </Submenu>
        <Button
          onPress={() => {
            Linking.openURL("https://x.com/betomoedano");
          }}
          systemImage={getSystemImage("bird", "tag")}
        >
          X (Twitter)
        </Button>
        <Button
          onPress={() => {
            Linking.openURL("https://codewithbeto.dev/learn");
          }}
          systemImage={getSystemImage("book", "menu_book")}
        >
          React Native Course
        </Button>
        <Button
          onPress={() => {
            Linking.openURL("https://codewithbeto.dev");
          }}
          systemImage={getSystemImage("questionmark.circle", "help_outline")}
        >
          About
        </Button>
      </ContextMenu.Items>
      <ContextMenu.Trigger>
        {/* <Pressable
                style={[styles.timerContainer, { justifyContent: "center" }]}
              >
                <IconSymbol name="gearshape" size={20} color="white" />
              </Pressable> */}
        <Button
          color="white"
          systemImage={getSystemImage("gearshape", "settings")}
        >
          {""}
        </Button>
      </ContextMenu.Trigger>
    </ContextMenu>
  );
}
