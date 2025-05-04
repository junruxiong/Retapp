import asyncio
import json
import os
import uuid
from datetime import datetime, timedelta

import av  # Import av at the top level
import cv2
from aiortc import MediaStreamTrack, RTCPeerConnection, RTCSessionDescription
from aiortc.contrib.media import MediaRelay
from av import VideoFrame
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware

# Set FFmpeg log level to suppress warnings
av.logging.set_level(av.logging.ERROR)  # Only show errors, suppress warnings

app = FastAPI()

# Add CORS middleware for your mobile app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict to your app's domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store active connections and sessions
peer_connections = {}
sessions = {}
relay = MediaRelay()

# Ensure the imgs directory exists
os.makedirs("imgs", exist_ok=True)


# Custom video track receiver
class VideoReceiver(MediaStreamTrack):
    kind = "video"

    def __init__(self, track):
        super().__init__()
        self.track = track
        self.frame_count = 0

    async def recv(self):
        frame = await self.track.recv()
        self.frame_count += 1

        try:
            # Only process every 10th frame to reduce load
            if self.frame_count % 10 == 0:
                # Convert to numpy array if it's a VideoFrame
                if isinstance(frame, VideoFrame):
                    # Log original frame dimensions
                    print(
                        f"Original frame dimensions: {frame.width}x{frame.height}, format: {frame.format.name}"
                    )

                    # Convert to numpy array preserving original dimensions
                    img_frame = frame.to_ndarray(format="bgr24")

                    # Log converted frame dimensions to ensure they match
                    print(
                        f"Converted frame dimensions: {img_frame.shape[1]}x{img_frame.shape[0]}"
                    )

                    # Add timestamp to the frame
                    current_time = datetime.now()
                    new_time = current_time - timedelta(seconds=55)
                    timestamp = new_time.strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]

                    # Add frame dimensions to the saved image
                    dimensions_text = f"{img_frame.shape[1]}x{img_frame.shape[0]}"

                    # Add text to the image
                    cv2.putText(
                        img_frame,
                        timestamp,
                        (10, img_frame.shape[0] - 30),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        1,
                        (0, 255, 0),
                        2,
                        cv2.LINE_AA,
                    )

                    # Add dimensions text
                    cv2.putText(
                        img_frame,
                        dimensions_text,
                        (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        1,
                        (0, 255, 0),
                        2,
                        cv2.LINE_AA,
                    )

                    # Save the frame to disk with original dimensions
                    cv2.imwrite(
                        f"imgs/received_frame_{self.frame_count}.jpg", img_frame
                    )
                    print(
                        f"Saved frame {self.frame_count} to file with dimensions {dimensions_text}"
                    )
        except Exception as e:
            print(f"Error processing video frame: {e}")

        return frame


# Custom audio track receiver
class AudioReceiver(MediaStreamTrack):
    kind = "audio"

    def __init__(self, track):
        super().__init__()
        self.track = track
        self.sample_count = 0

    async def recv(self):
        try:
            frame = await self.track.recv()
            # print("FRAME", frame)
            self.sample_count += 1
            # if self.sample_count % 100 == 0:  # Log less frequently for audio
            #     print(f"Audio frame #{self.sample_count}: {len(frame.samples)} samples")
            # elif self.sample_count <= 10:  # Log first few frames to verify reception
            #     print(
            #         f"Initial audio frame #{self.sample_count}: {len(frame.samples)} samples"
            #     )
            return frame
        except Exception as e:
            print(f"Error in AudioReceiver.recv: {e}")
            # Re-raise to ensure the error is properly handled by WebRTC stack
            raise


@app.post("/api/realtime/sessions")
async def create_session(request: Request):
    body = await request.json()
    print("HHHHHH", body)

    # Extract parameters from request
    model = body.get("model", "default-model")
    voice = body.get("voice", "default-voice")
    instructions = body.get("instructions", "")

    # Media processing options
    process_video = body.get("process_video", True)
    process_audio = body.get("process_audio", True)

    # Create session ID and token
    session_id = str(uuid.uuid4())
    client_secret = str(uuid.uuid4())

    # Store session info
    sessions[session_id] = {
        "client_secret": {"value": client_secret},
        "model": model,
        "voice": voice,
        "instructions": instructions,
        "process_video": process_video,
        "process_audio": process_audio,
        "status": "created",
    }

    return {"session_id": session_id, "client_secret": {"value": client_secret}}


@app.post("/api/realtime")
async def handle_webrtc_offer(request: Request):
    # Validate authorization
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization")

    token = auth_header.replace("Bearer ", "")

    # Find session by token
    session_id = None
    for sid, session in sessions.items():
        if session["client_secret"]["value"] == token:
            session_id = sid
            break

    if not session_id:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get SDP offer from request body
    offer_sdp = await request.body()
    offer_sdp_str = offer_sdp.decode()

    # Create new RTCPeerConnection
    pc = RTCPeerConnection()
    peer_connections[session_id] = pc

    # Set up event handlers
    @pc.on("datachannel")
    def on_datachannel(channel):
        print(f"Data channel established: {channel.label}")

        # Set up keepalive ping to maintain connection
        async def send_keepalive():
            while True:
                try:
                    if channel.readyState == "open":
                        channel.send(json.dumps({"type": "ping"}))
                    await asyncio.sleep(10)  # Send keepalive every 10 seconds
                except Exception as e:
                    print(f"Error in keepalive: {e}")
                    break

        # Start keepalive task
        asyncio.create_task(send_keepalive())

        @channel.on("message")
        def on_message(message):
            if isinstance(message, str):
                print(f"Received message: {message}")
                # Echo messages back - you would replace this with your AI model response
                channel.send(
                    json.dumps(
                        {
                            "type": "response.audio_transcript.delta",
                            "delta": "I received your message",
                        }
                    )
                )

    @pc.on("track")
    def on_track(track):
        print(f"Track received: {track.kind}")
        session = sessions.get(session_id, {})

        try:
            if track.kind == "audio" and session.get("process_audio", True):
                print(f"Processing audio track from {session_id}")
                audio_receiver = AudioReceiver(relay.subscribe(track))
                pc.addTrack(audio_receiver)

                # Store reference to track for cleanup
                if "tracks" not in session:
                    session["tracks"] = []
                session["tracks"].append(audio_receiver)

                # Add event handler for when track ends
                @track.on("ended")
                def on_ended():
                    print(f"Audio track ended from {session_id}")

            if track.kind == "video" and session.get("process_video", True):
                print(f"Processing video track from {session_id}")
                video_receiver = VideoReceiver(relay.subscribe(track))
                pc.addTrack(video_receiver)

                # Store reference to track for cleanup
                if "tracks" not in session:
                    session["tracks"] = []
                session["tracks"].append(video_receiver)

                # Add event handler for when track ends
                @track.on("ended")
                def on_ended():
                    print(f"Video track ended from {session_id}")
        except Exception as e:
            print(f"Error processing track {track.kind}: {e}")

    # Set remote description from offer
    await pc.setRemoteDescription(
        RTCSessionDescription(sdp=offer_sdp_str, type="offer")
    )

    # Create answer
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    # Update session status
    sessions[session_id]["status"] = "connected"

    # Return the SDP answer
    return Response(content=pc.localDescription.sdp, media_type="application/sdp")


@app.on_event("shutdown")
async def on_shutdown():
    # Close all peer connections
    coros = [pc.close() for pc in peer_connections.values()]
    await asyncio.gather(*coros)
    peer_connections.clear()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
