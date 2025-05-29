// video.js - Final Fixed Version
const VIDEO_SERVER_URL = "https://barshatalk-video-server.onrender.com";

// --- DOM Elements --- 
const muteBtn = document.getElementById("muteBtn");
const toggleCameraBtn = document.getElementById("toggleCameraBtn");
const nextBtn = document.getElementById("nextBtn");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const statusText = document.getElementById("statusText");
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
const loadingCircle = document.getElementById("loadingCircle");

// --- State Variables --- 
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let socket = null;
let socketId = null;
let partnerId = null;
let isInitiator = false;
let isConnected = false;
let isWaitingForMatch = false;
let iceCandidateQueue = [];
let iceServersConfig = [{ urls: "stun:stun.l.google.com:19302" }];
let userProfile = {
  nickname: "",
  birthday: "",
  gender: "",
};
let isCameraEnabled = true;
let isMicEnabled = true;

// --- Main Initialization ---
if (userInfoModal) {
  console.log("Video chat script loaded (Final Fixed Version)");
  initializeUserProfileModal();
}

// --- User Profile Modal ---
function initializeUserProfileModal() {
  generateRandomNickname();
  
  try {
    const today = new Date();
    const defaultDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    birthdayInput.value = defaultDate.toISOString().split("T")[0];
  } catch (e) {
    birthdayInput.value = "";
  }

  genderButtons.forEach(button => {
    button.addEventListener("click", function() {
      genderButtons.forEach(btn => btn.classList.remove("active"));
      this.classList.add("active");
      userProfile.gender = this.getAttribute("data-value");
    });
  });

  generateNicknameBtn.addEventListener("click", generateRandomNickname);

  startChatBtn.addEventListener("click", async () => {
    if (validateUserProfile()) {
      saveUserProfile();
      userInfoModal.classList.remove("active");
      videoContainer.style.display = "flex";
      
      const cameraInitialized = await initializeCamera();
      if (cameraInitialized) {
        await fetchIceServersAndConnect();
      } else {
        disableVideoControls();
      }
    }
  });

  initMobileGestures();
  initHeartButton();
  if (localNicknameDisplay) localNicknameDisplay.style.display = "none";
  if (remoteNicknameDisplay) remoteNicknameDisplay.style.display = "none";
  userInfoModal.classList.add("active");
}

function generateRandomNickname() {
  const adjectives = ["Cool", "Funky", "Vibrant", "Cosmic", "Epic", "Groovy"];
  const animals = ["Lizard", "Tiger", "Panda", "Shark", "Eagle", "Wolf"];
  const randomNum = Math.floor(Math.random() * 100);
  nicknameInput.value = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${animals[Math.floor(Math.random() * animals.length)]}${randomNum}`;
}

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

function saveUserProfile() {
  userProfile.nickname = nicknameInput.value.trim();
  userProfile.birthday = birthdayInput.value;
}

// --- Camera Initialization (Fixed) ---
async function initializeCamera() {
  try {
    // Get available devices
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    const audioDevices = devices.filter(device => device.kind === 'audioinput');
    
    // Use first available devices
    localStream = await navigator.mediaDevices.getUserMedia({
      video: videoDevices[0] ? { deviceId: videoDevices[0].deviceId } : true,
      audio: audioDevices[0] ? { deviceId: audioDevices[0].deviceId } : true
    });
    
    localVideo.srcObject = localStream;
    localVideo.muted = true;
    isCameraEnabled = true;
    isMicEnabled = true;
    updateMediaButtonStates();

    if (localNicknameDisplay) {
      localNicknameDisplay.textContent = userProfile.nickname;
      localNicknameDisplay.style.display = "block";
    }
    return true;
  } catch (err) {
    console.error("Camera access error:", err);
    if (err.name === 'NotReadableError') {
      alert('⚠️ Camera/mic is being used by another app. Close other apps and refresh.');
    } else {
      alert(`⚠️ Camera/mic access error: ${err.message}`);
    }
    disableVideoControls();
    return false;
  }
}

// --- WebRTC Connection ---
async function fetchIceServersAndConnect() {
  try {
    const response = await fetch(`${VIDEO_SERVER_URL}/api/turn-credentials`);
    if (response.ok) {
      const config = await response.json();
      iceServersConfig = config.iceServers;
    }
  } catch (error) {
    console.log("Using default STUN servers");
  }
  initializeSocketAndWebRTC();
}

function initializeSocketAndWebRTC() {
  remoteStream = new MediaStream();
  if (remoteVideo) remoteVideo.srcObject = remoteStream;
  
  showLoadingCircle(true);
  setStatus("⌛ Connecting...");

  try {
    socket = io(VIDEO_SERVER_URL, { 
      transports: ["websocket", "polling"]
    });

    // Socket event handlers remain unchanged from your working version
    // (Keep your existing socket.on handlers here)

  } catch (error) {
    console.error("Socket connection failed:", error);
    setStatus("❌ Connection failed");
  }
}

// Keep all other functions (createPeerConnection, etc.) 
// exactly as in your current working version
