
'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { addTag, getTags, deleteTag, type Tag } from '@/app/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Tag as TagIcon, Trash2, PlusCircle } from 'lucide-react';
import { Badge } from './ui/badge';

const formSchema = z.object({
  name: z.string().min(1, 'Tag name cannot be empty.').max(25, 'Tag name is too long.'),
});

type FormValues = z.infer<typeof formSchema>;

export function ManageTagsForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [tags, setTags] = useState<Tag[]>([]);
  const [isFetchingTags, setIsFetchingTags] = useState(true);
  const [isAddingTag, startAddingTag] = useTransition();
  const [isDeletingTag, startDeletingTag] = useTransition();
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '' },
  });

  const fetchTags = useCallback(async () => {
    if (!user) return;
    setIsFetchingTags(true);
    try {
      const userTags = await getTags(user.uid);
      setTags(userTags.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error("[ManageTagsForm] Error fetching tags:", error);
      toast({ title: 'Error', description: 'Could not load your tags.', variant: 'destructive' });
    } finally {
      setIsFetchingTags(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (!user) return;

    startAddingTag(async () => {
      try {
        const newTag = await addTag(data.name, user.uid);
        if (newTag) {
          // Check if tag is already in state to avoid duplicates from race conditions
          if (!tags.some(t => t.id === newTag.id)) {
            setTags(prevTags => [...prevTags, newTag].sort((a, b) => a.name.localeCompare(b.name)));
          }
          toast({ title: 'Success', description: `Tag "${newTag.name}" added.` });
          form.reset();
        } else {
          throw new Error('Tag might already exist or failed to be created.');
        }
      } catch (error) {
        console.error("[ManageTagsForm] Error adding tag:", error);
        toast({ title: 'Error', description: 'Could not add the tag. It may already exist.', variant: 'destructive' });
      }
    });
  };
  
  const handleDeleteTag = (tagId: string) => {
    setDeletingTagId(tagId);
    startDeletingTag(async () => {
        const result = await deleteTag(tagId);
        if (result.success) {
            setTags(prev => prev.filter(t => t.id !== tagId));
            toast({title: "Success", description: "Tag deleted."});
        } else {
            toast({title: "Error", description: "Failed to delete tag.", variant: "destructive"});
        }
        setDeletingTagId(null);
    });
  };

  return (
    <Card className="w-full max-w-2xl shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-headline">
          <TagIcon className="h-5 w-5 text-primary" />
          Manage Tags
        </CardTitle>
        <CardDescription>Add or remove tags available for your tasks.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-start gap-2 mb-4">
          <div className="grid flex-grow gap-1.5">
            <Input
              id="name"
              placeholder="e.g., #work"
              {...form.register('name')}
              disabled={isAddingTag}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <Button type="submit" disabled={isAddingTag}>
            {isAddingTag ? <Loader2 className="animate-spin" /> : <PlusCircle />}
            <span className="hidden sm:inline ml-2">Add Tag</span>
          </Button>
        </form>

        <div className="mt-6">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Your Tags:</h4>
          {isFetchingTags ? (
             <div className="flex justify-center items-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.length > 0 ? (
                tags.map((tag) => (
                  <Badge key={tag.id} variant="secondary" className="pl-3 pr-1 text-sm group">
                    {tag.name}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 ml-1 -mr-1 group-hover:bg-destructive/20"
                        onClick={() => handleDeleteTag(tag.id)}
                        disabled={isDeletingTag && deletingTagId === tag.id}
                        aria-label={`Delete tag "${tag.name}"`}
                    >
                        {isDeletingTag && deletingTagId === tag.id 
                            ? <Loader2 className="h-3 w-3 animate-spin text-destructive"/> 
                            : <Trash2 className="h-3 w-3 text-destructive/50 group-hover:text-destructive" />
                        }
                    </Button>
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No tags created yet.</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
