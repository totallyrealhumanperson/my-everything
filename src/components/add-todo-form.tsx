
'use client';

import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { addTodo, getTags, type TodoClient, type Tag } from '@/app/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Loader2, PlusCircle, Tag as TagIcon, ChevronDown } from 'lucide-react';
import { Label } from './ui/label';

const formSchema = z.object({
  text: z.string().min(1, 'Task cannot be empty.'),
  priority: z.enum(['Low', 'Medium', 'High']),
  tags: z.array(z.string()).default([]),
});

type FormValues = z.infer<typeof formSchema>;

interface AddTodoFormProps {
  onTodoAdded: (newTodo: TodoClient) => void;
}

export function AddTodoForm({ onTodoAdded }: AddTodoFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { text: '', priority: 'Medium', tags: [] },
  });

  const selectedTags = form.watch('tags');

  useEffect(() => {
    if (user) {
      getTags(user.uid).then(setAvailableTags);
    }
  }, [user]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in.', variant: 'destructive' });
      return;
    }
    
    setIsPending(true);
    try {
      const newTodo = await addTodo(data.text, user.uid, data.priority, data.tags);
      if (newTodo) {
        toast({ title: 'Success', description: 'Task added successfully.' });
        onTodoAdded(newTodo);
        form.reset();
      } else {
        throw new Error('Failed to create task.');
      }
    } catch (error) {
      console.error("[AddTodoForm] Error adding todo:", error);
      toast({ title: 'Error', description: 'Could not add the task.', variant: 'destructive' });
    } finally {
      setIsPending(false);
    }
  };

  const handleTagSelect = (tagName: string) => {
    const currentTags = form.getValues('tags');
    const newTags = currentTags.includes(tagName)
      ? currentTags.filter((t) => t !== tagName)
      : [...currentTags, tagName];
    form.setValue('tags', newTags, { shouldValidate: true });
  };

  return (
    <Card className="w-full max-w-2xl shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-headline">
          <PlusCircle className="h-5 w-5 text-primary" />
          Add a New Task
        </CardTitle>
        <CardDescription>What do you need to get done?</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid sm:grid-cols-[1fr_auto_auto] gap-2 items-start">
                <div className="grid gap-1.5">
                    <Label htmlFor="text" className="sr-only">Task description</Label>
                    <Input
                        id="text"
                        placeholder="e.g., Finish the prototype"
                        {...form.register('text')}
                        disabled={isPending}
                    />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="priority" className="sr-only">Priority</Label>
                    <Select
                        value={form.watch('priority')}
                        onValueChange={(value) => form.setValue('priority', value as 'Low' | 'Medium' | 'High')}
                        disabled={isPending}
                    >
                        <SelectTrigger id="priority" className="w-[120px]">
                            <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Low">Low</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-1.5">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-[120px]" disabled={isPending || availableTags.length === 0}>
                                <TagIcon className="mr-2 h-4 w-4" />
                                Tags
                                {selectedTags.length > 0 && <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs">{selectedTags.length}</span>}
                                <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                            <DropdownMenuLabel>Assign tags</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {availableTags.map((tag) => (
                                <DropdownMenuCheckboxItem
                                    key={tag.id}
                                    checked={selectedTags.includes(tag.name)}
                                    onCheckedChange={() => handleTagSelect(tag.name)}
                                    onSelect={(e) => e.preventDefault()} // prevent menu from closing on item click
                                >
                                    {tag.name}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            {form.formState.errors.text && (
                <p className="text-sm text-destructive">{form.formState.errors.text.message}</p>
            )}
             <div>
                <Button type="submit" disabled={isPending} className="w-full">
                    {isPending ? <Loader2 className="animate-spin" /> : 'Add Task'}
                </Button>
            </div>
        </form>
      </CardContent>
    </Card>
  );
}

    