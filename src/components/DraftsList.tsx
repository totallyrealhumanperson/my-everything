
"use client";

import type { DraftClient } from "@/app/actions";
import { getDrafts, deleteDraft, submitTweet } from "@/app/actions";
import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState, useTransition, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, Send, FileText, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';

interface DraftsListProps {
  refreshKey: number; // Used to trigger re-fetch
}

export function DraftsList({ refreshKey }: DraftsListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<DraftClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, startDeleting] = useTransition();
  const [isPosting, startPosting] = useTransition();
  const [postingDraftId, setPostingDraftId] = useState<string | null>(null);
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);


  const fetchDrafts = useCallback(async () => {
    if (!user) {
      console.log("[DraftsList] fetchDrafts: No user, clearing drafts.");
      setDrafts([]);
      setIsLoading(false);
      return;
    }
    console.log(`[DraftsList] fetchDrafts: Called for user ${user.uid}. Refresh key: ${refreshKey}`);
    setIsLoading(true);
    try {
      const userDrafts = await getDrafts(user.uid);
      console.log("[DraftsList] fetchDrafts: Received drafts from server action:", userDrafts);
      setDrafts(userDrafts);
    } catch (error) {
      console.error("[DraftsList] fetchDrafts: Failed to fetch drafts:", error);
      toast({ title: "Error", description: "Could not fetch drafts.", variant: "destructive" });
      setDrafts([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, toast, refreshKey]); // Added refreshKey to dependencies as its change should trigger fetch logic

  useEffect(() => {
    console.log("[DraftsList] useEffect: Triggered. User:", user ? user.uid : "null", "Refresh key:", refreshKey);
    if (user) { // Ensure user is available before fetching
      fetchDrafts();
    } else {
      // If user becomes null (e.g., logout), clear drafts and stop loading
      setDrafts([]);
      setIsLoading(false);
    }
  }, [user, fetchDrafts, refreshKey]); // fetchDrafts is now stable due to useCallback, refreshKey triggers re-fetch

  const handleDeleteDraft = (draftId: string) => {
    setDeletingDraftId(draftId);
    startDeleting(async () => {
      const result = await deleteDraft(draftId);
      if (result.success) {
        toast({ title: "Success", description: result.message });
        setDrafts((prevDrafts) => prevDrafts.filter(d => d.id !== draftId));
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
      setDeletingDraftId(null);
    });
  };

  const handlePostDraftToX = (draft: DraftClient) => {
    setPostingDraftId(draft.id);
    startPosting(async () => {
      const result = await submitTweet(draft.content);
      if (result.success) {
        toast({ title: "Success!", description: result.message });
        const deleteResult = await deleteDraft(draft.id);
        if (deleteResult.success) {
          setDrafts((prevDrafts) => prevDrafts.filter(d => d.id !== draft.id));
        } else {
          toast({ title: "Info", description: "Posted to X, but failed to auto-delete draft.", variant: "default" });
        }
      } else {
        toast({ title: "Error Posting to X", description: result.message, variant: "destructive" });
      }
      setPostingDraftId(null);
    });
  };

  if (!user && !isLoading) { // If not loading and no user, don't render anything
    return null;
  }
  
  if (isLoading) {
    return (
      <div className="w-full max-w-xl mt-8 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading drafts...</p>
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <Card className="w-full max-w-xl mt-8 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-headline">
            <FileText className="h-5 w-5 text-primary" />
            Saved Drafts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium">No drafts saved yet.</p>
            <p>Use the "Save Draft" button above to keep your ideas.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-xl mt-8 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-headline">
          <FileText className="h-5 w-5 text-primary" />
          Saved Drafts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Content</TableHead>
              <TableHead className="w-[120px] text-center hidden sm:table-cell">Saved</TableHead>
              <TableHead className="w-[180px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drafts.map((draft) => (
              <TableRow key={draft.id}>
                <TableCell className="font-medium break-all max-w-[200px] sm:max-w-none">
                  {draft.content.length > 70 ? `${draft.content.substring(0, 67)}...` : draft.content}
                </TableCell>
                <TableCell className="text-muted-foreground text-center hidden sm:table-cell">
                  {draft.createdAt ? formatDistanceToNow(new Date(draft.createdAt), { addSuffix: true }) : 'Just now'}
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handlePostDraftToX(draft)}
                    disabled={isPosting && postingDraftId === draft.id}
                    aria-label="Post to X"
                  >
                    {isPosting && postingDraftId === draft.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 text-primary" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteDraft(draft.id)}
                    disabled={isDeleting && deletingDraftId === draft.id}
                    aria-label="Delete Draft"
                  >
                     {isDeleting && deletingDraftId === draft.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

