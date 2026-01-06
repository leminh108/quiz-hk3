"use client";
import { useState } from "react";
import http from '@/utils/AxiosClient';
import { Todo } from '@/types/todo';

export default function useFetchTodo() {
  const [loading, setLoading] = useState(false);
  const [todo, setTodo] = useState<Todo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTodo = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await http.get<Todo>('/todos/1');
      setTodo(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fetch failed');
    } finally {
      setLoading(false);
    }
  };

  return { todo, loading, error, fetchTodo } as const;
}
