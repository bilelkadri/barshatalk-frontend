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
let socket;
let peerConnection = null;
let remoteStream = null;
let iceCandidateQueue = [];
let userProfile = {
  nickname: "",
  birthday: "",
  gender: ""
};

// Make variables available to inline scripts
window.isConnected = isConnected;
window.socket = socket;
window.partnerId = partnerId;
window.userProfile = userProfile;

// Initialize user profile modal
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
      initializeCamera();
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
    window.isConnected = isConnected;
    window.socket = socket;
    window.partnerId = partnerId;
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
    
    initializeWebRTC();
    return true;
  } catch (err) {
    console.error("Camera access error:", err);
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
  socket = io("
https://barshatalk-video-server-1.onrender.com", { withCredentials: true, transports: ['websocket', 'polling'] });

  remoteVideo.style.display = "none";
  remoteCameraOffEmoji.style.display = "block";
  loadingCircle.style.display = "block";
  
  // Ensure remote nickname is hidden until connected
  if (remoteNicknameDisplay) {
    remoteNicknameDisplay.style.display = "none";
  }

  socket.on("connect", () => {
    socketId = socket.id;
    if (!isWaitingForMatch) {
      isWaitingForMatch = true;
      // Send user profile data with ready signal
      socket.emit("ready", { 
        nickname: userProfile.nickname,
        gender: userProfile.gender
      });
    }
    
    // Update global variables for inline scripts
    window.socket = socket;
  });

  socket.on("connect_error", (error) => {
    console.error("Socket.IO connection error:", error);
    setStatus("⚠️ Connection error");
  });

  socket.on("matched", async (data) => {
    if (data && data.partnerId === socketId) {
      socket.emit("next");
      return;
    }
    if (data && data.partnerId) partnerId = data.partnerId;
    isConnected = true;
    isWaitingForMatch = false;
    isInitiator = data.initiator;
    setStatus("Connected to a partner");
    remoteVideoContainer.classList.add("glow");
    
    // Display partner nickname if available
    if (data.partnerNickname && remoteNicknameDisplay) {
      remoteNicknameDisplay.textContent = data.partnerNickname;
      remoteNicknameDisplay.style.display = "block";
      console.log("Partner nickname set:", data.partnerNickname);
    } else {
      console.log("No partner nickname received in matched event");
      // Request partner info explicitly
      if (socket && partnerId) {
        socket.emit("getPartnerInfo", { partnerId: partnerId });
      }
    }
    
    // Update global variables for inline scripts
    window.isConnected = isConnected;
    window.partnerId = partnerId;
    
    createPeerConnection();

    if (isInitiator) {
      try {
        const offer = await peerConnection.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await peerConnection.setLocalDescription(offer);
        setTimeout(() => socket.emit("offer", peerConnection.localDescription), 1000);
      } catch (err) {
        console.error("Offer creation error:", err);
      }
    }
  });

  socket.on("offer", async (offer) => {
    if (!isConnected) {
      isConnected = true;
      isWaitingForMatch = false;
      isInitiator = false;
      setStatus("Connected to a partner");
      remoteVideoContainer.classList.add("glow");
      createPeerConnection();
      
      // Update global variables for inline scripts
      window.isConnected = isConnected;
    }

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      iceCandidateQueue.forEach(async (c) => {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(c));
        } catch (err) {
          console.warn("❗ ICE retry failed:", err);
        }
      });
      iceCandidateQueue = [];
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      setTimeout(() => socket.emit("answer", peerConnection.localDescription), 1000);
    } catch (err) {
      console.error("Answer creation error:", err);
    }
  });

  socket.on("answer", async (answer) => {
    if (peerConnection && isInitiator) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      iceCandidateQueue.forEach(async (c) => {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(c));
        } catch (err) {
          console.warn("❗ ICE retry on answer failed:", err);
        }
      });
      iceCandidateQueue = [];
    }
  });

  socket.on("candidate", async (candidate) => {
    if (peerConnection && candidate) {
      if (!peerConnection.remoteDescription || !peerConnection.remoteDescription.type) {
        console.log("🕒 Queuing ICE candidate");
        iceCandidateQueue.push(candidate);
      } else {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
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
    
    // Update global variables for inline scripts
    window.isConnected = isConnected;
    window.partnerId = null;
  });

  document.getElementById("nextBtn").onclick = () => {
    socket.emit("next");
    disconnectPartner();
  };
}

function createPeerConnection() {
  if (peerConnection) peerConnection.close();
  if (remoteStream) remoteStream.getTracks().forEach(t => t.stop());

  remoteStream = new MediaStream();
  remoteVideo.srcObject = remoteStream;
  peerConnection = new RTCPeerConnection(config);

  // ✅ Only add transceivers if we're the initiator
  if (isInitiator) {
    peerConnection.addTransceiver('video', { direction: 'sendrecv' });
    peerConnection.addTransceiver('audio', { direction: 'sendrecv' });
  }

  // ✅ Add local tracks
  if (localStream) {
    localStream.getTracks().forEach(track => {
      if (!peerConnection.getSenders().some(s => s.track === track)) {
        peerConnection.addTrack(track, localStream);
        console.log("✔️ Track added to peerConnection:", track.kind);
      }
    });
  }

  peerConnection.ontrack = event => {
    console.log("Remote track received:", event.track.kind, event.track.enabled);
    if (event.streams && event.streams[0]) {
      event.streams[0].getTracks().forEach(track => {
        remoteStream.addTrack(track);
        console.log("➡️ Track added to remoteStream:", track.kind);
        if (track.kind === "video") {
          setTimeout(() => {
            remoteVideo.style.display = "block";
            remoteCameraOffEmoji.style.display = "none";
            loadingCircle.style.display = "none";
            
            // Request partner info again when video track is received
            if (socket && partnerId && (!remoteNicknameDisplay.textContent || remoteNicknameDisplay.style.display === "none")) {
              socket.emit("getPartnerInfo", { partnerId: partnerId });
              console.log("Requesting partner info after video track received");
            }
          }, 500);
        }
      });
    }
  };

  peerConnection.onicecandidate = event => {
    if (event.candidate) socket.emit("candidate", event.candidate);
  };

  peerConnection.onconnectionstatechange = () => {
    console.log("WebRTC connection state:", peerConnection.connectionState);
    if (peerConnection.connectionState === "connected") {
      setTimeout(() => {
        const videoTracks = remoteStream.getVideoTracks();
        console.log("✅ Remote video tracks after connection:", videoTracks);
        if (videoTracks.length === 0) {
          console.log("🚨 No video tracks. Attempting renegotiation.");
          if (isInitiator && peerConnection) {
            peerConnection.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
              .then(offer => peerConnection.setLocalDescription(offer))
              .then(() => {
                socket.emit("offer", peerConnection.localDescription);
              })
              .catch(err => console.error("Renegotiation error:", err));
          }
        } else {
          remoteVideo.style.display = "block";
          remoteCameraOffEmoji.style.display = "none";
          loadingCircle.style.display = "none";
          
          // Make another attempt to get partner nickname if not already displayed
          if (socket && partnerId && (!remoteNicknameDisplay.textContent || remoteNicknameDisplay.style.display === "none")) {
            socket.emit("getPartnerInfo", { partnerId: partnerId });
            console.log("Requesting partner info after connection established");
          }
        }
      }, 1000);
    } else if (["disconnected", "failed"].includes(peerConnection.connectionState)) {
      disconnectPartner();
    }
  };
}

function disconnectPartner() {
  isConnected = false;
  partnerId = null;
  isInitiator = false;
  setStatus("⌛ Waiting for a stranger...");

  if (disconnectSound) disconnectSound.play().catch(() => {});
  remoteVideoContainer.classList.remove("glow");
  if (remoteStream) remoteStream.getTracks().forEach(t => remoteStream.removeTrack(t));

  remoteVideo.style.display = "none";
  remoteCameraOffEmoji.style.display = "block";
  loadingCircle.style.display = "block";
  
  // Hide remote nickname on disconnect
  if (remoteNicknameDisplay) {
    remoteNicknameDisplay.style.display = "none";
    remoteNicknameDisplay.textContent = "";
  }
  
  // Update global variables for inline scripts
  window.isConnected = false;
  window.partnerId = null;

  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  remoteStream = new MediaStream();
  remoteVideo.srcObject = remoteStream;

  if (!isWaitingForMatch && socket && socket.connected) {
    isWaitingForMatch = true;
    socket.emit("ready", { 
      nickname: userProfile.nickname,
      gender: userProfile.gender
    });
  }
}

function setStatus(text) {
  statusText.textContent = text;
  statusText.classList.add("glitch");
  setTimeout(() => statusText.classList.remove("glitch"), 500);
}

muteBtn.onclick = () => {
  if (!localStream) return;
  const audioTrack = localStream.getAudioTracks()[0];
  if (!audioTrack) return;
  audioTrack.enabled = !audioTrack.enabled;
  muteBtn.textContent = audioTrack.enabled ? "Mute" : "Unmute";
};

toggleCameraBtn.onclick = () => {
  if (!localStream) return;
  const videoTrack = localStream.getVideoTracks()[0];
  if (!videoTrack) return;
  videoTrack.enabled = !videoTrack.enabled;
  updateCameraStatus();
};

// Check if device is mobile
function isMobileDevice() {
  return (window.innerWidth <= 768) || 
         (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
}

// Add device-specific classes
function setupDeviceSpecificUI() {
  const body = document.body;
  if (isMobileDevice()) {
    body.classList.add('mobile-device');
    
    // Make buttons more touch-friendly
    const allButtons = document.querySelectorAll('button');
    allButtons.forEach(btn => {
      btn.classList.add('touch-friendly');
    });
  } else {
    body.classList.add('desktop-device');
  }
}

window.onload = () => {
  // Setup device-specific UI
  setupDeviceSpecificUI();
  
  // Initialize the user profile modal first
  initializeUserProfileModal();
  
  // Hide video container until profile is completed
  videoContainer.style.display = "none";
  
  // Handle window resize events for responsive adjustments
  window.addEventListener('resize', function() {
    setupDeviceSpecificUI();
  });
};
