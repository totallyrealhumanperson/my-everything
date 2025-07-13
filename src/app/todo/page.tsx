
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ListTodo, Loader2, Trash2, Tag, PlusCircle, X, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useState, useEffect, useTransition, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { getTodos, addTodo, toggleTodo, deleteTodo, type TodoClient, getTags, addTag, deleteTag, type Tag as TagType } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

const priorityConfig = {
    High: { label: "High", color: "bg-red-500", ring: "ring-red-500/50" },
    Medium: { label: "Medium", color: "bg-yellow-500", ring: "ring-yellow-500/50" },
    Low: { label: "Low", color: "bg-blue-500", ring: "ring-blue-500/50" },
};

type Priority = keyof typeof priorityConfig;

const ONE_MINUTE_IN_MS = 60 * 1000;

export default function TodoPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [todos, setTodos] = useState<TodoClient[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);

  const [newTodo, setNewTodo] = useState('');
  const [newTodoPriority, setNewTodoPriority] = useState<Priority>('Medium');
  const [newTodoTags, setNewTodoTags] = useState<string[]>([]);
  
  const [newTagName, setNewTagName] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [showOldCompleted, setShowOldCompleted] = useState(false);

  const filteredTodos = useMemo(() => {
    const now = Date.now();
    return [...todos]
        .filter(todo => {
            if (todo.completed && todo.completedAt && !showOldCompleted) {
                const completedTime = new Date(todo.completedAt).getTime();
                return now - completedTime < ONE_MINUTE_IN_MS;
            }
            return true;
        })
        .sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            const priorityOrder: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };
            if (a.priority !== b.priority) return priorityOrder[a.priority] - priorityOrder[b.priority];
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
  }, [todos, showOldCompleted]);

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      Promise.all([getTodos(user.uid), getTags(user.uid)])
        .then(([userTodos, userTags]) => {
          setTodos(userTodos);
          setTags(userTags);
        })
        .catch(err => {
          console.error(err);
          toast({ title: 'Error', description: 'Failed to load your data.', variant: 'destructive' });
        })
        .finally(() => setIsLoading(false));
    } else if (!authLoading) {
        setIsLoading(false);
        setTodos([]);
        setTags([]);
    }
  }, [user, authLoading, toast]);

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodo.trim() === '' || !user) return;
    
    startTransition(async () => {
      const createdTodo = await addTodo(newTodo, user.uid, newTodoPriority, newTodoTags);
      if (createdTodo) {
        setTodos(prev => [createdTodo, ...prev]);
        setNewTodo('');
        setNewTodoPriority('Medium');
        setNewTodoTags([]);
      } else {
        toast({ title: "Error", description: "Failed to add task.", variant: "destructive" });
      }
    });
  };

  const handleToggleTodo = (id: string, completed: boolean) => {
    startTransition(async () => {
        const originalTodo = todos.find(t => t.id === id);
        if (!originalTodo) return;

        setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !completed, completedAt: !completed ? new Date().toISOString() : null } : t));
        
        const result = await toggleTodo(id, !completed);
        if(!result.success) {
            toast({ title: "Error", description: "Failed to update task.", variant: "destructive" });
            setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: originalTodo.completed, completedAt: originalTodo.completedAt } : t));
        } else {
            // Ensure client state matches server state
            setTodos(prev => prev.map(t => t.id === id ? { ...t, completedAt: result.completedAt } : t));
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
            setTodos(originalTodos);
        }
    });
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTagName.trim() === '' || !user) return;

    startTransition(async () => {
        const createdTag = await addTag(newTagName, user.uid);
        if (createdTag) {
            if (!tags.find(t => t.id === createdTag.id)) {
                setTags(prev => [...prev, createdTag]);
            }
            setNewTagName('');
        } else {
            toast({ title: "Error", description: "Failed to add tag.", variant: "destructive" });
        }
    });
  }

  const handleDeleteTag = (tagId: string) => {
    startTransition(async () => {
        const originalTags = [...tags];
        setTags(tags.filter(tag => tag.id !== tagId));
        const result = await deleteTag(tagId);
        if (!result.success) {
            toast({ title: "Error", description: "Failed to delete tag.", variant: "destructive" });
            setTags(originalTags);
        }
    });
  }
  
  const handleTagSelection = (tagName: string) => {
    setNewTodoTags(prev => 
        prev.includes(tagName) 
        ? prev.filter(t => t !== tagName) 
        : [...prev, tagName]
    );
  }

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
    <div className="flex flex-col items-center justify-start min-h-screen p-4 sm:p-8 pt-12 sm:pt-24 gap-8">
        
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-headline">
                 <PlusCircle className="h-5 w-5 text-primary" />
                 Add a New Task
            </CardTitle>
        </CardHeader>
        <CardContent>
             <form onSubmit={handleAddTodo} className="space-y-4">
                <Input
                id="new-todo"
                type="text"
                placeholder="What needs to be done?"
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                disabled={isPending}
                />
                <div className="flex flex-col sm:flex-row gap-2">
                    <Select onValueChange={(v: Priority) => setNewTodoPriority(v)} value={newTodoPriority} disabled={isPending}>
                        <SelectTrigger className="w-full sm:w-[150px]">
                            <SelectValue placeholder="Set priority" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(priorityConfig).map(([key, {label}]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full sm:w-auto justify-start font-normal">
                                <Tag className="mr-2 h-4 w-4" />
                                Tags
                                {newTodoTags.length > 0 && <Badge variant="secondary" className="ml-2 rounded-sm">{newTodoTags.length}</Badge>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-0" align="start">
                            <div className="p-4 space-y-2">
                                {tags.length > 0 ? tags.map(tag => (
                                    <div key={tag.id} className="flex items-center gap-2">
                                        <Checkbox id={`tag-${tag.id}`} checked={newTodoTags.includes(tag.name)} onCheckedChange={() => handleTagSelection(tag.name)}/>
                                        <Label htmlFor={`tag-${tag.id}`}>{tag.name}</Label>
                                    </div>
                                )) : <p className="text-sm text-muted-foreground">No tags yet.</p>}
                            </div>
                        </PopoverContent>
                    </Popover>
                
                    <Button type="submit" className="flex-grow" disabled={isPending || newTodo.trim() === ''}>
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                        Add Task
                    </Button>
                </div>
            </form>
        </CardContent>
      </Card>

      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-headline">
            <ListTodo className="h-6 w-6 text-primary" />
            My To-Do List
          </CardTitle>
          <CardDescription>
            Add, check off, and manage your daily tasks with priorities and tags.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center gap-4 p-4 border-b">
                 <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground"/>
                    <Label htmlFor="show-old-completed" className="text-muted-foreground">Show old completed tasks</Label>
                 </div>
                <Switch 
                    id="show-old-completed"
                    checked={showOldCompleted}
                    onCheckedChange={setShowOldCompleted}
                    aria-label="Toggle visibility of old completed tasks"
                />
            </div>

          <div className="space-y-4 mt-6">
            {filteredTodos.length > 0 ? (
              filteredTodos.map((todo) => (
                <div key={todo.id} className={cn("flex items-start justify-between p-3 rounded-lg bg-muted/50 transition-colors", (isPending) && 'opacity-50')}>
                  <div className="flex items-start gap-3">
                    <span className={cn("mt-1 h-3 w-3 rounded-full flex-shrink-0", priorityConfig[todo.priority].color)} />
                    <Checkbox
                      id={`todo-${todo.id}`}
                      checked={todo.completed}
                      onCheckedChange={() => handleToggleTodo(todo.id, todo.completed)}
                      aria-label={`Mark "${todo.text}" as ${todo.completed ? 'incomplete' : 'complete'}`}
                      disabled={isPending}
                      className="mt-0.5"
                    />
                    <div className="flex flex-col">
                        <Label
                        htmlFor={`todo-${todo.id}`}
                        className={cn(
                            'text-base transition-colors cursor-pointer',
                            todo.completed ? 'text-muted-foreground line-through' : 'text-foreground'
                        )}
                        >
                        {todo.text}
                        </Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {todo.tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                        </div>
                    </div>
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
      
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-headline">
                <Tag className="h-5 w-5 text-primary" />
                Manage Tags
            </CardTitle>
        </CardHeader>
        <CardContent>
            <form onSubmit={handleAddTag} className="flex items-center gap-2 mb-4">
                 <Input
                    id="new-tag"
                    type="text"
                    placeholder="New tag name..."
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    disabled={isPending}
                 />
                 <Button type="submit" disabled={isPending || newTagName.trim() === ''}>
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Tag"}
                 </Button>
            </form>
            <div className="flex flex-wrap gap-2">
                {tags.length > 0 ? tags.map(tag => (
                    <Badge key={tag.id} variant="outline" className="text-base py-1 pl-3 pr-1">
                        {tag.name}
                        <Button variant="ghost" size="icon" className="h-5 w-5 ml-1" onClick={() => handleDeleteTag(tag.id)} disabled={isPending}>
                            <X className="h-3 w-3" />
                        </Button>
                    </Badge>
                )) : <p className="text-sm text-muted-foreground">No tags created yet.</p>}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

    