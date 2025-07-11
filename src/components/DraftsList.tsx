
"use client";

import type { DraftClient } from "@/app/actions";
import { getDrafts, deleteDraft, submitTweet } from "@/app/actions";
import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState, useTransition, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, Send, FileText, AlertTriangle, Eye, ClipboardCopy } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';

interface DraftsListProps {
  refreshKey: number;
  onTweetPosted?: (streakInfo?: { newStreak: number; isFirstPostOfDay: boolean }) => void;
}

export function DraftsList({ refreshKey, onTweetPosted }: DraftsListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<DraftClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, startDeleting] = useTransition();
  const [isPosting, startPosting] = useTransition();
  const [postingDraftId, setPostingDraftId] = useState<string | null>(null);
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);
  const [viewingDraft, setViewingDraft] = useState<DraftClient | null>(null);


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
  }, [user, toast, refreshKey]); 

  useEffect(() => {
    console.log("[DraftsList] useEffect: Triggered. User:", user ? user.uid : "null", "Refresh key:", refreshKey);
    if (user) { 
      fetchDrafts();
    } else {
      setDrafts([]);
      setIsLoading(false);
    }
  }, [user, fetchDrafts, refreshKey]); 

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
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to post.", variant: "destructive" });
      return;
    }
    setPostingDraftId(draft.id);
    startPosting(async () => {
      const result = await submitTweet(draft.content, user.uid); 
      if (result.success) {
        toast({ title: "Success!", description: result.message });
        onTweetPosted?.(result.streakInfo);
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

  const handleCopyDraft = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({ title: "Success", description: "Draft content copied to clipboard!" });
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast({ title: "Error", description: "Failed to copy draft content.", variant: "destructive" });
    }
  };

  if (!user && !isLoading) { 
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
            Cowards Corner
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
    <AlertDialog open={!!viewingDraft} onOpenChange={(open) => {
      if (!open) {
        setViewingDraft(null);
      }
    }}>
      <Card className="w-full max-w-xl mt-8 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-headline">
            <FileText className="h-5 w-5 text-primary" />
            Cowards Corner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Content</TableHead>
                <TableHead className="w-[120px] text-center hidden sm:table-cell">Saved</TableHead>
                <TableHead className="w-[220px] text-right">Actions</TableHead> 
              </TableRow>
            </TableHeader>
            <TableBody>
              {drafts.map((draft) => (
                <TableRow key={draft.id}>
                  <TableCell className="font-medium break-all max-w-[150px] sm:max-w-[200px] md:max-w-xs">
                    {draft.content.length > 50 ? `${draft.content.substring(0, 47)}...` : draft.content}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-center hidden sm:table-cell">
                    {draft.createdAt ? formatDistanceToNow(new Date(draft.createdAt), { addSuffix: true }) : 'Just now'}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setViewingDraft(draft)}
                        aria-label="View Full Draft"
                      >
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </AlertDialogTrigger>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopyDraft(draft.content)}
                      aria-label="Copy Draft Content"
                    >
                      <ClipboardCopy className="h-4 w-4 text-muted-foreground" />
                    </Button>
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

      {viewingDraft && ( 
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Full Draft Content</AlertDialogTitle>
            <AlertDialogDescription className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-words py-2">
              {viewingDraft.content}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setViewingDraft(null)}>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  );
}
