
"use server";

import { filterOffensiveLanguage as aiFilter, type FilterOffensiveLanguageInput, type FilterOffensiveLanguageOutput } from "@/ai/flows/filter-offensive-language";
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, deleteDoc, doc, Timestamp, getCountFromServer } from 'firebase/firestore';

export interface Draft {
  id: string;
  userId: string;
  content: string;
  createdAt: Timestamp; // Firestore Timestamp
}

export interface DraftClient extends Omit<Draft, 'createdAt'> {
  createdAt: string; // ISO string for client-side display
}

export interface PostedTweet {
  userId: string;
  content: string;
  xTweetId: string;
  postedAt: Timestamp;
}


export async function analyzeTweetSentiment(data: FilterOffensiveLanguageInput): Promise<FilterOffensiveLanguageOutput> {
  try {
    const result = await aiFilter(data);
    return {
      isOffensive: !!result.isOffensive,
      rephrasedTweet: result.rephrasedTweet || "",
      explanation: result.explanation || ""
    };
  } catch (error) {
    console.error("[actions.ts analyzeTweetSentiment] Error:", error);
    return {
      isOffensive: false,
      rephrasedTweet: data.tweet,
      explanation: "Could not analyze tweet sentiment due to an error."
    };
  }
}

const getTwitterClient = async () => {
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
  return client.readWrite;
};


export async function submitTweet(tweetContent: string, userId: string): Promise<{ success: boolean; message: string; tweetId?: string }> {
  console.log(`[actions.ts submitTweet] Attempting to post tweet for userId ${userId}:`, tweetContent);
  if (!userId) {
    console.error("[actions.ts submitTweet] Error: User ID not provided.");
    return { success: false, message: "User ID not provided." };
  }
  if (!tweetContent || tweetContent.trim().length === 0) {
    return { success: false, message: "Note content cannot be empty." };
  }
  if (tweetContent.length > 280) {
    return { success: false, message: "Note exceeds 280 characters." };
  }

  try {
    const twitterClient = await getTwitterClient();
    const { data: createdTweet } = await twitterClient.v2.tweet(tweetContent);
    console.log(`[actions.ts submitTweet] Tweet Posted! ID: ${createdTweet.id}, Content: "${createdTweet.text}"`);

    try {
      await addDoc(collection(db, "postedTweets"), {
        userId: userId,
        content: tweetContent,
        xTweetId: createdTweet.id,
        postedAt: serverTimestamp(),
      });
      console.log(`[actions.ts submitTweet] Tweet metadata saved to Firestore for userId ${userId}.`);
    } catch (firestoreError) {
      console.error("[actions.ts submitTweet] Error saving tweet metadata to Firestore:", firestoreError);
    }

    return { success: true, message: "Tweet successfully posted to X!", tweetId: createdTweet.id };

  } catch (error) {
    console.error("[actions.ts submitTweet] Error posting tweet:", error);
    let errorMessage = "Failed to post tweet to X. Please try again.";

    const apiError = error as any;
    if (apiError && typeof apiError === 'object' && 'isApiError' in apiError && apiError.isApiError) {
        if (apiError.data && (apiError.data.detail || apiError.data.title)) {
            errorMessage = apiError.data.detail || apiError.data.title || "X API Error";
        }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { success: false, message: errorMessage };
  }
}

export async function saveDraft(noteContent: string, userId: string): Promise<{ success: boolean; message: string; draftId?: string }> {
  console.log(`[actions.ts saveDraft] Attempting to save draft for userId: ${userId}`);
  if (!userId) {
    console.error("[actions.ts saveDraft] Error: User not authenticated.");
    return { success: false, message: "User not authenticated." };
  }
  if (!noteContent || noteContent.trim().length === 0) {
    console.warn("[actions.ts saveDraft] Warning: Draft content cannot be empty.");
    return { success: false, message: "Draft content cannot be empty." };
  }
  if (noteContent.length > 280) {
    console.warn("[actions.ts saveDraft] Warning: Draft cannot exceed 280 characters.");
    return { success: false, message: "Draft cannot exceed 280 characters." };
  }

  try {
    const docRef = await addDoc(collection(db, "drafts"), {
      userId: userId,
      content: noteContent,
      createdAt: serverTimestamp(),
    });
    console.log(`[actions.ts saveDraft] Draft saved successfully! Draft ID: ${docRef.id}`);
    return { success: true, message: "Draft saved successfully!", draftId: docRef.id };
  } catch (error) {
    console.error("[actions.ts saveDraft] Error saving draft:", error);
    return { success: false, message: "Failed to save draft. Please try again." };
  }
}

export async function getDrafts(userId: string): Promise<DraftClient[]> {
  if (!userId) {
    console.log("[actions.ts getDrafts] No user ID provided. Returning empty array.");
    return [];
  }
  console.log(`[actions.ts getDrafts] Attempting to fetch drafts for userId: ${userId}`);
  try {
    const draftsRef = collection(db, "drafts");
    const q = query(draftsRef, where("userId", "==", userId), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    console.log(`[actions.ts getDrafts] Query for userId ${userId} - Snapshot empty: ${querySnapshot.empty}, Size: ${querySnapshot.size}`);

    if (querySnapshot.empty) {
      console.log(`[actions.ts getDrafts] Firestore query returned no documents for userId: ${userId}.`);
      return [];
    }

    const drafts: DraftClient[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      console.log(`[actions.ts getDrafts] Raw data for draft ${docSnap.id}:`, JSON.stringify(data));
      
      let createdAtISO = new Date().toISOString(); // Fallback
      if (data.createdAt && typeof data.createdAt.seconds === 'number') {
         try {
            createdAtISO = new Date(data.createdAt.seconds * 1000 + (data.createdAt.nanoseconds || 0) / 1000000).toISOString();
         } catch (e) {
            console.error(`[actions.ts getDrafts] Error converting Firestore Timestamp for draft ${docSnap.id}`, e);
         }
      } else if (data.createdAt) { // Handle if createdAt is already a string or number (e.g. from older data)
        console.warn(`[actions.ts getDrafts] Unusual or non-Timestamp createdAt format for draft ${docSnap.id}:`, data.createdAt);
        try {
          const parsedDate = new Date(data.createdAt);
          if (!isNaN(parsedDate.getTime())) {
            createdAtISO = parsedDate.toISOString();
          }
        } catch (e) {
          console.error(`[actions.ts getDrafts] Error parsing non-standard date for draft ${docSnap.id}`, e);
        }
      }


      drafts.push({
        id: docSnap.id,
        userId: data.userId || "UNKNOWN_USER_ID_IN_DRAFT",
        content: data.content || "NO_CONTENT_IN_DRAFT",
        createdAt: createdAtISO,
      });
    });
    console.log(`[actions.ts getDrafts] Successfully processed ${drafts.length} drafts for client.`);
    return drafts;
  } catch (error: any) {
    console.error("[actions.ts getDrafts] Error fetching or processing drafts:", error.message, error.stack);
    if ((error as any)?.code === 'failed-precondition') {
        console.error("[actions.ts getDrafts] Firestore 'failed-precondition' error. This often means a required composite index is missing or still building. Please check your Firestore indexes for the 'drafts' collection, ensuring an index exists for 'userId' (ASC) and 'createdAt' (DESC).");
    }
    return [];
  }
}

export async function deleteDraft(draftId: string): Promise<{ success: boolean; message: string }> {
  console.log(`[actions.ts deleteDraft] Attempting to delete draft ID: ${draftId}`);
  if (!draftId) {
    console.error("[actions.ts deleteDraft] Error: Draft ID not provided.");
    return { success: false, message: "Draft ID not provided." };
  }
  try {
    await deleteDoc(doc(db, "drafts", draftId));
    console.log(`[actions.ts deleteDraft] Draft deleted successfully! ID: ${draftId}`);
    return { success: true, message: "Draft deleted successfully!" };
  } catch (error) {
    console.error(`[actions.ts deleteDraft] Error deleting draft ID ${draftId}:`, error);
    return { success: false, message: "Failed to delete draft. Please try again." };
  }
}

export async function getPostedTweetCount(userId: string): Promise<number> {
  if (!userId) {
    console.log("[actions.ts getPostedTweetCount] No user ID provided. Returning 0.");
    return 0;
  }
  console.log(`[actions.ts getPostedTweetCount] Attempting to fetch tweet count for userId: ${userId}`);
  try {
    const postedTweetsRef = collection(db, "postedTweets");
    const q = query(postedTweetsRef, where("userId", "==", userId));
    const snapshot = await getCountFromServer(q);
    const count = snapshot.data().count;
    console.log(`[actions.ts getPostedTweetCount] User ${userId} has ${count} posted tweets.`);
    return count;
  } catch (error) {
    console.error(`[actions.ts getPostedTweetCount] Error fetching tweet count for userId ${userId}:`, error);
    if ((error as any)?.code === 'permission-denied') {
        console.error("[actions.ts getPostedTweetCount] Firestore permission denied. Check your security rules for 'postedTweets' collection.");
    }
    return 0;
  }
}
