/**
 * Expo Config Plugin: WebRTC Audio Configuration
 *
 * This plugin configures the iOS app to properly handle WebRTC audio sessions.
 * It specifically:
 *  - Sets up audio to use the speaker by default (instead of the earpiece)
 *  - Configures audio session for playAndRecord with videoChat mode
 *  - Allows audio mixing with other apps (.mixWithOthers)
 *  - Enables ducking other audio sources (.duckOthers)
 *  - Properly handles locking/unlocking the audio configuration
 *
 * The plugin injects Swift code into the AppDelegate.swift file during
 * the Expo prebuild process to ensure proper WebRTC audio routing.
 */

// withWebRTCAudioConfig.js
const { withAppDelegate } = require("@expo/config-plugins");

module.exports = function withWebRTCAudioConfig(config) {
  return withAppDelegate(config, (config) => {
    // Get the AppDelegate contents
    let appDelegateContents = config.modResults.contents;

    // Add imports if they don't exist
    if (!appDelegateContents.includes("import AVFoundation")) {
      appDelegateContents = appDelegateContents.replace(
        /import Expo/,
        "import Expo\nimport AVFoundation"
      );
    }

    if (!appDelegateContents.includes("import WebRTC")) {
      appDelegateContents = appDelegateContents.replace(
        /import AVFoundation/,
        "import AVFoundation\nimport WebRTC"
      );
    }

    // Find the application method using a more flexible regex
    // This pattern is much more flexible with whitespace and parameter formatting
    const appMethodRegex =
      /public\s+override\s+func\s+application[\s\S]*?didFinishLaunchingWithOptions[\s\S]*?{/;
    const match = appDelegateContents.match(appMethodRegex);

    if (!match) {
      console.error(
        "Could not find application method in AppDelegate.swift. Current content:",
        appDelegateContents
      );
      throw new Error("Could not find application method in AppDelegate.swift");
    }

    // The end of the matched string is where we want to insert our code
    const insertIndex = match.index + match[0].length;

    // Check if our audio config is already there
    if (!appDelegateContents.includes("// WebRTC Audio Configuration")) {
      // Define the WebRTC audio configuration code to insert
      const webRTCConfig = `
    // WebRTC Audio Configuration
    let audioConfiguration = RTCAudioSessionConfiguration.webRTC()
    
    // Set category and mode for WebRTC
    audioConfiguration.category = AVAudioSession.Category.playAndRecord.rawValue
    audioConfiguration.mode = AVAudioSession.Mode.videoChat.rawValue
    audioConfiguration.categoryOptions = [.mixWithOthers, .duckOthers, .defaultToSpeaker]
    
    // Apply the configuration
    let rtcAudioSession = RTCAudioSession.sharedInstance()
    rtcAudioSession.lockForConfiguration()
    do {
      try rtcAudioSession.setConfiguration(audioConfiguration)
    } catch let error {
      print("Error setting RTCAudioSession configuration: \\(error)")
    }
    rtcAudioSession.unlockForConfiguration()
    `;

      // Insert the WebRTC configuration after the opening brace of the method
      appDelegateContents =
        appDelegateContents.substring(0, insertIndex) +
        webRTCConfig +
        appDelegateContents.substring(insertIndex);
    }

    // Update the AppDelegate contents
    config.modResults.contents = appDelegateContents;

    return config;
  });
};
