// Wraps the Anthropic API call that powers the "suggest chart content"
// feature: given a freeform prompt and the song's existing chart, asks
// Claude to propose new sections (chords/bars) as structured JSON so the
// app never has to trust free-text ABC output. Called only by
// app/api/songs/[id]/suggest/route.ts.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { Section } from "./types";

const client = new Anthropic();

const ChordSchema = z.object({
  symbol: z.string().describe('Chord symbol, e.g. "Cmaj7", "G/B", "Am".'),
  beat: z.number().describe("1-indexed beat position within the bar."),
});

const BarSchema = z.object({
  chords: z.array(ChordSchema),
});

const SectionSchema = z.object({
  name: z.string().describe('Section name, e.g. "Verse 1", "Chorus".'),
  bars: z.array(BarSchema),
});

const ProposalSchema = z.object({
  sections: z.array(SectionSchema),
});

/** IDs are assigned client/server-side after the AI response comes back — the model only proposes shape and content. */
type ProposedSection = z.infer<typeof SectionSchema>;

/**
 * Calls Claude with the song's current chart (for context) plus the user's
 * freeform request, and returns proposed new section(s). Uses
 * `messages.parse()` with a Zod schema (structured outputs) instead of tool
 * use, since we only need a JSON shape back, not a multi-step tool loop.
 */
export async function suggestSections(
  prompt: string,
  context: { key: string | null; defaultTimeSignature: string; existingSections: Section[] },
): Promise<ProposedSection[]> {
  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 4096,
    output_config: { effort: "medium", format: zodOutputFormat(ProposalSchema) },
    system:
      "You are a songwriting assistant that proposes chord progressions for the chart " +
      "(harmonic outline) layer of a song. Only propose chords, bars, and section names — " +
      "never melody notes or lyrics. Respect the song's key and time signature.",
    messages: [
      {
        role: "user",
        content:
          `Song key: ${context.key ?? "unspecified"}\n` +
          `Time signature: ${context.defaultTimeSignature}\n` +
          `Existing sections: ${JSON.stringify(context.existingSections.map((s) => s.name))}\n\n` +
          `Request: ${prompt}`,
      },
    ],
  });

  if (!response.parsed_output) {
    throw new Error("Claude did not return a parseable chart proposal");
  }
  return response.parsed_output.sections;
}
