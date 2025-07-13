
'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { addTodo, type TodoClient } from '@/app/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, PlusCircle } from 'lucide-react';
import { Label } from './ui/label';

const formSchema = z.object({
  text: z.string().min(1, 'Task cannot be empty.'),
  priority: z.enum(['Low', 'Medium', 'High']),
});

type FormValues = z.infer<typeof formSchema>;

interface AddTodoFormProps {
  onTodoAdded: (newTodo: TodoClient) => void;
}

export function AddTodoForm({ onTodoAdded }: AddTodoFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { text: '', priority: 'Medium' },
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in.', variant: 'destructive' });
      return;
    }
    
    setIsPending(true);
    try {
      const newTodo = await addTodo(data.text, user.uid, data.priority);
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid sm:grid-cols-12 gap-2 items-start">
          <div className="sm:col-span-8 grid gap-1.5">
            <Label htmlFor="text" className="sr-only">Task description</Label>
            <Input
              id="text"
              placeholder="e.g., Finish the prototype"
              {...form.register('text')}
              disabled={isPending}
            />
            {form.formState.errors.text && (
              <p className="text-sm text-destructive">{form.formState.errors.text.message}</p>
            )}
          </div>
          <div className="sm:col-span-2 grid gap-1.5">
             <Label htmlFor="priority" className="sr-only">Priority</Label>
             <Select
                value={form.watch('priority')}
                onValueChange={(value) => form.setValue('priority', value as 'Low' | 'Medium' | 'High')}
                disabled={isPending}
            >
                <SelectTrigger id="priority">
                    <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? <Loader2 className="animate-spin" /> : 'Add Task'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
