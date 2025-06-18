// use server'
'use server';
/**
 * @fileOverview An AI agent that generates a draft tweet based on a topic or idea.
 *
 * - generateTweet - A function that handles the tweet generation process.
 * - GenerateTweetInput - The input type for the generateTweet function.
 * - GenerateTweetOutput - The return type for the generateTweet function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateTweetInputSchema = z.object({
  topic: z.string().describe('The topic or idea for the tweet.'),
});
export type GenerateTweetInput = z.infer<typeof GenerateTweetInputSchema>;

const GenerateTweetOutputSchema = z.object({
  tweet: z.string().describe('The generated tweet.'),
});
export type GenerateTweetOutput = z.infer<typeof GenerateTweetOutputSchema>;

export async function generateTweet(input: GenerateTweetInput): Promise<GenerateTweetOutput> {
  return generateTweetFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTweetPrompt',
  input: {schema: GenerateTweetInputSchema},
  output: {schema: GenerateTweetOutputSchema},
  prompt: `You are a social media expert specializing in creating engaging tweets.

You will use the following topic to generate a tweet.

Topic: {{{topic}}}

Tweet:`,
});

const generateTweetFlow = ai.defineFlow(
  {
    name: 'generateTweetFlow',
    inputSchema: GenerateTweetInputSchema,
    outputSchema: GenerateTweetOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
