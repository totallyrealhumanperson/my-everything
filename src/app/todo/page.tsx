
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ListTodo, Loader2 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getTodos, type TodoClient } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { AddTodoForm } from '@/components/add-todo-form';
import { TodoItem } from '@/components/todo-item';

export default function TodoPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [todos, setTodos] = useState<TodoClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const fetchTodos = useCallback(async () => {
    if (!user) {
      setTodos([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const userTodos = await getTodos(user.uid);
      // Sort todos: incomplete first, then by creation date
      userTodos.sort((a, b) => {
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setTodos(userTodos);
    } catch (err) {
      console.error("[TodoPage] Error fetching todos:", err);
      toast({ title: 'Error', description: 'Failed to load your to-do list.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading) {
      fetchTodos();
    }
  }, [authLoading, fetchTodos]);
  
  const handleTodoAdded = (newTodo: TodoClient) => {
    setTodos((prevTodos) => [newTodo, ...prevTodos].sort((a, b) => {
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }));
  };
  
  const handleTodoToggled = (todoId: string, completed: boolean, completedAt: string | null) => {
    setTodos(prevTodos => 
        prevTodos.map(t => t.id === todoId ? { ...t, completed, completedAt } : t)
        .sort((a, b) => {
          if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
          }
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })
    );
  };
  
  const handleTodoDeleted = (todoId: string) => {
      setTodos(prevTodos => prevTodos.filter(t => t.id !== todoId));
  };
  
  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });


  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-start min-h-screen p-4 sm:p-8 pt-12 sm:pt-24">
         <div className="w-full max-w-2xl flex justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading...</p>
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
    );
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-4 sm:p-8 pt-12 sm:pt-24 gap-8">
      <AddTodoForm onTodoAdded={handleTodoAdded} />
      
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-headline">
            <ListTodo className="h-5 w-5 text-primary" />
            Your Tasks
          </CardTitle>
          <CardDescription>
            Here are the tasks you've added.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full" onValueChange={(value) => setFilter(value as any)}>
            <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {isLoading ? (
             <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-2 mt-4">
              {filteredTodos.length > 0 ? (
                <ul className="divide-y divide-border">
                  {filteredTodos.map((todo) => (
                    <TodoItem 
                        key={todo.id} 
                        todo={todo}
                        onToggle={handleTodoToggled}
                        onDelete={handleTodoDeleted}
                    />
                  ))}
                </ul>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <p className="font-medium">
                    {filter === 'all' && 'No tasks found. Add one above!'}
                    {filter === 'active' && 'No active tasks. Great job!'}
                    {filter === 'completed' && 'No completed tasks yet.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
