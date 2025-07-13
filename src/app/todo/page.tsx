
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ListTodo, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { getTodos, addTodo, toggleTodo, deleteTodo, type TodoClient } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';


export default function TodoPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [todos, setTodos] = useState<TodoClient[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      getTodos(user.uid)
        .then(setTodos)
        .catch(err => {
          console.error(err);
          toast({ title: 'Error', description: 'Failed to load your tasks.', variant: 'destructive' });
        })
        .finally(() => setIsLoading(false));
    } else if (!authLoading) {
        // Not logged in, so stop loading
        setIsLoading(false);
        setTodos([]);
    }
  }, [user, authLoading, toast]);

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodo.trim() === '' || !user) return;
    
    const tempId = Date.now().toString();
    const optimisticTodo: TodoClient = {
      id: tempId,
      userId: user.uid,
      text: newTodo,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    startTransition(async () => {
      setTodos(prev => [optimisticTodo, ...prev]);
      setNewTodo('');
      
      const createdTodo = await addTodo(newTodo, user.uid);
      if (createdTodo) {
        setTodos(prev => prev.map(t => t.id === tempId ? createdTodo : t));
      } else {
        toast({ title: "Error", description: "Failed to add task.", variant: "destructive" });
        setTodos(prev => prev.filter(t => t.id !== tempId));
      }
    });
  };

  const handleToggleTodo = (id: string, completed: boolean) => {
    startTransition(async () => {
        const originalTodos = [...todos];
        setTodos(
          todos.map(todo =>
            todo.id === id ? { ...todo, completed: !todo.completed } : todo
          )
        );
        const result = await toggleTodo(id, !completed);
        if(!result.success) {
            toast({ title: "Error", description: "Failed to update task.", variant: "destructive" });
            setTodos(originalTodos); // Revert on failure
        }
    });
  };
  
  const handleDeleteTodo = (id: string) => {
     startTransition(async () => {
        const originalTodos = [...todos];
        setTodos(todos.filter(todo => todo.id !== id));
        const result = await deleteTodo(id);
        if(!result.success) {
            toast({ title: "Error", description: "Failed to delete task.", variant: "destructive" });
            setTodos(originalTodos); // Revert on failure
        }
    });
  };

  if (authLoading || (isLoading && user)) {
    return (
      <div className="flex flex-col items-center justify-start min-h-screen p-4 sm:p-8 pt-12 sm:pt-24">
         <div className="w-full max-w-2xl flex justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading your tasks...</p>
        </div>
      </div>
    );
  }

  if (!user) {
     return (
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
     )
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-4 sm:p-8 pt-12 sm:pt-24">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-headline">
            <ListTodo className="h-6 w-6 text-primary" />
            My To-Do List
          </CardTitle>
          <CardDescription>
            Add, check off, and manage your daily tasks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddTodo} className="flex items-center gap-2 mb-6">
            <Input
              id="new-todo"
              type="text"
              placeholder="What needs to be done?"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              className="flex-grow"
              disabled={isPending}
            />
            <Button type="submit" disabled={isPending || newTodo.trim() === ''}>
              {isPending && todos.some(t => t.id.length > 15) ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Task'}
            </Button>
          </form>

          <div className="space-y-4">
            {todos.length > 0 ? (
              todos.map((todo) => (
                <div key={todo.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={`todo-${todo.id}`}
                      checked={todo.completed}
                      onCheckedChange={() => handleToggleTodo(todo.id, todo.completed)}
                      aria-label={`Mark "${todo.text}" as ${todo.completed ? 'incomplete' : 'complete'}`}
                      disabled={isPending}
                    />
                    <Label
                      htmlFor={`todo-${todo.id}`}
                      className={cn(
                        'text-base transition-colors',
                        todo.completed ? 'text-muted-foreground line-through' : 'text-foreground'
                      )}
                    >
                      {todo.text}
                    </Label>
                  </div>
                   <Button variant="ghost" size="icon" onClick={() => handleDeleteTodo(todo.id)} aria-label={`Delete task "${todo.text}"`} disabled={isPending}>
                      <Trash2 className="h-4 w-4 text-destructive/70 hover:text-destructive" />
                    </Button>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <p className="font-medium">All caught up!</p>
                <p className="text-sm">You have no pending tasks.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
