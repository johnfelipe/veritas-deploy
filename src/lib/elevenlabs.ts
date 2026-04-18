// ElevenLabs Text-to-Speech API client

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

// Default voice - Rachel (clear, professional). Overridable via ELEVENLABS_VOICE_ID.
const DEFAULT_VOICE_ID =
  process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

export interface TTSOptions {
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
}

export function isElevenLabsEnabled(): boolean {
  return !!process.env.ELEVENLABS_API_KEY;
}

export async function textToSpeech(
  text: string,
  options: TTSOptions = {}
): Promise<ArrayBuffer | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error("ELEVENLABS_API_KEY not configured");
    return null;
  }

  const {
    voiceId = DEFAULT_VOICE_ID,
    modelId = "eleven_multilingual_v2",
    stability = 0.5,
    similarityBoost = 0.75,
  } = options;

  try {
    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("ElevenLabs API error:", response.status, error);
      return null;
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.error("Error calling ElevenLabs API:", error);
    return null;
  }
}

export async function textToSpeechStream(
  text: string,
  options: TTSOptions = {}
): Promise<ReadableStream<Uint8Array> | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error("ELEVENLABS_API_KEY not configured");
    return null;
  }

  const {
    voiceId = DEFAULT_VOICE_ID,
    modelId = "eleven_multilingual_v2",
    stability = 0.5,
    similarityBoost = 0.75,
  } = options;

  try {
    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}/stream`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("ElevenLabs streaming API error:", response.status, error);
      return null;
    }

    return response.body;
  } catch (error) {
    console.error("Error streaming from ElevenLabs:", error);
    return null;
  }
}
