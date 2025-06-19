
"use server";

import { filterOffensiveLanguage as aiFilter, type FilterOffensiveLanguageInput, type FilterOffensiveLanguageOutput } from "@/ai/flows/filter-offensive-language";
// Static imports for twitter-api-v2 are removed and will be dynamically imported.

export async function analyzeTweetSentiment(data: FilterOffensiveLanguageInput): Promise<FilterOffensiveLanguageOutput> {
  try {
    const result = await aiFilter(data);
    return {
      isOffensive: !!result.isOffensive,
      rephrasedTweet: result.rephrasedTweet || "",
      explanation: result.explanation || ""
    };
  } catch (error) {
    console.error("Error in analyzeTweetSentiment:", error);
    return {
      isOffensive: false,
      rephrasedTweet: data.tweet,
      explanation: "Could not analyze tweet sentiment due to an error."
    };
  }
}

const getTwitterClient = async () => {
  // Dynamically import TwitterApi only when the function is called
  const { TwitterApi } = await import('twitter-api-v2');

  if (
    !process.env.X_API_KEY ||
    !process.env.X_API_KEY_SECRET ||
    !process.env.X_ACCESS_TOKEN ||
    !process.env.X_ACCESS_TOKEN_SECRET
  ) {
    throw new Error("X API credentials are not fully configured in environment variables. Please check your .env file.");
  }
  const client = new TwitterApi({
    appKey: process.env.X_API_KEY as string,
    appSecret: process.env.X_API_KEY_SECRET as string,
    accessToken: process.env.X_ACCESS_TOKEN as string,
    accessSecret: process.env.X_ACCESS_TOKEN_SECRET as string,
  });
  return client.readWrite; // The type of readWrite client will be inferred
};


export async function submitTweet(tweetContent: string): Promise<{ success: boolean; message: string; tweetId?: string }> {
  console.log("Attempting to post tweet:", tweetContent); // Keep for debugging
  if (!tweetContent || tweetContent.trim().length === 0) {
    return { success: false, message: "Note content cannot be empty." };
  }
  // Max length check can be removed if not relevant for "notes" vs "tweets"
  // if (tweetContent.length > 280) {
  //   return { success: false, message: "Note exceeds 280 characters." };
  // }

  try {
    // For "Personal Notes", we might not actually call Twitter API.
    // Simulating a save operation for now.
    // If X integration is still desired, uncomment the X API call.

    // const twitterClient = await getTwitterClient();
    // const { data: createdTweet } = await twitterClient.v2.tweet(tweetContent);
    // console.log(`Tweet Posted! ID: ${createdTweet.id}, Content: "${createdTweet.text}"`);
    // return { success: true, message: "Tweet successfully posted!", tweetId: createdTweet.id };
    
    // Simulate saving a note
    console.log(`Note saved (simulated): ${tweetContent}`);
    // In a real app, you'd save this to Firebase Firestore here, associated with the logged-in user.
    return { success: true, message: "Note successfully saved!" };

  } catch (error) {
    console.error("Error saving note:", error);
    let errorMessage = "Failed to save note. Please try again.";
    
    const apiError = error as any; 
    if (apiError && typeof apiError === 'object' && apiError.isApiError) {
      if (apiError.data && (apiError.data.detail || apiError.data.title)) {
        errorMessage = apiError.data.detail || apiError.data.title || "X API Error (if used)";
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return { success: false, message: errorMessage };
  }
}

