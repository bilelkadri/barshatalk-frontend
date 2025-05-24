// BarshatTalk Video Chat - Enhanced with Mobile & Gen Z Features
const muteBtn = document.getElementById("muteBtn");
const toggleCameraBtn = document.getElementById("toggleCameraBtn");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const localVideoContainer = document.getElementById("localVideoContainer");
const remoteVideoContainer = document.getElementById("remoteVideoContainer");
const localCameraOffEmoji = localVideoContainer.querySelector(".camera-off-emoji");
const remoteCameraOffEmoji = remoteVideoContainer.querySelector(".camera-off-emoji");
const loadingCircle = document.querySelector(".loading-circle");
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
const genderButtons = document.querySelectorAll('.gender-button');
const heartBtn = document.getElementById("heartBtn");

let localStream;
let isConnected = false;
let isWaitingForMatch = false;
let socketId = null;
let partnerId = null;
let isInitiator = false;
let socket; // This socket variable is specific to video.js
let peerConnection = null;
let remoteStream = null;
let iceCandidateQueue = [];
let userProfile = {
  nickname: "",
  birthday: "",
  gender: ""
};

// Make variables available to inline scripts if needed, but be careful with naming conflicts
// Consider renaming if script.js is also loaded on the same page
window.isVideoConnected = isConnected; // Renamed to avoid conflict
window.videoSocket = socket; // Renamed to avoid conflict
window.videoPartnerId = partnerId; // Renamed to avoid conflict
window.userProfile = userProfile; // Shared profile might be okay

// Initialize user profile modal (This seems specific to video chat start)
function initializeUserProfileModal() {
  // Set default nickname (random adjective + animal + number)
  generateRandomNickname();

  // Set default date (18 years ago)
  const today = new Date();
  const defaultDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  birthdayInput.value = defaultDate.toISOString().split('T')[0];

  // Add event listener for gender selection
  let selectedGender = null;

  genderButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Remove active class from all buttons
      genderButtons.forEach(btn => btn.classList.remove('active'));

      // Add active class to clicked button
      this.classList.add('active');

      // Store selected gender
      selectedGender = this.getAttribute('data-value');
      userProfile.gender = selectedGender;
    });
  });

  // Add event listener for nickname generator
  generateNicknameBtn.addEventListener('click', generateRandomNickname);

  // Add event listener for start chat button
  startChatBtn.addEventListener("click", function() {
    if (validateUserProfile()) {
      saveUserProfile();
      userInfoModal.classList.remove('active');
      videoContainer.style.display = "flex";
      initializeCamera(); // Start camera and WebRTC after profile setup
    }
  });

  // Initialize mobile swipe gestures
  initMobileGestures();

  // Initialize heart button
  initHeartButton();

  // Ensure nicknames are hidden initially
  if (localNicknameDisplay) {
    localNicknameDisplay.style.display = "none";
  }
  if (remoteNicknameDisplay) {
    remoteNicknameDisplay.style.display = "none";
  }
  // Show the modal initially if it's hidden by default
  userInfoModal.classList.add('active');
}

// Generate random nickname
function generateRandomNickname() {
  const adjectives = ["Cool", "Funky", "Vibrant", "Cosmic", "Epic", "Groovy", "Chill", "Dope", "Lit", "Savage"];
  const animals = ["Lizard", "Tiger", "Panda", "Shark", "Eagle", "Wolf", "Fox", "Dragon", "Unicorn", "Phoenix"];
  const randomNum = Math.floor(Math.random() * 100);
  const randomNickname = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${animals[Math.floor(Math.random() * animals.length)]}${randomNum}`;

  nicknameInput.value = randomNickname;
}

// Validate user profile inputs
function validateUserProfile() {
  if (!nicknameInput.value.trim()) {
    alert("Please enter a nickname");
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

// Save user profile data
function saveUserProfile() {
  userProfile.nickname = nicknameInput.value.trim();
  userProfile.birthday = birthdayInput.value;

  // Update global userProfile for inline scripts
  window.userProfile = userProfile;

  // Don't display nickname yet - wait until camera is initialized
}

// Initialize mobile swipe gestures
function initMobileGestures() {
  let touchStartX = 0;
  let touchEndX = 0;
  let touchStartY = 0;
  let touchEndY = 0;

  // Add touch event listeners to both video containers
  [remoteVideoContainer, localVideoContainer].forEach(container => {
    if (container) {
      container.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
      });

      container.addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe(this);
      });
    }
  });

  function handleSwipe(container) {
    // Up swipe (threshold of 50px) for next
    if (touchStartY - touchEndY > 50) {
      // Add swipe up animation effect
      container.classList.add('swipe-up-transition');

      // Remove the class after animation completes
      setTimeout(() => {
        container.classList.remove('swipe-up-transition');
      }, 500);

      // Trigger next button
      document.getElementById('nextBtn').click();
    }
  }
}

// Initialize heart button
function initHeartButton() {
  if (heartBtn) {
    heartBtn.addEventListener('click', function() {
      showHeartAnimation();
    });
  }
}

// Show colorful Instagram-style heart animation in remote container only
function showHeartAnimation() {
  // Create multiple colorful hearts
  const colors = ['heart-pink', 'heart-red', 'heart-purple', 'heart-blue'];
  const heartCount = 3 + Math.floor(Math.random() * 3); // 3-5 hearts

  for (let i = 0; i < heartCount; i++) {
    setTimeout(() => {
      const heartElement = document.createElement('div');
      heartElement.textContent = '❤️';
      heartElement.classList.add('animated-heart');

      // Add random color class
      const colorClass = colors[Math.floor(Math.random() * colors.length)];
      heartElement.classList.add(colorClass);

      // Position the heart at a random horizontal position
      const randomX = Math.random() * 80 + 10; // 10% to 90% of container width
      heartElement.style.left = `${randomX}%`;
      heartElement.style.bottom = '20px';

      // Add random size variation
      const randomSize = 0.8 + Math.random() * 0.4; // 0.8-1.2
      heartElement.style.fontSize = `${50 * randomSize}px`;

      // Add to remote container only
      remoteVideoContainer.appendChild(heartElement);

      // Remove after animation completes
      setTimeout(() => {
        if (remoteVideoContainer.contains(heartElement)) {
          remoteVideoContainer.removeChild(heartElement);
        }
      }, 2000);
    }, i * 150); // Stagger the hearts
  }

  // If connected to a peer, send heart data
  if (isConnected && socket) {
    socket.emit("reaction", { 
      emoji: '❤️', 
      to: partnerId,
      nickname: userProfile.nickname
    });

    // Update global variables for inline scripts
    window.isVideoConnected = isConnected;
    window.videoSocket = socket;
    window.videoPartnerId = partnerId;
  }
}

async function initializeCamera() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    console.log("Camera access granted:", localStream.getTracks().map(t => t.kind));
    localVideo.srcObject = localStream;
    updateCameraStatus();

    // Now that camera is initialized, show local nickname
    if (localNicknameDisplay) {
      localNicknameDisplay.textContent = userProfile.nickname;
      localNicknameDisplay.style.display = "block";
    }

    initializeWebRTC(); // Initialize WebRTC connection AFTER getting camera stream
    return true;
  } catch (err) {
    console.error("Camera access error:", err);
    setStatus("⚠️ Camera access denied or failed.");
    updateCameraStatus(false);
    return false;
  }
}

function updateCameraStatus(enabled = true) {
  if (!localStream && enabled) return;
  const videoEnabled = localStream ? localStream.getVideoTracks()[0]?.enabled : false;
  localVideo.style.display = videoEnabled ? "block" : "none";
  localCameraOffEmoji.style.display = videoEnabled ? "none" : "block";
  toggleCameraBtn.textContent = videoEnabled ? "Hide Camera" : "Show Camera";
}

const config = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:relay1.expressturn.com:3478",
      username: "efRRo8fpQZz55JfAAACX",
      credential: "1CbiPKQqR68TDqKH"
    }
  ]
};

function initializeWebRTC() {
  remoteStream = new MediaStream();
  remoteVideo.srcObject = remoteStream;
  // *** CORRECTED URL HERE - REMOVED LEADING \n ***
  socket = io("https://barshatalk-video-server-1.onrender.com", { withCredentials: true, transports: ['websocket', 'polling'] });

  remoteVideo.style.display = "none";
  remoteCameraOffEmoji.style.display = "block";
  loadingCircle.style.display = "block";
  setStatus("⌛ Connecting to video server...");

  // Ensure remote nickname is hidden until connected
  if (remoteNicknameDisplay) {
    remoteNicknameDisplay.style.display = "none";
  }

  socket.on("connect", () => {
    socketId = socket.id;
    console.log("Connected to video server with ID:", socketId);
    setStatus("⌛ Waiting for a stranger...");
    if (!isWaitingForMatch) {
      isWaitingForMatch = true;
      // Send user profile data with ready signal
      socket.emit("ready", { 
        nickname: userProfile.nickname,
        gender: userProfile.gender
      });
    }

    // Update global variables for inline scripts
    window.videoSocket = socket;
  });

  socket.on("connect_error", (error) => {
    console.error("Video Socket.IO connection error:", error);
    setStatus("⚠️ Connection error to video server.");
  });

  socket.on("matched", async (data) => {
    console.log("Matched event received:", data);
    if (data && data.partnerId === socketId) {
      console.log("Matched with self? Requesting next.");
      socket.emit("next");
      return;
    }
    if (data && data.partnerId) partnerId = data.partnerId;
    isConnected = true;
    isWaitingForMatch = false;
    isInitiator = data.initiator;
    setStatus("✅ Connected to a partner");
    remoteVideoContainer.classList.add("glow");
    loadingCircle.style.display = "none"; // Hide loading circle

    // Display partner nickname if available
    if (data.partnerNickname && remoteNicknameDisplay) {
      remoteNicknameDisplay.textContent = data.partnerNickname;
      remoteNicknameDisplay.style.display = "block";
      console.log("Partner nickname set:", data.partnerNickname);
    } else {
      console.log("No partner nickname received in matched event, requesting...");
      // Request partner info explicitly
      if (socket && partnerId) {
        socket.emit("getPartnerInfo", { partnerId: partnerId });
      }
    }

    // Update global variables for inline scripts
    window.isVideoConnected = isConnected;
    window.videoPartnerId = partnerId;

    createPeerConnection();

    if (isInitiator) {
      console.log("I am the initiator, creating offer...");
      try {
        const offer = await peerConnection.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await peerConnection.setLocalDescription(offer);
        // Add a slight delay before sending offer
        setTimeout(() => socket.emit("offer", { offer: peerConnection.localDescription, to: partnerId }), 500);
        console.log("Offer sent to", partnerId);
      } catch (err) {
        console.error("Offer creation error:", err);
      }
    }
  });

  socket.on("offer", async (data) => {
    console.log("Offer received:", data);
    if (!isConnected) {
        console.log("Received offer but not connected yet, setting up...");
        partnerId = data.from; // Assuming 'from' contains the partner's socket ID
        isConnected = true;
        isWaitingForMatch = false;
        isInitiator = false;
        setStatus("✅ Connected to a partner");
        remoteVideoContainer.classList.add("glow");
        loadingCircle.style.display = "none"; // Hide loading circle
        createPeerConnection();

        // Update global variables for inline scripts
        window.isVideoConnected = isConnected;
        window.videoPartnerId = partnerId;
    }

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
      console.log("Remote description (offer) set.");
      // Process queued candidates immediately after setting remote description
      console.log(`Processing ${iceCandidateQueue.length} queued ICE candidates...`);
      while (iceCandidateQueue.length > 0) {
          const candidate = iceCandidateQueue.shift();
          try {
              await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
              console.log("Queued ICE candidate added.");
          } catch (err) {
              console.warn("❗ Adding queued ICE candidate failed:", err);
          }
      }
      console.log("Creating answer...");
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      console.log("Local description (answer) set.");
      // Add a slight delay before sending answer
      setTimeout(() => socket.emit("answer", { answer: peerConnection.localDescription, to: partnerId }), 500);
      console.log("Answer sent to", partnerId);
    } catch (err) {
      console.error("Answer creation/setting error:", err);
    }
  });

  socket.on("answer", async (data) => {
    console.log("Answer received:", data);
    if (peerConnection && isInitiator) {
      try {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
          console.log("Remote description (answer) set.");
          // Process queued candidates immediately after setting remote description
          console.log(`Processing ${iceCandidateQueue.length} queued ICE candidates...`);
          while (iceCandidateQueue.length > 0) {
              const candidate = iceCandidateQueue.shift();
              try {
                  await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                  console.log("Queued ICE candidate added.");
              } catch (err) {
                  console.warn("❗ Adding queued ICE candidate on answer failed:", err);
              }
          }
      } catch (err) {
          console.error("Error setting remote description (answer):", err);
      }
    }
  });

  socket.on("candidate", async (data) => {
    console.log("ICE Candidate received:", data);
    if (peerConnection && data.candidate) {
      try {
          // Queue candidate if remote description is not yet set
          if (!peerConnection.remoteDescription || !peerConnection.remoteDescription.type) {
              console.log("🕒 Queuing ICE candidate (remote description not set)");
              iceCandidateQueue.push(data.candidate);
          } else {
              await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
              console.log("ICE candidate added.");
          }
      } catch (err) {
          console.warn("❗ Error adding received ICE candidate:", err);
      }
    }
  });

  // Handle incoming reactions
  socket.on("reaction", (data) => {
    if (data && data.emoji === '❤️') {
      // Show colorful Instagram-style hearts
      showHeartAnimation();
    }
  });

  // Handle partner nickname update
  socket.on("partnerInfo", (data) => {
    if (data && data.nickname && remoteNicknameDisplay) {
      console.log("Partner info received:", data);
      remoteNicknameDisplay.textContent = data.nickname;
      remoteNicknameDisplay.style.display = "block";
    }
  });

  socket.on("partnerDisconnected", () => disconnectPartner());

  socket.on("waiting", () => {
    console.log("Waiting event received from server.");
    isConnected = false;
    isWaitingForMatch = true;
    isInitiator = false;
    setStatus("⌛ Waiting for a stranger...");
    remoteVideoContainer.classList.remove("glow");
    remoteVideo.style.display = "none";
    remoteCameraOffEmoji.style.display = "block";
    loadingCircle.style.display = "block";

    // Hide remote nickname while waiting
    if (remoteNicknameDisplay) {
      remoteNicknameDisplay.style.display = "none";
      remoteNicknameDisplay.textContent = "";
    }

    // Clean up peer connection if exists
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
        remoteStream = null;
        remoteVideo.srcObject = null;
    }
    iceCandidateQueue = []; // Clear queue

    // Update global variables for inline scripts
    window.isVideoConnected = isConnected;
    window.videoPartnerId = null;
  });

  document.getElementById("nextBtn").onclick = () => {
    console.log("Next button clicked.");
    if (socket) socket.emit("next");
    disconnectPartner();
  };

  // Add button listeners if they exist
  if (muteBtn) {
      muteBtn.onclick = () => {
          if (localStream) {
              const audioTrack = localStream.getAudioTracks()[0];
              if (audioTrack) {
                  audioTrack.enabled = !audioTrack.enabled;
                  muteBtn.textContent = audioTrack.enabled ? "Mute" : "Unmute";
              }
          }
      };
  }

  if (toggleCameraBtn) {
      toggleCameraBtn.onclick = () => {
          if (localStream) {
              const videoTrack = localStream.getVideoTracks()[0];
              if (videoTrack) {
                  videoTrack.enabled = !videoTrack.enabled;
                  updateCameraStatus(); // Update UI based on new state
              }
          }
      };
  }
}

function createPeerConnection() {
  console.log("Creating Peer Connection...");
  if (peerConnection) {
      console.log("Closing existing Peer Connection.");
      peerConnection.close();
  }
  if (remoteStream) {
      remoteStream.getTracks().forEach(t => t.stop());
  }

  remoteStream = new MediaStream();
  remoteVideo.srcObject = remoteStream;
  peerConnection = new RTCPeerConnection(config);

  // Add local tracks to the connection
  if (localStream) {
    localStream.getTracks().forEach(track => {
      try {
          if (!peerConnection.getSenders().some(s => s.track === track)) {
              peerConnection.addTrack(track, localStream);
              console.log("✔️ Track added to peerConnection:", track.kind);
          }
      } catch (err) {
          console.error("Error adding track:", err);
      }
    });
  }

  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      console.log("ICE Candidate generated:", event.candidate);
      // Send candidate to the partner via the signaling server
      if (socket && partnerId) {
          socket.emit("candidate", { candidate: event.candidate, to: partnerId });
      }
    }
  };

  peerConnection.ontrack = event => {
    console.log("Remote track received:", event.track.kind, event.track.enabled);
    if (event.streams && event.streams[0]) {
      event.streams[0].getTracks().forEach(track => {
        console.log("➡️ Adding track to remoteStream:", track.kind);
        remoteStream.addTrack(track);
      });
      // Once tracks are received, show the remote video
      remoteVideo.style.display = "block";
      remoteCameraOffEmoji.style.display = "none";
      loadingCircle.style.display = "none"; // Hide loading circle
    } else {
        // Handle cases where track is added directly to the stream
        console.log("➡️ Adding track directly to remoteStream:", event.track.kind);
        remoteStream.addTrack(event.track);
        remoteVideo.style.display = "block";
        remoteCameraOffEmoji.style.display = "none";
        loadingCircle.style.display = "none"; // Hide loading circle
    }
  };

  peerConnection.oniceconnectionstatechange = () => {
      console.log("ICE Connection State Change:", peerConnection.iceConnectionState);
      if (peerConnection.iceConnectionState === 'disconnected' || peerConnection.iceConnectionState === 'failed' || peerConnection.iceConnectionState === 'closed') {
          console.log("Peer connection disconnected or failed.");
          // Consider notifying the user or attempting to reconnect
          // disconnectPartner(); // Optionally disconnect if state becomes failed/closed
      }
  };

  peerConnection.onconnectionstatechange = () => {
      console.log("Connection State Change:", peerConnection.connectionState);
      if (peerConnection.connectionState === 'connected') {
          console.log("Peers connected!");
          setStatus("✅ Connected");
          loadingCircle.style.display = "none"; // Ensure loading circle is hidden
      }
  };
}

function disconnectPartner() {
  console.log("Disconnecting partner...");
  if (isConnected) {
    if (disconnectSound) disconnectSound.play();
    isConnected = false;
    isWaitingForMatch = true; // Go back to waiting state
    isInitiator = false;
    partnerId = null;
    setStatus("Partner disconnected. Waiting...");
    remoteVideoContainer.classList.remove("glow");
    remoteVideo.style.display = "none";
    remoteCameraOffEmoji.style.display = "block";
    loadingCircle.style.display = "block";

    // Hide remote nickname
    if (remoteNicknameDisplay) {
      remoteNicknameDisplay.style.display = "none";
      remoteNicknameDisplay.textContent = "";
    }

    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
      remoteStream = null;
      remoteVideo.srcObject = null;
    }
    iceCandidateQueue = []; // Clear queue

    // Update global variables
    window.isVideoConnected = isConnected;
    window.videoPartnerId = partnerId;

    // Tell the server we are ready for a new match
    if (socket) {
        socket.emit("ready", { 
            nickname: userProfile.nickname,
            gender: userProfile.gender
        });
    }
  }
}

function setStatus(text) {
  if (statusText) {
    statusText.textContent = text;
  }
}

// Initialize the user profile modal when the script loads
// Ensure this runs only on the video page (video.html)
if (document.getElementById('userInfoModal')) { // Check if the modal exists on the current page
    initializeUserProfileModal();
}

