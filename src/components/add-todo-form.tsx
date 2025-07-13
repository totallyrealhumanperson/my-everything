
'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { addTodo, type TodoClient } from '@/app/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle } from 'lucide-react';

const formSchema = z.object({
  text: z.string().min(1, 'Task cannot be empty.'),
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
    defaultValues: { text: '' },
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in.', variant: 'destructive' });
      return;
    }
    
    setIsPending(true);
    try {
      const newTodo = await addTodo(data.text, user.uid);
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
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-start gap-2">
          <div className="flex-grow grid gap-1.5">
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
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : 'Add Task'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
