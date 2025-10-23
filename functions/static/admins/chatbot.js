/* eslint-env browser */
/* global DOMPurify */
/* global marked */ // For ESLint: tells it "marked" is globally available

// functions/static/[merchant or admins]/chatbot.js

(function() {
  "use strict";

  // ===== DOM Elements =====
  const chatContainer = document.getElementById("chat-container");
  const chatInput = document.getElementById("chat-input");
  const sendButton = document.getElementById("send-button");
  const typingIndicator = document.getElementById("typing-indicator");
  const loaderOverlay = document.getElementById("loader-overlay");

  // ===== Configuration =====
  // URL for the lambdaChatbotAssistant Lambda
  const CHATBOT_LAMBDA_URL = "https://y36af4qeuyxcpjwxap6crcdwtm0wnuyn.lambda-url.us-east-1.on.aws/"; // YOUR URL INSERTED HERE
  const MAX_HISTORY_TO_SEND = 10; // Max messages (user + assistant turns)

  // ===== State =====
  let isWaitingForResponse = false;
  let userContext = null;
  const chatHistory = [];

  // ===== Helper Functions =====

  /**
   * Determines the user context (merchant ID or admin role).
   * @return {object|null} Context object or null if undetermined.
   */
  function getUserContext() {
    // Check for merchant ID in localStorage
    const idNegocio = localStorage.getItem("id_negocio_logeado");
    if (idNegocio) {
      console.log("Context: Merchant, ID =", idNegocio);
      return {type: "merchant", id_negocio: idNegocio};
    }

    // Basic check for admin - REPLACE/ADJUST this logic as needed
    // This example checks if the URL path contains
    // '/admin' or refers to admin navbar
    const isAdminPath =
    window.location.pathname.toLowerCase().includes("/admin");
    const isAdminNavbar =
    document.getElementById("navbar-placeholder")?.
        dataset.partial?.includes("navbaradmins");
    if (isAdminPath || isAdminNavbar) {
      console.log("Context: Admin");
      return {type: "admin"};
    }

    // Fallback if context cannot be determined
    console.error("Chatbot Error: Could not determine" +
        " user context (merchant or admin).");
    return null;
  }

  /**
   * Appends a message bubble to the chat, renders Markdown for AI.
   * Also adds the message to chatHistory.
   * @param {object} messageData - { role: 'user'/'assistant', content: '...' }
   * @param {string} sender - 'user' or 'ai'
   */
  function appendMessage(messageData, sender = "ai") {
    if (!chatContainer || !messageData ||
        typeof messageData.content !== "string") {
      console.error("appendMessage: Invalid input", {
        chatContainer, messageData,
      });
      return;
    }

    // Add to history (only if content exists and role is valid)
    if (messageData.content.trim() &&
    ["user", "assistant"].includes(messageData.role)) {
      chatHistory.push(messageData);
    }

    const bubble = document.createElement("div");
    bubble.classList.add("chat-bubble");
    bubble.classList.add(sender === "user" ? "user-bubble" : "ai-bubble");

    if (sender === "ai" && typeof marked === "function") {
      try {
        // Render AI response as HTML from Markdown
        const rawHtml = marked.parse(messageData.content || "", {breaks: true});
        // Sanitize with DOMPurify if available; fallback to a minimal escape
        const safeHtml =
        (window.DOMPurify && typeof DOMPurify.sanitize === "function") ?
         DOMPurify.sanitize(rawHtml) :
         rawHtml.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        bubble.innerHTML = safeHtml;
      } catch (e) {
        console.error("Markdown parsing error:", e);
        bubble.textContent = messageData.content; // Fallback to plain text
      }
    } else {
    // Display user message or AI message (if marked fails) as plain text
      bubble.textContent = messageData.content;
    }

    chatContainer.appendChild(bubble);

    // Scroll to the bottom smoothly after element is added
    setTimeout(() => {
      chatContainer.scrollTo({
        top: chatContainer.scrollHeight, behavior: "smooth",
      });
    }, 0);
  }

  /** Shows or hides the typing indicator
   * @param {boolean} show - true to show, false to hide
  */
  function showTypingIndicator(show = true) {
    if (typingIndicator) {
      typingIndicator.classList.toggle("hidden", !show);
      if (show && chatContainer) {
        setTimeout(() => { // Ensure layout updated before scrolling
          chatContainer.scrollTo({
            top: chatContainer.scrollHeight, behavior: "smooth",
          });
        }, 50);
      }
    }
  }

  /** Handles sending message: displays user msg,
   * calls Lambda, displays AI msg */
  async function sendMessage() {
    const messageContent = chatInput?.value.trim();
    // Prevent sending if empty, waiting, or context is missing
    if (!messageContent || isWaitingForResponse || !userContext) {
      console.warn("SendMessage blocked:", {
        messageContent, isWaitingForResponse, userContext,
      });
      return;
    }

    const userMessage = {role: "user", content: messageContent};

    // 1. Display User Message & Add to History
    appendMessage(userMessage, "user");
    if (chatInput) chatInput.value = "";
    chatInput?.focus(); // Keep focus

    // 2. Update UI State (Waiting)
    showTypingIndicator(true);
    isWaitingForResponse = true;
    if (chatInput) chatInput.disabled = true;
    if (sendButton) sendButton.disabled = true;

    // 3. Prepare History Slice
    const historyToSend = chatHistory.slice(-MAX_HISTORY_TO_SEND);

    // 4. Call Lambda
    try {
      console.log("Sending to Lambda:", {
        message: messageContent, context: userContext, history: historyToSend,
      });
      const response = await fetch(CHATBOT_LAMBDA_URL, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          message: messageContent, // Send current message separately
          context: userContext,
          history: historyToSend,
        }),
      });

      const data = await response.json(); // Read body once

      if (!response.ok) {
        throw new Error(data.message ||
            `Error del servidor (${response.status})`);
      }
      if (!data.reply) {
        throw new Error("La respuesta del asistente estaba vacía.");
      }

      // 5. Display AI Response & Add to History
      const aiMessage = {role: "assistant", content: data.reply};
      appendMessage(aiMessage, "ai");
    } catch (error) {
      console.error("Error llamando/procesando Lambda del chatbot:", error);
      // Display error message in chat
      const errorMessage = {
        role: "assistant",
        content: `Lo siento, ocurrió un error inesperado: ${error.message}`,
      };
      appendMessage(errorMessage, "ai");
    } finally {
      // 6. Restore UI State (Not Waiting)
      showTypingIndicator(false);
      isWaitingForResponse = false;
      if (chatInput) chatInput.disabled = false;
      if (sendButton) sendButton.disabled = false;
      chatInput?.focus(); // Re-focus input field
    }
  }

  // --- Initialization ---
  document.addEventListener("DOMContentLoaded", () => {
    loaderOverlay?.remove(); // Remove initial loader

    // Set user context
    userContext = getUserContext();

    // Handle case where context couldn't be determined
    if (!userContext) {
      appendMessage({
        role: "assistant",
        content: "Lo siento, no pude identificar si eres un negocio o " +
        "administrador. El asistente no funcionará correctamente.",
      }, "ai");
      if (chatInput) chatInput.disabled = true;
      if (sendButton) sendButton.disabled = true;
      return; // Stop further initialization
    }

    // Add initial AI message from HTML to history
    const initialAiBubble = chatContainer?.querySelector(".ai-bubble");
    const initialAiMsg = initialAiBubble?.textContent.trim();
    if (initialAiMsg) {
      if (!chatHistory.some((m) => m.role === "assistant" &&
            m.content === initialAiMsg)) {
        chatHistory.push({role: "assistant", content: initialAiMsg});
      }
    }

    // --- Event Listeners ---
    sendButton?.addEventListener("click", sendMessage);
    chatInput?.addEventListener("keypress", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault(); sendMessage();
      }
    });

    // Set initial focus on the input field
    chatInput?.focus();
  });
})();
