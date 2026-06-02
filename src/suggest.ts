import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

const CONTEXT_DESCRIPTIONS: Record<string, string> = {
  git_push: "just pushed or committed code",
  victory: "tests just passed or a milestone was reached",
  chill: "winding down, taking a break, or relaxing",
  focus: "needs to concentrate on deep work",
  uplifting: "needs energy and motivation",
};

export async function suggestSong(context: string, hint: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not set");
  }

  if (!client) {
    client = new Anthropic();
  }

  const contextDesc = CONTEXT_DESCRIPTIONS[context] ?? context;
  const hintPart = hint ? ` The specific event was: "${hint}".` : "";

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 60,
    messages: [{
      role: "user",
      content: `A developer ${contextDesc}.${hintPart} Suggest ONE song to play on Spotify for this moment. Reply with ONLY the Spotify search query (track name + artist), nothing else. Be creative and varied — avoid the most obvious choices.`,
    }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text.trim() : "";
  return text || "celebration music";
}
