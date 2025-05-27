// Based on the original Glitch script.js, adapted for Render backend and text.html structure
// v3: Added message clearing on disconnect/next

const socket = io("https://barshatalk-text-server.onrender.com"); 

let chatMode = "text"; 

// UI elements (Ensure IDs match text_corrected.html)
const chatScreen = document.getElementById("chatScreen");
const sendBtn = document.getElementById("sendBtn");
const nextBtn = document.getElementById("nextBtn"); 
const messageInput = document.getElementById("messageInput");
const messages = document.getElementById("messages");
const statusText = document.getElementById("statusText"); 

// Sound elements (Ensure IDs match text_corrected.html)
const messageSound = document.getElementById("sendSound"); 
const disconnectSound = document.getElementById("disconnectSound"); 

console.log("Text chat script loaded (v3 - Glitch style + Clear History).");

// --- Socket Event Handlers ---
socket.on("connect", () => {
  console.log("Connected to text chat server");
  if (statusText) statusText.textContent = "✅ Connected, waiting for partner...";
  // Clear messages on initial connect/reconnect
  if (messages) messages.innerHTML = 
      `<div class="system-message">⏳ Waiting for a partner...</div>`; 
});

socket.on("connect_error", (error) => {
    console.error("Text chat Socket.IO connection error:", error);
    appendMessage("⚠️ Connection error to text chat server.", "system"); 
    if (statusText) statusText.textContent = "❌ Connection Error";
});

socket.on("matched", () => { 
  // Clear previous messages before showing partner found
  if (messages) messages.innerHTML = 
      `<div class="system-message">🎉 Partner found!</div>`;
  if (statusText) statusText.textContent = "🟢 Chatting with a stranger";
});

socket.on("waiting", () => {
  // Clear previous messages before showing waiting message
  if (messages) messages.innerHTML = 
      `<div class="system-message">⏳ Waiting for a partner...</div>`;
  if (statusText) statusText.textContent = "⏳ Waiting for a partner...";
});

socket.on("message", (msg) => {
  appendMessage(msg, "stranger"); 
});

socket.on("partnerDisconnected", () => {
    // Clear previous messages first
    if (messages) messages.innerHTML = 
        `<div class="system-message">❌ Partner disconnected. Waiting for a new one...</div>`;
    if (statusText) statusText.textContent = "❌ Partner left. Waiting...";
});

// --- UI Event Handlers ---

function sendMessage() {
    const msg = messageInput.value;
    if (msg.trim()) {
        appendMessage(msg, "you"); 
        socket.emit("message", msg); 
        messageInput.value = "";
        if (messageSound) {
            messageSound.play().catch(e => console.error("Error playing send sound:", e));
        } else {
            console.warn("Send sound element not found");
        }
    }
}

if (sendBtn) {
    sendBtn.onclick = sendMessage;
} else {
    console.error("Send button (sendBtn) not found!");
}

if (messageInput) {
    messageInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault(); 
            sendMessage();
        }
    });
} else {
    console.error("Message input (messageInput) not found!");
}

if (nextBtn) {
    nextBtn.onclick = () => {
      console.log("Next button clicked");
      // Clear messages first
      if (messages) messages.innerHTML = 
          `<div class="system-message">🏃 You requested the next partner...</div>
           <div class="system-message">⏳ Waiting for a new text chat partner...</div>`;
      if (disconnectSound) {
          disconnectSound.play().catch(e => console.error("Error playing disconnect sound:", e));
      } else {
          console.warn("Disconnect sound element not found");
      }
      socket.emit("next"); 
      if (statusText) statusText.textContent = "⏳ Finding next partner...";
    };
} else {
    console.error("Next button (nextBtn) not found!");
}

// --- Message Display Function (Adds classes for CSS styling) ---
function appendMessage(msg, type) {
    if (!messages) {
        console.error("Messages container not found!");
        return;
    }
    const messageElement = document.createElement("div");
    
    if (type === "you") {
        messageElement.classList.add("message-you"); 
        messageElement.textContent = "You: " + msg; 
    } else if (type === "stranger") {
        messageElement.classList.add("message-stranger");
        messageElement.textContent = "Stranger: " + msg; 
    } else { 
        messageElement.classList.add("system-message");
        messageElement.textContent = msg;
    }
    messages.appendChild(messageElement);
    messages.scrollTop = messages.scrollHeight; 
}

// Emoji Picker Logic 
const emojiBtn = document.getElementById("emojiBtn");
const emojiPicker = document.getElementById("emojiPicker");

if (emojiBtn && emojiPicker && messageInput) {
    emojiBtn.onclick = () => {
        emojiPicker.style.display = emojiPicker.style.display === "none" ? "block" : "none";
    };
    emojiPicker.addEventListener("emoji-click", (event) => {
        messageInput.value += event.detail.unicode;
        emojiPicker.style.display = "none";
    });
} else {
    console.error("Emoji button, picker, or message input not found!");
}

// Reminder about Audio Errors
// Download MP3 files and host them locally in /public/sounds/
// Update <audio> tags in text.html: src="/sounds/your_sound.mp3"
