/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Conversation state
let conversation = [];
let userName = null;

// Set initial message
chatWindow.textContent = "👋 Hello! How can I help you today?";
conversation.push({
  role: "system",
  content:
    "You are a helpful assistant for L'Oréal. Only answer questions about L'Oréal products, beauty routines, recommendations, or beauty-related topics. If a question is not related to L'Oréal or beauty, politely reply: 'Sorry, I can only answer questions about L'Oréal products, routines, or beauty-related topics.' Track the user's name if they provide it, and use it in your responses when possible.",
});

function getTime() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Helper: Try to extract a name from user input (very basic)
function extractName(text) {
  const match = text.match(/my name is ([a-zA-Z\-\' ]+)/i);
  if (match) {
    return match[1].trim();
  }
  return null;
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Get user message
  const userMsg = userInput.value.trim();
  if (!userMsg) return;

  // Try to extract name
  const possibleName = extractName(userMsg);
  if (possibleName) {
    userName = possibleName;
  }

  // Show user message with timestamp in chat history
  chatWindow.innerHTML += `
    <div class="msg user">
      <span class="msg-text">${userMsg}</span>
      <span class="msg-time">${getTime()}</span>
    </div>`;
  chatWindow.scrollTop = chatWindow.scrollHeight;
  userInput.value = "";

  // Show latest question above the AI response (reset each time)
  let latestQ = document.getElementById("latest-question");
  if (!latestQ) {
    latestQ = document.createElement("div");
    latestQ.id = "latest-question";
    latestQ.style.margin = "24px 0 8px 0";
    latestQ.style.fontWeight = "600";
    latestQ.style.fontSize = "18px";
    latestQ.style.color = "#111";
    latestQ.style.letterSpacing = "0.01em";
    chatWindow.parentNode.insertBefore(latestQ, chatWindow);
  }
  latestQ.textContent = userMsg;

  // Add user message to conversation
  conversation.push({ role: "user", content: userMsg });

  // Show loading message
  chatWindow.innerHTML += `<div class="msg ai loading"><span class="msg-text">...</span></div>`;
  chatWindow.scrollTop = chatWindow.scrollHeight;

  try {
    // Use local secrets.js key if available
    const apiKey =
      typeof OPENAI_API_KEY !== "undefined" ? OPENAI_API_KEY : null;
    const apiUrl = apiKey
      ? "https://api.openai.com/v1/chat/completions"
      : "https://your-cloudflare-worker-url/"; // Replace with your deployed Worker URL

    const headers = apiKey
      ? {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        }
      : { "Content-Type": "application/json" };

    const body = apiKey
      ? JSON.stringify({ model: "gpt-4o", messages: conversation })
      : JSON.stringify({ messages: conversation });

    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body,
    });
    const data = await response.json();
    let aiMsg = "";
    if (
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      aiMsg = data.choices[0].message.content.trim();
    } else {
      aiMsg =
        "<span class='error'>Sorry, I couldn't get a response. Please try again.</span>";
    }

    // Add AI message to conversation
    conversation.push({ role: "assistant", content: aiMsg });

    // Replace loading message with AI response, with timestamp
    const msgs = chatWindow.querySelectorAll(".msg.ai");
    if (msgs.length) {
      msgs[
        msgs.length - 1
      ].innerHTML = `<span class="msg-text">${aiMsg}</span> <span class="msg-time">${getTime()}</span>`;
      msgs[msgs.length - 1].classList.remove("loading");
    } else {
      chatWindow.innerHTML += `<div class="msg ai"><span class="msg-text">${aiMsg}</span> <span class="msg-time">${getTime()}</span></div>`;
    }
    chatWindow.scrollTop = chatWindow.scrollHeight;
  } catch (err) {
    // Show error message with timestamp
    const errorMsg = `<span class='error'>Error: Unable to connect to the AI.</span>`;
    const msgs = chatWindow.querySelectorAll(".msg.ai");
    if (msgs.length) {
      msgs[
        msgs.length - 1
      ].innerHTML = `<span class="msg-text">${errorMsg}</span> <span class="msg-time">${getTime()}</span>`;
      msgs[msgs.length - 1].classList.remove("loading");
    } else {
      chatWindow.innerHTML += `<div class="msg ai"><span class="msg-text">${errorMsg}</span> <span class="msg-time">${getTime()}</span></div>`;
    }
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
});
