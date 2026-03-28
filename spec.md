# GCM - Global Christian Mission

## Current State
All 5 frontend pages (EducationHub, Events, Teams, VisionPlan, ChurchLocator) store data in `localStorage` on the admin's browser only. This means:
- Admin adds content → visible only on admin's device
- Other users on other devices see empty pages
- Data is lost if browser storage is cleared

The backend canister already has full CRUD APIs for all entities:
- `addEducationPost`, `getAllEducationPosts`, `updateEducationPost`, `deleteEducationPost`
- `addEvent`, `getAllEvents`, `updateEvent`, `deleteEvent`
- `addTeam`, `getAllTeams`, `updateTeam`, `deleteTeam`
- `addVisionContent`, `getAllVisionContent`, `updateVisionContent`, `deleteVisionContent`
- `addChurch`, `getAllChurches`, `updateChurch`, `deleteChurch`

The `useActor` hook exists and returns a `backendInterface` actor.

## Requested Changes (Diff)

### Add
- Loading states while fetching from backend
- Error handling for backend failures

### Modify
- **EducationHub.tsx**: Replace localStorage read/write with `actor.getAllEducationPosts()` (load), `actor.addEducationPost()` (create), `actor.updateEducationPost()` (update), `actor.deleteEducationPost()` (delete)
- **Events.tsx**: Same pattern with Events APIs
- **Teams.tsx**: Same pattern with Teams APIs
- **VisionPlan.tsx**: Same pattern with VisionContent APIs
- **ChurchLocator.tsx**: Replace manual churches localStorage with `actor.addChurch()`, `actor.getAllChurches()`, `actor.deleteChurch()` for admin-added churches

### Remove
- All `localStorage` usage for content data in the 5 pages above (keep admin session localStorage in AuthContext)
- `STORAGE_KEY` constants and bigint serialization helpers (no longer needed for data)

## Implementation Plan
1. In each page, import and call `useActor()` to get the actor
2. On mount, call the relevant `getAll*` function and set state
3. On admin add/edit/delete, call the backend mutating function then refresh the list
4. Show loading spinner while data is being fetched
5. Keep file upload via StorageClient as-is (it already returns URLs that get stored in backend)
6. For EducationPost: `isPublished` should be `true` by default when admin adds
7. For Event: `isPublished` should be `true` by default
8. The backend `addEvent` sets `isPublished = false` — frontend should set it to `true` before calling
