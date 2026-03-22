import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Response } from "express";

export type AIProvider = "openai" | "gemini" | "ollama";

function getProvider(): AIProvider {
  const provider = (process.env.AI_PROVIDER || "openai").toLowerCase();
  if (provider === "gemini") return "gemini";
  if (provider === "ollama") return "ollama";
  return "openai";
}

function isOllamaConfigured(): boolean {
  // Ollama is available if OLLAMA_BASE_URL is explicitly set, or if it's the chosen provider
  return !!(process.env.OLLAMA_BASE_URL || process.env.AI_PROVIDER?.toLowerCase() === "ollama");
}

export async function streamChatResponse(
  systemPrompt: string,
  conversationHistory: Array<{ role: string; content: string }>,
  userMessage: string,
  res: Response
): Promise<void> {
  const provider = getProvider();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    if (provider === "gemini") {
      await streamGemini(systemPrompt, conversationHistory, userMessage, res);
    } else if (provider === "ollama") {
      await streamOllama(systemPrompt, conversationHistory, userMessage, res);
    } else {
      await streamOpenAI(systemPrompt, conversationHistory, userMessage, res);
    }
  } catch (primaryError) {
    // Automatic fallback to Ollama if configured and a different provider was primary
    if (provider !== "ollama" && isOllamaConfigured()) {
      console.warn(
        `[AI] Primary provider '${provider}' failed — falling back to Ollama.`,
        primaryError instanceof Error ? primaryError.message : primaryError
      );
      try {
        await streamOllama(systemPrompt, conversationHistory, userMessage, res);
      } catch (fallbackError) {
        throw new Error(
          `Both primary provider (${provider}) and Ollama fallback failed. ` +
            `Primary: ${primaryError instanceof Error ? primaryError.message : primaryError}. ` +
            `Ollama: ${fallbackError instanceof Error ? fallbackError.message : fallbackError}`
        );
      }
    } else {
      throw primaryError;
}
  }
}

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  const provider = getProvider();

  try {
    if (provider === "gemini") {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("Gemini API key not configured");
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-1.5-flash" });
      
      const result = await model.generateContent([
        { text: "Please transcribe the following audio accurately. Reply ONLY with the transcribed text, nothing else." },
        {
          inlineData: {
            mimeType: mimeType,
            data: audioBuffer.toString("base64")
          }
        }
      ]);
      return result.response.text().trim();
    } else if (provider === "openai" || provider === "ollama") {
      // Ollama does not have a native Whisper-compatible endpoint in standard setups usually,
      // so if provider is ollama, we still need OPENAI_API_KEY for Whisper if they want voice.
      // Or they can configure a local Whisper API. For simplicity, we fallback to OpenAI for audio.
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("OpenAI API key not configured for audio transcription");
      
      const openai = new OpenAI({ apiKey });
      const file = await toFile(audioBuffer, "audio.webm", { type: mimeType });
      
      const transcription = await openai.audio.transcriptions.create({
        file,
        model: "whisper-1",
      });
      return transcription.text;
    }
    throw new Error("Unsupported AI provider for transcription");
  } catch (error) {
    console.error("Transcription error:", error);
    throw new Error("Failed to transcribe audio");
  }
}

export async function textToSpeech(text: string): Promise<Buffer | null> {
  const provider = getProvider();

  try {
    if (provider === "gemini") {
      // Gemini doesn't currently offer a stable TTS API via the Node SDK.
      // Return null to signify no audio available (client handles gracefully)
      return null;
    } else if (provider === "openai" || provider === "ollama") {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) return null; // Gracefully fallback to text-only if no OpenAI key for TTS
      
      const openai = new OpenAI({ apiKey });
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: text,
        response_format: "pcm", // use PCM for streaming playback
      });
      
      return Buffer.from(await mp3.arrayBuffer());
    }
    return null;
  } catch (error) {
    console.error("Text-to-speech error:", error);
    return null; // Graceful failure — client will just show text
  }
}

// ---------------------------------------------------------------------------
// OpenAI
// ---------------------------------------------------------------------------
async function streamOpenAI(
  systemPrompt: string,
  conversationHistory: Array<{ role: string; content: string }>,
  userMessage: string,
  res: Response
): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OpenAI API key not configured. Set OPENAI_API_KEY in your environment."
    );
  }

  const openai = new OpenAI({ apiKey });

  const messages: any[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  const stream = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages,
    stream: true,
    max_completion_tokens: 8192,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    if (content) {
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
}

// ---------------------------------------------------------------------------
// Google Gemini
// ---------------------------------------------------------------------------
async function streamGemini(
  systemPrompt: string,
  conversationHistory: Array<{ role: string; content: string }>,
  userMessage: string,
  res: Response
): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key not configured. Set GEMINI_API_KEY.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
    systemInstruction: systemPrompt,
  });

  const history = conversationHistory.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({ history });
  const result = await chat.sendMessageStream(userMessage);

  for await (const chunk of result.stream) {
    const content = chunk.text();
    if (content) {
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
}

// ---------------------------------------------------------------------------
// Ollama (OpenAI-compatible API)
// Ollama exposes /v1 endpoints compatible with the OpenAI SDK.
// ---------------------------------------------------------------------------
async function streamOllama(
  systemPrompt: string,
  conversationHistory: Array<{ role: string; content: string }>,
  userMessage: string,
  res: Response
): Promise<void> {
  const baseURL = process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1";
  const model = process.env.OLLAMA_MODEL || "llama3.2";

  // Ollama's OpenAI-compatible endpoint doesn't require an API key,
  // but the SDK requires a non-empty string — use a placeholder.
  const ollama = new OpenAI({
    apiKey: "ollama",
    baseURL,
  });

  const messages: any[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  const stream = await ollama.chat.completions.create({
    model,
    messages,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    if (content) {
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
}
