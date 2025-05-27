// script.js - Corrected Code

// Use the direct URL for the text chat server
const TEXT_SERVER_URL = "https://barshatalk-text-server.onrender.com"; 

// --- Socket.IO Connection ---
let socket; 
try {
  socket = io(TEXT_SERVER_URL, {
    // Optional: Add transports if needed, but default usually works
    // transports: ["websocket", "polling"] 
  });
} catch (error) {
  console.error("Failed to initialize Socket.IO:", error);
  // Display an error message to the user on the page if the socket fails to initialize
  const statusTextElement = document.getElementById("statusText");
  if (statusTextElement) {
    statusTextElement.textContent = "❌ Critical Error: Cannot connect to chat service.";
    statusTextElement.style.color = "#ff4444"; // Make error prominent
  }
  // Disable chat functionality if socket fails
  const sendBtn = document.getElementById("sendBtn");
  const nextBtn = document.getElementById("nextBtn");
  const messageInput = document.getElementById("messageInput");
  if (sendBtn) sendBtn.disabled = true;
  if (nextBtn) nextBtn.disabled = true;
  if (messageInput) messageInput.disabled = true;
  // Prevent further script execution if socket is unavailable
  throw new Error("Socket.IO initialization failed."); 
}


// --- UI Elements ---
const chatScreen = document.getElementById("chatScreen");
const sendBtn = document.getElementById("sendBtn");
const nextBtn = document.getElementById("nextBtn"); 
const messageInput = document.getElementById("messageInput");
const messages = document.getElementById("messages");
const statusText = document.getElementById("statusText"); 
const emojiBtn = document.getElementById("emojiBtn");
const emojiPicker = document.getElementById("emojiPicker");

// --- Sound Elements (Commented out temporarily) ---
// const messageSound = document.getElementById("sendSound"); 
// const disconnectSound = document.getElementById("disconnectSound"); 

console.log("Text chat script loaded (v5 - Corrected Server URL).");

// --- Socket Event Handlers ---

socket.on("connect", () => {
  console.log("Connected to text chat server:", socket.id);
  if (statusText) statusText.textContent = "✅ Connected, waiting for partner...";
  // Clear messages on initial connect/reconnect
  if (messages) messages.innerHTML = 
      `<div class="system-message">⏳ Waiting for a partner...</div>`; 
});

// Improved Connection Error Handling (Point 4)
socket.on("connect_error", (error) => {
    console.error("Text chat Socket.IO connection error:", error);
    appendMessage(`⚠️ Connection error: ${error.message}. Trying to reconnect...`, "system"); 
    if (statusText) {
        statusText.textContent = "❌ Connection Error";
        statusText.style.color = "#ff4444"; // Make error prominent
    }
    // Optionally disable buttons during connection error
    if (sendBtn) sendBtn.disabled = true;
});

// Handle reconnection attempts and success
socket.io.on("reconnect_attempt", (attempt) => {
    console.log(`Reconnection attempt ${attempt}...`);
    if (statusText) statusText.textContent = `⏳ Reconnecting (${attempt})...`;
});

socket.io.on("reconnect_failed", () => {
    console.error("Reconnection failed.");
    appendMessage("⚠️ Reconnection failed. Please check your internet connection.", "system");
    if (statusText) statusText.textContent = "❌ Reconnection Failed";
});

socket.io.on("reconnect", (attempt) => {
    console.log(`Reconnected successfully after ${attempt} attempts.`);
    if (statusText) {
        statusText.textContent = "✅ Reconnected. Waiting for partner...";
        statusText.style.color = "#00ffff"; // Reset color on success
    }
    if (sendBtn) sendBtn.disabled = false; // Re-enable send button
    // Server should handle putting the user back into the queue upon reconnection
});

// General Socket Error Handling (Point 4)
socket.on("error", (err) => {
    console.error("Text chat socket error:", err);
    // Display a generic error or specific one if available
    const errorMessage = (typeof err === "string") ? err : (err.message || "An unknown socket error occurred.");
    appendMessage(`⚠️ Socket error: ${errorMessage}`, "system");
    // Decide if the error is critical and requires UI changes
});

// Handle custom system errors from server (optional)
socket.on("system_error", (errorMessage) => {
    console.warn("System error from server:", errorMessage);
    appendMessage(`⚠️ Server: ${errorMessage}`, "system");
});


socket.on("matched", () => { 
  console.log("Partner matched!");
  // Clear previous messages before showing partner found
  if (messages) messages.innerHTML = 
      `<div class="system-message">🎉 Partner found! Say hi!</div>`;
  if (statusText) {
      statusText.textContent = "🟢 Chatting with a stranger";
      statusText.style.color = "#00ff00"; // Green for active chat
  }
  if (sendBtn) sendBtn.disabled = false; // Ensure send button is enabled
  if (messageInput) messageInput.disabled = false; // Ensure input is enabled
  if (messageInput) messageInput.focus(); // Focus input field
});

socket.on("waiting", () => {
  console.log("Waiting for partner...");
  // Clear previous messages before showing waiting message
  if (messages) messages.innerHTML = 
      `<div class="system-message">⏳ Waiting for a partner...</div>`;
  if (statusText) {
      statusText.textContent = "⏳ Waiting for a partner...";
      statusText.style.color = "#00ffff"; // Default cyan color
  }
   if (sendBtn) sendBtn.disabled = true; // Disable send while waiting
   if (messageInput) messageInput.disabled = true; // Disable input while waiting
});

socket.on("message", (msg) => {
  console.log("Message received from stranger:", msg);
  appendMessage(msg, "stranger"); 
  // Optional: Play a notification sound for incoming messages
  // const incomingSound = document.getElementById("incomingSound"); // Add <audio id="incomingSound">
  // if (incomingSound) incomingSound.play().catch(e => console.error("Error playing incoming sound:", e));
});

socket.on("partnerDisconnected", () => {
    console.log("Partner disconnected.");
    // Clear previous messages first
    if (messages) messages.innerHTML = 
        `<div class="system-message">❌ Partner disconnected. Waiting for a new one...</div>`;
    if (statusText) {
        statusText.textContent = "❌ Partner left. Waiting...";
        statusText.style.color = "#ff4444"; // Red for disconnected
    }
    // Commented out sound temporarily
    // if (disconnectSound) {
    //     disconnectSound.play().catch(e => console.error("Error playing disconnect sound:", e));
    // } else {
    //     console.warn("Disconnect sound element not found");
    // }
    // Server should automatically put this user back into the waiting queue
    // UI should reflect waiting state
    if (sendBtn) sendBtn.disabled = true; 
    if (messageInput) messageInput.disabled = true; 
});

// --- UI Event Handlers ---

function sendMessage() {
    if (!socket || !socket.connected) {
        appendMessage("⚠️ Cannot send message: Not connected to server.", "system");
        return;
    }
    
    const msg = messageInput.value;
    const trimmedMsg = msg.trim();

    // Client-side Validation (Point 2)
    if (trimmedMsg && trimmedMsg.length <= 500) { 
        appendMessage(trimmedMsg, "you"); // Display the trimmed message
        socket.emit("message", trimmedMsg); // Send the trimmed message
        messageInput.value = ""; // Clear input after sending
        // Commented out sound temporarily
        // if (messageSound) {
        //     messageSound.play().catch(e => console.error("Error playing send sound:", e));
        // } else {
        //     console.warn("Send sound element not found");
        // }
    } else if (trimmedMsg.length > 500) {
        // Inform user message is too long
        appendMessage("⚠️ Your message is too long (max 500 characters).", "system");
    } else {
        // Handle empty message case if needed, though trim() already covers spaces
        console.log("Empty message not sent.");
    }
    messageInput.focus(); // Keep focus on input
}

if (sendBtn) {
    sendBtn.onclick = sendMessage;
} else {
    console.error("Send button (sendBtn) not found!");
}

if (messageInput) {
    messageInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault(); // Prevent newline on Enter
            if (!sendBtn || !sendBtn.disabled) { // Only send if button exists and is enabled
                sendMessage();
            }
        }
    });
} else {
    console.error("Message input (messageInput) not found!");
}

if (nextBtn) {
    nextBtn.onclick = () => {
      if (!socket || !socket.connected) {
          appendMessage("⚠️ Cannot request next: Not connected to server.", "system");
          return;
      }
      console.log("Next button clicked");
      // Clear messages first
      if (messages) messages.innerHTML = 
          `<div class="system-message">🏃 You requested the next partner...</div>
           <div class="system-message">⏳ Waiting for a new text chat partner...</div>`;
      // Commented out sound temporarily
      // if (disconnectSound) {
      //     disconnectSound.play().catch(e => console.error("Error playing disconnect sound:", e));
      // } else {
      //     console.warn("Disconnect sound element not found");
      // }
      socket.emit("next"); 
      if (statusText) {
          statusText.textContent = "⏳ Finding next partner...";
          statusText.style.color = "#00ffff"; // Reset color
      }
      // UI should reflect waiting state
      if (sendBtn) sendBtn.disabled = true; 
      if (messageInput) messageInput.disabled = true; 
    };
} else {
    console.error("Next button (nextBtn) not found!");
}

// --- Message Display Function ---
// Adds classes for CSS styling from style.css
function appendMessage(msg, type) {
    if (!messages) {
        console.error("Messages container not found!");
        return;
    }
    const messageElement = document.createElement("div");
    
    // Add base class for all messages
    // messageElement.classList.add("message"); // Assuming style.css uses .message-you, .message-stranger, .system-message directly

    if (type === "you") {
        messageElement.classList.add("message-you"); 
        // No need to add "You:" prefix if CSS handles alignment/styling
        messageElement.textContent = msg; 
    } else if (type === "stranger") {
        messageElement.classList.add("message-stranger");
        // No need to add "Stranger:" prefix if CSS handles alignment/styling
        messageElement.textContent = msg; 
    } else { // System messages
        messageElement.classList.add("system-message");
        messageElement.textContent = msg;
    }
    messages.appendChild(messageElement);
    // Scroll to the bottom to show the latest message
    messages.scrollTop = messages.scrollHeight; 
}

// --- Emoji Picker Logic --- 
if (emojiBtn && emojiPicker && messageInput) {
    emojiBtn.onclick = (event) => {
        event.stopPropagation(); // Prevent click from closing picker immediately
        emojiPicker.style.display = emojiPicker.style.display === "none" || emojiPicker.style.display === "" ? "block" : "none";
    };
    emojiPicker.addEventListener("emoji-click", (event) => {
        messageInput.value += event.detail.unicode;
        emojiPicker.style.display = "none";
        messageInput.focus(); // Return focus to input
    });
    // Close picker if clicking outside
    document.addEventListener("click", (event) => {
        // Check if emojiPicker exists and is currently displayed
        if (emojiPicker && emojiPicker.style.display === "block" && emojiBtn && !emojiPicker.contains(event.target) && event.target !== emojiBtn) {
            emojiPicker.style.display = "none";
        }
    });

} else {
    console.error("Emoji button, picker, or message input not found! Emoji functionality disabled.");
    if(emojiBtn) emojiBtn.style.display = "none"; // Hide button if picker is missing
}

// --- Initial State ---
// Disable send button and input initially until connected and matched
if (sendBtn) sendBtn.disabled = true;
if (messageInput) messageInput.disabled = true;

// Reminder about Audio Errors (from original code)
// Ensure audio files are accessible. Consider hosting locally.
// Example: <audio id="sendSound" src="/sounds/send.mp3"></audio>



