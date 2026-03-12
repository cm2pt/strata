# Demo Mode

> How Strata handles offline/demo operation without a real API backend.

---

## How It Works

When `NEXT_PUBLIC_API_URL` is not set, Strata runs in **demo mode**:

- All data comes from seed files (`src/lib/api/seed.ts`)
- The `useData<T>()` hook tries the API first, falls back to seed data
- Mutations (POST/PATCH/DELETE) are disabled

## Key Flags

```tsx
import { isAPIEnabled, canMutate } from "@/lib/api/client";

isAPIEnabled  // true when NEXT_PUBLIC_API_URL is set
canMutate     // true when mutations are allowed (same as isAPIEnabled)
```

## Demo Mode Banner

**File**: `src/components/shared/demo-mode-banner.tsx`

An amber banner appears at the top of the dashboard layout when `isAPIEnabled` is false:

> **Demo Mode** — viewing sample data. Mutations are disabled.

When the API is configured, the banner renders nothing.

## Disabling Mutation Buttons

All mutation buttons check `canMutate` and show a tooltip when disabled:

```tsx
<Button
  onClick={handleApprove}
  disabled={!canMutate}
  title={!canMutate ? "API unavailable in offline demo mode" : ""}
>
  Approve
</Button>
```

## Tooltip Pattern

For buttons that use `Tooltip` instead of `title`:

```tsx
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

<Tooltip>
  <TooltipTrigger asChild>
    <Button disabled={!canMutate}>Approve</Button>
  </TooltipTrigger>
  {!canMutate && (
    <TooltipContent>API unavailable in offline demo mode</TooltipContent>
  )}
</Tooltip>
```

## Switching to Live Mode

Set the environment variable and restart:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1 npm run dev
```

The demo banner will disappear and mutations will be enabled.
