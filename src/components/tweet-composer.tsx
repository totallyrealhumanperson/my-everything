
"use client";

import { useState, useTransition, type Dispatch, type SetStateAction } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { analyzeTweetSentiment, submitTweet, saveDraft } from "@/app/actions";
import type { FilterOffensiveLanguageOutput } from "@/ai/flows/filter-offensive-language"; 
import { useAuth } from "@/contexts/auth-context";


import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SendHorizonal, Sparkles, Loader2, Info, Save } from "lucide-react";

const tweetSchema = z.object({
  text: z.string().min(1, "Note cannot be empty.").max(280, "Note cannot exceed 280 characters for X."),
});

type TweetFormData = z.infer<typeof tweetSchema>;

const MAX_CHARS = 280;

interface TweetComposerProps {
  onDraftSaved?: () => void; 
  onTweetPosted?: (streakInfo?: { newStreak: number; isFirstPostOfDay: boolean }) => void;
}

export function TweetComposer({ onDraftSaved, onTweetPosted }: TweetComposerProps) {
  const [isSubmittingToX, startSubmittingToX] = useTransition();
  const [isSavingDraft, startSavingDraft] = useTransition();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const form = useForm<TweetFormData>({
    resolver: zodResolver(tweetSchema),
    defaultValues: {
      text: "",
    },
  });

  const tweetText = form.watch("text");
  const charCount = tweetText.length;

  const [aiResult, setAiResult] = useState<FilterOffensiveLanguageOutput | null>(null);
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [tweetToSubmitToX, setTweetToSubmitToX] = useState("");

  const handleActualSubmitToX = (finalText: string) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to post notes.", variant: "destructive" });
      setShowAiDialog(false);
      return;
    }
    startSubmittingToX(async () => {
      const result = await submitTweet(finalText, user.uid);
      if (result.success) {
        toast({
          title: "Success!",
          description: result.message, 
        });

        if (result.streakInfo?.isFirstPostOfDay) {
          toast({
              title: `Streak Extended! 🔥`,
              description: `You're on a ${result.streakInfo.newStreak}-day streak! Keep it up!`,
          });
        }
        
        form.reset();
        setAiResult(null);
        onTweetPosted?.(result.streakInfo);
      } else {
        toast({
          title: "Error Posting to X",
          description: result.message,
          variant: "destructive",
        });
      }
      setShowAiDialog(false);
    });
  };

  const onSubmitToX: SubmitHandler<TweetFormData> = (data) => {
    setTweetToSubmitToX(data.text); 
    if (!user) {
       toast({ title: "Authentication Error", description: "You must be logged in to post.", variant: "destructive" });
       return;
    }
    startSubmittingToX(async () => {
      const analysisResult = await analyzeTweetSentiment({ tweet: data.text });
      setAiResult(analysisResult);
      if (analysisResult.isOffensive) {
        setShowAiDialog(true);
      } else {
        handleActualSubmitToX(data.text);
      }
    });
  };

  const handleSaveDraft: SubmitHandler<TweetFormData> = (data) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to save drafts.", variant: "destructive" });
      return;
    }
    startSavingDraft(async () => {
      const result = await saveDraft(data.text, user.uid);
      if (result.success) {
        toast({
          title: "Draft Saved!",
          description: result.message,
        });
        form.reset();
        onDraftSaved?.(); 
      } else {
        toast({
          title: "Error Saving Draft",
          description: result.message,
          variant: "destructive",
        });
      }
    });
  };


  const handleAiDialogAction = (action: "use_suggestion" | "post_original" | "edit") => {
    if (action === "use_suggestion" && aiResult?.rephrasedTweet) {
      form.setValue("text", aiResult.rephrasedTweet); 
      handleActualSubmitToX(aiResult.rephrasedTweet); 
    } else if (action === "post_original") {
      handleActualSubmitToX(tweetToSubmitToX); 
    }
    setShowAiDialog(false);
  };

  const getCharCountColor = () => {
    if (charCount > MAX_CHARS) return "text-destructive";
    if (charCount > MAX_CHARS - 20) return "text-orange-500";
    return "text-muted-foreground";
  };

  const isPending = isSubmittingToX || isSavingDraft;

  return (
    <>
      <Card className="w-full max-w-xl shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-headline">
            <Sparkles className="h-6 w-6 text-primary" />
            Send it
          </CardTitle>
        </CardHeader>
        <form>
          <CardContent>
            <div className="grid w-full gap-2">
              <Label htmlFor="tweet-text" className="sr-only">Note content</Label>
              <Textarea
                id="tweet-text"
                placeholder="what are you silly"
                className="min-h-[120px] text-base resize-none focus:ring-2 focus:ring-primary"
                {...form.register("text")}
                aria-invalid={form.formState.errors.text ? "true" : "false"}
                aria-describedby="char-count text-error"
              />
              <div className="flex justify-between items-center">
                <p 
                  id="char-count" 
                  className={`text-sm ${getCharCountColor()}`}
                  aria-live="polite"
                >
                  {charCount}/{MAX_CHARS}
                </p>
                {form.formState.errors.text && (
                  <p id="text-error" className="text-sm text-destructive" role="alert">
                    {form.formState.errors.text.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              type="button"
              variant="outline"
              className="w-full sm:w-auto text-lg py-6"
              onClick={form.handleSubmit(handleSaveDraft)}
              disabled={isPending || charCount === 0 || charCount > MAX_CHARS || !user}
              aria-label="Save as Draft"
            >
              {isSavingDraft ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Save className="mr-2 h-5 w-5" />
              )}
              Save Draft
            </Button>
            <Button 
              type="button"
              className="w-full sm:flex-grow text-lg py-6"
              onClick={form.handleSubmit(onSubmitToX)}
              disabled={isPending || charCount === 0 || charCount > MAX_CHARS || !user}
              aria-label="Analyze and Post Note to X"
            >
              {isSubmittingToX ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <SendHorizonal className="mr-2 h-5 w-5" />
              )}
              Save Draft
            </Button>
          </CardFooter>
        </form>
      </Card>

      {aiResult && (
        <AlertDialog open={showAiDialog} onOpenChange={setShowAiDialog}>
          <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-accent" />
                Content Suggestion
              </AlertDialogTitle>
              <AlertDialogDescription>
                {aiResult.explanation || "Our AI has reviewed your note."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="my-4 space-y-3 text-sm">
              <div>
                <p className="font-medium text-muted-foreground">Original Note:</p>
                <p className="p-2 bg-muted rounded-md break-words">{tweetToSubmitToX}</p>
              </div>
              {aiResult.isOffensive && aiResult.rephrasedTweet && (
                 <div>
                  <p className="font-medium text-accent">Suggested Revision:</p>
                  <p className="p-2 bg-accent/10 border border-accent rounded-md break-words text-accent-foreground">
                    {aiResult.rephrasedTweet}
                  </p>
                </div>
              )}
            </div>

            <AlertDialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => handleAiDialogAction("edit")}>Edit Manually</Button>
              <Button variant="ghost" onClick={() => handleAiDialogAction("post_original")}>Post Original Anyway</Button>
              {aiResult.isOffensive && aiResult.rephrasedTweet && (
                <Button 
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                  onClick={() => handleAiDialogAction("use_suggestion")}
                >
                  Use Suggestion & Post
                </Button>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
