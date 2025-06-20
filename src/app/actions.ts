
"use server";

import { filterOffensiveLanguage as aiFilter, type FilterOffensiveLanguageInput, type FilterOffensiveLanguageOutput } from "@/ai/flows/filter-offensive-language";
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, deleteDoc, doc, Timestamp } from 'firebase/firestore';
// Removed unused: import type { User } from 'firebase/auth';

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
  return client.readWrite;
};


export async function submitTweet(tweetContent: string): Promise<{ success: boolean; message: string; tweetId?: string }> {
  console.log("Attempting to post tweet:", tweetContent);
  if (!tweetContent || tweetContent.trim().length === 0) {
    return { success: false, message: "Note content cannot be empty." };
  }
  if (tweetContent.length > 280) { // X character limit
    return { success: false, message: "Note exceeds 280 characters." };
  }

  try {
    const twitterClient = await getTwitterClient();
    const { data: createdTweet } = await twitterClient.v2.tweet(tweetContent);
    console.log(`Tweet Posted! ID: ${createdTweet.id}, Content: "${createdTweet.text}"`);
    return { success: true, message: "Tweet successfully posted to X!", tweetId: createdTweet.id };

  } catch (error) {
    console.error("Error posting tweet:", error);
    let errorMessage = "Failed to post tweet to X. Please try again.";

    const apiError = error as any;
    if (apiError && typeof apiError === 'object' && apiError.isApiError) {
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
  if (!userId) {
    return { success: false, message: "User not authenticated." };
  }
  if (!noteContent || noteContent.trim().length === 0) {
    return { success: false, message: "Draft content cannot be empty." };
  }
  if (noteContent.length > 280) {
    return { success: false, message: "Draft cannot exceed 280 characters." };
  }

  try {
    const docRef = await addDoc(collection(db, "drafts"), {
      userId: userId,
      content: noteContent,
      createdAt: serverTimestamp(),
    });
    return { success: true, message: "Draft saved successfully!", draftId: docRef.id };
  } catch (error) {
    console.error("Error saving draft:", error);
    return { success: false, message: "Failed to save draft. Please try again." };
  }
}

export async function getDrafts(userId: string): Promise<DraftClient[]> {
  if (!userId) {
    console.log("No user ID provided to getDrafts");
    return [];
  }
  console.log(`Attempting to fetch drafts for userId: ${userId}`);
  try {
    const draftsRef = collection(db, "drafts");
    const q = query(draftsRef, where("userId", "==", userId), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    console.log(`Firestore query returned ${querySnapshot.size} drafts for userId: ${userId}`);

    const drafts: DraftClient[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as Omit<Draft, 'id' | 'userId' | 'content'> & { userId: string; content: string; createdAt: any }; // More flexible type for logging
      console.log(`Processing draft ${doc.id}, raw data:`, JSON.stringify(data));

      let createdAtISO = new Date().toISOString(); // Default to now if conversion fails or field is missing

      if (data.createdAt && typeof (data.createdAt as Timestamp).toDate === 'function') {
        try {
          createdAtISO = (data.createdAt as Timestamp).toDate().toISOString();
        } catch (e) {
          console.error(`Error converting Firestore Timestamp to ISOString for draft ${doc.id}:`, e);
          // createdAtISO remains the default (current time)
        }
      } else if (data.createdAt) {
        // If createdAt exists but is not a Timestamp object (e.g., already a string or number)
        console.warn(`Draft ${doc.id} has 'createdAt' field, but it's not a Firestore Timestamp object. Value:`, data.createdAt);
        if (typeof data.createdAt === 'string') {
          try {
            // Attempt to parse if it's a valid ISO string
            const parsedDate = new Date(data.createdAt);
            if (!isNaN(parsedDate.getTime())) {
              createdAtISO = parsedDate.toISOString();
            } else {
              console.warn(`Draft ${doc.id} 'createdAt' string is not a valid ISO date. Defaulting to current time.`);
            }
          } catch (e) {
            console.warn(`Error parsing 'createdAt' string for draft ${doc.id}. Defaulting.`, e);
          }
        } else if (typeof data.createdAt === 'number') { // Handle if it's a Unix timestamp (milliseconds)
             try {
                createdAtISO = new Date(data.createdAt).toISOString();
             } catch(e) {
                console.warn(`Error converting numeric 'createdAt' for draft ${doc.id}. Defaulting.`, e);
             }
        }
      } else {
         console.warn(`Draft ${doc.id} is missing 'createdAt' field. Defaulting to current time.`);
      }

      drafts.push({
        id: doc.id,
        userId: data.userId,
        content: data.content,
        createdAt: createdAtISO,
      });
    });
    console.log(`Successfully processed ${drafts.length} drafts for client:`, drafts.map(d => d.id));
    return drafts;
  } catch (error) {
    console.error("Error fetching or processing drafts:", error);
    // Check if it's a Firestore permission error specifically
    if ((error as any)?.code === 'permission-denied') {
        console.error("Firestore permission denied. Check your security rules.");
    }
    return []; // Return empty array on error
  }
}

export async function deleteDraft(draftId: string): Promise<{ success: boolean; message: string }> {
  if (!draftId) {
    return { success: false, message: "Draft ID not provided." };
  }
  try {
    await deleteDoc(doc(db, "drafts", draftId));
    return { success: true, message: "Draft deleted successfully!" };
  } catch (error) {
    console.error("Error deleting draft:", error);
    return { success: false, message: "Failed to delete draft. Please try again." };
  }
}

