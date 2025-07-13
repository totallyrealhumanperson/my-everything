
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ListTodo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Trash2 } from 'lucide-react';

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
}

export default function TodoPage() {
  const [todos, setTodos] = useState<TodoItem[]>([
    { id: 1, text: 'Create a new project', completed: true },
    { id: 2, text: 'Add a to-do list page', completed: false },
    { id: 3, text: 'Build something awesome', completed: false },
  ]);
  const [newTodo, setNewTodo] = useState('');

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodo.trim() === '') return;
    setTodos([
      ...todos,
      { id: Date.now(), text: newTodo, completed: false },
    ]);
    setNewTodo('');
  };

  const toggleTodo = (id: number) => {
    setTodos(
      todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };
  
  const deleteTodo = (id: number) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

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
            />
            <Button type="submit">Add Task</Button>
          </form>

          <div className="space-y-4">
            {todos.length > 0 ? (
              todos.map((todo) => (
                <div key={todo.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={`todo-${todo.id}`}
                      checked={todo.completed}
                      onCheckedChange={() => toggleTodo(todo.id)}
                      aria-label={`Mark "${todo.text}" as ${todo.completed ? 'incomplete' : 'complete'}`}
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
                   <Button variant="ghost" size="icon" onClick={() => deleteTodo(todo.id)} aria-label={`Delete task "${todo.text}"`}>
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
