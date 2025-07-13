
'use client';

import { useTransition } from 'react';
import { type TodoClient, toggleTodo, deleteTodo, updateTodoStatus, type TodoStatus } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';

interface TodoItemProps {
  todo: TodoClient;
  onToggle: (todoId: string, completed: boolean, completedAt: string | null) => void;
  onDelete: (todoId: string) => void;
  onStatusChange: (todoId: string, newStatus: TodoStatus) => void;
}

const todoStatuses: TodoStatus[] = ['No Status', 'In Progress', 'Needs Review', 'Blocked'];

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

const statusColorMap: Record<TodoStatus, string> = {
    'No Status': 'bg-slate-400',
    'In Progress': 'bg-blue-500',
    'Needs Review': 'bg-yellow-500',
    'Blocked': 'bg-red-500'
};


export function TodoItem({ todo, onToggle, onDelete, onStatusChange }: TodoItemProps) {
  const { toast } = useToast();
  const [isTogglePending, startToggleTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [isStatusPending, startStatusTransition] = useTransition();

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

  const handleStatusChange = (newStatus: TodoStatus) => {
    startStatusTransition(async () => {
        const result = await updateTodoStatus(todo.id, newStatus);
        if (result.success) {
            onStatusChange(todo.id, newStatus);
            toast({ title: 'Status updated', description: `Task status set to "${newStatus}".` });
        } else {
            toast({ title: 'Error', description: 'Failed to update status.', variant: 'destructive' });
        }
    });
  };
  
  const isPending = isTogglePending || isDeletePending || isStatusPending;

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
        
        <div className="flex items-center gap-2 ml-auto">
            <Select value={todo.status} onValueChange={handleStatusChange} disabled={isPending}>
                <SelectTrigger className="w-[150px] h-8 text-xs">
                    <SelectValue>
                        <div className="flex items-center gap-2">
                            <span className={cn("h-2 w-2 rounded-full", statusColorMap[todo.status])} />
                            {todo.status}
                        </div>
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    {todoStatuses.map(status => (
                        <SelectItem key={status} value={status}>
                            <div className="flex items-center gap-2">
                                <span className={cn("h-2 w-2 rounded-full", statusColorMap[status])} />
                                {status}
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Badge variant={priorityVariantMap[todo.priority] || 'default'} className="hidden sm:inline-flex h-8">
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
