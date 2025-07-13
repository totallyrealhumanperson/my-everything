
"use server";

import { filterOffensiveLanguage as aiFilter, type FilterOffensiveLanguageInput, type FilterOffensiveLanguageOutput } from "@/ai/flows/filter-offensive-language";
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, deleteDoc, doc, Timestamp, getCountFromServer, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { format, isSameDay, isYesterday } from 'date-fns';

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

export interface UserStreak {
  userId: string;
  currentStreak: number;
  lastPostDate: string; // YYYY-MM-DD format
}

export interface UserStats {
  tweetCount: number;
  streakCount: number;
}

export interface Todo {
  id: string;
  userId: string;
  text: string;
  completed: boolean;
  createdAt: Timestamp;
  priority: 'Low' | 'Medium' | 'High';
  tags: string[];
}

export interface TodoClient extends Omit<Todo, 'createdAt'> {
    createdAt: string;
}

export interface Tag {
    id: string;
    userId: string;
    name: string;
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


async function _updateUserStreak(userId: string): Promise<{ newStreak: number; isFirstPostOfDay: boolean }> {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const streakRef = doc(db, "userStreaks", userId);

  try {
    const streakSnap = await getDoc(streakRef);

    if (!streakSnap.exists()) {
      const newStreakData: UserStreak = { userId, currentStreak: 1, lastPostDate: todayStr };
      await setDoc(streakRef, newStreakData);
      return { newStreak: 1, isFirstPostOfDay: true };
    } else {
      const streakData = streakSnap.data() as UserStreak;
      const lastPostDate = new Date(streakData.lastPostDate);

      if (isSameDay(lastPostDate, today)) {
        return { newStreak: streakData.currentStreak, isFirstPostOfDay: false };
      } else if (isYesterday(lastPostDate, today)) {
        const newStreak = streakData.currentStreak + 1;
        await updateDoc(streakRef, { currentStreak: newStreak, lastPostDate: todayStr });
        return { newStreak, isFirstPostOfDay: true };
      } else {
        await updateDoc(streakRef, { currentStreak: 1, lastPostDate: todayStr });
        return { newStreak: 1, isFirstPostOfDay: true };
      }
    }
  } catch (error) {
    console.error(`[actions.ts _updateUserStreak] Error updating streak for userId ${userId}:`, error);
    return { newStreak: 0, isFirstPostOfDay: false };
  }
}


export async function submitTweet(tweetContent: string, userId: string): Promise<{ success: boolean; message: string; tweetId?: string; streakInfo?: { newStreak: number; isFirstPostOfDay: boolean } }> {
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
    
    const streakInfo = await _updateUserStreak(userId);
    console.log(`[actions.ts submitTweet] Streak updated for userId ${userId}:`, streakInfo);

    return { success: true, message: "Tweet successfully posted to X!", tweetId: createdTweet.id, streakInfo };

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
    const q = query(draftsRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    console.log(`[actions.ts getDrafts] Query for userId ${userId} - Snapshot empty: ${querySnapshot.empty}, Size: ${querySnapshot.size}`);

    if (querySnapshot.empty) {
      console.log(`[actions.ts getDrafts] Firestore query returned no documents for userId: ${userId}.`);
      return [];
    }

    const draftsData = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        let createdAtISO = new Date().toISOString(); // Fallback
        if (data.createdAt && typeof data.createdAt.seconds === 'number') {
            try {
                createdAtISO = new Date(data.createdAt.seconds * 1000 + (data.createdAt.nanoseconds || 0) / 1000000).toISOString();
            } catch (e) {
                console.error(`[actions.ts getDrafts] Error converting Firestore Timestamp for draft ${docSnap.id}`, e);
            }
        }
        return {
            id: docSnap.id,
            userId: data.userId,
            content: data.content,
            createdAt: createdAtISO,
            createdAtDate: data.createdAt ? new Date(createdAtISO) : new Date(0)
        };
    });
    
    // Sort drafts by date in descending order (newest first)
    draftsData.sort((a, b) => b.createdAtDate.getTime() - a.createdAtDate.getTime());

    console.log(`[actions.ts getDrafts] Successfully processed ${draftsData.length} drafts for client.`);
    return draftsData;
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


export async function getUserStats(userId: string): Promise<UserStats> {
    if (!userId) {
        return { tweetCount: 0, streakCount: 0 };
    }
    const tweetCount = await getPostedTweetCount(userId);
    
    let streakCount = 0;
    try {
        const streakRef = doc(db, "userStreaks", userId);
        const streakSnap = await getDoc(streakRef);
        if (streakSnap.exists()) {
            const streakData = streakSnap.data() as UserStreak;
            // Validate if the streak is still active
            const lastPostDate = new Date(streakData.lastPostDate);
            const today = new Date();
            // The streak is valid if the last post was today or yesterday.
            // We adjust for timezone by ensuring the dates are compared correctly.
            if (isSameDay(lastPostDate, today) || isYesterday(lastPostDate, today)) {
                streakCount = streakData.currentStreak;
            } else {
                streakCount = 0; // Streak is broken
            }
        }
    } catch (error) {
        console.error(`[actions.ts getUserStats] Error fetching streak for userId ${userId}:`, error);
    }

    return { tweetCount, streakCount };
}

// To-Do Actions

export async function getTodos(userId: string): Promise<TodoClient[]> {
    if (!userId) return [];
    try {
        const todosRef = collection(db, 'myToDos');
        const q = query(todosRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(docSnap => {
            const data = docSnap.data() as Omit<Todo, 'id'>;
            return {
                id: docSnap.id,
                userId: data.userId,
                text: data.text,
                completed: data.completed,
                createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
                priority: data.priority || 'Medium',
                tags: data.tags || [],
            };
        });
    } catch (error) {
        console.error("[actions.ts getTodos] Error fetching todos:", error);
        return [];
    }
}

export async function addTodo(
    text: string, 
    userId: string,
    priority: 'Low' | 'Medium' | 'High',
    tags: string[]
): Promise<TodoClient | null> {
    if (!userId || !text.trim()) return null;
    try {
        const docRef = await addDoc(collection(db, 'myToDos'), {
            userId,
            text,
            completed: false,
            createdAt: serverTimestamp(),
            priority,
            tags
        });
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data() as Omit<Todo, 'id'>;
            return {
                id: docSnap.id,
                userId: data.userId,
                text: data.text,
                completed: data.completed,
                createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
                priority: data.priority,
                tags: data.tags,
            };
        }
        return null;
    } catch (error) {
        console.error("[actions.ts addTodo] Error adding todo:", error);
        return null;
    }
}

export async function toggleTodo(todoId: string, completed: boolean): Promise<{ success: boolean }> {
    try {
        await updateDoc(doc(db, 'myToDos', todoId), { completed });
        return { success: true };
    } catch (error) {
        console.error("[actions.ts toggleTodo] Error toggling todo:", error);
        return { success: false };
    }
}

export async function deleteTodo(todoId: string): Promise<{ success: boolean }> {
    try {
        await deleteDoc(doc(db, 'myToDos', todoId));
        return { success: true };
    } catch (error) {
        console.error("[actions.ts deleteTodo] Error deleting todo:", error);
        return { success: false };
    }
}

// Tag Actions

export async function getTags(userId: string): Promise<Tag[]> {
    if (!userId) return [];
    try {
        const tagsRef = collection(db, 'toDoTags');
        const q = query(tagsRef, where('userId', '==', userId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
        } as Tag));
    } catch (error) {
        console.error("[actions.ts getTags] Error fetching tags:", error);
        return [];
    }
}

export async function addTag(name: string, userId: string): Promise<Tag | null> {
    if (!userId || !name.trim()) return null;
    
    const tagsRef = collection(db, 'toDoTags');
    const q = query(tagsRef, where('userId', '==', userId), where('name', '==', name.trim()));
    const existing = await getDocs(q);
    if (!existing.empty) {
        // Tag already exists, just return it
        return { id: existing.docs[0].id, ...existing.docs[0].data() } as Tag;
    }

    try {
        const docRef = await addDoc(tagsRef, { userId, name: name.trim() });
        return { id: docRef.id, userId, name: name.trim() };
    } catch (error) {
        console.error("[actions.ts addTag] Error adding tag:", error);
        return null;
    }
}

export async function deleteTag(tagId: string): Promise<{ success: boolean }> {
    try {
        await deleteDoc(doc(db, 'toDoTags', tagId));
        return { success: true };
    } catch (error) {
        console.error("[actions.ts deleteTag] Error deleting tag:", error);
        return { success: false };
    }
}
