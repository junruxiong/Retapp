import { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import {
  RTCPeerConnection,
  RTCSessionDescription,
  mediaDevices,
} from "react-native-webrtc";
import AnimatedMeshGradientView from "@/components/AnimatedMeshGradient";
import { Link } from "expo-router";
import SettingsMenu from "@/components/SettingsMenu";
import { Voice } from "@/types";

export default function App() {
  const [transcript, setTranscript] = useState("");
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [voice, setVoice] = useState<Voice>(Voice.ALLOY);
  const [isLoading, setIsLoading] = useState(false);
  const pc = useRef<RTCPeerConnection | null>(null);
  const dc = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null | any>(null);

  const startCall = async () => {
    if (isCallActive || pc.current || isLoading) return;

    setIsLoading(true);

    try {
      // 1) fetch ephemeral key
      // Fetch the session data and handle potential undefined values
      const response = await fetch(
        `http://192.168.0.120:8081/api/session?voice=${voice}`
        // `https://quickcall.expo.app/api/session?voice=${voice}` // In production use your deployed url
      ).then((r) => r.json());
      console.log("response", response);
      // Check if client_secret exists and has a value property
      if (!response.client_secret || !response.client_secret.value) {
        console.error("Failed to get valid API key from session", response);
        throw new Error("Failed to get valid API key from session");
      }

      const key = response.client_secret.value;

      // 2) make PeerConnection
      pc.current = new RTCPeerConnection();
      dc.current = pc.current.createDataChannel("oai-events");
      dc.current.onmessage = ({ data }: { data: string }) => {
        try {
          const event = JSON.parse(data);
          console.log("Event:", JSON.stringify(event, null, 2));

          // Update transcript for both delta updates and completed transcripts
          if (event.type === "response.audio_transcript.delta" && event.delta) {
            setTranscript((prev) => prev + event.delta);
          } else if (
            event.type === "response.audio_transcript.done" &&
            event.transcript
          ) {
            setTranscript(event.transcript);
          }
        } catch (error) {
          console.error("Error parsing event data:", error);
        }
      };

      // 3) add mic audio
      const stream = await mediaDevices.getUserMedia({ audio: true });
      stream
        .getTracks()
        .forEach((track) => pc.current!.addTrack(track, stream));

      // 4) offer → SDP POST
      const offer = await pc.current.createOffer({});
      await pc.current.setLocalDescription(offer);
      const res = await fetch(
        `https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/sdp",
          },
          body: offer.sdp,
        }
      );
      const answerSdp = await res.text();
      await pc.current.setRemoteDescription(
        new RTCSessionDescription({ type: "answer", sdp: answerSdp })
      );

      setIsCallActive(true);
      setCallDuration(0);

      // Start the timer
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error starting call:", error);
      // @ts-ignore
      alert("Error starting call: " + error?.message);
      if (pc.current) {
        pc.current.close();
        pc.current = null;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const endCall = () => {
    if (pc.current) {
      pc.current.close();
      pc.current = null;
    }
    setIsCallActive(false);
    setTranscript("");

    // Clear the timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Format seconds into MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  useEffect(() => {
    return () => {
      if (pc.current) {
        pc.current.close();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return (
    <AnimatedMeshGradientView>
      <View style={styles.container}>
        <SettingsMenu voice={voice} setVoice={setVoice} />
        <View
          style={{
            flexDirection: "row",
            gap: 10,
            alignItems: "center",
          }}
        >
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>
              {isCallActive ? formatTime(callDuration) : "00:00"}
            </Text>
          </View>
          {/* <Pressable
            style={[styles.timerContainer, { justifyContent: "center" }]}
          >
            <IconSymbol name="gearshape" size={20} color="white" />
          </Pressable> */}
        </View>
        <Image
          style={styles.logo}
          source={require("../assets/images/icon.png")}
          placeholder={{ blurhash: "L3C00000" }}
          contentFit="contain"
          transition={1000}
        />
        <Text style={styles.title}>
          <Text style={styles.firstLetter}>Q</Text>
          <Text style={styles.restOfText}>uickCall</Text>
        </Text>
        <Text style={{ color: "white", fontSize: 14 }}>
          Voice: {voice.charAt(0).toUpperCase() + voice.slice(1)}
        </Text>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {transcript && (
          <View
            style={{
              paddingHorizontal: 50,
              maxHeight: 200,
            }}
          >
            <View style={{}}>
              {[1, 2].map((i) => (
                <View
                  key={i}
                  style={{
                    width: 10 * i,
                    height: 10 * i,
                    top: -5 * i,
                    left: 10 * i,
                    backgroundColor: "white",
                    borderRadius: 10 * i,
                  }}
                />
              ))}
            </View>
            <View style={styles.thoughtContainer}>
              <Text style={styles.transcript}>{transcript}</Text>
            </View>
          </View>
        )}

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {isCallActive ? (
          <TouchableOpacity
            style={[styles.callButton, styles.endCallButton]}
            onPress={endCall}
          >
            <Text style={styles.buttonText}>End Call</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.callButton,
              styles.startCallButton,
              isLoading && styles.loadingButton,
            ]}
            onPress={startCall}
            disabled={isLoading}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="white" size="small" />
                <Text style={styles.buttonText}>Connecting...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Start Call</Text>
            )}
          </TouchableOpacity>
        )}
        <Text style={{ color: "white", fontSize: 12 }}>
          Made with ❤️ by{" "}
          <Link href="https://codewithbeto.dev" style={{ color: "orange" }}>
            codewithbeto.dev
          </Link>
        </Text>

        {/* Spacer */}
        <View style={{ flex: 1 }} />
      </View>
    </AnimatedMeshGradientView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    ...StyleSheet.absoluteFillObject,
  },
  logo: {
    width: 100,
    height: 100,
    marginTop: 10,
    borderRadius: 50,
  },
  title: {
    fontWeight: "bold",
    color: "white",
    flexDirection: "row",
  },
  firstLetter: {
    fontSize: 60,
    fontWeight: "600",
    color: "white",
  },
  restOfText: {
    fontSize: 50,
    fontWeight: "600",
    color: "white",
  },
  transcript: {
    color: "#3100CD",
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  callButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "white",
    marginVertical: 20,
  },
  startCallButton: {
    backgroundColor: "rgba(0, 150, 0, .5)",
  },
  endCallButton: {
    backgroundColor: "rgba(200, 0, 0, 0.5)",
  },
  loadingButton: {
    opacity: 0.8,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  timerContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    marginTop: 40,
    marginBottom: 10,
  },
  timerText: {
    color: "white",
    fontSize: 20,
    fontWeight: "600",
  },
  thoughtContainer: {
    top: -12,
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: 20, // stays large
  },
});
