
"use server";

import { filterOffensiveLanguage as aiFilter, type FilterOffensiveLanguageInput, type FilterOffensiveLanguageOutput } from "@/ai/flows/filter-offensive-language";
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, deleteDoc, doc, Timestamp } from 'firebase/firestore';

export interface Draft {
  id: string;
  userId: string;
  content: string;
  createdAt: Timestamp; // Firestore Timestamp
}

export interface DraftClient extends Omit<Draft, 'createdAt'> {
  createdAt: string; // ISO string for client-side display
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
  return client.readWrite;
};


export async function submitTweet(tweetContent: string): Promise<{ success: boolean; message: string; tweetId?: string }> {
  console.log("[actions.ts submitTweet] Attempting to post tweet:", tweetContent);
  if (!tweetContent || tweetContent.trim().length === 0) {
    return { success: false, message: "Note content cannot be empty." };
  }
  if (tweetContent.length > 280) { // X character limit
    return { success: false, message: "Note exceeds 280 characters." };
  }

  try {
    const twitterClient = await getTwitterClient();
    const { data: createdTweet } = await twitterClient.v2.tweet(tweetContent);
    console.log(`[actions.ts submitTweet] Tweet Posted! ID: ${createdTweet.id}, Content: "${createdTweet.text}"`);
    return { success: true, message: "Tweet successfully posted to X!", tweetId: createdTweet.id };

  } catch (error) {
    console.error("[actions.ts submitTweet] Error posting tweet:", error);
    let errorMessage = "Failed to post tweet to X. Please try again.";

    const apiError = error as any;
    if (apiError && typeof apiError === 'object' && 'isApiError' in apiError && apiError.isApiError) {
        // Check if it's an ApiV2Error from twitter-api-v2
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
    console.log("[actions.ts getDrafts] No user ID provided to getDrafts. Returning empty array.");
    return [];
  }
  console.log(`[actions.ts getDrafts] Attempting to fetch drafts for userId: ${userId}`);
  try {
    const draftsRef = collection(db, "drafts");
    // Temporarily remove orderBy to diagnose indexing issue
    const q = query(draftsRef, where("userId", "==", userId) /*, orderBy("createdAt", "desc")*/);
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log(`[actions.ts getDrafts] Firestore query returned no documents (empty) for userId: ${userId}`);
    } else {
      console.log(`[actions.ts getDrafts] Firestore query returned ${querySnapshot.size} documents for userId: ${userId}`);
    }

    const drafts: DraftClient[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`[actions.ts getDrafts] Processing draft ${doc.id}, raw data:`, JSON.stringify(data));

      let createdAtISO = new Date().toISOString(); 

      if (data.createdAt && typeof (data.createdAt as Timestamp).toDate === 'function') {
        try {
          createdAtISO = (data.createdAt as Timestamp).toDate().toISOString();
        } catch (e) {
          console.error(`[actions.ts getDrafts] Error converting Firestore Timestamp to ISOString for draft ${doc.id}:`, e);
        }
      } else if (data.createdAt) {
        console.warn(`[actions.ts getDrafts] Draft ${doc.id} has 'createdAt' field, but it's not a Firestore Timestamp object. Value:`, data.createdAt);
        if (typeof data.createdAt === 'string') {
          try {
            const parsedDate = new Date(data.createdAt);
            if (!isNaN(parsedDate.getTime())) {
              createdAtISO = parsedDate.toISOString();
            } else {
               console.warn(`[actions.ts getDrafts] Draft ${doc.id} 'createdAt' string is not a valid ISO date. Defaulting to current time.`);
            }
          } catch (e) {
             console.warn(`[actions.ts getDrafts] Error parsing 'createdAt' string for draft ${doc.id}. Defaulting.`, e);
          }
        } else if (typeof data.createdAt === 'number') { 
             try {
                createdAtISO = new Date(data.createdAt).toISOString();
             } catch(e) {
                 console.warn(`[actions.ts getDrafts] Error converting numeric 'createdAt' for draft ${doc.id}. Defaulting.`, e);
             }
        }
      } else {
         console.warn(`[actions.ts getDrafts] Draft ${doc.id} is missing 'createdAt' field. Defaulting to current time.`);
      }

      drafts.push({
        id: doc.id,
        userId: data.userId,
        content: data.content,
        createdAt: createdAtISO,
      });
    });
    console.log(`[actions.ts getDrafts] Successfully processed ${drafts.length} drafts for client:`, drafts.map(d => d.id).join(', '));
    return drafts;
  } catch (error) {
    console.error("[actions.ts getDrafts] Error fetching or processing drafts:", error);
    if ((error as any)?.code === 'permission-denied') {
        console.error("[actions.ts getDrafts] Firestore permission denied. Check your security rules.");
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
