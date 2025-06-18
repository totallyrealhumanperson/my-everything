// @ts-nocheck
// TODO: Fix typescript errors
"use client";

import { useState, useEffect, useTransition } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { analyzeTweetSentiment, submitTweet } from "@/app/actions";
import type { FilterOffensiveLanguageOutput } from "@/ai/flows/filter-offensive-language";

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
import { SendHorizonal, Sparkles, Loader2, Info } from "lucide-react";

const tweetSchema = z.object({
  text: z.string().min(1, "Tweet cannot be empty.").max(280, "Tweet cannot exceed 280 characters."),
});

type TweetFormData = z.infer<typeof tweetSchema>;

const MAX_CHARS = 280;

export function TweetComposer() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  
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
  const [tweetToSubmit, setTweetToSubmit] = useState("");

  const handleActualSubmit = (finalText: string) => {
    startTransition(async () => {
      const result = await submitTweet(finalText);
      if (result.success) {
        toast({
          title: "Success!",
          description: result.message,
        });
        form.reset();
        setAiResult(null);
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
      setShowAiDialog(false);
    });
  };

  const onSubmit: SubmitHandler<TweetFormData> = (data) => {
    setTweetToSubmit(data.text); // Store the current text for potential submission
    startTransition(async () => {
      const analysisResult = await analyzeTweetSentiment({ tweet: data.text });
      setAiResult(analysisResult);
      if (analysisResult.isOffensive) {
        setShowAiDialog(true);
      } else {
        handleActualSubmit(data.text);
      }
    });
  };

  const handleAiDialogAction = (action: "use_suggestion" | "post_original" | "edit") => {
    if (action === "use_suggestion" && aiResult?.rephrasedTweet) {
      form.setValue("text", aiResult.rephrasedTweet); // Update text area
      handleActualSubmit(aiResult.rephrasedTweet); // Directly post suggestion
    } else if (action === "post_original") {
      handleActualSubmit(tweetToSubmit); // Post original text that triggered dialog
    }
    // For "edit", just closing the dialog is enough, user edits manually.
    setShowAiDialog(false);
  };

  const getCharCountColor = () => {
    if (charCount > MAX_CHARS) return "text-destructive";
    if (charCount > MAX_CHARS - 20) return "text-orange-500";
    return "text-muted-foreground";
  };

  return (
    <>
      <Card className="w-full max-w-xl shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-headline">
            <Sparkles className="h-6 w-6 text-primary" />
            Compose Tweet
          </CardTitle>
          <CardDescription>Craft your message and share it with the world (via API).</CardDescription>
        </CardHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent>
            <div className="grid w-full gap-2">
              <Label htmlFor="tweet-text" className="sr-only">Tweet content</Label>
              <Textarea
                id="tweet-text"
                placeholder="What's happening?"
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
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full text-lg py-6"
              disabled={isPending || charCount === 0 || charCount > MAX_CHARS}
              aria-label="Analyze and Post Tweet"
            >
              {isPending ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <SendHorizonal className="mr-2 h-5 w-5" />
              )}
              Analyze & Post
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
                {aiResult.explanation || "Our AI has reviewed your tweet."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="my-4 space-y-3 text-sm">
              <div>
                <p className="font-medium text-muted-foreground">Original Tweet:</p>
                <p className="p-2 bg-muted rounded-md break-words">{tweetToSubmit}</p>
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
