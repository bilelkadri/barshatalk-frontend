// video.js - Updated Full Code

// --- Configuration --- 
// Use a variable for the server URL (Point 7)
// Ideally, this value would come from configuration or an injected environment variable
const VIDEO_SERVER_URL = process.env.REACT_APP_VIDEO_SERVER_URL || "https://barshatalk-video-server-1.onrender.com"; 

// --- DOM Elements --- 
const muteBtn = document.getElementById("muteBtn");
const toggleCameraBtn = document.getElementById("toggleCameraBtn");
const nextBtn = document.getElementById("nextBtn");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const localVideoContainer = document.getElementById("localVideoContainer");
const remoteVideoContainer = document.getElementById("remoteVideoContainer");
const localCameraOffEmoji = localVideoContainer?.querySelector(".camera-off-emoji"); // Use optional chaining
const remoteCameraOffEmoji = remoteVideoContainer?.querySelector(".camera-off-emoji"); // Use optional chaining
const loadingCircle = document.getElementById("loadingCircle");
const statusText = document.getElementById("statusText");
const disconnectSound = document.getElementById("disconnectSound");
const userInfoModal = document.getElementById("userInfoModal");
const videoContainer = document.getElementById("videoContainer");
const startChatBtn = document.getElementById("startChatBtn");
const nicknameInput = document.getElementById("nickname");
const birthdayInput = document.getElementById("birthday");
const localNicknameDisplay = document.getElementById("localNickname");
const remoteNicknameDisplay = document.getElementById("remoteNickname");
const generateNicknameBtn = document.getElementById("generateNickname");
const genderButtons = document.querySelectorAll(".gender-button");
const heartBtn = document.getElementById("heartBtn");

// --- State Variables --- 
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let socket = null; // Video chat specific socket
let socketId = null;
let partnerId = null;
let isInitiator = false;
let isConnected = false; // Tracks if currently matched with a partner
let isWaitingForMatch = false; // Tracks if actively waiting for a match
let iceCandidateQueue = [];
let iceServersConfig = [{ urls: "stun:stun.l.google.com:19302" }]; // Default STUN
let userProfile = {
  nickname: "",
  birthday: "",
  gender: "",
};
let isCameraEnabled = true;
let isMicEnabled = true;

// --- Initialization --- 

// Check if we are on the video page by checking for a key element
if (userInfoModal) {
  console.log("Video chat script loaded (v4 - Updated with Error Handling, TURN Fetch, Config).");
  initializeUserProfileModal();
} else {
  console.log("Not on video page, video script inactive.");
}

// --- User Profile Modal Logic --- 
function initializeUserProfileModal() {
  if (!userInfoModal || !nicknameInput || !birthdayInput || !generateNicknameBtn || !startChatBtn || !videoContainer) {
      console.error("One or more user profile modal elements are missing. Cannot initialize.");
      return;
  }
  
  // Set default nickname
  generateRandomNickname();

  // Set default date (18 years ago)
  try {
    const today = new Date();
    const defaultDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    birthdayInput.value = defaultDate.toISOString().split("T")[0];
  } catch (e) {
      console.error("Error setting default birthday:", e);
      // Set to empty or handle error appropriately
      birthdayInput.value = ""; 
  }

  // Gender selection
  genderButtons.forEach(button => {
    button.addEventListener("click", function() {
      genderButtons.forEach(btn => btn.classList.remove("active"));
      this.classList.add("active");
      userProfile.gender = this.getAttribute("data-value");
    });
  });

  // Nickname generator
  generateNicknameBtn.addEventListener("click", generateRandomNickname);

  // Start chat button
  startChatBtn.addEventListener("click", async () => {
    if (validateUserProfile()) {
      saveUserProfile();
      userInfoModal.classList.remove("active");
      videoContainer.style.display = "flex"; // Show video area
      
      // Initialize camera and then WebRTC connection
      const cameraInitialized = await initializeCamera();
      if (cameraInitialized) {
          // Fetch TURN config and then initialize WebRTC/Socket connection
          await fetchIceServersAndConnect(); 
      } else {
          // Handle camera initialization failure (message already shown in initializeCamera)
          // Maybe disable video chat controls if camera failed
          disableVideoControls();
      }
    }
  });

  // Initialize mobile swipe gestures
  initMobileGestures();

  // Initialize heart button
  initHeartButton();

  // Ensure nicknames are hidden initially
  if (localNicknameDisplay) localNicknameDisplay.style.display = "none";
  if (remoteNicknameDisplay) remoteNicknameDisplay.style.display = "none";
  
  // Show the modal initially
  userInfoModal.classList.add("active");
}

function generateRandomNickname() {
  if (!nicknameInput) return;
  const adjectives = ["Cool", "Funky", "Vibrant", "Cosmic", "Epic", "Groovy", "Chill", "Dope", "Lit", "Savage"];
  const animals = ["Lizard", "Tiger", "Panda", "Shark", "Eagle", "Wolf", "Fox", "Dragon", "Unicorn", "Phoenix"];
  const randomNum = Math.floor(Math.random() * 100);
  nicknameInput.value = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${animals[Math.floor(Math.random() * animals.length)]}${randomNum}`;
}

function validateUserProfile() {
  if (!nicknameInput || !birthdayInput) return false;
  if (!nicknameInput.value.trim()) {
    alert("Please enter a nickname");
    return false;
  }
  if (nicknameInput.value.trim().length > 50) {
      alert("Nickname is too long (max 50 characters).");
      return false;
  }
  if (!birthdayInput.value) {
    alert("Please enter your birthday");
    return false;
  }
  if (!userProfile.gender) {
    alert("Please select your gender");
    return false;
  }
  return true;
}

function saveUserProfile() {
  if (!nicknameInput || !birthdayInput) return;
  userProfile.nickname = nicknameInput.value.trim();
  userProfile.birthday = birthdayInput.value;
  // Gender is already set in userProfile by button click
  console.log("User profile saved:", userProfile);
}

// --- Camera and Media --- 

async function initializeCamera() {
  if (!localVideo) {
      console.error("Local video element not found.");
      setStatus("⚠️ Internal Error: Video display missing.");
      return false;
  }
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    console.log("Camera access granted:", localStream.getTracks().map(t => `${t.kind}: ${t.label}`));
    localVideo.srcObject = localStream;
    localVideo.muted = true; // Ensure local video is muted
    isCameraEnabled = true;
    isMicEnabled = true;
    updateMediaButtonStates();
    updateCameraOffEmoji(localCameraOffEmoji, false); // Hide emoji

    // Show local nickname now that camera is ready
    if (localNicknameDisplay) {
      localNicknameDisplay.textContent = userProfile.nickname;
      localNicknameDisplay.style.display = "block";
    }
    return true;
  } catch (err) {
    console.error("Camera access error:", err);
    setStatus(`⚠️ Camera/Mic access denied or failed: ${err.message}`);
    updateCameraOffEmoji(localCameraOffEmoji, true); // Show emoji
    disableVideoControls();
    return false;
  }
}

function updateMediaButtonStates() {
    if (muteBtn) {
        muteBtn.textContent = isMicEnabled ? "Mute Mic" : "Unmute Mic";
    }
    if (toggleCameraBtn) {
        toggleCameraBtn.textContent = isCameraEnabled ? "Hide Camera" : "Show Camera";
    }
}

function updateCameraOffEmoji(emojiElement, show) {
    if (emojiElement) {
        emojiElement.style.display = show ? "block" : "none";
    }
    // Also ensure the corresponding video element is hidden/shown
    if (emojiElement === localCameraOffEmoji && localVideo) {
        localVideo.style.display = show ? "none" : "block";
    }
    if (emojiElement === remoteCameraOffEmoji && remoteVideo) {
        // Remote video display is handled by track events, but emoji can indicate state
    }
}

function toggleMic() {
    if (localStream) {
        const audioTracks = localStream.getAudioTracks();
        if (audioTracks.length > 0) {
            isMicEnabled = !isMicEnabled;
            audioTracks[0].enabled = isMicEnabled;
            console.log(`Microphone ${isMicEnabled ? "enabled" : "disabled"}`);
            updateMediaButtonStates();
        }
    }
}

function toggleCamera() {
    if (localStream) {
        const videoTracks = localStream.getVideoTracks();
        if (videoTracks.length > 0) {
            isCameraEnabled = !isCameraEnabled;
            videoTracks[0].enabled = isCameraEnabled;
            console.log(`Camera ${isCameraEnabled ? "enabled" : "disabled"}`);
            updateMediaButtonStates();
            updateCameraOffEmoji(localCameraOffEmoji, !isCameraEnabled);
            // Optionally: Send camera status to partner?
            // if (socket && isConnected && partnerId) {
            //     socket.emit("cameraStatus", { enabled: isCameraEnabled, to: partnerId });
            // }
        }
    }
}

function disableVideoControls() {
    if (muteBtn) muteBtn.disabled = true;
    if (toggleCameraBtn) toggleCameraBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
    if (heartBtn) heartBtn.disabled = true;
}

function enableVideoControls() {
    if (muteBtn) muteBtn.disabled = false;
    if (toggleCameraBtn) toggleCameraBtn.disabled = false;
    if (nextBtn) nextBtn.disabled = false;
    if (heartBtn) heartBtn.disabled = false;
}

// --- WebRTC and Socket.IO Connection --- 

// Fetches ICE server config from backend (Point 1)
async function fetchIceServersAndConnect() {
  setStatus("🔧 Configuring connection...");
  try {
    const response = await fetch(`${VIDEO_SERVER_URL}/api/turn-credentials`);
    if (response.ok) {
      const config = await response.json();
      if (config && config.iceServers && config.iceServers.length > 0) {
        iceServersConfig = config.iceServers;
        console.log("Fetched ICE server config from backend:", iceServersConfig);
      } else {
        console.warn("Backend returned invalid ICE config, using default STUN only.");
        // iceServersConfig remains the default STUN
      }
    } else {
      console.warn(`Could not fetch TURN credentials from backend (Status: ${response.status}), using default STUN only.`);
      // iceServersConfig remains the default STUN
    }
  } catch (error) {
    console.error("Error fetching TURN credentials:", error);
    setStatus("⚠️ Error fetching connection config. Using default.");
    // iceServersConfig remains the default STUN
  }
  // Proceed to initialize Socket.IO and WebRTC regardless of TURN fetch success
  initializeSocketAndWebRTC();
}

function initializeSocketAndWebRTC() {
  if (!localStream) {
      console.error("Cannot initialize WebRTC: Local stream not available.");
      setStatus("⚠️ Internal Error: Camera not ready.");
      return;
  }
  
  // Initialize remote stream placeholder
  remoteStream = new MediaStream();
  if (remoteVideo) {
      remoteVideo.srcObject = remoteStream;
      remoteVideo.style.display = "none"; // Hide until track received
  } else {
      console.error("Remote video element not found!");
  }
  updateCameraOffEmoji(remoteCameraOffEmoji, true); // Show emoji initially
  showLoadingCircle(true);
  setStatus("⌛ Connecting to video server...");

  // Ensure remote nickname is hidden until connected
  if (remoteNicknameDisplay) remoteNicknameDisplay.style.display = "none";

  // Initialize Socket.IO connection (Point 7)
  try {
      socket = io(VIDEO_SERVER_URL, { 
          withCredentials: true, 
          transports: ["websocket", "polling"], // Explicitly define transports for robustness
          // reconnectionAttempts: 5 // Optional: Limit reconnection attempts
      });
  } catch (error) {
      console.error("Failed to initialize Socket.IO for video:", error);
      setStatus("❌ Critical Error: Cannot connect to video service.");
      disableVideoControls();
      return; // Stop initialization if socket fails
  }

  // --- Socket Event Handlers (Video) --- 

  socket.on("connect", () => {
    socketId = socket.id;
    console.log("Connected to video server with ID:", socketId);
    setStatus("⌛ Waiting for a stranger...");
    isWaitingForMatch = true;
    isConnected = false;
    // Send user profile data with ready signal
    if (userProfile.nickname && userProfile.gender) {
        socket.emit("ready", { 
            nickname: userProfile.nickname,
            gender: userProfile.gender
            // Add birthday/age if needed for matching
        });
    } else {
        console.error("User profile is incomplete, cannot send ready signal.");
        setStatus("⚠️ Error: Profile incomplete.");
    }
    enableVideoControls(); // Enable controls now that we are connected
  });

  // Connection Error Handling (Point 4)
  socket.on("connect_error", (error) => {
    console.error("Video Socket.IO connection error:", error);
    setStatus(`⚠️ Connection error: ${error.message}. Retrying...`);
    disableVideoControls(); // Disable controls during connection issues
    cleanupConnection(); // Clean up WebRTC state on connection failure
  });

  socket.io.on("reconnect_attempt", (attempt) => {
    console.log(`Video reconnect attempt ${attempt}...`);
    setStatus(`⏳ Reconnecting video (${attempt})...`);
  });

  socket.io.on("reconnect_failed", () => {
    console.error("Video reconnection failed.");
    setStatus("❌ Video Reconnection Failed. Please refresh.");
    disableVideoControls();
  });

  socket.io.on("reconnect", (attempt) => {
    console.log(`Video reconnected successfully after ${attempt} attempts.`);
    // Server should handle re-adding to queue upon reconnection if needed
    // For simplicity, we require user to signal ready again after full disconnect/reconnect
    setStatus("✅ Reconnected. Waiting for partner...");
    isWaitingForMatch = true;
    isConnected = false;
    // Re-send ready signal with profile
     if (userProfile.nickname && userProfile.gender) {
        socket.emit("ready", { 
            nickname: userProfile.nickname,
            gender: userProfile.gender
        });
    } 
    enableVideoControls();
  });

  // General Socket Error Handling (Point 4)
  socket.on("error", (err) => {
      console.error("Video chat socket error:", err);
      const errorMessage = (typeof err === "string") ? err : (err.message || "An unknown socket error occurred.");
      setStatus(`⚠️ Socket error: ${errorMessage}`);
      // Consider if cleanup is needed based on error type
  });
  
  // Handle custom system errors from server
  socket.on("system_error", (errorMessage) => {
      console.warn("Video system error from server:", errorMessage);
      setStatus(`⚠️ Server: ${errorMessage}`);
  });

  // Event: Matched with a partner
  socket.on("matched", async (data) => {
    console.log("Matched event received:", data);
    if (!data || !data.partnerId || data.partnerId === socketId) {
      console.warn("Invalid matched event or matched with self. Requesting next.");
      if (socket) socket.emit("next"); // Ask server for another partner
      return;
    }
    
    partnerId = data.partnerId;
    isConnected = true;
    isWaitingForMatch = false;
    isInitiator = data.initiator;
    setStatus("✅ Partner found! Connecting...");
    if(remoteVideoContainer) remoteVideoContainer.classList.add("glow");
    showLoadingCircle(false); // Hide loading circle, connection starts

    // Display partner nickname
    if (data.partnerNickname && remoteNicknameDisplay) {
      remoteNicknameDisplay.textContent = data.partnerNickname;
      remoteNicknameDisplay.style.display = "block";
      console.log("Partner nickname set:", data.partnerNickname);
    } else {
      console.log("No partner nickname in matched event, requesting...");
      if (socket && partnerId) {
        socket.emit("getPartnerInfo", { partnerId: partnerId });
      }
    }

    // Create Peer Connection and start signaling (wrapped in try...catch)
    try {
      createPeerConnection(); // Uses the fetched iceServersConfig

      if (isInitiator) {
        console.log("I am the initiator, creating offer...");
        const offer = await peerConnection.createOffer({ 
            offerToReceiveAudio: true, 
            offerToReceiveVideo: true 
        });
        await peerConnection.setLocalDescription(offer);
        // Send offer after a short delay to ensure partner is ready
        setTimeout(() => {
            if (socket && isConnected && partnerId) { // Check state before sending
                 socket.emit("offer", { offer: peerConnection.localDescription, to: partnerId });
                 console.log("Offer sent to", partnerId);
            }
        }, 500);
      }
    } catch (err) {
      console.error("Error during WebRTC setup (initiator offer):", err);
      setStatus("⚠️ Error setting up video connection.");
      disconnectPartner(false); // Disconnect without notifying server again immediately
    }
  });

  // Event: Received offer from partner
  socket.on("offer", async (data) => {
    if (isInitiator || !data || !data.offer || !data.from) {
        console.warn("Ignoring unexpected offer.", { isInitiator, data });
        return;
    }
    console.log("Offer received from:", data.from);
    
    // Ensure connection state is consistent
    if (!isConnected || partnerId !== data.from) {
        console.log("Received offer but not connected to sender, setting up...");
        partnerId = data.from;
        isConnected = true;
        isWaitingForMatch = false;
        isInitiator = false; // We received the offer
        setStatus("✅ Partner found! Connecting...");
        if(remoteVideoContainer) remoteVideoContainer.classList.add("glow");
        showLoadingCircle(false);
        // Request partner info if needed
        if (socket && partnerId && !remoteNicknameDisplay?.textContent) {
            socket.emit("getPartnerInfo", { partnerId: partnerId });
        }
    }

    try {
      // Create peer connection if it doesn't exist (should exist if matched event was processed)
      if (!peerConnection) {
          console.log("Peer connection doesn't exist, creating...");
          createPeerConnection();
      }
      
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
      console.log("Remote description (offer) set.");
      
      // Process queued candidates immediately
      await processIceQueue();
      
      console.log("Creating answer...");
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      console.log("Local description (answer) set.");
      
      // Send answer after a short delay
      setTimeout(() => {
          if (socket && isConnected && partnerId) { // Check state
              socket.emit("answer", { answer: peerConnection.localDescription, to: partnerId });
              console.log("Answer sent to", partnerId);
          }
      }, 500);

    } catch (err) {
      console.error("Error handling offer / creating answer:", err);
      setStatus("⚠️ Error processing video offer.");
      disconnectPartner(false);
    }
  });

  // Event: Received answer from partner
  socket.on("answer", async (data) => {
    if (!isInitiator || !isConnected || !peerConnection || !data || !data.answer || !data.from || data.from !== partnerId) {
        console.warn("Ignoring unexpected answer.", { isInitiator, isConnected, partnerId, from: data?.from });
        return;
    }
    console.log("Answer received from:", data.from);
    
    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
      console.log("Remote description (answer) set.");
      // Process any queued candidates after setting answer
      await processIceQueue();
    } catch (err) {
      console.error("Error setting remote description (answer):", err);
      setStatus("⚠️ Error processing video answer.");
      disconnectPartner(false);
    }
  });

  // Event: Received ICE candidate from partner
  socket.on("candidate", async (data) => {
    if (!isConnected || !peerConnection || !data || !data.candidate || !data.from || data.from !== partnerId) {
        console.warn("Ignoring unexpected ICE candidate.", { isConnected, partnerId, from: data?.from });
        return;
    }
    // console.log("ICE Candidate received from:", data.from);
    
    try {
      // Queue candidate if remote description is not yet set
      if (!peerConnection.remoteDescription || !peerConnection.remoteDescription.type) {
        console.log("🕒 Queuing ICE candidate (remote description not set)");
        iceCandidateQueue.push(data.candidate);
      } else {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        // console.log("ICE candidate added.");
      }
    } catch (err) {
      // Log warnings for ICE candidate errors, as they are sometimes non-fatal
      console.warn("❗ Error adding received ICE candidate (often ignorable):", err.message);
    }
  });

  // Event: Received reaction from partner
  socket.on("reaction", (data) => {
    if (isConnected && data && data.emoji === "❤️" && data.from === partnerId) {
      console.log(`Received heart reaction from ${data.nickname || partnerId}`);
      showHeartAnimation(); // Trigger local animation display
    }
  });

  // Event: Received partner info (nickname, etc.)
  socket.on("partnerInfo", (data) => {
    if (isConnected && data && data.nickname && remoteNicknameDisplay) {
      console.log("Partner info received:", data);
      remoteNicknameDisplay.textContent = data.nickname;
      remoteNicknameDisplay.style.display = "block";
    }
  });

  // Event: Partner disconnected
  socket.on("partnerDisconnected", () => {
      console.log("Partner disconnected event received from server.");
      disconnectPartner(true); // Disconnect and go back to waiting state
  });

  // Event: Server puts us back in waiting state
  socket.on("waiting", () => {
    console.log("Server put us in waiting state.");
    if (isConnected) {
        // This might happen if the server forces a disconnect/requeue
        cleanupConnection();
    }
    isConnected = false;
    isWaitingForMatch = true;
    isInitiator = false;
    partnerId = null;
    setStatus("⌛ Waiting for a stranger...");
    if(remoteVideoContainer) remoteVideoContainer.classList.remove("glow");
    if(remoteVideo) remoteVideo.style.display = "none";
    updateCameraOffEmoji(remoteCameraOffEmoji, true);
    showLoadingCircle(true);
    if (remoteNicknameDisplay) remoteNicknameDisplay.style.display = "none";
    iceCandidateQueue = []; // Clear queue
  });

}

// --- WebRTC Peer Connection Logic --- 

function createPeerConnection() {
  console.log("Creating Peer Connection with config:", iceServersConfig);
  // Close existing connection if any
  if (peerConnection) {
    console.log("Closing existing Peer Connection before creating new one.");
    peerConnection.close();
    peerConnection = null;
  }
  
  // Ensure remote stream is reset
  if (remoteStream) {
      remoteStream.getTracks().forEach(t => t.stop());
  }
  remoteStream = new MediaStream();
  if(remoteVideo) remoteVideo.srcObject = remoteStream;

  try {
    // Create the connection using the fetched ICE server config (Point 1)
    peerConnection = new RTCPeerConnection({ iceServers: iceServersConfig });

    // Event: ICE Candidate generated locally
    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        // console.log("Local ICE Candidate generated:", event.candidate);
        // Send candidate to the partner via the signaling server
        if (socket && isConnected && partnerId) {
          socket.emit("candidate", { candidate: event.candidate, to: partnerId });
        }
      }
    };

    // Event: Remote track received
    peerConnection.ontrack = event => {
      console.log("Remote track received:", event.track.kind, event.streams[0]);
      if (event.streams && event.streams[0]) {
        event.streams[0].getTracks().forEach(track => {
          console.log(`➡️ Adding track to remoteStream: ${track.kind}`);
          if (remoteStream) remoteStream.addTrack(track);
        });
        // Once tracks are received, show the remote video
        if(remoteVideo) remoteVideo.style.display = "block";
        updateCameraOffEmoji(remoteCameraOffEmoji, false);
        showLoadingCircle(false); // Hide loading circle
      } else {
          // Handle cases where track is added directly (less common now)
          console.log(`➡️ Adding track directly to remoteStream: ${event.track.kind}`);
           if (remoteStream) remoteStream.addTrack(event.track);
           if(remoteVideo) remoteVideo.style.display = "block";
           updateCameraOffEmoji(remoteCameraOffEmoji, false);
           showLoadingCircle(false);
      }
    };

    // Event: ICE Connection State Change
    peerConnection.oniceconnectionstatechange = () => {
      if (!peerConnection) return;
      console.log("ICE Connection State Change:", peerConnection.iceConnectionState);
      switch (peerConnection.iceConnectionState) {
          case "connected":
              setStatus("✅ Connected");
              showLoadingCircle(false);
              break;
          case "disconnected":
              setStatus("⚠️ Connection unstable. Trying to reconnect...");
              // WebRTC might recover automatically
              break;
          case "failed":
              setStatus("❌ Connection failed.");
              disconnectPartner(true); // Disconnect fully on failure
              break;
          case "closed":
              setStatus("Connection closed.");
              // Already handled by disconnectPartner or cleanupConnection
              break;
      }
    };

    // Event: Signaling State Change (for debugging)
    peerConnection.onsignalingstatechange = () => {
        if (!peerConnection) return;
        console.log("Signaling State Change:", peerConnection.signalingState);
    };
    
    // Event: Connection State Change (more comprehensive)
    peerConnection.onconnectionstatechange = () => {
        if (!peerConnection) return;
        console.log("Connection State Change:", peerConnection.connectionState);
         switch (peerConnection.connectionState) {
            case "connected":
                setStatus("✅ Connected");
                showLoadingCircle(false);
                break;
            case "disconnected":
                setStatus("⚠️ Connection lost. Reconnecting...");
                break;
            case "failed":
                setStatus("❌ Connection failed.");
                disconnectPartner(true);
                break;
            case "closed":
                setStatus("Connection closed.");
                break;
        }
    };

    // Add local tracks to the connection (wrapped in try...catch - Point 4)
    if (localStream) {
      localStream.getTracks().forEach(track => {
        try {
          if (peerConnection && !peerConnection.getSenders().some(s => s.track === track)) {
            peerConnection.addTrack(track, localStream);
            console.log(`✔️ Track added to peerConnection: ${track.kind}`);
          }
        } catch (err) {
          console.error(`Error adding track (${track.kind}):`, err);
          setStatus("⚠️ Error adding local video/audio.");
          // Consider disconnecting if adding tracks fails critically
        }
      });
    } else {
        console.error("Cannot add tracks: Local stream is missing.");
        setStatus("⚠️ Internal Error: Camera stream lost.");
    }

  } catch (error) {
      console.error("Failed to create Peer Connection:", error);
      setStatus("⚠️ Critical Error: Cannot create video connection.");
      cleanupConnection();
  }
}

async function processIceQueue() {
    if (!peerConnection || !peerConnection.remoteDescription || !peerConnection.remoteDescription.type) {
        console.log("Cannot process ICE queue: Peer connection or remote description not ready.");
        return;
    }
    if (iceCandidateQueue.length > 0) {
        console.log(`Processing ${iceCandidateQueue.length} queued ICE candidates...`);
        while (iceCandidateQueue.length > 0) {
            const candidate = iceCandidateQueue.shift();
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                // console.log("Queued ICE candidate added.");
            } catch (err) {
                console.warn("❗ Adding queued ICE candidate failed (often ignorable):", err.message);
            }
        }
    }
}

// --- Cleanup and Disconnect Logic --- 

// Main function to handle partner disconnection, resets state
function disconnectPartner(notifyServer) {
  console.log(`Disconnecting partner. Notify server: ${notifyServer}`);
  if (isConnected || peerConnection) { // Only cleanup if actually connected or trying
    if (disconnectSound) {
        disconnectSound.play().catch(e => console.error("Error playing disconnect sound:", e));
    }
    
    cleanupConnection(); // Close WebRTC and streams

    isConnected = false;
    isWaitingForMatch = true; // Go back to waiting state
    isInitiator = false;
    const oldPartnerId = partnerId;
    partnerId = null;
    
    setStatus("❌ Partner disconnected. Waiting...");
    if(remoteVideoContainer) remoteVideoContainer.classList.remove("glow");
    if(remoteVideo) remoteVideo.style.display = "none";
    updateCameraOffEmoji(remoteCameraOffEmoji, true);
    showLoadingCircle(true);
    if (remoteNicknameDisplay) remoteNicknameDisplay.style.display = "none";
    iceCandidateQueue = []; // Clear queue

    // Tell the server we are ready for a new match ONLY if requested
    if (notifyServer && socket && socket.connected) {
        console.log("Notifying server we are ready for next match.");
        // Server expects a "ready" event to re-enter the queue
        if (userProfile.nickname && userProfile.gender) {
             socket.emit("ready", { 
                nickname: userProfile.nickname,
                gender: userProfile.gender
            });
        } else {
             console.error("Cannot signal ready: User profile incomplete.");
             setStatus("⚠️ Error: Profile incomplete.");
        }
    } else if (notifyServer && (!socket || !socket.connected)) {
        console.warn("Cannot notify server for next match: Socket not connected.");
        setStatus("⚠️ Not connected to server. Please refresh?");
    }
  }
}

// Cleans up WebRTC and stream resources
function cleanupConnection() {
    console.log("Cleaning up WebRTC connection and streams...");
    if (peerConnection) {
        peerConnection.onicecandidate = null;
        peerConnection.ontrack = null;
        peerConnection.oniceconnectionstatechange = null;
        peerConnection.onsignalingstatechange = null;
        peerConnection.onconnectionstatechange = null;
        peerConnection.close();
        peerConnection = null;
    }
    if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
        remoteStream = null;
        if(remoteVideo) remoteVideo.srcObject = null;
    }
    // Do NOT stop localStream here, user might want to stay on the page
    iceCandidateQueue = []; // Clear any pending candidates
}

// --- UI Helpers --- 

function setStatus(text) {
  if (statusText) {
    statusText.textContent = text;
    // Reset color unless it indicates an error
    if (text.startsWith("⚠️") || text.startsWith("❌")) {
        statusText.style.color = "#ff4444";
    } else if (text.startsWith("✅")) {
         statusText.style.color = "#00ff00";
    } else {
        statusText.style.color = "#00ffff"; // Default cyan
    }
  }
}

function showLoadingCircle(show) {
    if (loadingCircle) {
        loadingCircle.style.display = show ? "block" : "none";
    }
}

// --- Mobile Gestures --- 
function initMobileGestures() {
  let touchStartY = 0;

  // Add touch listener to remote video container for swipe up = next
  if (remoteVideoContainer) {
      remoteVideoContainer.addEventListener("touchstart", (e) => {
          if (e.touches.length === 1) { // Single touch
              touchStartY = e.touches[0].clientY;
          }
      }, { passive: true });

      remoteVideoContainer.addEventListener("touchend", (e) => {
          if (e.changedTouches.length === 1) { // Single touch
              const touchEndY = e.changedTouches[0].clientY;
              const swipeDistance = touchStartY - touchEndY;
              
              // Check for a significant upward swipe
              if (swipeDistance > 50) { // Threshold of 50px
                  console.log("Swipe up detected on remote video - triggering next.");
                  // Add visual feedback (optional)
                  if(remoteVideoContainer) {
                      remoteVideoContainer.classList.add("swipe-up-transition");
                      setTimeout(() => remoteVideoContainer.classList.remove("swipe-up-transition"), 500);
                  }
                  // Trigger the next button click
                  if (nextBtn && !nextBtn.disabled) {
                      nextBtn.click();
                  }
              }
          }
      });
  }
}

// --- Heart Reaction Logic --- 
function initHeartButton() {
  if (heartBtn) {
    heartBtn.addEventListener("click", () => {
        if (isConnected && socket && partnerId) {
            console.log("Sending heart reaction.");
            // Send reaction to partner via server
            socket.emit("reaction", { 
                emoji: "❤️", 
                to: partnerId,
                // nickname: userProfile.nickname // Server can add nickname based on socket ID
            });
            // Show animation locally immediately
            showHeartAnimation();
        } else {
            console.log("Cannot send heart: Not connected.");
        }
    });
  }
}

function showHeartAnimation() {
  if (!remoteVideoContainer) return;
  const colors = ["heart-pink", "heart-red", "heart-purple", "heart-blue"];
  const heartCount = 3 + Math.floor(Math.random() * 3); // 3-5 hearts

  for (let i = 0; i < heartCount; i++) {
    setTimeout(() => {
      const heartElement = document.createElement("div");
      heartElement.textContent = "❤️";
      heartElement.classList.add("animated-heart");
      const colorClass = colors[Math.floor(Math.random() * colors.length)];
      heartElement.classList.add(colorClass);
      const randomX = Math.random() * 80 + 10; // 10% to 90%
      heartElement.style.left = `${randomX}%`;
      heartElement.style.bottom = "20px";
      const randomSize = 0.8 + Math.random() * 0.4;
      heartElement.style.fontSize = `${50 * randomSize}px`;

      remoteVideoContainer.appendChild(heartElement);

      // Remove after animation
      setTimeout(() => {
        if (remoteVideoContainer.contains(heartElement)) {
          remoteVideoContainer.removeChild(heartElement);
        }
      }, 2000);
    }, i * 150); // Stagger hearts
  }
}

// --- UI Event Listeners Setup --- 
if (muteBtn) muteBtn.onclick = toggleMic;
if (toggleCameraBtn) toggleCameraBtn.onclick = toggleCamera;
if (nextBtn) {
    nextBtn.onclick = () => {
        console.log("Next button clicked.");
        if (socket && socket.connected) {
            // Disconnect current partner and tell server we want the next one
            disconnectPartner(true); 
        } else {
            console.warn("Cannot request next: Socket not connected.");
            setStatus("⚠️ Not connected to server.");
        }
    };
}

// --- Global Error Handling --- 
window.addEventListener("error", (event) => {
    console.error("Unhandled global error:", event.error, event.message);
    // Optionally report critical errors to a logging service
});
window.addEventListener("unhandledrejection", (event) => {
    console.error("Unhandled promise rejection:", event.reason);
});



