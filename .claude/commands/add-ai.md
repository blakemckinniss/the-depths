# Add New AI Feature

Guide for adding AI-powered features.

## Steps

1. Create API route in `src/app/api/<name>/route.ts`
2. Define Zod schema in `src/lib/ai-schemas.ts`
3. Create React hook in `src/lib/use-<name>.ts`
4. Integrate in game component

## API Route Template

```typescript
// src/app/api/<name>/route.ts
import { createGroq } from '@ai-sdk/groq';
import { generateObject } from 'ai';
import { <name>Schema } from '@/lib/ai-schemas';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request: Request) {
  const body = await request.json();

  const result = await generateObject({
    model: groq('llama-3.3-70b-versatile'),
    schema: <name>Schema,
    prompt: `Your prompt here with ${body.context}`,
  });

  return Response.json(result.object);
}
```

## Schema Template

```typescript
// Add to src/lib/ai-schemas.ts
export const <name>Schema = z.object({
  // Define your schema
});

export type <Name>Response = z.infer<typeof <name>Schema>;
```

## Hook Template

```typescript
// src/lib/use-<name>.ts
import { useState, useCallback } from 'react';
import type { <Name>Response } from './ai-schemas';

export function use<Name>() {
  const [data, setData] = useState<<Name>Response | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async (context: unknown) => {
    setLoading(true);
    try {
      const res = await fetch('/api/<name>', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context }),
      });
      const result = await res.json();
      setData(result);
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, generate };
}
```
