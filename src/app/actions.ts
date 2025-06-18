// @ts-nocheck
// TODO: Fix typescript errors
"use server";

import { filterOffensiveLanguage as aiFilter, type FilterOffensiveLanguageInput, type FilterOffensiveLanguageOutput } from "@/ai/flows/filter-offensive-language";
import { TwitterApi, type ApiV2Error } from 'twitter-api-v2';

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

const getTwitterClient = () => {
  if (
    !process.env.X_API_KEY ||
    !process.env.X_API_KEY_SECRET ||
    !process.env.X_ACCESS_TOKEN ||
    !process.env.X_ACCESS_TOKEN_SECRET
  ) {
    throw new Error("X API credentials are not fully configured in environment variables.");
  }
  return new TwitterApi({
    appKey: process.env.X_API_KEY,
    appSecret: process.env.X_API_KEY_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.X_ACCESS_TOKEN_SECRET,
  });
};


export async function submitTweet(tweetContent: string): Promise<{ success: boolean; message: string; tweetId?: string }> {
  console.log("Attempting to post tweet:", tweetContent);
  if (!tweetContent || tweetContent.trim().length === 0) {
    return { success: false, message: "Tweet content cannot be empty." };
  }
  if (tweetContent.length > 280) {
    return { success: false, message: "Tweet exceeds 280 characters." };
  }

  try {
    const twitterClient = getTwitterClient();
    const rwClient = twitterClient.readWrite;
    const { data: createdTweet } = await rwClient.v2.tweet(tweetContent);
    console.log(`Tweet Posted! ID: ${createdTweet.id}, Content: "${createdTweet.text}"`);
    return { success: true, message: "Tweet successfully posted!", tweetId: createdTweet.id };
  } catch (error) {
    console.error("Error posting tweet to X:", error);
    let errorMessage = "Failed to post tweet. Please try again.";
    
    // Check if it's an ApiV2Error from twitter-api-v2
    const apiError = error as ApiV2Error;
    if (apiError.isApiError && apiError.data && (apiError.data.detail || apiError.data.title)) {
       errorMessage = apiError.data.detail || apiError.data.title || "X API Error";
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return { success: false, message: errorMessage };
  }
}
