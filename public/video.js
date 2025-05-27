// video.js - Corrected Code

// --- Configuration --- 
// Use the direct URL for the video chat server
const VIDEO_SERVER_URL = "https://barshatalk-video-server.onrender.com"; 

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
// const disconnectSound = document.getElementById("disconnectSound"); // Sound commented out
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
  console.log("Video chat script loaded (v5 - Corrected Server URL).");
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
    // Use the direct URL here
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
      // Use the direct URL here
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
    } else {
      // Fallback if nickname not received
      remoteNicknameDisplay.textContent = "Stranger";
      remoteNicknameDisplay.style.display = "block";
    }

    // Create Peer Connection
    createPeerConnection();

    // If initiator, create offer
    if (isInitiator) {
      try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        console.log("Created offer and set local description");
        socket.emit("offer", { offer: offer, to: partnerId });
        console.log("Sent offer to partner:", partnerId);
      } catch (error) {
        console.error("Error creating offer:", error);
        setStatus("⚠️ Error starting connection (offer).");
        cleanupConnection();
      }
    }
    // Process any queued ICE candidates
    processIceCandidateQueue();
  });

  // Event: Waiting for partner
  socket.on("waiting", () => {
    console.log("Server put client in waiting state.");
    setStatus("⏳ Waiting for a stranger...");
    isWaitingForMatch = true;
    isConnected = false;
    partnerId = null;
    showLoadingCircle(true);
    if(remoteVideoContainer) remoteVideoContainer.classList.remove("glow");
    if (remoteNicknameDisplay) remoteNicknameDisplay.style.display = "none";
    // Clean up previous connection if any
    cleanupConnection(false); // Don't reset status text
  });

  // Event: Received offer from partner
  socket.on("offer", async (data) => {
    if (!data || !data.offer || !data.from || data.from !== partnerId || isInitiator) {
        console.warn("Ignoring invalid or unexpected offer:", data);
        return;
    }
    console.log("Received offer from partner:", partnerId);
    if (!peerConnection) {
        createPeerConnection();
    }
    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
      console.log("Set remote description (offer)");
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      console.log("Created answer and set local description");
      socket.emit("answer", { answer: answer, to: partnerId });
      console.log("Sent answer to partner:", partnerId);
      processIceCandidateQueue(); // Process any queued candidates after setting descriptions
    } catch (error) {
      console.error("Error handling offer:", error);
      setStatus("⚠️ Error handling connection (offer).");
      cleanupConnection();
    }
  });

  // Event: Received answer from partner
  socket.on("answer", async (data) => {
    if (!data || !data.answer || !data.from || data.from !== partnerId || !isInitiator) {
        console.warn("Ignoring invalid or unexpected answer:", data);
        return;
    }
    console.log("Received answer from partner:", partnerId);
    if (!peerConnection) {
      console.error("Received answer but no peer connection exists!");
      return;
    }
    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
      console.log("Set remote description (answer)");
      processIceCandidateQueue(); // Process any queued candidates after setting descriptions
    } catch (error) {
      console.error("Error handling answer:", error);
      setStatus("⚠️ Error handling connection (answer).");
      cleanupConnection();
    }
  });

  // Event: Received ICE candidate from partner
  socket.on("candidate", async (data) => {
    if (!data || !data.candidate || !data.from || data.from !== partnerId) {
        console.warn("Ignoring invalid or unexpected candidate:", data);
        return;
    }
    console.log("Received ICE candidate from partner:", partnerId);
    try {
      const candidate = new RTCIceCandidate(data.candidate);
      if (peerConnection && peerConnection.remoteDescription) {
        await peerConnection.addIceCandidate(candidate);
        console.log("Added received ICE candidate");
      } else {
        // Queue candidate if peer connection or remote description isn't ready yet
        iceCandidateQueue.push(candidate);
        console.log("Queued received ICE candidate");
      }
    } catch (error) {
      // Ignore benign errors like candidate already added or state preventing addition
      if (!error.message.includes("Cannot add ICE candidate") && !error.message.includes("Error processing ICE candidate")) {
           console.error("Error adding received ICE candidate:", error);
      }
    }
  });

  // Event: Partner disconnected
  socket.on("partnerDisconnected", () => {
    console.log("Partner disconnected event received.");
    setStatus("❌ Partner disconnected. Waiting...");
    if(remoteVideoContainer) remoteVideoContainer.classList.remove("glow");
    if (remoteNicknameDisplay) remoteNicknameDisplay.style.display = "none";
    // Commented out sound
    // if (disconnectSound) {
    //     disconnectSound.play().catch(e => console.error("Error playing disconnect sound:", e));
    // }
    cleanupConnection();
    // Server should automatically put this client in waiting state
    isWaitingForMatch = true;
    showLoadingCircle(true);
  });

  // Event: Received reaction from partner
  socket.on("reaction", (reactionData) => {
      if (reactionData && reactionData.type === "heart") {
          showFloatingEmoji("❤️", true); // Show on remote side
      }
      // Add more reaction types if needed
  });

}

// --- WebRTC Peer Connection Logic --- 

function createPeerConnection() {
  if (peerConnection) {
    console.log("Closing existing peer connection before creating new one.");
    peerConnection.close();
    peerConnection = null;
  }
  console.log("Creating new PeerConnection with config:", iceServersConfig);
  try {
    peerConnection = new RTCPeerConnection({ iceServers: iceServersConfig });

    // Event: ICE candidate generated
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket && partnerId) {
        console.log("Generated ICE candidate, sending to partner:", partnerId);
        socket.emit("candidate", { candidate: event.candidate, to: partnerId });
      } else if (!event.candidate) {
          console.log("ICE gathering finished.");
      }
    };

    // Event: ICE connection state change
    peerConnection.oniceconnectionstatechange = () => {
      if (!peerConnection) return;
      console.log("ICE connection state change:", peerConnection.iceConnectionState);
      switch (peerConnection.iceConnectionState) {
        case "connected":
          setStatus("🟢 Connected!");
          isConnected = true;
          isWaitingForMatch = false;
          showLoadingCircle(false);
          break;
        case "disconnected":
          setStatus("⚠️ Connection lost? Trying to reconnect...");
          // Rely on socket disconnect or higher-level logic to handle this fully
          break;
        case "failed":
          setStatus("❌ Connection failed.");
          console.error("ICE connection failed.");
          cleanupConnection();
          // Ask server for a new partner after a short delay?
          // setTimeout(() => { if (socket) socket.emit("next"); }, 1000);
          break;
        case "closed":
          console.log("ICE connection closed.");
          // Cleanup is usually handled elsewhere
          break;
      }
    };

    // Event: Track received from remote peer
    peerConnection.ontrack = (event) => {
      console.log("Track received from remote peer:", event.track, event.streams);
      if (event.streams && event.streams[0]) {
        // Add track to the remote stream
        remoteStream.addTrack(event.track);
        if (remoteVideo) {
            remoteVideo.srcObject = remoteStream; // Re-assign in case it was null
            remoteVideo.style.display = "block"; // Show remote video element
            updateCameraOffEmoji(remoteCameraOffEmoji, false); // Hide emoji
        } else {
            console.error("Remote video element missing when track received!");
        }
      } else {
          // Handle cases where track might not have a stream (less common)
          console.warn("Received track without an associated stream:", event.track);
          // You might need to manually create a stream and add the track
          // remoteStream.addTrack(event.track);
          // if (remoteVideo) remoteVideo.srcObject = remoteStream;
      }
      
      // Handle remote camera on/off based on track state?
      event.track.onmute = () => {
          console.log("Remote track muted:", event.track.kind);
          if (event.track.kind === "video") {
              updateCameraOffEmoji(remoteCameraOffEmoji, true);
              if (remoteVideo) remoteVideo.style.display = "none";
          }
      };
      event.track.onunmute = () => {
          console.log("Remote track unmuted:", event.track.kind);
          if (event.track.kind === "video") {
              updateCameraOffEmoji(remoteCameraOffEmoji, false);
               if (remoteVideo) remoteVideo.style.display = "block";
          }
      };
    };

    // Add local tracks to the connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        try {
            peerConnection.addTrack(track, localStream);
            console.log(`Added local ${track.kind} track to peer connection.`);
        } catch (error) {
            console.error(`Error adding local ${track.kind} track:`, error);
        }
      });
    } else {
        console.error("Cannot add tracks: Local stream is not available.");
    }

  } catch (error) {
    console.error("Error creating PeerConnection:", error);
    setStatus("❌ Error creating connection.");
    cleanupConnection();
  }
}

function processIceCandidateQueue() {
    if (!peerConnection || !peerConnection.remoteDescription) {
        // console.log("Cannot process ICE queue yet, peer connection or remote description not ready.");
        return;
    }
    while (iceCandidateQueue.length > 0) {
        const candidate = iceCandidateQueue.shift();
        console.log("Processing queued ICE candidate");
        peerConnection.addIceCandidate(candidate).catch(error => {
            // Ignore benign errors
            if (!error.message.includes("Cannot add ICE candidate") && !error.message.includes("Error processing ICE candidate")) {
                 console.error("Error adding queued ICE candidate:", error);
            }
        });
    }
}

function cleanupConnection(resetStatus = true) {
  console.log("Cleaning up connection...");
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  if (remoteVideo && remoteVideo.srcObject) {
    // Stop remote tracks
    remoteVideo.srcObject.getTracks().forEach(track => track.stop());
    remoteVideo.srcObject = null; 
    remoteVideo.style.display = "none";
  }
  updateCameraOffEmoji(remoteCameraOffEmoji, true);
  if(remoteVideoContainer) remoteVideoContainer.classList.remove("glow");
  if (remoteNicknameDisplay) remoteNicknameDisplay.style.display = "none";

  iceCandidateQueue = []; // Clear any pending candidates
  partnerId = null;
  isConnected = false;
  isInitiator = false;
  // Don't reset isWaitingForMatch here, let server events control it
  if (resetStatus) {
      setStatus("⌛ Waiting for a stranger...");
      showLoadingCircle(true);
  }
}

function setStatus(text) {
  if (statusText) {
    statusText.textContent = text;
    // Reset color unless it's an error/warning
    if (text.includes("❌") || text.includes("⚠️")) {
        statusText.style.color = "#ff4444"; // Red for errors
    } else if (text.includes("✅") || text.includes("🟢")) {
        statusText.style.color = "#00ff00"; // Green for success
    } else {
        statusText.style.color = "#00ffff"; // Default cyan
    }
  } else {
      console.log("Status:", text); // Fallback if element not found
  }
}

function showLoadingCircle(show) {
    if (loadingCircle) {
        loadingCircle.style.display = show ? "block" : "none";
    }
}

// --- UI Event Listeners --- 
if (muteBtn) {
    muteBtn.addEventListener("click", toggleMic);
} else {
    console.error("Mute button (muteBtn) not found!");
}

if (toggleCameraBtn) {
    toggleCameraBtn.addEventListener("click", toggleCamera);
} else {
    console.error("Toggle Camera button (toggleCameraBtn) not found!");
}

if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (!socket || !socket.connected) {
          setStatus("⚠️ Cannot request next: Not connected.");
          return;
      }
      console.log("Next button clicked");
      setStatus("🏃 Finding next partner...");
      if(remoteVideoContainer) remoteVideoContainer.classList.remove("glow");
      if (remoteNicknameDisplay) remoteNicknameDisplay.style.display = "none";
      // Commented out sound
      // if (disconnectSound) {
      //     disconnectSound.play().catch(e => console.error("Error playing disconnect sound:", e));
      // }
      cleanupConnection(false); // Clean up old connection, keep status text
      socket.emit("next");
      isWaitingForMatch = true;
      showLoadingCircle(true);
    });
} else {
    console.error("Next button (nextBtn) not found!");
}

// --- Mobile Gestures --- 
function initMobileGestures() {
    let touchstartX = 0;
    let touchendX = 0;
    const gestureZone = document.body; // Or a specific container

    gestureZone.addEventListener('touchstart', function(event) {
        touchstartX = event.changedTouches[0].screenX;
    }, false);

    gestureZone.addEventListener('touchend', function(event) {
        touchendX = event.changedTouches[0].screenX;
        handleGesture();
    }, false); 

    function handleGesture() {
        if (touchendX < touchstartX - 50) { // Swipe Left
            console.log('Swiped left');
            if (nextBtn && !nextBtn.disabled) {
                nextBtn.click(); // Simulate next button click
            }
        }
        // Add swipe right if needed
        // if (touchendX > touchstartX + 50) { 
        //     console.log('Swiped right');
        // }
    }
}

// --- Heart Button --- 
function initHeartButton() {
    if (!heartBtn) return;
    heartBtn.addEventListener("click", () => {
        if (socket && isConnected && partnerId) {
            socket.emit("reaction", { type: "heart", to: partnerId });
            showFloatingEmoji("❤️", false); // Show locally immediately
        }
    });
}

function showFloatingEmoji(emoji, isRemote) {
    const container = isRemote ? remoteVideoContainer : localVideoContainer;
    if (!container) return;

    const emojiElement = document.createElement("div");
    emojiElement.textContent = emoji;
    emojiElement.classList.add("floating-emoji");
    container.appendChild(emojiElement);

    // Remove the emoji after animation
    emojiElement.addEventListener("animationend", () => {
        emojiElement.remove();
    });
}

// --- Graceful Shutdown --- 
window.addEventListener("beforeunload", () => {
  if (socket) {
    socket.disconnect();
  }
  if (peerConnection) {
    peerConnection.close();
  }
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }
});

