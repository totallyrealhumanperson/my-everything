
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ListTodo, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getTodos, type TodoClient } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

export default function TodoPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [todos, setTodos] = useState<TodoClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      console.log(`[TodoPage] Fetching todos for user: ${user.uid}`);
      getTodos(user.uid)
        .then((userTodos) => {
          console.log(`[TodoPage] Received ${userTodos.length} todos:`, userTodos);
          setTodos(userTodos);
        })
        .catch(err => {
          console.error("[TodoPage] Error fetching todos:", err);
          toast({ title: 'Error', description: 'Failed to load your to-do list.', variant: 'destructive' });
        })
        .finally(() => {
            console.log("[TodoPage] Finished loading.");
            setIsLoading(false)
        });
    } else if (!authLoading) {
        setIsLoading(false);
        setTodos([]);
    }
  }, [user, authLoading, toast]);

  const renderLoading = () => (
      <div className="flex flex-col items-center justify-start min-h-screen p-4 sm:p-8 pt-12 sm:pt-24">
         <div className="w-full max-w-2xl flex justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading your tasks...</p>
        </div>
      </div>
  );

  const renderNoUser = () => (
    <div className="flex flex-col items-center justify-start min-h-screen p-4 sm:p-8 pt-12 sm:pt-24">
        <Card className="w-full max-w-2xl shadow-xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl font-headline">
                    <ListTodo className="h-6 w-6 text-primary" />
                    My To-Do List
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-center text-muted-foreground py-8">
                    <p className="font-medium">Please log in to manage your to-do list.</p>
                </div>
            </CardContent>
        </Card>
    </div>
  );

  if (authLoading || (isLoading && user)) {
    return renderLoading();
  }

  if (!user) {
     return renderNoUser();
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-4 sm:p-8 pt-12 sm:pt-24 gap-8">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-headline">
            <ListTodo className="h-6 w-6 text-primary" />
            My To-Do List
          </CardTitle>
          <CardDescription>
            A plain list of your tasks from Firestore.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 mt-6">
            {todos.length > 0 ? (
              <ul>
                {todos.map((todo) => (
                  <li key={todo.id} className="p-2 border-b">
                    {todo.text}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <p className="font-medium">No tasks found.</p>
                <p className="text-sm">Either you have no tasks or they are not loading correctly.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
