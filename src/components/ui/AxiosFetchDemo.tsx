"use client";
import Button from '@/components/common/Button';
import useFetchTodo from '@/hooks/useFetchTodo';

export default function AxiosFetchDemo() {
  const { todo, loading, error, fetchTodo } = useFetchTodo();

  return (
    <div>
      <h2 className="font-semibold mb-2">Axios fetch demo</h2>
      <Button onClick={fetchTodo} variant="primary" disabled={loading}>
        {loading ? 'Loading...' : 'Fetch Todo'}
      </Button>
      {error && <p className="text-red-500 mt-2">{error}</p>}
      {todo && (
        <pre className="mt-2 p-2 bg-gray-100 rounded text-sm">{JSON.stringify(todo, null, 2)}</pre>
      )}
    </div>
  );
}
