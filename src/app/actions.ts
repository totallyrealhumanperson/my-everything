// @ts-nocheck
// TODO: Fix typescript errors
"use server";

import { filterOffensiveLanguage as aiFilter, type FilterOffensiveLanguageInput, type FilterOffensiveLanguageOutput } from "@/ai/flows/filter-offensive-language";

export async function analyzeTweetSentiment(data: FilterOffensiveLanguageInput): Promise<FilterOffensiveLanguageOutput> {
  try {
    const result = await aiFilter(data);
    // Ensure result structure matches FilterOffensiveLanguageOutput, especially boolean and string types
    return {
      isOffensive: !!result.isOffensive, // Coerce to boolean
      rephrasedTweet: result.rephrasedTweet || "", // Ensure string, provide fallback
      explanation: result.explanation || "" // Ensure string, provide fallback
    };
  } catch (error) {
    console.error("Error in analyzeTweetSentiment:", error);
    // Return a default non-offensive structure in case of error to prevent app crash
    return {
      isOffensive: false,
      rephrasedTweet: data.tweet, // Return original tweet
      explanation: "Could not analyze tweet sentiment due to an error."
    };
  }
}

export async function submitTweet(tweetContent: string): Promise<{ success: boolean; message: string; tweetId?: string }> {
  console.log("Attempting to post tweet:", tweetContent);
  if (!tweetContent || tweetContent.trim().length === 0) {
    return { success: false, message: "Tweet content cannot be empty." };
  }
  if (tweetContent.length > 280) {
    return { success: false, message: "Tweet exceeds 280 characters." };
  }

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Simulate a successful post
  const mockTweetId = Math.random().toString(36).substring(2, 15);
  console.log(`Mock Tweet Posted! ID: ${mockTweetId}, Content: "${tweetContent}"`);
  return { success: true, message: "Tweet successfully posted!", tweetId: mockTweetId };
}
