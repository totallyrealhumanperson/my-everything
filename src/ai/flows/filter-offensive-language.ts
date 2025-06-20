
'use server';

/**
 * @fileOverview An AI agent that filters offensive language and provides suggestions for rephrasing.
 *
 * - filterOffensiveLanguage - A function that handles the language filtering process.
 * - FilterOffensiveLanguageInput - The input type for the filterOffensiveLanguage function.
 * - FilterOffensiveLanguageOutput - The return type for the filterOffensiveLanguage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
// Removed unused Timestamp import


const FilterOffensiveLanguageInputSchema = z.object({
  tweet: z.string().describe('The tweet content to be filtered.'),
});
export type FilterOffensiveLanguageInput = z.infer<typeof FilterOffensiveLanguageInputSchema>;

const FilterOffensiveLanguageOutputSchema = z.object({
  isOffensive: z
    .boolean()
    .describe('Whether the tweet is determined to contain offensive language.'),
  rephrasedTweet: z
    .string()
    .describe('A rephrased version of the tweet, free of offensive language.'),
  explanation: z.string().describe('Explanation of why the tweet was flagged and suggestions.'),
});
export type FilterOffensiveLanguageOutput = z.infer<typeof FilterOffensiveLanguageOutputSchema>;

export async function filterOffensiveLanguage(
  input: FilterOffensiveLanguageInput
): Promise<FilterOffensiveLanguageOutput> {
  return filterOffensiveLanguageFlow(input);
}

// Removed unused DraftClient interface definition


const prompt = ai.definePrompt({
  name: 'filterOffensiveLanguagePrompt',
  input: {schema: FilterOffensiveLanguageInputSchema},
  output: {schema: FilterOffensiveLanguageOutputSchema},
  prompt: `You are an AI assistant designed to detect and filter offensive language in tweets.

  Analyze the following tweet and determine if it contains any potentially offensive or harmful language. If it does, provide a rephrased version of the tweet that is free of offensive language, and explain why the original tweet was flagged and provide suggestions for improvement.

  Tweet: {{{tweet}}}

  Respond in JSON format.
  `,
});

const filterOffensiveLanguageFlow = ai.defineFlow(
  {
    name: 'filterOffensiveLanguageFlow',
    inputSchema: FilterOffensiveLanguageInputSchema,
    outputSchema: FilterOffensiveLanguageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

