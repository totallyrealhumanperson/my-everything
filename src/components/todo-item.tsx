
'use client';

import { useTransition } from 'react';
import { type TodoClient, toggleTodo, deleteTodo } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';

interface TodoItemProps {
  todo: TodoClient;
  onToggle: (todoId: string, completed: boolean, completedAt: string | null) => void;
  onDelete: (todoId: string) => void;
}

const priorityVariantMap: Record<TodoClient['priority'], 'destructive' | 'secondary' | 'default'> = {
  High: 'destructive',
  Medium: 'secondary',
  Low: 'default',
};

const priorityTextMap: Record<TodoClient['priority'], string> = {
  High: 'High',
  Medium: 'Medium',
  Low: 'Low',
};


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
        'flex flex-col items-start gap-3 p-3 transition-colors first:rounded-t-md last:rounded-b-md',
        todo.completed && 'bg-muted/50',
        isPending && 'opacity-50'
      )}
    >
      <div className="flex w-full items-center gap-3">
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
        <Badge variant={priorityVariantMap[todo.priority] || 'default'} className="hidden sm:inline-flex">
          {priorityTextMap[todo.priority] || 'Medium'}
        </Badge>
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
      </div>
      {todo.tags && todo.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 pl-10">
          {todo.tags.map((tag, index) => (
            <Badge key={index} variant="outline" className="py-1 px-2 text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </li>
  );
}

    