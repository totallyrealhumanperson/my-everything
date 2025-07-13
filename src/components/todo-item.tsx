
'use client';

import { useState, useTransition } from 'react';
import { type TodoClient, toggleTodo, deleteTodo } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TodoItemProps {
  todo: TodoClient;
  onToggle: (todoId: string, completed: boolean, completedAt: string | null) => void;
  onDelete: (todoId: string) => void;
}

export function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  const { toast } = useToast();
  const [isTogglePending, startToggleTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();

  const handleToggle = () => {
    startToggleTransition(async () => {
      const result = await toggleTodo(todo.id, !todo.completed);
      if (result.success) {
        onToggle(todo.id, !todo.completed, result.completedAt);
      } else {
        toast({ title: 'Error', description: 'Failed to update task.', variant: 'destructive' });
      }
    });
  };

  const handleDelete = () => {
    startDeleteTransition(async () => {
      const result = await deleteTodo(todo.id);
      if (result.success) {
        toast({ title: 'Success', description: 'Task deleted.' });
        onDelete(todo.id);
      } else {
        toast({ title: 'Error', description: 'Failed to delete task.', variant: 'destructive' });
      }
    });
  };
  
  const isPending = isTogglePending || isDeletePending;

  return (
    <li
      className={cn(
        'flex items-center gap-3 p-3 transition-colors',
        todo.completed && 'bg-muted/50',
        isPending && 'opacity-50'
      )}
    >
      <Checkbox
        id={`todo-${todo.id}`}
        checked={todo.completed}
        onCheckedChange={handleToggle}
        disabled={isPending}
        aria-label={`Mark "${todo.text}" as ${todo.completed ? 'incomplete' : 'complete'}`}
      />
      <label
        htmlFor={`todo-${todo.id}`}
        className={cn(
          'flex-grow text-sm cursor-pointer',
          todo.completed && 'text-muted-foreground line-through'
        )}
      >
        {todo.text}
      </label>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDelete}
        disabled={isPending}
        className="h-8 w-8"
        aria-label={`Delete task "${todo.text}"`}
      >
        {isDeletePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
      </Button>
    </li>
  );
}
